'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Real production checkout page
export default function RealCheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [cartData, setCartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
      const cartData = await cartResponse.json();
      
      if (cartData.success && cartData.cart) {
        setCartData(cartData.cart);
      }

      // Create real checkout
      const checkoutResponse = await fetch('/api/shopify/checkout-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartId })
      });

      const checkoutData = await checkoutResponse.json();
      
      if (checkoutData.success && checkoutData.checkout?.webUrl) {
        console.log('✅ Real checkout created:', checkoutData.checkout.webUrl);
        setCheckoutUrl(checkoutData.checkout.webUrl);
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

  const proceedToShopifyCheckout = () => {
    if (checkoutUrl) {
      // Add return URL for after checkout completion
      const returnUrl = `${window.location.origin}/success`;
      const urlWithReturn = new URL(checkoutUrl);
      urlWithReturn.searchParams.set('return_to', returnUrl);
      
      console.log('🚀 Redirecting to Shopify checkout:', urlWithReturn.toString());
      
      // Clear cart since we're going to checkout
      localStorage.removeItem('pixelme-cart-id');
      
      // Redirect to Shopify's real checkout
      window.location.href = urlWithReturn.toString();
    }
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
            <p className="text-green-800 font-medium">Real Shopify Checkout - Secure Payment Processing</p>
          </div>
        </div>

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
              onClick={proceedToShopifyCheckout}
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