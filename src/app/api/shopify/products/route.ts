import { NextRequest, NextResponse } from 'next/server';
import { shopifyAdmin, generateProductTitle, generateProductHandle, generateVariantSku, BASE_PRODUCT_DATA, CLOTHING_SIZES, CLOTHING_COLORS } from '../../../../lib/shopify';

// Helper function to get product image URL
function getProductImageUrl(clothing: string, style: string, request?: NextRequest): string {
  // Try to get base URL from the request or environment
  let baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  
  if (!baseUrl && request) {
    const url = new URL(request.url);
    baseUrl = `${url.protocol}//${url.host}`;
  }
  
  if (!baseUrl) {
    baseUrl = 'http://localhost:3001'; // fallback for development
  }
  
  // Map clothing type to image file
  const clothingImageMap: Record<string, string> = {
    'hoodie': '/clothes/hoodie.png',
    'trackies': '/clothes/trackies.png',
  };
  
  const imagePath = clothingImageMap[clothing.toLowerCase()] || '/clothes/hoodie.png';
  return `${baseUrl}${imagePath}`;
}

// Get products or create a new product
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('id');
    const limit = searchParams.get('limit') || '50';

    if (productId) {
      // Get single product
      const query = `
        query getProduct($id: ID!) {
          product(id: $id) {
            id
            title
            handle
            description
            productType
            vendor
            tags
            status
            options {
              id
              name
              values
            }
            variants(first: 50) {
              edges {
                node {
                  id
                  title
                  price
                  sku
                  inventoryQuantity
                  selectedOptions {
                    name
                    value
                  }
                  image {
                    url
                    altText
                  }
                }
              }
            }
            images(first: 10) {
              edges {
                node {
                  id
                  url
                  altText
                }
              }
            }
          }
        }
      `;

      const response = await shopifyAdmin.request(query, {
        variables: { id: `gid://shopify/Product/${productId}` }
      });

      return NextResponse.json({ success: true, product: response.data.product });
    } else {
      // Get all products
      const query = `
        query getProducts($first: Int!) {
          products(first: $first) {
            edges {
              node {
                id
                title
                handle
                description
                productType
                vendor
                status
                tags
                options {
                  id
                  name
                  values
                }
                variants(first: 50) {
                  edges {
                    node {
                      id
                      title
                      price
                      sku
                      inventoryQuantity
                      selectedOptions {
                        name
                        value
                      }
                      image {
                        url
                        altText
                      }
                    }
                  }
                }
                images(first: 10) {
                  edges {
                    node {
                      url
                      altText
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const response = await shopifyAdmin.request(query, {
        variables: { first: parseInt(limit) }
      });

      console.log('🔍 Shopify products API response:', JSON.stringify(response, null, 2));

      if (!response.data || !response.data.products) {
        console.error('❌ Invalid response structure from Shopify API');
        console.error('Response:', response);
        console.error('Response errors:', response.errors);
        return NextResponse.json(
          { error: 'Invalid response from Shopify API', details: response.errors || 'No data received' },
          { status: 500 }
        );
      }

      return NextResponse.json({ 
        success: true, 
        products: response.data.products.edges.map((edge: any) => edge.node) 
      });
    }
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

// Create a new product
export async function POST(request: NextRequest) {
  try {
    const { clothing, style, price = '29.99', description, processedImageUrl, selectedSize = 'M', selectedColor = 'Black' } = await request.json();

    if (!clothing || !style) {
      return NextResponse.json(
        { error: 'Missing required fields: clothing and style' },
        { status: 400 }
      );
    }

    const title = generateProductTitle(clothing, style);
    const handle = generateProductHandle(clothing, style);

    const mutation = `
      mutation productCreate($input: ProductInput!) {
        productCreate(input: $input) {
          product {
            id
            title
            handle
            descriptionHtml
            productType
            vendor
            status
            variants(first: 1) {
              edges {
                node {
                  id
                  title
                  price
                  sku
                  inventoryQuantity
                  selectedOptions {
                    name
                    value
                  }
                }
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const productInput = {
      title,
      handle,
      descriptionHtml: description || `Custom ${clothing} with ${style} style design. Upload your photo and we'll create a personalized cartoon version just for you!`,
      productType: 'Custom Clothing',
      vendor: 'PixelMe',
      tags: ['custom', 'cartoon', 'personalized'],
      status: 'ACTIVE'
    };

    console.log('Creating product with input:', JSON.stringify(productInput, null, 2));

    const response = await shopifyAdmin.request(mutation, {
      variables: { input: productInput }
    });

    console.log('Product creation response:', JSON.stringify(response, null, 2));

    // Check if response has the expected structure
    if (!response.data || !response.data.productCreate) {
      console.error('Unexpected API response structure:', response);
      console.error('Response errors:', response.errors);
      console.error('GraphQL errors:', response.errors?.graphQLErrors);
      return NextResponse.json(
        { error: 'Unexpected API response from Shopify', details: response.errors },
        { status: 500 }
      );
    }

    if (response.data.productCreate.userErrors && response.data.productCreate.userErrors.length > 0) {
      console.error('Product creation user errors:', response.data.productCreate.userErrors);
      return NextResponse.json(
        { error: 'Shopify validation errors', details: response.data.productCreate.userErrors },
        { status: 400 }
      );
    }

    const product = response.data.productCreate.product;
    console.log('Product created successfully:', product.id);

    // Publish the product to make it available for sale
    const publishMutation = `
      mutation productPublish($input: ProductPublishInput!) {
        productPublish(input: $input) {
          product {
            id
            status
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const publishInput = {
      id: product.id,
      productPublications: [{
        publicationId: 'gid://shopify/Publication/1' // Online Store
      }]
    };

    try {
      const publishResponse = await shopifyAdmin.request(publishMutation, {
        variables: { input: publishInput }
      });
      
      console.log('Product publish response:', JSON.stringify(publishResponse, null, 2));
      
      if (publishResponse.data?.productPublish?.userErrors?.length > 0) {
        console.warn('Product publish warnings:', publishResponse.data.productPublish.userErrors);
      }
    } catch (publishError) {
      console.warn('Failed to publish product, but continuing:', publishError);
    }

    // Wait a moment for the product to be fully created, then fetch it again to get real variant IDs
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Fetch the product again to get the real variant IDs
    const realProductQuery = `
      query getProduct($id: ID!) {
        product(id: $id) {
          id
          title
          handle
          descriptionHtml
          productType
          vendor
          status
          variants(first: 50) {
            edges {
              node {
                id
                title
                price
                sku
                inventoryQuantity
                availableForSale
              }
            }
          }
        }
      }
    `;

    const realProductResponse = await shopifyAdmin.request(realProductQuery, {
      variables: { id: product.id }
    });

    const realProduct = realProductResponse.data.product;
    console.log('Real product after creation:', JSON.stringify(realProduct, null, 2));

    // Use the default variant that was automatically created
    const defaultVariant = realProduct.variants.edges[0]?.node;
    if (!defaultVariant) {
      console.error('No default variant found in real product');
      return NextResponse.json(
        { error: 'No default variant found in real product' },
        { status: 500 }
      );
    }

    console.log('Using real default variant:', defaultVariant.id);
    console.log('Real default variant details:', JSON.stringify(defaultVariant, null, 2));

    // Verify the variant is accessible via Storefront API
    try {
      const { shopifyStorefront } = await import('../../../../lib/shopify');
      const storefrontVariantQuery = `
        query getProductVariant($id: ID!) {
          productVariant(id: $id) {
            id
            title
            availableForSale
            product {
              id
              title
              availableForSale
            }
          }
        }
      `;
      
      const storefrontVariantResponse = await shopifyStorefront.request(storefrontVariantQuery, {
        variables: { id: defaultVariant.id }
      });
      
      console.log('Storefront variant verification:', JSON.stringify(storefrontVariantResponse, null, 2));
    } catch (storefrontError) {
      console.error('Storefront variant verification failed:', storefrontError);
    }

    // Add product image if processedImageUrl is provided
    if (processedImageUrl) {
      const imageMutation = `
        mutation productImageCreate($input: ProductImageInput!) {
          productImageCreate(input: $input) {
            image {
              id
              url
              altText
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const imageInput = {
        productId: product.id,
        src: processedImageUrl,
        altText: `${title} - ${style} style custom clothing`
      };

      try {
        const imageResponse = await shopifyAdmin.request(imageMutation, {
          variables: { input: imageInput }
        });

        if (imageResponse.data?.productImageCreate?.userErrors?.length > 0) {
          console.warn('Image creation warnings:', imageResponse.data.productImageCreate.userErrors);
        }
      } catch (imageError) {
        console.warn('Failed to add image, but product created successfully:', imageError);
      }
    }

    // Return the real product data we already fetched
    console.log('Final product with variants:', JSON.stringify(realProduct, null, 2));

    return NextResponse.json({
      success: true,
      product: realProduct,
      message: 'Product created successfully'
    });

  } catch (error) {
    console.error('Error creating product:', error);
    console.error('Full error details:', JSON.stringify(error, null, 2));
    return NextResponse.json(
      { error: 'Failed to create product', details: error },
      { status: 500 }
    );
  }
}

// Update a product
export async function PUT(request: NextRequest) {
  try {
    const { id, title, description, price, status } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const mutation = `
      mutation productUpdate($input: ProductInput!) {
        productUpdate(input: $input) {
          product {
            id
            title
            description
            status
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const updateData: any = { id: `gid://shopify/Product/${id}` };
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (status) updateData.status = status;

    // If price is provided, we need to update variants
    if (price) {
      // First get the product to find its variants
      const getVariantsQuery = `
        query getProduct($id: ID!) {
          product(id: $id) {
            variants(first: 50) {
              edges {
                node {
                  id
                }
              }
            }
          }
        }
      `;

      const variantsResponse = await shopifyAdmin.request(getVariantsQuery, {
        variables: { id: `gid://shopify/Product/${id}` }
      });

      updateData.variants = variantsResponse.data.product.variants.edges.map((edge: any) => ({
        id: edge.node.id,
        price: price
      }));
    }

    const response = await shopifyAdmin.request(mutation, {
      variables: { input: updateData }
    });

    if (response.data.productUpdate.userErrors.length > 0) {
      return NextResponse.json(
        { error: 'Shopify validation errors', details: response.data.productUpdate.userErrors },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      product: response.data.productUpdate.product,
      message: 'Product updated successfully'
    });

  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

// Delete a product
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('id');

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const mutation = `
      mutation productDelete($input: ProductDeleteInput!) {
        productDelete(input: $input) {
          deletedProductId
          userErrors {
            field
            message
          }
        }
      }
    `;

    const response = await shopifyAdmin.request(mutation, {
      variables: { 
        input: { 
          id: `gid://shopify/Product/${productId}` 
        } 
      }
    });

    if (response.data.productDelete.userErrors.length > 0) {
      return NextResponse.json(
        { error: 'Shopify validation errors', details: response.data.productDelete.userErrors },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      deletedProductId: response.data.productDelete.deletedProductId,
      message: 'Product deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
} 