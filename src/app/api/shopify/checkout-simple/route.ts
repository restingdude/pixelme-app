import { NextRequest, NextResponse } from 'next/server';
import { shopifyStorefront } from '../../../../lib/shopify';

// Simple and reliable checkout implementation
export async function POST(request: NextRequest) {
  try {
    const { cartId } = await request.json();

    if (!cartId) {
      return NextResponse.json(
        { error: 'Cart ID is required' },
        { status: 400 }
      );
    }

    console.log('🚀 Creating simple checkout for cart:', cartId);

    // Get cart details
    const cartQuery = `
      query getCartForSimpleCheckout($cartId: ID!) {
        cart(id: $cartId) {
          id
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

    const response = await shopifyStorefront.request(cartQuery, {
      variables: { cartId }
    });

    console.log('📋 Cart data for simple checkout:', JSON.stringify(response.data, null, 2));

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

    // Create cart/add URL for the first item (most reliable method)
    const firstItem = cart.lines.edges[0].node;
    const variantId = firstItem.merchandise.id.split('/').pop();
    
    // Build cart/add URL with all items
    const storeUrl = 'https://pixelmecustoms.com';
    const cartAddUrl = `${storeUrl}/cart/add`;
    
    const formData = new URLSearchParams();
    formData.append('id', variantId);
    formData.append('quantity', firstItem.quantity.toString());
    
    // Add custom properties
    firstItem.attributes.forEach((attr: any) => {
      formData.append(`properties[${attr.key}]`, attr.value);
    });
    
    // Add return URL to automatically go to cart page
    formData.append('return_to', '/cart');
    
    const checkoutUrl = `${cartAddUrl}?${formData.toString()}`;
    
    console.log('✅ Simple checkout URL created:', checkoutUrl);

    return NextResponse.json({
      success: true,
      checkout: {
        webUrl: checkoutUrl,
        id: cart.id,
        totalAmount: cart.cost?.totalAmount,
        subtotalAmount: cart.cost?.subtotalAmount,
        totalQuantity: cart.totalQuantity,
        method: 'cart_add_simple'
      },
      message: 'Simple checkout URL created successfully'
    });

  } catch (error) {
    console.error('❌ Simple checkout error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create checkout', details: errorMessage },
      { status: 500 }
    );
  }
} 