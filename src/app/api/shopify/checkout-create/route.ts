import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { cartId } = await request.json();

    if (!cartId) {
      return NextResponse.json(
        { error: 'Cart ID is required' },
        { status: 400 }
      );
    }

    console.log('🛒 Getting Shopify checkout URL for cart:', cartId);

    // Get the cart data including the checkout URL
    const cartQuery = `
      query getCart($id: ID!) {
        cart(id: $id) {
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
          lines(first: 50) {
            edges {
              node {
                id
                quantity
                cost {
                  totalAmount {
                    amount
                    currencyCode
                  }
                }
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    price {
                      amount
                      currencyCode
                    }
                    product {
                      id
                      title
                      handle
                    }
                    selectedOptions {
                      name
                      value
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

    const cartResponse = await fetch(
      `https://${process.env.SHOPIFY_STORE_DOMAIN}/api/2023-10/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN!,
        },
        body: JSON.stringify({
          query: cartQuery,
          variables: { id: cartId }
        }),
      }
    );

    const cartData = await cartResponse.json();
    
    if (!cartData.data?.cart) {
      return NextResponse.json(
        { error: 'Cart not found' },
        { status: 404 }
      );
    }

    const cart = cartData.data.cart;
    console.log('📦 Cart data retrieved:', {
      totalQuantity: cart.totalQuantity,
      linesCount: cart.lines.edges.length,
      originalCheckoutUrl: cart.checkoutUrl
    });

    // Convert the checkout URL from custom domain to Shopify domain
    // From: https://pixelmecustoms.com/cart/c/CART_ID?key=KEY
    // To:   https://aeufcr-ch.myshopify.com/cart/c/CART_ID?key=KEY
    let shopifyCheckoutUrl = cart.checkoutUrl;
    
    // Extract the store domain from environment
    const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
    
    // Replace the custom domain with Shopify domain
    if (shopifyCheckoutUrl.includes('pixelmecustoms.com')) {
      shopifyCheckoutUrl = shopifyCheckoutUrl.replace('pixelmecustoms.com', storeDomain);
      console.log('🔄 Converted checkout URL:', shopifyCheckoutUrl);
    } else {
      console.log('✅ Using original checkout URL:', shopifyCheckoutUrl);
    }

    // Count custom items for reporting
    const customItems = cart.lines.edges.filter((edge: any) => 
      edge.node.attributes.some((attr: any) => attr.key === 'custom_design_url')
    );

    if (customItems.length > 0) {
      console.log('🎨 Custom PixelMe data in cart:');
      customItems.forEach((edge: any, index: number) => {
        const item = edge.node;
        console.log(`  Item ${index + 1}:`, item.merchandise.title);
        
        const customAttrs = item.attributes.reduce((acc: any, attr: any) => {
          acc[attr.key] = attr.value;
          return acc;
        }, {});
        
        console.log('  Custom Attributes:', customAttrs);
      });
    }

    console.log('✅ Checkout URL ready:', shopifyCheckoutUrl);

    return NextResponse.json({
      success: true,
      checkout: {
        id: cart.id,
        webUrl: shopifyCheckoutUrl,
        totalPrice: cart.cost.totalAmount,
        subtotalPrice: cart.cost.subtotalAmount,
        lineItemsCount: cart.lines.edges.length,
        customItemsCount: customItems.length
      },
      message: 'Shopify checkout URL prepared successfully'
    });

  } catch (error) {
    console.error('❌ Error getting checkout URL:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
} 