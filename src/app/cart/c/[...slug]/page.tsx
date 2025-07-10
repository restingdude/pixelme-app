'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function CartRedirectPage() {
  const params = useParams();
  const router = useRouter();
  
  useEffect(() => {
    // Instead of client-side redirect, use an API route to handle this
    const slug = params.slug as string[];
    const cartPath = slug ? slug.join('/') : '';
    
    // Get current URL search params (for the key parameter)
    const currentUrl = new URL(window.location.href);
    const searchParams = currentUrl.searchParams.toString();
    
    console.log('🔄 Cart redirect - Using API route to avoid loops');
    console.log('📋 Cart path:', cartPath);
    console.log('📋 Search params:', searchParams);
    
    // Redirect to our API route that will handle the server-side redirect
    const apiUrl = `/api/shopify/redirect-cart?path=${encodeURIComponent(cartPath)}&${searchParams}`;
    window.location.href = apiUrl;
    
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