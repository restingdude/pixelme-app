import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  
  return NextResponse.json({
    storeDomain: storeDomain ? `SET (${storeDomain.substring(0, 10)}...)` : 'UNDEFINED',
    adminToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ? `SET (${process.env.SHOPIFY_ADMIN_ACCESS_TOKEN.substring(0, 10)}...)` : 'UNDEFINED',
    storefrontToken: process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN ? `SET (${process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN.substring(0, 10)}...)` : 'UNDEFINED',
    replicateToken: process.env.REPLICATE_API_TOKEN ? 'SET' : 'UNDEFINED',
    nodeEnv: process.env.NODE_ENV,
    currentWorkingDirectory: process.cwd(),
    timestamp: new Date().toISOString(),
    // Show partial values to help debug without exposing full tokens
  });
} 