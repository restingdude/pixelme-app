'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Mock checkout page for localhost testing only
export default function MockCheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [cartData, setCartData] = useState<any>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // Get cart data from URL parameters
    const cartId = searchParams.get('cartId');
    if (cartId) {
      fetchCartData(decodeURIComponent(cartId));
    }
  }, [searchParams]);

  const fetchCartData = async (cartId: string) => {
    try {
      const response = await fetch(`/api/shopify/cart?cartId=${encodeURIComponent(cartId)}`);
      const data = await response.json();
      if (data.success && data.cart) {
        setCartData(data.cart);
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
    }
  };

  const simulatePayment = async () => {
    setProcessing(true);
    
    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Clear cart
    localStorage.removeItem('pixelme-cart-id');
    
    // Redirect to success page with mock order data
    const mockOrderId = Math.floor(Math.random() * 10000) + 1000;
    router.push(`/success?order_id=${mockOrderId}&order_number=${mockOrderId}&total=${cartData?.cost?.totalAmount?.amount}&currency=${cartData?.cost?.totalAmount?.currencyCode}`);
  };

  if (!cartData) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading checkout...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-yellow-800 font-medium">Mock Checkout - Localhost Testing Only</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h1>
          
          {/* Order Summary */}
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
                      <p className="text-xs text-blue-600">✨ Custom Design</p>
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

          {/* Mock Payment Form */}
          <div className="space-y-4 mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Payment Information</h2>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">Mock Payment Form (Testing Only)</p>
              <div className="space-y-3">
                <input 
                  type="text" 
                  placeholder="4111 1111 1111 1111" 
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  disabled
                />
                <div className="flex gap-4">
                  <input 
                    type="text" 
                    placeholder="MM/YY" 
                    className="flex-1 p-3 border border-gray-300 rounded-lg"
                    disabled
                  />
                  <input 
                    type="text" 
                    placeholder="CVC" 
                    className="flex-1 p-3 border border-gray-300 rounded-lg"
                    disabled
                  />
                </div>
              </div>
            </div>
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
              onClick={simulatePayment}
              disabled={processing}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </div>
              ) : (
                'Complete Mock Order'
              )}
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-4 text-center">
            This is a mock checkout for localhost testing. Real payments use Shopify's secure checkout.
          </p>
        </div>
      </div>
    </main>
  );
} 