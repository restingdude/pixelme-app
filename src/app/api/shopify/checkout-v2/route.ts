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

    // Method 1: Try embedded checkout first (most reliable)
    const embeddedResult = await createEmbeddedCheckout(cartId);
    
    if (embeddedResult.success && embeddedResult.checkout) {
      console.log('✅ Embedded checkout successful:', embeddedResult.checkout.webUrl);
      return NextResponse.json(embeddedResult);
    }

    // Method 2: Try cart-based checkout
    const checkoutResult = await createModernCheckout(cartId);
    
    if (checkoutResult.success && checkoutResult.checkout) {
      console.log('✅ Cart checkout successful:', checkoutResult.checkout.webUrl);
      return NextResponse.json(checkoutResult);
    }

    // Method 3: Last fallback - direct Shopify store checkout
    console.log('⚠️ Using direct store fallback');
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

    // Check if cart URL is actually a working checkout URL
    console.log('📋 Original Shopify checkout URL:', checkoutUrl);
    
    // If it's a cart URL, it might not work for checkout - throw error to try other methods
    if (checkoutUrl.includes('/cart/c/')) {
      console.log('⚠️ Got cart URL instead of checkout URL - will try embedded checkout');
      throw new Error('Cart URL provided instead of checkout URL');
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

    console.log('🔗 Creating embedded checkout with line items:', lineItems);

    // Try using the newer cartBuyerIdentityUpdate + cartCheckoutUrl approach
    // First, try to get a direct checkout URL from the cart
    const cartCheckoutQuery = `
      query getCartCheckoutUrl($cartId: ID!) {
        cart(id: $cartId) {
          id
          checkoutUrl
          totalQuantity
        }
      }
    `;

    const cartCheckoutResponse = await shopifyStorefront.request(cartCheckoutQuery, {
      variables: { cartId }
    });

    console.log('🔗 Cart checkout URL response:', JSON.stringify(cartCheckoutResponse.data, null, 2));

    if (cartCheckoutResponse.data?.cart?.checkoutUrl && !cartCheckoutResponse.data.cart.checkoutUrl.includes('/cart/c/')) {
      // We got a proper checkout URL directly
      return {
        success: true,
        checkout: {
          webUrl: cartCheckoutResponse.data.cart.checkoutUrl,
          id: cartCheckoutResponse.data.cart.id,
          method: 'cart_checkout_url'
        },
        message: 'Direct cart checkout URL obtained'
      };
    }

    // Fall back to checkoutCreate if cart checkout URL is not available
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
          allowPartialAddresses: true,
          note: 'PixelMe Custom Design Order'
        }
      }
    });

    console.log('🔗 Raw GraphQL response:', JSON.stringify(checkoutResponse, null, 2));

    console.log('🔗 Embedded checkout response:', JSON.stringify(checkoutResponse.data, null, 2));

    if (!checkoutResponse.data || !checkoutResponse.data.checkoutCreate) {
      throw new Error('Invalid GraphQL response - checkoutCreate mutation failed');
    }

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
      
      // Create cart/add URL that automatically adds item and redirects to cart
      const cartAddUrl = `${storeUrl}/cart/add`;
      const formData = new URLSearchParams({
        id: variantId,
        quantity: firstItem.quantity.toString()
      });
      
      // Add custom attributes as properties
      firstItem.attributes.forEach((attr: any) => {
        formData.append(`properties[${attr.key}]`, attr.value);
      });
      
      const fullCartAddUrl = `${cartAddUrl}?${formData.toString()}&return_to=/cart`;
      
      console.log('🛍️ Cart add URL:', fullCartAddUrl);
      
      return {
        success: true,
        checkout: {
          webUrl: fullCartAddUrl,
          id: cart.id,
          method: 'cart_add_redirect'
        },
        message: 'Cart add redirect URL created'
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