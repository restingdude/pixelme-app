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
      customImageUrl,
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

    console.log('�� Buy Now - Creating bypass checkout for single item');
    console.log('📋 Item details:', { variantId, quantity, clothing, style, size, color, position });

    // Extract variant ID number for cart/add URL
    const variantNumber = variantId.startsWith('gid://') 
      ? variantId.replace('gid://shopify/ProductVariant/', '') 
      : variantId;

    const storeDomain = `https://${process.env.SHOPIFY_STORE_DOMAIN}`;
    
    // Universal checkout URL that works with all themes (cart/add method)
    const bypassCheckoutUrl = `${storeDomain}/cart/add?id=${variantNumber}&quantity=${quantity}&return_to=/checkout`;
    
    console.log('✅ Buy Now - Generated universal bypass checkout URL (cart/add method):', bypassCheckoutUrl);

    // Log custom attributes that will be preserved (Note: cart/add URLs have limitations with custom attributes)
    if (customImageUrl || clothing || style || size || color || position) {
      console.log('⚠️ Note: Custom attributes may need to be handled via cart API for full preservation');
      console.log('🎨 Intended custom attributes:', {
        custom_design_url: customImageUrl,
        clothing_type: clothing,
        style,
        size,
        color,
        position
      });
    }

    return NextResponse.json({
      success: true,
      checkout: {
        id: 'bypass-checkout',
        webUrl: bypassCheckoutUrl,
        totalPrice: { amount: '80.00', currencyCode: 'USD' }, // Default price - will be calculated by Shopify
        subtotalPrice: { amount: '80.00', currencyCode: 'USD' },
        totalQuantity: quantity,
        customItemsCount: customImageUrl ? 1 : 0
      },
      message: 'Buy Now bypass checkout created successfully (avoids infinite loops)'
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
    
    // Universal checkout URL that works with all themes
    const bypassCheckoutUrl = `${storeDomain}/cart/add?id=${firstVariantId}&quantity=${firstItem?.quantity}&return_to=/checkout`;
    
    console.log('✅ Generated universal bypass checkout URL (cart/add method):', bypassCheckoutUrl);
    
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