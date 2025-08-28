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
      fields: 'id,order_number,name,email,created_at,updated_at,total_price,currency,financial_status,fulfillment_status,customer,line_items,shipping_address,billing_address,note,tags'
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
          clothingType: props.clothing_type,
          designSize: props['Design Size'] || props['Image Size'] || props['Embroidery Sizes'] || 'Not specified'
        };
      });

      // Determine digitization status based on tags
      const tags = order.tags || '';
      let digitizationStatus: 'pending' | 'shared' | 'pending_approval' | 'assigned' | 'in_progress' | 'completed' | 'completed_paid' | 'completed_unpaid' = 'pending';
      let digitizerName = null;
      
      // First extract digitizer name if present (format: "digitizer:Name")
      const digitizerMatch = tags.match(/digitizer:([^,]+)/);
      if (digitizerMatch) {
        digitizerName = digitizerMatch[1].trim();
      }
      
      if (tags.includes('digitizer-pending-approval')) {
        digitizationStatus = 'pending_approval';
      } else if (tags.includes('digitizer-approved') || tags.includes('digitizer-assigned')) {
        digitizationStatus = 'assigned';
      } else if (tags.includes('digitizer-in-progress')) {
        digitizationStatus = 'in_progress';
      } else if (tags.includes('digitizer-completed-paid')) {
        digitizationStatus = 'completed_paid';
      } else if (tags.includes('digitizer-completed-unpaid')) {
        digitizationStatus = 'completed_unpaid';
      } else if (tags.includes('digitizer-completed')) {
        digitizationStatus = 'completed_unpaid'; // fallback for old completed status
      } else if (tags.includes('digitizer-pending')) {
        digitizationStatus = 'pending_approval';
      }
      // If digitizerName exists but no specific status, keep status as 'pending' but with digitizer name

      // Extract payment amount for completed paid orders
      let paymentAmount = null;
      if (digitizationStatus === 'completed_paid' && order.note) {
        const paymentMatch = order.note.match(/Payment processed: \$(\d+(?:\.\d{2})?)/);
        if (paymentMatch) {
          paymentAmount = paymentMatch[1];
        }
      }

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
        tags: tags,
        isPixelMeOrder: customItems.length > 0,
        pixelMeItems: pixelMeData,
        totalItems: order.line_items?.length || 0,
        customItemsCount: customItems.length,
        digitizationStatus: customItems.length > 0 ? digitizationStatus : undefined,
        digitizerName: digitizerName,
        paymentAmount: paymentAmount
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

 