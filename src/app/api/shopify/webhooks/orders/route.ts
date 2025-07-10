import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const hmacHeader = request.headers.get('x-shopify-hmac-sha256');
    
    // Verify webhook authenticity
    if (process.env.SHOPIFY_WEBHOOK_SECRET && hmacHeader) {
      const hash = crypto
        .createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET)
        .update(body, 'utf8')
        .digest('base64');
      
      if (hash !== hmacHeader) {
        console.error('❌ Invalid webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const order = JSON.parse(body);
    const topic = request.headers.get('x-shopify-topic');
    
    console.log('📦 Order Webhook Received:', {
      topic,
      orderId: order.id,
      orderNumber: order.order_number,
      email: order.email,
      totalPrice: order.total_price,
      financialStatus: order.financial_status,
      fulfillmentStatus: order.fulfillment_status
    });

    // Handle different order events
    switch (topic) {
      case 'orders/create':
        await handleOrderCreated(order);
        break;
      case 'orders/paid':
        await handleOrderPaid(order);
        break;
      case 'orders/fulfilled':
        await handleOrderFulfilled(order);
        break;
      case 'orders/cancelled':
        await handleOrderCancelled(order);
        break;
    }

    return NextResponse.json({ success: true, topic, orderId: order.id });
    
  } catch (error) {
    console.error('❌ Order webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handleOrderCreated(order: any) {
  console.log('🆕 Order Created:', {
    id: order.id,
    orderNumber: order.order_number,
    email: order.email,
    customer: `${order.customer?.first_name} ${order.customer?.last_name}`,
    totalPrice: order.total_price,
    currency: order.currency
  });

  // Log custom PixelMe data
  const customLineItems = order.line_items?.filter((item: any) => 
    item.properties?.some((prop: any) => prop.name === 'custom_design_url')
  );

  if (customLineItems?.length > 0) {
    console.log('🎨 Custom PixelMe Items Found:');
    customLineItems.forEach((item: any, index: number) => {
      console.log(`  Item ${index + 1}:`, item.title);
      
      const customProps = item.properties?.reduce((acc: any, prop: any) => {
        acc[prop.name] = prop.value;
        return acc;
      }, {});
      
      console.log('  Custom Properties:', customProps);
    });
  }

  // Here you could:
  // - Save order to your database
  // - Send confirmation emails
  // - Trigger fulfillment processes
  // - Update inventory systems
}

async function handleOrderPaid(order: any) {
  console.log('💰 Order Paid:', {
    id: order.id,
    orderNumber: order.order_number,
    totalPrice: order.total_price,
    paymentStatus: order.financial_status
  });

  // Here you could:
  // - Trigger production workflows
  // - Send payment confirmation
  // - Update order status in your system
}

async function handleOrderFulfilled(order: any) {
  console.log('📦 Order Fulfilled:', {
    id: order.id,
    orderNumber: order.order_number,
    trackingNumber: order.fulfillments?.[0]?.tracking_number
  });

  // Here you could:
  // - Send shipping notifications
  // - Update tracking information
  // - Mark order as complete
}

async function handleOrderCancelled(order: any) {
  console.log('❌ Order Cancelled:', {
    id: order.id,
    orderNumber: order.order_number,
    cancelReason: order.cancel_reason
  });

  // Here you could:
  // - Process refunds
  // - Update inventory
  // - Send cancellation emails
} 