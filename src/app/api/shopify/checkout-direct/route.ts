import { NextRequest, NextResponse } from 'next/server';
import { shopifyStorefront } from '../../../../lib/shopify';

// Direct checkout that works with headless Shopify stores
export async function POST(request: NextRequest) {
  try {
    const { cartId } = await request.json();

    if (!cartId) {
      return NextResponse.json(
        { error: 'Cart ID is required' },
        { status: 400 }
      );
    }

    console.log('🚀 Creating direct checkout for cart:', cartId);

    // Get the cart URL directly from Shopify
    const cartQuery = `
      query getCartForDirectCheckout($cartId: ID!) {
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

    const response = await shopifyStorefront.request(cartQuery, {
      variables: { cartId }
    });

    console.log('📋 Cart data for direct checkout:', JSON.stringify(response.data, null, 2));

    if (!response.data?.cart) {
      return NextResponse.json(
        { error: 'Cart not found' },
        { status: 404 }
      );
    }

    const cart = response.data.cart;

    // Validate cart
    if (!cart.lines?.edges?.length) {
      return NextResponse.json(
        { error: 'Cart is empty' },
        { status: 400 }
      );
    }

    // Check if all items are available
    const unavailableItems = cart.lines.edges.filter(({ node }: any) => 
      !node.merchandise.availableForSale
    );

    if (unavailableItems.length > 0) {
      const unavailableNames = unavailableItems.map(({ node }: any) => node.merchandise.title).join(', ');
      return NextResponse.json(
        { error: `Some items are not available: ${unavailableNames}` },
        { status: 400 }
      );
    }

    // Use the cart URL but modify it to work properly
    let checkoutUrl = cart.checkoutUrl;
    
    if (!checkoutUrl) {
      return NextResponse.json(
        { error: 'No checkout URL available from Shopify' },
        { status: 400 }
      );
    }

    // Since we're in a headless setup, let's use the actual cart URL
    // and handle the checkout on the Shopify side
    console.log('📋 Using direct cart URL:', checkoutUrl);

    return NextResponse.json({
      success: true,
      checkout: {
        webUrl: checkoutUrl,
        id: cart.id,
        totalAmount: cart.cost?.totalAmount,
        subtotalAmount: cart.cost?.subtotalAmount,
        totalQuantity: cart.totalQuantity,
        method: 'direct_cart_url'
      },
      message: 'Direct cart checkout URL ready',
      note: 'Using existing cart URL - if this gives 404, your Shopify store needs proper checkout configuration'
    });

  } catch (error) {
    console.error('❌ Direct checkout error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create checkout', details: errorMessage },
      { status: 500 }
    );
  }
} 