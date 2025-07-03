import { NextRequest, NextResponse } from 'next/server';
import { shopifyAdmin } from '../../../../lib/shopify';

// Get shop metafields (for loading custom presets)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const namespace = searchParams.get('namespace') || 'pixelme';
    const key = searchParams.get('key') || 'custom_presets';

    const query = `
      query getShopMetafields($namespace: String!, $key: String!) {
        shop {
          metafield(namespace: $namespace, key: $key) {
            id
            namespace
            key
            value
            type
          }
        }
      }
    `;

    const response = await shopifyAdmin.request(query, {
      variables: { namespace, key }
    });

    const metafield = response.data?.shop?.metafield;
    
    if (metafield) {
      // Parse the JSON value
      let parsedValue: Record<string, any> = {};
      try {
        const rawValue = JSON.parse(metafield.value);
        
        console.log('📦 Raw metafield value:', rawValue);
        console.log('📊 Raw value type:', typeof rawValue);
        console.log('📋 Raw value keys:', Object.keys(rawValue || {}));
        
        // If rawValue is null, undefined, or empty object, return empty presets
        if (!rawValue || (typeof rawValue === 'object' && Object.keys(rawValue).length === 0)) {
          console.log('ℹ️ Metafield exists but is empty, returning empty presets');
          return NextResponse.json({
            success: true,
            metafield: {
              ...metafield,
              parsedValue: {}
            }
          });
        }
        
        // Convert old format (width/height) to new format (size) for backward compatibility
        parsedValue = {};
        for (const [key, preset] of Object.entries(rawValue)) {
          if (preset && typeof preset === 'object') {
            const convertedPreset = { ...preset } as any;
            
            // If preset has width/height but no size, convert it
            if ('width' in convertedPreset && 'height' in convertedPreset && !('size' in convertedPreset)) {
              // Use the average of width and height, or just width if they're the same
              convertedPreset.size = Math.max(convertedPreset.width, convertedPreset.height);
              delete convertedPreset.width;
              delete convertedPreset.height;
            }
            
            parsedValue[key] = convertedPreset;
          }
        }
        
        console.log('✅ Converted presets:', parsedValue);
      } catch (error) {
        console.error('Error parsing metafield value:', error);
        // If parsing fails, return empty presets
        parsedValue = {};
      }

      return NextResponse.json({
        success: true,
        metafield: {
          ...metafield,
          parsedValue
        }
      });
    } else {
      // Return default presets ONLY if no metafield exists at all (first time setup)
      console.log('ℹ️ No metafield found, returning default presets for first-time setup');
      const defaultPresets = {
        'center-chest': { name: 'Center Chest', x: 35, y: 25, size: 30 },
        'left-chest': { name: 'Left Chest', x: 15, y: 25, size: 25 },
        'right-chest': { name: 'Right Chest', x: 55, y: 25, size: 25 },
        'side-leg': { name: 'Side Leg', x: 60, y: 30, size: 25 }
      };

      return NextResponse.json({
        success: true,
        metafield: {
          namespace,
          key,
          parsedValue: defaultPresets
        }
      });
    }
  } catch (error) {
    console.error('Error fetching shop metafields:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metafields' },
      { status: 500 }
    );
  }
}

