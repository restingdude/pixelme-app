'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Component that uses useSearchParams - wrapped in Suspense
function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [cartData, setCartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [alternativeUrls, setAlternativeUrls] = useState<Array<{url: string, method: string, description: string}>>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLocalhost, setIsLocalhost] = useState(false);

  useEffect(() => {
    // Check if we're on localhost
    setIsLocalhost(window.location.hostname === 'localhost');
    
    const cartId = searchParams.get('cartId');
    if (cartId) {
      initializeRealCheckout(decodeURIComponent(cartId));
    } else {
      setError('No cart ID provided');
      setLoading(false);
    }
  }, [searchParams]);

  const initializeRealCheckout = async (cartId: string) => {
    try {
      setLoading(true);
      
      // First, get cart data for display
      const cartResponse = await fetch(`/api/shopify/cart?cartId=${encodeURIComponent(cartId)}`);
      const cartApiResponse = await cartResponse.json();
      
      if (cartApiResponse.success && cartApiResponse.cart) {
        setCartData(cartApiResponse.cart);
      }

      // Create real checkout - try multiple methods for maximum compatibility
      let checkoutResponse = await fetch('/api/shopify/checkout-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartId })
      });
      let method = 'direct';

      // If direct method fails, try permalink method (works with basic themes)
      if (!checkoutResponse.ok) {
        console.log('⚠️ Direct checkout failed, trying permalink method...');
        checkoutResponse = await fetch('/api/shopify/checkout-permalink', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cartId })
        });
        method = 'permalink';
      }

      // If permalink method fails, try add-to-cart method (universal fallback)
      if (!checkoutResponse.ok) {
        console.log('⚠️ Permalink checkout failed, trying add-to-cart method...');
        checkoutResponse = await fetch('/api/shopify/checkout-add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cartId })
        });
        method = 'add-to-cart';
      }

      // If add-to-cart fails, try simple method
      if (!checkoutResponse.ok) {
        console.log('⚠️ Add-to-cart checkout failed, trying simple method...');
        checkoutResponse = await fetch('/api/shopify/checkout-simple', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cartId })
        });
        method = 'simple';
      }

      // Final fallback: try the complex v2 method
      if (!checkoutResponse.ok) {
        console.log('⚠️ Simple checkout failed, trying v2 method...');
        checkoutResponse = await fetch('/api/shopify/checkout-v2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cartId })
        });
        method = 'v2';
      }

      const checkoutData = await checkoutResponse.json();
      
      if (checkoutData.success && checkoutData.checkout?.webUrl) {
        console.log(`✅ Real checkout created using ${method} method:`, checkoutData.checkout.webUrl);
        
        // For headless setup, convert the checkout URL to use Shopify's domain
        let finalCheckoutUrl = checkoutData.checkout.webUrl;
        if (finalCheckoutUrl.includes('pixelmecustoms.com')) {
          // Replace with Shopify domain for headless compatibility
          finalCheckoutUrl = finalCheckoutUrl.replace('pixelmecustoms.com', 'aeufcr-ch.myshopify.com');
          console.log('🔄 Converted checkout URL for headless:', finalCheckoutUrl);
        }
        
        setCheckoutUrl(finalCheckoutUrl);
        
        // If we got a cart/c/ URL (which often fails), generate alternative formats manually
        if (checkoutData.checkout.webUrl.includes('/cart/c/')) {
          console.log('⚠️ Got cart/c/ URL which may not work with theme. Generating alternatives...');
          
          const alternatives: Array<{url: string, method: string, description: string}> = [];
          
          // Generate alternatives from cart data without additional API calls
          if (cartApiResponse.success && cartApiResponse.cart && cartApiResponse.cart.lines?.edges?.length > 0) {
            const firstItem = cartApiResponse.cart.lines.edges[0].node;
            const variantId = firstItem.merchandise.id.replace('gid://shopify/ProductVariant/', '');
            const quantity = firstItem.quantity || 1;
            
            // Extract domain from checkoutUrl
            const urlParts = checkoutData.checkout.webUrl.split('/');
            const domain = `${urlParts[0]}//${urlParts[2]}`;
            
            // For headless setup, use Shopify's myshopify.com domain directly
            const shopifyDomain = 'aeufcr-ch.myshopify.com';
            
            // Generate permalink format on Shopify's domain
            const permalinkUrl = `https://${shopifyDomain}/cart/${variantId}:${quantity}`;
            alternatives.push({
              url: permalinkUrl,
              method: 'permalink',
              description: 'Shopify domain permalink (works with headless)'
            });
            
            // Generate add-to-cart format with attributes on Shopify's domain
            const attributes = firstItem.attributes || [];
            let attributeParams = '';
            
            if (attributes.length > 0) {
              const attrPairs = attributes.map((attr: any) => 
                `attributes[${encodeURIComponent(attr.key)}]=${encodeURIComponent(attr.value)}`
              );
              attributeParams = '&' + attrPairs.join('&');
            }
            
            const addUrl = `https://${shopifyDomain}/cart/add?id=${variantId}&quantity=${quantity}${attributeParams}&return_to=/cart`;
            alternatives.push({
              url: addUrl,
              method: 'add-to-cart',
              description: 'Shopify domain add-to-cart (headless compatible)'
            });
            
            setAlternativeUrls(alternatives);
            console.log(`📋 Generated ${alternatives.length} alternative checkout URLs manually`);
            console.log('✅ Permalink alternative:', permalinkUrl);
            console.log('✅ Add-to-cart alternative:', addUrl);
          } else {
            console.log('⚠️ No cart data available for generating alternatives');
          }
        }
      } else {
        throw new Error(checkoutData.error || 'Failed to create checkout');
      }

    } catch (error) {
      console.error('❌ Real checkout error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to initialize checkout: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const redirectToCheckout = (url: string) => {
    console.log('🚀 Redirecting to Shopify checkout:', url);
    
    // Show confirmation dialog on localhost for testing
    if (isLocalhost) {
      const confirmRedirect = confirm(
        `Ready to redirect to Shopify checkout!\n\n` +
        `URL: ${url}\n\n` +
        `Click OK to proceed to payment.`
      );
      
      if (!confirmRedirect) {
        console.log('🚫 User cancelled checkout redirect');
        return;
      }
    }
    
    // Clear cart since we're going to checkout
    localStorage.removeItem('pixelme-cart-id');
    
    // Redirect to Shopify checkout
    console.log('✅ Redirecting to Shopify checkout...');
    window.location.href = url;
  };

  const proceedToShopifyCheckout = () => {
    if (checkoutUrl) {
      redirectToCheckout(checkoutUrl);
    }
  };

  const handleAlternativeCheckout = (url: string) => {
    redirectToCheckout(url);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Preparing your checkout...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Checkout Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/cart')}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
            >
              Back to Cart
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
            >
              Start Over
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-green-800 font-medium">Real Shopify Checkout - Secure Payment Processing</p>
              {isLocalhost && (
                <p className="text-green-700 text-sm mt-1">🧪 Testing Mode: Theme installed - checkout should work!</p>
              )}
            </div>
          </div>
        </div>

                {/* Debug Info for localhost */}
        {isLocalhost && checkoutUrl && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">🧪 Debug Info (Localhost Only)</h3>
            <div className="text-blue-800 text-sm space-y-1">
              <p><strong>Primary URL:</strong> {checkoutUrl}</p>
              <p><strong>Status:</strong> Ready to test with theme!</p>
              {alternativeUrls.length > 0 && (
                <div className="mt-3">
                  <p><strong>Alternative URLs (if primary fails):</strong></p>
                  {alternativeUrls.map((alt, index) => (
                    <div key={index} className="ml-2 mt-1 text-xs">
                      <p><strong>{alt.method}:</strong> {alt.url}</p>
                      <p className="text-blue-600">{alt.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Alternative checkout options if primary is likely to fail */}
        {checkoutUrl && checkoutUrl.includes('/cart/c/') && alternativeUrls.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-yellow-900 mb-3">⚠️ Primary URL May Not Work</h3>
            <p className="text-yellow-800 text-sm mb-4">
              The primary checkout URL uses the cart/c/ format which often doesn't work with themes. Try these alternatives:
            </p>
            <div className="space-y-2">
              {alternativeUrls.map((alt, index) => (
                                 <button
                   key={index}
                   onClick={(e) => {
                     e.preventDefault();
                     handleAlternativeCheckout(alt.url);
                   }}
                   className="w-full text-left px-4 py-3 bg-white border border-yellow-300 rounded-lg hover:bg-yellow-50 transition-colors"
                 >
                  <div className="font-medium text-yellow-900">{alt.description}</div>
                  <div className="text-xs text-yellow-700 mt-1 truncate">{alt.url}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Secure Checkout</h1>
          
          {/* Order Summary */}
          {cartData && (
            <div className="border-b border-gray-200 pb-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
              
              {cartData.lines.edges.map(({ node }: any) => (
                <div key={node.id} className="flex items-center gap-4 mb-4">
                  {node.merchandise.product.images.edges[0] && (
                    <img 
                      src={node.merchandise.product.images.edges[0].node.url}
                      alt={node.merchandise.product.title}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{node.merchandise.product.title}</h3>
                    <p className="text-sm text-gray-600">{node.merchandise.title}</p>
                    <p className="text-sm text-gray-600">Quantity: {node.quantity}</p>
                    
                    {/* Custom Design Info */}
                    {node.attributes.some((attr: any) => attr.key === 'custom_design_url') && (
                      <div className="mt-2">
                        <p className="text-xs text-green-600">✨ Custom Design</p>
                        <p className="text-xs text-gray-500">
                          Style: {node.attributes.find((attr: any) => attr.key === 'style')?.value}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      ${node.cost.totalAmount.amount} {node.cost.totalAmount.currencyCode}
                    </p>
                  </div>
                </div>
              ))}
              
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Total</span>
                  <span>${cartData.cost.totalAmount.amount} {cartData.cost.totalAmount.currencyCode}</span>
                </div>
              </div>
            </div>
          )}

          {/* Checkout Info */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">Secure Payment</h3>
            <ul className="text-blue-800 text-sm space-y-1">
              <li>• SSL encrypted checkout</li>
              <li>• Multiple payment methods accepted</li>
              <li>• Your payment info is never stored</li>
              <li>• 100% secure Shopify checkout</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/cart')}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
            >
              Back to Cart
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                proceedToShopifyCheckout();
              }}
              disabled={!checkoutUrl}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {checkoutUrl ? 'Proceed to Payment' : 'Preparing...'}
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-4 text-center">
            You will be redirected to Shopify's secure checkout to complete your payment.
          </p>
        </div>
      </div>
    </main>
  );
}

// Loading component for Suspense fallback
function CheckoutLoading() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading checkout...</p>
      </div>
    </main>
  );
}

// Main page component with Suspense boundary
export default function RealCheckoutPage() {
  return (
    <Suspense fallback={<CheckoutLoading />}>
      <CheckoutContent />
    </Suspense>
  );
} 