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

    console.log('🌐 Creating Web Checkout session for headless setup:', cartId);

    if (!process.env.SHOPIFY_STORE_DOMAIN || !process.env.SHOPIFY_ADMIN_ACCESS_TOKEN) {
      throw new Error('Missing required Shopify environment variables');
    }

    // Use Storefront API to get cart data (has cart field)
    const cartQuery = `
      query getCart($cartId: ID!) {
        cart(id: $cartId) {
          id
          lines(first: 250) {
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
          cost {
            totalAmount {
              amount
              currencyCode
            }
          }
        }
      }
    `;

    const cartResponse = await shopifyStorefront.request(cartQuery, {
      variables: { cartId }
    });

    console.log('📦 Cart data for web checkout:', JSON.stringify(cartResponse.data, null, 2));

    if (!cartResponse.data?.cart?.lines?.edges?.length) {
      throw new Error('Cart is empty or not found');
    }

    const cart = cartResponse.data.cart;

    // Convert cart lines to checkout line items for Admin API
    const lineItems = cart.lines.edges.map((edge: any) => ({
      variant_id: parseInt(edge.node.merchandise.id.replace('gid://shopify/ProductVariant/', '')),
      quantity: edge.node.quantity,
      properties: edge.node.attributes?.reduce((acc: any, attr: any) => {
        acc[attr.key] = attr.value;
        return acc;
      }, {}) || {}
    }));

    console.log('🔄 Converting to checkout line items:', lineItems);

    // Create checkout using Admin API
    const checkoutResponse = await fetch(`https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2023-10/checkouts.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        checkout: {
          line_items: lineItems
        }
      })
    });

    const checkoutData = await checkoutResponse.json();
    console.log('✅ Web checkout response:', JSON.stringify(checkoutData, null, 2));

    if (!checkoutResponse.ok || !checkoutData.checkout) {
      throw new Error(`Checkout creation failed: ${JSON.stringify(checkoutData)}`);
    }

    const checkout = checkoutData.checkout;

    return NextResponse.json({
      success: true,
      checkout: {
        id: checkout.id,
        webUrl: checkout.web_url, // This is the proper web checkout URL
        token: checkout.token,
        totalPrice: checkout.total_price,
        customAttributes: lineItems.flatMap((item: any) => 
          Object.entries(item.properties || {}).map(([key, value]) => ({ key, value }))
        )
      },
      method: 'admin-api-web-checkout'
    });

  } catch (error) {
    console.error('❌ Web checkout error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
} 