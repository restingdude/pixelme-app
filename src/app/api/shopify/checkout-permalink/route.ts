import { NextRequest, NextResponse } from 'next/server';

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_STOREFRONT_ACCESS_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
  console.error('❌ Missing Shopify environment variables');
}

export async function POST(request: NextRequest) {
  try {
    const { cartId } = await request.json();
    
    if (!cartId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Cart ID is required' 
      }, { status: 400 });
    }

    console.log('🚀 Creating permalink checkout for cart:', cartId);

    // Get cart data to build permalink URL
    const cartQuery = `
      query getCart($cartId: ID!) {
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
                    product {
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

    const cartResponse = await fetch(`https://${SHOPIFY_STORE_DOMAIN}/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_ACCESS_TOKEN!,
      },
      body: JSON.stringify({
        query: cartQuery,
        variables: { cartId }
      }),
    });

    const cartData = await cartResponse.json();
    console.log('🔍 Cart data for permalink:', JSON.stringify(cartData, null, 2));

    if (cartData.errors) {
      throw new Error(`Cart query failed: ${cartData.errors[0].message}`);
    }

    const cart = cartData.data.cart;
    if (!cart) {
      throw new Error('Cart not found');
    }

    // Build permalink cart URL - this format works with most themes
    const cartLines = cart.lines.edges;
    if (cartLines.length === 0) {
      throw new Error('Cart is empty');
    }

    // Extract variant ID (remove the GraphQL prefix)
    const variantId = cartLines[0].node.merchandise.id.replace('gid://shopify/ProductVariant/', '');
    const quantity = cartLines[0].node.quantity;

    // Create permalink URL that should work with any theme
    const permalinkUrl = `https://${SHOPIFY_STORE_DOMAIN}/cart/${variantId}:${quantity}`;
    
    console.log('📋 Using permalink URL:', permalinkUrl);

    return NextResponse.json({
      success: true,
      checkout: {
        webUrl: permalinkUrl
      },
      method: 'permalink'
    });

  } catch (error) {
    console.error('❌ Permalink checkout error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
} 