import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cartPath = searchParams.get('path');
    const key = searchParams.get('key');
    
    if (!cartPath) {
      return NextResponse.json({ error: 'Cart path is required' }, { status: 400 });
    }

    // Build the Shopify domain URL
    const storeDomain = process.env.SHOPIFY_STORE_DOMAIN || 'aeufcr-ch.myshopify.com';
    const shopifyUrl = `https://${storeDomain}/cart/c/${cartPath}${key ? `?key=${key}` : ''}`;
    
    console.log('🔄 Server redirect - Cart path:', cartPath);
    console.log('🔄 Server redirect - Key:', key);
    console.log('🚀 Server redirect - Redirecting to:', shopifyUrl);
    
    // Use server-side redirect with 302 status
    return NextResponse.redirect(shopifyUrl, { status: 302 });
    
  } catch (error) {
    console.error('❌ Server redirect error:', error);
    
    // Fallback to main cart page
    const storeDomain = process.env.SHOPIFY_STORE_DOMAIN || 'aeufcr-ch.myshopify.com';
    const fallbackUrl = `https://${storeDomain}/cart`;
    
    return NextResponse.redirect(fallbackUrl, { status: 302 });
  }
} 