// Create or update shop metafields (for saving custom presets)
export async function POST(request: NextRequest) {
  try {
    const { namespace = 'pixelme', key = 'custom_presets', value } = await request.json();

    console.log('💾 POST - Saving metafield:', { namespace, key, value });
    console.log('📊 Value type:', typeof value);
    console.log('📋 Value keys:', Object.keys(value || {}));
    console.log('🔢 Value count:', Object.keys(value || {}).length);

    if (value === null || value === undefined) {
      return NextResponse.json(
        { error: 'Value is required' },
        { status: 400 }
      );
    }

    // First, test the API connection with a simple shop query
    console.log('🔗 Testing Shopify API connection...');
    try {
      const testQuery = `query { shop { name id } }`;
      const testResponse = await shopifyAdmin.request(testQuery);
      console.log('✅ API connection test successful:', testResponse.data?.shop);
    } catch (testError) {
      console.error('❌ API connection test failed:', testError);
      return NextResponse.json(
        { error: 'Shopify API connection failed', details: testError },
        { status: 500 }
      );
    }

    // First, check if metafield already exists
    const getQuery = `
      query getShopMetafield($namespace: String!, $key: String!) {
        shop {
          metafield(namespace: $namespace, key: $key) {
            id
          }
        }
      }
    `;

    const getResponse = await shopifyAdmin.request(getQuery, {
      variables: { namespace, key }
    });

    console.log('🔍 Existing metafield check:', getResponse.data?.shop?.metafield);

    const existingMetafield = getResponse.data?.shop?.metafield;

    // Validate the existing metafield
    if (existingMetafield && !existingMetafield.id) {
      console.error('❌ Existing metafield has no ID:', existingMetafield);
      return NextResponse.json(
        { error: 'Invalid metafield found - missing ID' },
        { status: 500 }
      );
    }

    // Get shop ID for metafieldsSet mutation
    const shopQuery = `
      query getShop {
        shop {
          id
        }
      }
    `;

    const shopResponse = await shopifyAdmin.request(shopQuery);
    const shopId = shopResponse.data?.shop?.id;

    if (!shopId) {
      return NextResponse.json(
        { error: 'Could not get shop ID' },
        { status: 500 }
      );
    }

    // Use metafieldsSet for both create and update (modern Shopify API)
    const mutation = `
      mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            namespace
            key
            value
            type
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      metafields: [{
        ownerId: shopId,
        namespace,
        key,
        value: JSON.stringify(value),
        type: "json"
      }]
    };

    console.log('🚀 Sending mutation to Shopify:', { mutation: mutation.split('\n')[1].trim(), variables });
    
    let response;
    try {
      response = await shopifyAdmin.request(mutation, { variables });
    } catch (error) {
      console.error('❌ Shopify request failed:', error);
      return NextResponse.json(
        { error: 'Shopify API request failed', details: error },
        { status: 500 }
      );
    }

    console.log('📡 Response from Shopify:', response);

    // Check for GraphQL errors first (Shopify client wraps them)
    if (response.errors?.graphQLErrors && response.errors.graphQLErrors.length > 0) {
      console.error('❌ GraphQL errors:', response.errors.graphQLErrors);
      // Log each error in detail
      response.errors.graphQLErrors.forEach((error: any, index: number) => {
        console.error(`❌ GraphQL Error ${index + 1}:`, {
          message: error.message,
          locations: error.locations,
          path: error.path,
          extensions: error.extensions
        });
      });
      return NextResponse.json(
        { error: 'GraphQL errors occurred', details: response.errors.graphQLErrors },
        { status: 400 }
      );
    }

    // Also check if there's no data at all
    if (!response.data) {
      console.error('❌ No data in response:', response);
      return NextResponse.json(
        { error: 'No data returned from Shopify', details: response },
        { status: 500 }
      );
    }

    const result = response.data?.metafieldsSet;

    console.log('📦 Mutation result:', result);

    if (result?.userErrors && result.userErrors.length > 0) {
      console.error('❌ Shopify user errors:', result.userErrors);
      return NextResponse.json(
        { error: 'Metafield operation failed', details: result.userErrors },
        { status: 400 }
      );
    }

    const metafield = result?.metafields?.[0];

    console.log('💾 Final metafield saved:', metafield);
    console.log('📄 Stored value:', metafield?.value);

    return NextResponse.json({
      success: true,
      metafield: {
        ...metafield,
        parsedValue: value
      },
      message: existingMetafield ? 'Custom presets updated successfully' : 'Custom presets saved successfully'
    });

  } catch (error) {
    console.error('Error saving shop metafields:', error);
    return NextResponse.json(
      { error: 'Failed to save metafields' },
      { status: 500 }
    );
  }
}

// Delete shop metafields (for removing custom presets)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const namespace = searchParams.get('namespace') || 'pixelme';
    const key = searchParams.get('key') || 'custom_presets';

    // First, get the metafield ID
    const getQuery = `
      query getShopMetafield($namespace: String!, $key: String!) {
        shop {
          metafield(namespace: $namespace, key: $key) {
            id
          }
        }
      }
    `;

    const getResponse = await shopifyAdmin.request(getQuery, {
      variables: { namespace, key }
    });

    const metafield = getResponse.data?.shop?.metafield;

    if (!metafield) {
      return NextResponse.json(
        { error: 'Metafield not found' },
        { status: 404 }
      );
    }

    // Delete the metafield
    const deleteQuery = `
      mutation metafieldDelete($input: MetafieldDeleteInput!) {
        metafieldDelete(input: $input) {
          deletedId
          userErrors {
            field
            message
          }
        }
      }
    `;

    const deleteResponse = await shopifyAdmin.request(deleteQuery, {
      variables: {
        input: {
          id: metafield.id
        }
      }
    });

    if (deleteResponse.data?.metafieldDelete?.userErrors?.length > 0) {
      return NextResponse.json(
        { error: 'Failed to delete metafield', details: deleteResponse.data.metafieldDelete.userErrors },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      deletedId: deleteResponse.data?.metafieldDelete?.deletedId,
      message: 'Custom presets reset to defaults'
    });

  } catch (error) {
    console.error('Error deleting shop metafields:', error);
    return NextResponse.json(
      { error: 'Failed to delete metafields' },
      { status: 500 }
    );
  }
} 