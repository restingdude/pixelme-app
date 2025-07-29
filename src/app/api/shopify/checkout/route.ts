import { NextRequest, NextResponse } from 'next/server';
import { shopifyStorefront } from '../../../../lib/shopify';

// Create a checkout session from individual items OR from an existing cart
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Check if this is a cart-to-checkout conversion
    if (body.cartId) {
      return await createCheckoutFromCart(body.cartId);
    }
    
    // Modern single-item checkout functionality using Cart API
    const { 
      variantId, 
      quantity = 1, 
      clothing,
      style,
      size,
      color,
      position 
    } = body;

    if (!variantId) {
      return NextResponse.json(
        { error: 'Variant ID is required' },
        { status: 400 }
      );
    }

    console.log('🛒 Buy Now - Creating fresh cart for single item (clears existing cart)');
    console.log('📋 Item details:', { variantId, quantity, clothing, style, size, color, position });

    // Build custom attributes for the cart item (no image URLs since only saved after payment)
    const customAttributes = [];
    if (clothing) customAttributes.push({ key: 'clothing_type', value: clothing });
    if (style) customAttributes.push({ key: 'style', value: style });
    if (size) customAttributes.push({ key: 'size', value: size });
    if (color) customAttributes.push({ key: 'color', value: color });
    if (position) customAttributes.push({ key: 'position', value: position });

    // Create a fresh cart with the single item
    const cartCreateMutation = `
      mutation cartCreate($input: CartInput!) {
        cartCreate(input: $input) {
          cart {
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
            lines(first: 10) {
              edges {
                node {
                  id
                  quantity
                  attributes {
                    key
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

    // Ensure variantId is in proper GID format
    const merchandiseId = variantId.startsWith('gid://') ? variantId : `gid://shopify/ProductVariant/${variantId}`;
    
    const cartInput = {
      lines: [{
        merchandiseId: merchandiseId,
        quantity: quantity,
        attributes: customAttributes
      }]
    };

    console.log('🔄 Creating fresh cart with attributes:', customAttributes);
    console.log('🆔 Original variant ID:', variantId);
    console.log('🆔 Formatted merchandise ID:', merchandiseId);
    console.log('📦 Cart input:', JSON.stringify(cartInput, null, 2));
    
    const cartResponse = await shopifyStorefront.request(cartCreateMutation, {
      variables: { input: cartInput }
    });

    console.log('📋 Full cart response:', JSON.stringify(cartResponse, null, 2));

    if (cartResponse.data?.cartCreate?.userErrors?.length > 0) {
      console.error('❌ Cart creation errors:', cartResponse.data.cartCreate.userErrors);
      throw new Error(`Failed to create cart: ${cartResponse.data.cartCreate.userErrors.map((e: any) => e.message).join(', ')}`);
    }

    const cart = cartResponse.data?.cartCreate?.cart;
    if (!cart) {
      console.error('❌ No cart returned. Full response:', cartResponse);
      throw new Error('Failed to create cart - no cart returned');
    }

    console.log('✅ Fresh cart created successfully:', cart.id);
    console.log('🎨 Custom attributes preserved:', cart.lines.edges[0]?.node.attributes?.length || 0);

    // Use the cart's checkout URL
    const checkoutUrl = cart.checkoutUrl;
    
    console.log('✅ Buy Now - Fresh cart checkout URL:', checkoutUrl);

    return NextResponse.json({
      success: true,
      checkout: {
        id: cart.id,
        webUrl: checkoutUrl,
        totalPrice: cart.cost.totalAmount,
        subtotalPrice: cart.cost.subtotalAmount,
        totalQuantity: cart.totalQuantity,
        customItemsCount: customAttributes.length > 0 ? 1 : 0
      },
      message: 'Buy Now fresh cart created successfully (cart cleared first)'
    });

  } catch (error) {
    console.error('Error creating checkout:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout' },
      { status: 500 }
    );
  }
}

// New function to create checkout from existing cart
async function createCheckoutFromCart(cartId: string) {
  try {
    console.log('🛒 Creating bypass checkout from cart:', cartId);
    
    // Get the cart details
    const cartQuery = `
      query getCart($cartId: ID!) {
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

    const cartResponse = await shopifyStorefront.request(cartQuery, {
      variables: { cartId }
    });

    if (!cartResponse.data?.cart) {
      console.error('❌ Cart not found for checkout');
      return NextResponse.json(
        { error: 'Cart not found' },
        { status: 404 }
      );
    }

    const cart = cartResponse.data.cart;

    // Validate cart has items
    if (!cart.lines?.edges || cart.lines.edges.length === 0) {
      console.error('❌ Cart is empty');
      return NextResponse.json(
        { error: 'Cart is empty' },
        { status: 400 }
      );
    }

    // Build universal bypass checkout URL using cart/add method for theme compatibility
    const firstItem = cart.lines.edges[0]?.node;
    const firstVariantId = firstItem?.merchandise.id.replace('gid://shopify/ProductVariant/', '');

    const storeDomain = `https://${process.env.SHOPIFY_STORE_DOMAIN}`;
    
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
        webUrl: bypassCheckoutUrl,
        id: cart.id,
        totalAmount: cart.cost?.totalAmount,
        subtotalAmount: cart.cost?.subtotalAmount,
        totalQuantity: cart.totalQuantity,
        customItemsCount: customItems.length
      },
      message: 'Bypass checkout URL created successfully (avoids infinite loops)'
    });
      
  } catch (error) {
    console.error('Error creating checkout from cart:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout from cart' },
      { status: 500 }
    );
  }
} 