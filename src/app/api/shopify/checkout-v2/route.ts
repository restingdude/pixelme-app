import { NextRequest, NextResponse } from 'next/server';
import { shopifyStorefront } from '../../../../lib/shopify';

// Modern Shopify checkout implementation for production
export async function POST(request: NextRequest) {
  try {
    const { cartId } = await request.json();

    if (!cartId) {
      return NextResponse.json(
        { error: 'Cart ID is required' },
        { status: 400 }
      );
    }

    console.log('🚀 Creating modern checkout for cart:', cartId);

    // Method 1: Try Shopify's Cart-based checkout (recommended)
    const checkoutResult = await createModernCheckout(cartId);
    
    if (checkoutResult.success) {
      return NextResponse.json(checkoutResult);
    }

    // Method 2: Fallback to embedded checkout
    const embeddedResult = await createEmbeddedCheckout(cartId);
    
    if (embeddedResult.success) {
      return NextResponse.json(embeddedResult);
    }

    // Method 3: Last fallback - direct Shopify store checkout
    const directResult = await createDirectCheckout(cartId);
    
    return NextResponse.json(directResult);

  } catch (error) {
    console.error('❌ Modern checkout error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create checkout', details: errorMessage },
      { status: 500 }
    );
  }
}

// Method 1: Modern Cart-based checkout
async function createModernCheckout(cartId: string) {
  try {
    // Get cart with checkout URL
    const query = `
      query getCartCheckout($cartId: ID!) {
        cart(id: $cartId) {
          id
          checkoutUrl
          totalQuantity
          cost {
            totalAmount {
              amount
              currencyCode
            }
            subtotalAmount {
              amount
              currencyCode
            }
          }
          lines(first: 100) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    price {
                      amount
                      currencyCode
                    }
                    availableForSale
                    product {
                      id
                      title
                      handle
                    }
                  }
                }
                attributes {
                  key
                  value
                }
              }
            }
          }
        }
      }
    `;

    const response = await shopifyStorefront.request(query, {
      variables: { cartId }
    });

    console.log('📋 Cart checkout response:', JSON.stringify(response.data, null, 2));

    if (!response.data?.cart) {
      throw new Error('Cart not found');
    }

    const cart = response.data.cart;

    // Validate cart
    if (!cart.lines?.edges?.length) {
      throw new Error('Cart is empty');
    }

    // Check if all items are available
    const unavailableItems = cart.lines.edges.filter(({ node }: any) => 
      !node.merchandise.availableForSale
    );

    if (unavailableItems.length > 0) {
      throw new Error(`Some items are not available: ${unavailableItems.map(({ node }: any) => node.merchandise.title).join(', ')}`);
    }

    // Use Shopify's provided checkout URL
    let checkoutUrl = cart.checkoutUrl;
    
    if (!checkoutUrl) {
      throw new Error('No checkout URL provided by Shopify');
    }

    // Modern approach: Convert cart URL to proper checkout
    if (checkoutUrl.includes('/cart/c/')) {
      // Extract cart token from URL
      const cartToken = checkoutUrl.split('/cart/c/')[1]?.split('?')[0];
      
      if (cartToken) {
        // Create proper Shopify checkout URL
        const domain = new URL(checkoutUrl).origin;
        checkoutUrl = `${domain}/checkouts/c/${cartToken}`;
        
        console.log('🔄 Converted to modern checkout URL:', checkoutUrl);
      }
    }

    return {
      success: true,
      checkout: {
        webUrl: checkoutUrl,
        id: cart.id,
        totalAmount: cart.cost?.totalAmount,
        subtotalAmount: cart.cost?.subtotalAmount,
        totalQuantity: cart.totalQuantity,
        method: 'modern_cart_checkout'
      },
      message: 'Modern cart checkout created successfully'
    };

  } catch (error) {
    console.error('❌ Modern checkout failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

// Method 2: Embedded checkout using Web Checkout API
async function createEmbeddedCheckout(cartId: string) {
  try {
    // Get cart items for checkout creation
    const cartQuery = `
      query getCartForEmbedded($cartId: ID!) {
        cart(id: $cartId) {
          id
          lines(first: 100) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                  }
                }
                attributes {
                  key
                  value
                }
              }
            }
          }
        }
      }
    `;

    const cartResponse = await shopifyStorefront.request(cartQuery, {
      variables: { cartId }
    });

    if (!cartResponse.data?.cart) {
      throw new Error('Cart not found for embedded checkout');
    }

    const cart = cartResponse.data.cart;

    // Convert cart to line items
    const lineItems = cart.lines.edges.map(({ node }: any) => ({
      variantId: node.merchandise.id,
      quantity: node.quantity,
      customAttributes: node.attributes
    }));

    // Create checkout using newer mutation
    const checkoutMutation = `
      mutation checkoutCreate($input: CheckoutCreateInput!) {
        checkoutCreate(input: $input) {
          checkout {
            id
            webUrl
            ready
            totalPrice {
              amount
              currencyCode
            }
            lineItems(first: 10) {
              edges {
                node {
                  title
                  quantity
                }
              }
            }
          }
          checkoutUserErrors {
            field
            message
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const checkoutResponse = await shopifyStorefront.request(checkoutMutation, {
      variables: {
        input: {
          lineItems,
          allowPartialAddresses: true
        }
      }
    });

    console.log('🔗 Embedded checkout response:', JSON.stringify(checkoutResponse.data, null, 2));

    if (checkoutResponse.data.checkoutCreate.checkoutUserErrors?.length > 0) {
      throw new Error(`Checkout errors: ${checkoutResponse.data.checkoutCreate.checkoutUserErrors.map((e: any) => e.message).join(', ')}`);
    }

    const checkout = checkoutResponse.data.checkoutCreate.checkout;

    if (!checkout?.webUrl) {
      throw new Error('No checkout URL returned from embedded checkout');
    }

    return {
      success: true,
      checkout: {
        webUrl: checkout.webUrl,
        id: checkout.id,
        totalAmount: checkout.totalPrice,
        method: 'embedded_checkout'
      },
      message: 'Embedded checkout created successfully'
    };

  } catch (error) {
    console.error('❌ Embedded checkout failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

// Method 3: Direct store checkout (last resort)
async function createDirectCheckout(cartId: string) {
  try {
    // Get cart details
    const cartQuery = `
      query getCartForDirect($cartId: ID!) {
        cart(id: $cartId) {
          id
          lines(first: 100) {
            edges {
              node {
                merchandise {
                  ... on ProductVariant {
                    id
                    product {
                      handle
                    }
                  }
                }
                quantity
                attributes {
                  key
                  value
                }
              }
            }
          }
        }
      }
    `;

    const response = await shopifyStorefront.request(cartQuery, {
      variables: { cartId }
    });

    if (!response.data?.cart) {
      throw new Error('Cart not found for direct checkout');
    }

    const cart = response.data.cart;
    
    // Build direct product URLs for Shopify store
    const storeUrl = 'https://pixelmecustoms.com';
    const firstItem = cart.lines.edges[0]?.node;
    
    if (firstItem) {
      const variantId = firstItem.merchandise.id.split('/').pop();
      const productHandle = firstItem.merchandise.product.handle;
      
      // Create Add to Cart URL that will work with Shopify's store
      const addToCartUrl = `${storeUrl}/products/${productHandle}?variant=${variantId}`;
      
      console.log('🛍️ Direct store URL:', addToCartUrl);
      
      return {
        success: true,
        checkout: {
          webUrl: addToCartUrl,
          id: cart.id,
          method: 'direct_store_checkout'
        },
        message: 'Direct store checkout URL created'
      };
    }

    throw new Error('No items found for direct checkout');

  } catch (error) {
    console.error('❌ Direct checkout failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage,
      checkout: {
        webUrl: 'https://pixelmecustoms.com',
        method: 'store_fallback'
      },
      message: 'Fallback to store homepage'
    };
  }
} 