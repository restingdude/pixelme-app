import { NextRequest, NextResponse } from 'next/server';
import { shopifyStorefront } from '../../../../lib/shopify';

// Alternative checkout that bypasses cart URLs entirely
export async function POST(request: NextRequest) {
  try {
    const { cartId } = await request.json();

    if (!cartId) {
      return NextResponse.json(
        { error: 'Cart ID is required' },
        { status: 400 }
      );
    }

    console.log('🚀 Bypass checkout - Getting cart data to create fresh checkout');

    // First, get cart data
    const cartQuery = `
      query getCart($id: ID!) {
        cart(id: $id) {
          id
          totalQuantity
          lines(first: 50) {
            edges {
              node {
                id
                quantity
                attributes {
                  key
                  value
                }
                merchandise {
                  ... on ProductVariant {
                    id
                  }
                }
              }
            }
          }
        }
      }
    `;

    const cartResponse = await shopifyStorefront.request(cartQuery, {
      variables: { id: cartId }
    });

    if (!cartResponse.data?.cart) {
      return NextResponse.json(
        { error: 'Cart not found' },
        { status: 404 }
      );
    }

    const cart = cartResponse.data.cart;

    // Create direct /cart/add URL (bypasses cart/c/ URLs entirely)
    const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
    
    if (cart.lines.edges.length > 0) {
      const firstItem = cart.lines.edges[0].node;
      const variantId = firstItem.merchandise.id.replace('gid://shopify/ProductVariant/', '');
      const quantity = firstItem.quantity || 1;
      
      // Build cart/add URL with all attributes
      const attributes = firstItem.attributes || [];
      const attrParams = attributes.map((attr: any) => 
        `attributes[${encodeURIComponent(attr.key)}]=${encodeURIComponent(attr.value)}`
      ).join('&');
      
      const directUrl = `https://${storeDomain}/cart/add?id=${variantId}&quantity=${quantity}&${attrParams}&return_to=/cart`;
      
      console.log('✅ Bypass checkout - Direct cart/add URL:', directUrl);
      
      return NextResponse.json({
        success: true,
        checkout: {
          webUrl: directUrl,
          method: 'cart_add_direct',
          preservedAttributes: attributes.length
        },
        message: 'Direct cart/add URL (bypasses cart/c/ entirely)'
      });
    }

    // Fallback to cart page
    const fallbackUrl = `https://${storeDomain}/cart`;
    
    return NextResponse.json({
      success: true,
      checkout: { webUrl: fallbackUrl },
      message: 'Cart page fallback'
    });

  } catch (error) {
    console.error('❌ Bypass checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create bypass checkout' },
      { status: 500 }
    );
  }
} 