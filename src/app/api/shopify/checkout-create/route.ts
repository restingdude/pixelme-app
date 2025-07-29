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

    console.log('🛒 Creating bypass checkout URL for cart:', cartId);

    // Get the cart data 
    const cartQuery = `
      query getCart($id: ID!) {
        cart(id: $id) {
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
      linesCount: cart.lines.edges.length
    });

    // Check if cart has items
    if (!cart.lines.edges.length) {
      return NextResponse.json(
        { error: 'Cart is empty' },
        { status: 400 }
      );
    }

    // Cart items for logging (used later in permalink format)

    const storeDomain = `https://${process.env.SHOPIFY_STORE_DOMAIN}`;
    
    // Use cart permalink method instead of cart/add to avoid adding to existing cart
    const firstItem = cart.lines.edges[0]?.node;
    const firstVariantId = firstItem?.merchandise.id.replace('gid://shopify/ProductVariant/', '');
    
    // Build cart permalink URL - this shows ONLY the specified items (doesn't add to existing cart)
    const cartItems = cart.lines.edges.map((edge: any) => {
      const item = edge.node;
      const variantId = item.merchandise.id.replace('gid://shopify/ProductVariant/', '');
      return `${variantId}:${item.quantity}`;
    }).join(',');
    
    // Cart permalink format - bypasses existing cart completely
    const bypassCheckoutUrl = `${storeDomain}/cart/${cartItems}`;
    
    console.log('✅ Generated cart permalink URL (shows only specified items):', bypassCheckoutUrl);
    console.log('📋 Cart items in URL:', cartItems);
    
    // Log custom attributes for debugging (these will be preserved via cart API, not URL)
    const attributes = firstItem?.attributes || [];
    if (attributes.length > 0) {
      console.log('🎨 Custom attributes preserved in cart (not in URL):', attributes.length, 'attributes');
      console.log('📝 Note: Custom attributes preserved via Shopify cart, not permalink URL');
    }
    
    // Log all items for multi-item carts
    if (cart.lines.edges.length > 1) {
      console.log('⚠️ Multi-item cart detected. Additional items may need to be added separately.');
      console.log('📋 All cart items:', cart.lines.edges.map((edge: any) => ({
        variantId: edge.node.merchandise.id.replace('gid://shopify/ProductVariant/', ''),
        quantity: edge.node.quantity,
        title: edge.node.merchandise.title
      })));
    }

    // Count custom items for reporting
    const customItems = cart.lines.edges.filter((edge: any) => 
      edge.node.attributes.some((attr: any) => attr.key === 'custom_design_url')
    );

    if (customItems.length > 0) {
      console.log('🎨 Custom PixelMe data preserved in checkout:');
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

    return NextResponse.json({
      success: true,
      checkout: {
        id: cart.id,
        webUrl: bypassCheckoutUrl,
        totalPrice: cart.cost.totalAmount,
        subtotalPrice: cart.cost.subtotalAmount,
        lineItemsCount: cart.lines.edges.length,
        customItemsCount: customItems.length
      },
      message: 'Bypass checkout URL created successfully (avoids infinite loops)'
    });

  } catch (error) {
    console.error('❌ Error creating bypass checkout:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
} 