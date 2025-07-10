import { NextRequest, NextResponse } from 'next/server';
import { shopifyStorefront } from '../../../../lib/shopify';

export async function POST(request: NextRequest) {
  try {
    const { cartId } = await request.json();
    
    if (!cartId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Cart ID is required' 
      }, { status: 400 });
    }

    console.log('🚀 Creating hosted checkout for headless setup:', cartId);

    // Get cart data with checkout URL
    const cartQuery = `
      query getCart($cartId: ID!) {
        cart(id: $cartId) {
          id
          checkoutUrl
          totalQuantity
          cost {
            totalAmount {
              amount
              currencyCode
            }
          }
          lines(first: 250) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
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

    console.log('📦 Cart response for checkout:', JSON.stringify(cartResponse.data, null, 2));

    if (!cartResponse.data?.cart) {
      throw new Error('Cart not found');
    }

    const cart = cartResponse.data.cart;

    if (!cart.lines?.edges?.length) {
      throw new Error('Cart is empty');
    }

    if (!cart.checkoutUrl) {
      throw new Error('No checkout URL available');
    }

    // Convert pixelmecustoms.com checkout URL to Shopify domain
    const originalCheckoutUrl = cart.checkoutUrl;
    
    if (!process.env.SHOPIFY_STORE_DOMAIN) {
      throw new Error('SHOPIFY_STORE_DOMAIN environment variable is not set');
    }
    
    const shopifyCheckoutUrl = originalCheckoutUrl.replace(
      'https://pixelmecustoms.com', 
      `https://${process.env.SHOPIFY_STORE_DOMAIN}`
    );

    console.log('🔄 Converting checkout URL:');
    console.log('  Original:', originalCheckoutUrl);
    console.log('  Shopify:', shopifyCheckoutUrl);

    // Verify all custom attributes are preserved
    const customAttributes = cart.lines.edges.flatMap((edge: any) => edge.node.attributes || []);
    console.log('✅ Custom attributes preserved:', customAttributes);

    return NextResponse.json({
      success: true,
      checkout: {
        id: cart.id,
        webUrl: shopifyCheckoutUrl, // This goes to your Shopify domain
        ready: true,
        totalPrice: cart.cost.totalAmount,
        customAttributes: customAttributes
      },
      method: 'cart-checkout-url-conversion'
    });

  } catch (error) {
    console.error('❌ Hosted checkout error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
} 