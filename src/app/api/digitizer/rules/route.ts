import { NextRequest, NextResponse } from 'next/server';

// For now, we'll store rules in Shopify metafields
// In a more complex setup, you might use a dedicated database

export async function GET() {
  try {
    if (!process.env.SHOPIFY_STORE_DOMAIN || !process.env.SHOPIFY_ADMIN_ACCESS_TOKEN) {
      throw new Error('Missing Shopify environment variables');
    }

    console.log('📋 Fetching digitizer rules...');

    // Fetch the digitizer rules from Shopify metafields
    const response = await fetch(
      `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2023-10/metafields.json?namespace=pixelme&key=digitizer_rules`,
      {
        headers: {
          'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status}`);
    }

    const data = await response.json();
    const metafield = data.metafields?.[0];
    const rules = metafield?.value || '';

    console.log('✅ Retrieved digitizer rules');

    return NextResponse.json({
      success: true,
      rules: rules
    });

  } catch (error) {
    console.error('❌ Error fetching digitizer rules:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage,
      rules: '' // Return empty rules on error
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { rules } = await request.json();

    if (!process.env.SHOPIFY_STORE_DOMAIN || !process.env.SHOPIFY_ADMIN_ACCESS_TOKEN) {
      throw new Error('Missing Shopify environment variables');
    }

    console.log('📋 Saving digitizer rules...');

    // First, try to get existing metafield ID
    const getResponse = await fetch(
      `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2023-10/metafields.json?namespace=pixelme&key=digitizer_rules`,
      {
        headers: {
          'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
          'Content-Type': 'application/json',
        },
      }
    );

    let method = 'POST';
    let url = `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2023-10/metafields.json`;
    let metafieldId = null;

    if (getResponse.ok) {
      const existingData = await getResponse.json();
      const existingMetafield = existingData.metafields?.[0];
      
      if (existingMetafield) {
        method = 'PUT';
        metafieldId = existingMetafield.id;
        url = `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2023-10/metafields/${metafieldId}.json`;
      }
    }

    const requestBody: {
      metafield: {
        namespace: string;
        key: string;
        value: string;
        type: string;
        id?: string;
      }
    } = {
      metafield: {
        namespace: 'pixelme',
        key: 'digitizer_rules',
        value: rules,
        type: 'multi_line_text_field'
      }
    };

    if (metafieldId) {
      requestBody.metafield.id = metafieldId;
    }

    const response = await fetch(url, {
      method: method,
      headers: {
        'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Digitizer rules saved successfully');

    return NextResponse.json({
      success: true,
      message: 'Digitizer rules saved successfully',
      metafield: data.metafield
    });

  } catch (error) {
    console.error('❌ Error saving digitizer rules:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
}