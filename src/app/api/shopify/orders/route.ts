import { NextRequest, NextResponse } from 'next/server';
import { shopifyAdmin } from '../../../../lib/shopify';

// Get orders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('id');
    const limit = searchParams.get('limit') || '50';

    if (orderId) {
      // Get single order
      const query = `
        query getOrder($id: ID!) {
          order(id: $id) {
            id
            name
            email
            phone
            createdAt
            updatedAt
            financialStatus
            fulfillmentStatus
            totalPrice
            subtotalPrice
            totalTax
            currencyCode
            customer {
              id
              firstName
              lastName
              email
            }
            lineItems(first: 50) {
              edges {
                node {
                  id
                  title
                  quantity
                  variant {
                    id
                    title
                    price
                    sku
                  }
                  customAttributes {
                    key
                    value
                  }
                }
              }
            }
            note
            tags
          }
        }
      `;

      const response = await shopifyAdmin.request(query, {
        variables: { id: `gid://shopify/Order/${orderId}` }
      });

      return NextResponse.json({ success: true, order: response.data.order });
    } else {
      // Get multiple orders
      const query = `
        query getOrders($first: Int!) {
          orders(first: $first) {
            edges {
              node {
                id
                name
                email
                createdAt
                financialStatus
                fulfillmentStatus
                totalPrice
                currencyCode
                customer {
                  id
                  firstName
                  lastName
                  email
                }
                lineItems(first: 10) {
                  edges {
                    node {
                      id
                      title
                      quantity
                    }
                  }
                }
                tags
              }
            }
          }
        }
      `;

      const response = await shopifyAdmin.request(query, {
        variables: { first: parseInt(limit) }
      });

      return NextResponse.json({ 
        success: true, 
        orders: response.data.orders.edges.map((edge: any) => edge.node) 
      });
    }
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

// Create a new order
export async function POST(request: NextRequest) {
  try {
    const { 
      email, 
      lineItems, 
      customImageUrl,
      note = 'Custom PixelMe design order'
    } = await request.json();

    if (!lineItems || lineItems.length === 0) {
      return NextResponse.json(
        { error: 'Line items are required' },
        { status: 400 }
      );
    }

    // Add custom image URL as line item attributes
    const enhancedLineItems = lineItems.map((item: any) => ({
      ...item,
      customAttributes: [
        ...(item.customAttributes || []),
        ...(customImageUrl ? [{ key: 'custom_design_url', value: customImageUrl }] : []),
        { key: 'created_via', value: 'PixelMe App' }
      ]
    }));

    const mutation = `
      mutation draftOrderCreate($input: DraftOrderInput!) {
        draftOrderCreate(input: $input) {
          draftOrder {
            id
            name
            email
            totalPrice
            lineItems(first: 20) {
              edges {
                node {
                  id
                  title
                  quantity
                  variant {
                    id
                    title
                    price
                  }
                  customAttributes {
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

    const orderInput = {
      lineItems: enhancedLineItems,
      email,
      note,
      tags: ['custom', 'pixelme']
    };

    const response = await shopifyAdmin.request(mutation, {
      variables: { input: orderInput }
    });

    if (response.data.draftOrderCreate.userErrors.length > 0) {
      return NextResponse.json(
        { error: 'Shopify validation errors', details: response.data.draftOrderCreate.userErrors },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      draftOrder: response.data.draftOrderCreate.draftOrder,
      message: 'Draft order created successfully'
    });

  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
} 