import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import crypto from 'crypto';

// Webhook endpoint to receive order completion notifications from Shopify
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    
    // Verify webhook authenticity using Shopify webhook secret
    const hmacHeader = headersList.get('x-shopify-hmac-sha256');
    const topic = headersList.get('x-shopify-topic');
    const shop = headersList.get('x-shopify-shop-domain');
    
    console.log('🎣 Webhook received:', { topic, shop });
    
    if (!hmacHeader) {
      console.error('❌ Missing HMAC header');
      return NextResponse.json({ error: 'Missing HMAC header' }, { status: 401 });
    }
    
    // Verify webhook signature (you'll need to set SHOPIFY_WEBHOOK_SECRET in your environment)
    const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
    if (webhookSecret) {
      const hmac = crypto.createHmac('sha256', webhookSecret);
      hmac.update(body, 'utf8');
      const generatedHash = hmac.digest('base64');
      
      if (generatedHash !== hmacHeader) {
        console.error('❌ Invalid webhook signature');
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
      }
    }
    
    const order = JSON.parse(body);
    
    // Handle different webhook topics
    switch (topic) {
      case 'orders/create':
        return await handleOrderCreate(order);
      case 'orders/updated':
        return await handleOrderUpdate(order);
      case 'orders/paid':
        return await handleOrderPaid(order);
      case 'orders/fulfilled':
        return await handleOrderFulfilled(order);
      case 'orders/cancelled':
        return await handleOrderCancelled(order);
      default:
        console.log('🔔 Unhandled webhook topic:', topic);
        return NextResponse.json({ success: true, message: 'Webhook received but not processed' });
    }
    
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handleOrderCreate(order: any) {
  console.log('📦 New order created:', order.name, 'for', order.email);
  
  // Log the order details for PixelMe custom orders
  const customItems = order.line_items?.filter((item: any) => 
    item.properties?.some((prop: any) => prop.name === 'custom_design_url')
  ) || [];
  
  if (customItems.length > 0) {
    console.log('🎨 Custom PixelMe items in order:');
    customItems.forEach((item: any) => {
      const designUrl = item.properties?.find((p: any) => p.name === 'custom_design_url')?.value;
      const style = item.properties?.find((p: any) => p.name === 'style')?.value;
      const position = item.properties?.find((p: any) => p.name === 'position')?.value;
      
      console.log(`  - ${item.title}: ${style} style at ${position} (${designUrl})`);
    });
  }
  
  // You could store order details in a database here
  // For now, we'll just log and respond
  
  return NextResponse.json({ 
    success: true, 
    message: 'Order created webhook processed',
    customItems: customItems.length 
  });
}

async function handleOrderUpdate(order: any) {
  console.log('📝 Order updated:', order.name, 'Status:', order.financial_status, order.fulfillment_status);
  
  return NextResponse.json({ 
    success: true, 
    message: 'Order updated webhook processed' 
  });
}

async function handleOrderPaid(order: any) {
  console.log('💰 Order paid:', order.name, 'Amount:', order.total_price, order.currency);
  
  // This is when you know payment was successful
  // Perfect time to trigger any post-payment processes
  
  return NextResponse.json({ 
    success: true, 
    message: 'Order paid webhook processed' 
  });
}

async function handleOrderFulfilled(order: any) {
  console.log('📮 Order fulfilled:', order.name);
  
  // Order has been shipped/fulfilled
  // You could send confirmation emails or update customer status here
  
  return NextResponse.json({ 
    success: true, 
    message: 'Order fulfilled webhook processed' 
  });
}

async function handleOrderCancelled(order: any) {
  console.log('❌ Order cancelled:', order.name, 'Reason:', order.cancel_reason);
  
  return NextResponse.json({ 
    success: true, 
    message: 'Order cancelled webhook processed' 
  });
}

// Handle webhook verification for GET requests (Shopify webhook verification)
export async function GET() {
  return NextResponse.json({ message: 'PixelMe Shopify Webhooks endpoint' });
} 