'use client';

import { useState } from 'react';

export default function TestCheckout() {
  const [cartId, setCartId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testCheckoutCreation = async () => {
    if (!cartId.trim()) {
      setError('Please enter a cart ID');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('🧪 Testing checkout creation for cart:', cartId);

      const response = await fetch('/api/shopify/checkout-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartId: cartId.trim() })
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
        console.log('✅ Checkout creation successful:', data);
      } else {
        setError(data.error || 'Failed to create checkout');
        console.error('❌ Checkout creation failed:', data);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Network error: ${errorMessage}`);
      console.error('❌ Test error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentCartId = () => {
    const storedCartId = localStorage.getItem('pixelme-cart-id');
    if (storedCartId) {
      setCartId(storedCartId);
      setError(null);
    } else {
      setError('No cart ID found in localStorage. Create a cart first by adding items.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            🧪 Test Shopify Checkout Integration
          </h1>

          <div className="space-y-6">
            {/* Cart ID Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cart ID
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={cartId}
                  onChange={(e) => setCartId(e.target.value)}
                  placeholder="gid://shopify/Cart/..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={getCurrentCartId}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium whitespace-nowrap"
                >
                  Use Current Cart
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Enter a cart ID or use your current cart from localStorage
              </p>
            </div>

            {/* Test Button */}
            <button
              onClick={testCheckoutCreation}
              disabled={loading || !cartId.trim()}
              className={`w-full px-4 py-3 rounded-lg font-semibold transition-colors ${
                loading || !cartId.trim()
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Testing...
                </div>
              ) : (
                '🚀 Test Checkout Creation'
              )}
            </button>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-red-800 font-medium">Error</span>
                </div>
                <p className="text-red-700 mt-1">{error}</p>
              </div>
            )}

            {/* Success Display */}
            {result && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-green-800 font-medium">Checkout Created Successfully!</span>
                </div>
                
                <div className="space-y-3">
                  <div className="bg-white border border-green-200 rounded p-3">
                    <h4 className="font-medium text-gray-900 mb-2">Checkout Details:</h4>
                    <div className="text-sm space-y-1">
                      <p><strong>Checkout ID:</strong> {result.checkout.id}</p>
                      <p><strong>Total Price:</strong> ${result.checkout.totalPrice.amount} {result.checkout.totalPrice.currencyCode}</p>
                      <p><strong>Line Items:</strong> {result.checkout.lineItemsCount}</p>
                      <p><strong>Custom Items:</strong> {result.checkout.customItemsCount}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <a
                      href={result.checkout.webUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-center"
                    >
                      🛒 Go to Shopify Checkout
                    </a>
                    <button
                      onClick={() => navigator.clipboard.writeText(result.checkout.webUrl)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                    >
                      📋 Copy URL
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">🔍 How to Test:</h3>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>First, create a cart by adding items in your main app</li>
                <li>Click "Use Current Cart" to get your cart ID</li>
                <li>Click "Test Checkout Creation" to test the API</li>
                <li>If successful, click "Go to Shopify Checkout" to test the full flow</li>
                <li>Complete a test purchase and check your admin dashboard</li>
              </ol>
            </div>

            {/* Back Button */}
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={() => window.history.back()}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                ← Back to App
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 