'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// Component that uses useSearchParams - wrapped in Suspense
function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get order information from URL parameters
    const orderId = searchParams.get('order_id');
    const orderNumber = searchParams.get('order_number');
    const total = searchParams.get('total');
    
    const orderIdentifier = orderId || orderNumber;
    if (orderIdentifier) {
      fetchOrderDetails(orderIdentifier);
    } else {
      setLoading(false);
    }

    // Clear cart since order was successful
    localStorage.removeItem('pixelme-cart-id');
    
    // Trigger cart update event to refresh any cart displays
    window.dispatchEvent(new CustomEvent('cart-updated'));
  }, [searchParams]);

  const fetchOrderDetails = async (orderIdentifier: string) => {
    try {
      const response = await fetch(`/api/shopify/orders?id=${orderIdentifier}`);
      const data = await response.json();
      
      if (data.success && data.order) {
        setOrderDetails(data.order);
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCustomDesignItems = () => {
    if (!orderDetails?.lineItems?.edges) return [];
    
    return orderDetails.lineItems.edges
      .map(({ node }: any) => node)
      .filter((item: any) => 
        item.customAttributes?.some((attr: any) => attr.key === 'custom_design_url')
      );
  };

  const getDesignUrl = (item: any) => {
    return item.customAttributes?.find((attr: any) => attr.key === 'custom_design_url')?.value;
  };

  const getStyle = (item: any) => {
    return item.customAttributes?.find((attr: any) => attr.key === 'style')?.value || 'Custom';
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
          <p className="text-lg text-gray-600">Thank you for your PixelMe custom order</p>
        </div>

        {/* Order Details Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          {orderDetails ? (
            <>
              <div className="border-b border-gray-200 pb-4 mb-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">
                  Order {orderDetails.name}
                </h2>
                <p className="text-gray-600">
                  Placed on {new Date(orderDetails.createdAt).toLocaleDateString()}
                </p>
                <div className="flex gap-4 mt-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    orderDetails.financialStatus === 'paid' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    Payment: {orderDetails.financialStatus}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    orderDetails.fulfillmentStatus === 'fulfilled'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    Status: {orderDetails.fulfillmentStatus || 'pending'}
                  </span>
                </div>
              </div>

              {/* Custom Design Items */}
              {getCustomDesignItems().length > 0 && (
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Your Custom Designs</h3>
                  <div className="space-y-3">
                    {getCustomDesignItems().map((item: any) => (
                      <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        {getDesignUrl(item) && (
                          <img 
                            src={getDesignUrl(item)} 
                            alt="Custom design"
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                        )}
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{item.title}</h4>
                          <p className="text-sm text-gray-600">{getStyle(item)} style</p>
                          <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            ${item.variant?.price} {orderDetails.currencyCode}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Order Total */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Total</span>
                  <span className="text-xl font-bold text-gray-900">
                    ${orderDetails.totalPrice} {orderDetails.currencyCode}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">Your order has been successfully placed!</p>
              <p className="text-sm text-gray-500">
                You should receive an email confirmation shortly with your order details.
              </p>
            </div>
          )}
        </div>

        {/* Next Steps */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">What happens next?</h3>
          <ul className="text-blue-800 space-y-1">
            <li>• You'll receive an email confirmation with your order details</li>
            <li>• Our team will review your custom design and begin production</li>
            <li>• You'll get tracking information once your order ships</li>
            <li>• Delivery typically takes 7-14 business days</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors text-center"
          >
            Create Another Design
          </Link>
          <Link
            href="/admin"
            className="px-6 py-3 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 font-semibold transition-colors text-center"
          >
            View Order History
          </Link>
        </div>
      </div>
    </main>
  );
}

// Loading component for Suspense fallback
function SuccessLoading() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading order details...</p>
      </div>
    </main>
  );
}

// Main page component with Suspense boundary
export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<SuccessLoading />}>
      <SuccessContent />
    </Suspense>
  );
} 