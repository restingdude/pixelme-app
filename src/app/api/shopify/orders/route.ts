import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '50';
    const status = searchParams.get('status') || 'any';
    const financialStatus = searchParams.get('financial_status');
    const fulfillmentStatus = searchParams.get('fulfillment_status');

    if (!process.env.SHOPIFY_STORE_DOMAIN || !process.env.SHOPIFY_ADMIN_ACCESS_TOKEN) {
      throw new Error('Missing Shopify environment variables');
    }

    console.log('📋 Fetching orders from Shopify Admin...');

    // Build query parameters
    const params = new URLSearchParams({
      limit,
      status,
      fields: 'id,order_number,name,email,created_at,updated_at,total_price,currency,financial_status,fulfillment_status,customer,line_items,shipping_address,billing_address,note'
    });

    if (financialStatus) params.append('financial_status', financialStatus);
    if (fulfillmentStatus) params.append('fulfillment_status', fulfillmentStatus);

    const response = await fetch(
      `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2023-10/orders.json?${params}`,
      {
        headers: {
          'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Retrieved ${data.orders?.length || 0} orders`);

    // Process orders to highlight PixelMe custom orders
    const processedOrders = data.orders?.map((order: any) => {
      // Check for custom PixelMe items
      const customItems = order.line_items?.filter((item: any) => 
        item.properties?.some((prop: any) => prop.name === 'custom_design_url')
      ) || [];

      const pixelMeData = customItems.map((item: any) => {
        const props = item.properties?.reduce((acc: any, prop: any) => {
          acc[prop.name] = prop.value;
          return acc;
        }, {});

        return {
          title: item.title,
          quantity: item.quantity,
          price: item.price,
          customDesignUrl: props.custom_design_url,
          style: props.style,
          position: props.position,
          clothingType: props.clothing_type
        };
      });

      return {
        id: order.id,
        orderNumber: order.order_number,
        name: order.name,
        email: order.email,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        totalPrice: order.total_price,
        currency: order.currency,
        financialStatus: order.financial_status,
        fulfillmentStatus: order.fulfillment_status,
        customer: order.customer ? {
          firstName: order.customer.first_name,
          lastName: order.customer.last_name,
          email: order.customer.email,
          phone: order.customer.phone
        } : null,
        shippingAddress: order.shipping_address,
        billingAddress: order.billing_address,
        note: order.note,
        isPixelMeOrder: customItems.length > 0,
        pixelMeItems: pixelMeData,
        totalItems: order.line_items?.length || 0,
        customItemsCount: customItems.length
      };
    }) || [];

    // Separate PixelMe orders for easy filtering
    const pixelMeOrders = processedOrders.filter((order: any) => order.isPixelMeOrder);
    const regularOrders = processedOrders.filter((order: any) => !order.isPixelMeOrder);

    return NextResponse.json({
      success: true,
      orders: processedOrders,
      summary: {
        total: processedOrders.length,
        pixelMeOrders: pixelMeOrders.length,
        regularOrders: regularOrders.length
      },
      filters: {
        limit: parseInt(limit),
        status,
        financialStatus,
        fulfillmentStatus
      }
    });

  } catch (error) {
    console.error('❌ Error fetching orders:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
}

 