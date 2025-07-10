import { NextRequest, NextResponse } from 'next/server';
import { shopifyAdmin } from '../../../../lib/shopify';

// Sync order data after checkout completion
export async function POST(request: NextRequest) {
  try {
    const { orderId, orderNumber } = await request.json();
    
    if (!orderId && !orderNumber) {
      return NextResponse.json(
        { error: 'Order ID or order number is required' },
        { status: 400 }
      );
    }

    // Query order details from Shopify
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
          shippingAddress {
            firstName
            lastName
            address1
            address2
            city
            province
            country
            zip
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
                  product {
                    id
                    title
                    handle
                  }
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

    // Use either orderId or construct from orderNumber
    const shopifyOrderId = orderId || `gid://shopify/Order/${orderNumber}`;
    
    const response = await shopifyAdmin.request(query, {
      variables: { id: shopifyOrderId }
    });

    if (!response.data?.order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const order = response.data.order;
    
    // Extract custom PixelMe order data
    const customItems = order.lineItems.edges
      .map(({ node }: any) => node)
      .filter((item: any) => 
        item.customAttributes?.some((attr: any) => attr.key === 'custom_design_url')
      );

    // Process custom design items
    const processedCustomItems = customItems.map((item: any) => {
      const customAttributes = item.customAttributes || [];
      
      return {
        lineItemId: item.id,
        productTitle: item.title,
        quantity: item.quantity,
        variant: item.variant,
        customDesignUrl: customAttributes.find((attr: any) => attr.key === 'custom_design_url')?.value,
        style: customAttributes.find((attr: any) => attr.key === 'style')?.value,
        clothingType: customAttributes.find((attr: any) => attr.key === 'clothing_type')?.value,
        size: customAttributes.find((attr: any) => attr.key === 'size')?.value,
        position: customAttributes.find((attr: any) => attr.key === 'position')?.value,
      };
    });

    console.log('📦 Order synced:', order.name);
    console.log('🎨 Custom items:', processedCustomItems.length);
    
    // Here you could:
    // 1. Store order details in your database
    // 2. Trigger notifications to your fulfillment team
    // 3. Update customer records
    // 4. Generate production files for custom designs
    
    // For now, we'll return the processed data
    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        name: order.name,
        email: order.email,
        createdAt: order.createdAt,
        financialStatus: order.financialStatus,
        fulfillmentStatus: order.fulfillmentStatus,
        totalPrice: order.totalPrice,
        currencyCode: order.currencyCode,
        customer: order.customer,
        shippingAddress: order.shippingAddress,
      },
      customItems: processedCustomItems,
      summary: {
        totalItems: order.lineItems.edges.length,
        customItems: processedCustomItems.length,
        value: order.totalPrice
      }
    });

  } catch (error) {
    console.error('Error syncing order:', error);
    return NextResponse.json(
      { error: 'Failed to sync order data' },
      { status: 500 }
    );
  }
}

// Get order sync status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const orderNumber = searchParams.get('orderNumber');
    
    if (!orderId && !orderNumber) {
      return NextResponse.json(
        { error: 'Order ID or order number is required' },
        { status: 400 }
      );
    }

    // This could check your database for sync status
    // For now, we'll just return a simple status
    
    return NextResponse.json({
      success: true,
      synced: true,
      lastSyncAt: new Date().toISOString(),
      orderId: orderId || orderNumber
    });

  } catch (error) {
    console.error('Error checking sync status:', error);
    return NextResponse.json(
      { error: 'Failed to check sync status' },
      { status: 500 }
    );
  }
} 