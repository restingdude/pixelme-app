'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function CartRedirectPage() {
  const params = useParams();
  
  useEffect(() => {
    // Get the cart path segments
    const slug = params.slug as string[];
    const cartPath = slug ? slug.join('/') : '';
    
    // Extract cart ID and key from the path
    const fullPath = `/cart/c/${cartPath}`;
    console.log('🔄 Cart redirect - Original path:', fullPath);
    
    // Get current URL search params (for the key parameter)
    const currentUrl = new URL(window.location.href);
    const searchParams = currentUrl.searchParams.toString();
    
    // Build the Shopify domain URL
    const shopifyDomain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || 'aeufcr-ch.myshopify.com';
    const shopifyUrl = `https://${shopifyDomain}${fullPath}${searchParams ? `?${searchParams}` : ''}`;
    
    console.log('🚀 Cart redirect - Redirecting to:', shopifyUrl);
    console.log('🎯 Cart redirect - This should work without infinite loops!');
    
    // Small delay to ensure logs appear, then redirect
    setTimeout(() => {
      window.location.href = shopifyUrl;
    }, 100);
    
  }, [params]);

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Redirecting to Checkout</h2>
        <p className="text-gray-600">Taking you to secure Shopify checkout...</p>
      </div>
    </main>
  );
} 