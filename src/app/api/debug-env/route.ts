import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    storeDomain: process.env.SHOPIFY_STORE_DOMAIN ? 'SET' : 'UNDEFINED',
    adminToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ? 'SET' : 'UNDEFINED',
    storefrontToken: process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN ? 'SET' : 'UNDEFINED',
    replicateToken: process.env.REPLICATE_API_TOKEN ? 'SET' : 'UNDEFINED',
    nodeEnv: process.env.NODE_ENV,
    // Don't return actual values for security, just check if they exist
  });
} 