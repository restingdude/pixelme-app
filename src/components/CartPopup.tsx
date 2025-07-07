'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface CartItem {
  id: string;
  quantity: number;
  cost: {
    totalAmount: {
      amount: string;
      currencyCode: string;
    };
  };
  merchandise: {
    id: string;
    title: string;
    price: {
      amount: string;
      currencyCode: string;
    };
    product: {
      id: string;
      title: string;
      handle: string;
      images: {
        edges: Array<{
          node: {
            url: string;
            altText: string;
          };
        }>;
      };
    };
    selectedOptions: Array<{
      name: string;
      value: string;
    }>;
  };
  attributes: Array<{
    key: string;
    value: string;
  }>;
}

interface Cart {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: {
    totalAmount: {
      amount: string;
      currencyCode: string;
    };
    subtotalAmount: {
      amount: string;
      currencyCode: string;
    };
  };
  lines: {
    edges: Array<{
      node: CartItem;
    }>;
  };
}

interface CartPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartPopup({ isOpen, onClose }: CartPopupProps) {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchCart();
    }
  }, [isOpen]);

  const fetchCart = async () => {
    try {
      const cartId = localStorage.getItem('pixelme-cart-id');
      if (!cartId) {
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/shopify/cart?cartId=${encodeURIComponent(cartId)}`);
      const data = await response.json();

      if (data.success && data.cart) {
        // Calculate actual total quantity from line items (workaround for Shopify quantity: 0 issue)
        const actualTotalQuantity = data.cart.lines?.edges?.reduce((total: number, { node }: { node: any }) => {
          return total + Math.max(node.quantity, node.quantity === 0 ? 1 : node.quantity);
        }, 0) || 0;
        
        // Update cart with corrected totalQuantity
        const correctedCart = {
          ...data.cart,
          totalQuantity: actualTotalQuantity
        };
        
        console.log('Cart popup - Original totalQuantity:', data.cart.totalQuantity);
        console.log('Cart popup - Corrected totalQuantity:', actualTotalQuantity);
        
        setCart(correctedCart);
      } else {
        // Cart might be expired or invalid, clear it
        localStorage.removeItem('pixelme-cart-id');
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
      setError('Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (lineId: string, newQuantity: number) => {
    if (!cart || newQuantity < 0) return;

    setUpdating(lineId);
    setError(null);
    try {
      const response = await fetch('/api/shopify/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          cartId: cart.id,
          lineId,
          quantity: newQuantity
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        await fetchCart(); // Refresh cart data
        // Trigger cart update event
        window.dispatchEvent(new CustomEvent('cart-updated'));
      } else {
        // Show the detailed error message from our API
        const errorMessage = data.details || data.error || 'Failed to update quantity';
        setError(errorMessage);
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
      setError('Failed to update quantity - network error');
    } finally {
      setUpdating(null);
    }
  };

  const removeItem = async (lineId: string) => {
    if (!cart) return;

    setUpdating(lineId);
    setError(null);
    try {
      const response = await fetch('/api/shopify/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove',
          cartId: cart.id,
          lineIds: [lineId]
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        await fetchCart(); // Refresh cart data
        // Trigger cart update event
        window.dispatchEvent(new CustomEvent('cart-updated'));
      } else {
        // Show the detailed error message from our API
        const errorMessage = data.details || data.error || 'Failed to remove item';
        setError(errorMessage);
      }
    } catch (error) {
      console.error('Error removing item:', error);
      setError('Failed to remove item - network error');
    } finally {
      setUpdating(null);
    }
  };

  const proceedToCheckout = () => {
    if (!cart?.checkoutUrl) {
      setError('Checkout URL not available');
      return;
    }

    // Check if cart has items (either quantity > 0 OR quantity = 0 with lines present - our workaround)
    const hasItemsWithQuantity = cart.lines.edges.some(({ node }) => 
      node.quantity > 0 || (node.quantity === 0 && cart.lines.edges.length > 0)
    );
    
    if (!hasItemsWithQuantity) {
      setError('Please add items to your cart before checking out');
      return;
    }

    // Clear any existing errors
    setError(null);
    
    // Close popup and redirect to Shopify checkout
    onClose();
    window.location.href = cart.checkoutUrl;
  };

  const continueShopping = () => {
    onClose();
    router.push('/');
  };

  const viewFullCart = () => {
    onClose();
    router.push('/cart');
  };

  const clearCart = async () => {
    if (!cart) return;
    
    setError(null);
    try {
      const response = await fetch('/api/shopify/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clear',
          cartId: cart.id
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Clear cart from localStorage and reset state
        localStorage.removeItem('pixelme-cart-id');
        setCart(null);
        // Trigger cart update event
        window.dispatchEvent(new CustomEvent('cart-updated'));
        // Close popup after successful clear
        onClose();
      } else {
        // If Shopify clear fails, force clear the frontend anyway
        console.warn('Shopify cart clear failed, forcing frontend clear:', data);
        forceCleanCart();
      }
    } catch (error) {
      console.error('Error clearing cart:', error);
      // If there's a network error, force clear the frontend anyway
      forceCleanCart();
    }
  };

  const forceCleanCart = () => {
    // Force clear the frontend state even if Shopify fails
    localStorage.removeItem('pixelme-cart-id');
    setCart(null);
    setError(null);
    // Trigger cart update event
    window.dispatchEvent(new CustomEvent('cart-updated'));
    // Close popup
    onClose();
    // Show a message that we've reset locally
    console.log('✅ Cart forcefully cleared from frontend. You can now start fresh.');
  };

  const getCustomAttribute = (attributes: Array<{key: string; value: string}>, key: string) => {
    return attributes.find(attr => attr.key === key)?.value || '';
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-transparent z-40"
        onClick={onClose}
      />
      
      {/* Popup */}
      <div className="fixed top-4 right-4 bottom-4 w-96 bg-white rounded-lg shadow-xl z-50 flex flex-col max-h-[calc(100vh-2rem)]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Your Cart</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-2 text-gray-600">Loading...</span>
            </div>
          ) : !cart || cart.lines.edges.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Your cart is empty</h3>
              <p className="text-gray-600 text-sm mb-4">Start creating your custom PixelMe clothing!</p>
              <button
                onClick={continueShopping}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            <>
              {/* Cart Items */}
              <div className="p-4">
                <div className="text-sm text-gray-600 mb-4">
                  {cart.totalQuantity} item{cart.totalQuantity !== 1 ? 's' : ''}
                </div>
                
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                    <p className="text-red-800 text-sm mb-3">{error}</p>
                    {(error.includes('not be removable') || error.includes('not be updated') || error.includes('available for sale')) && (
                      <button
                        onClick={clearCart}
                        className="w-full px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 font-medium transition-colors"
                      >
                        🗑️ Clear Cart & Start Fresh
                      </button>
                    )}
                  </div>
                )}

                <div className="space-y-4">
                  {cart.lines.edges.map(({ node: item }) => {
                    const image = item.merchandise.product.images.edges[0]?.node;
                    const customImageUrl = getCustomAttribute(item.attributes, 'custom_design_url');
                    const customStyle = getCustomAttribute(item.attributes, 'style');
                    const clothingType = getCustomAttribute(item.attributes, 'clothing_type');
                    const position = getCustomAttribute(item.attributes, 'position');
                    const color = item.merchandise.selectedOptions?.find(opt => opt.name === 'Color')?.value;
                    const size = item.merchandise.selectedOptions?.find(opt => opt.name === 'Size')?.value;
                    
                    return (
                      <div key={item.id} className="flex gap-3 p-3 border border-gray-200 rounded-lg">
                        {/* Product Image */}
                        <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 relative">
                          {customImageUrl ? (
                            <>
                              <img
                                src={customImageUrl}
                                alt={`Custom ${item.merchandise.product.title}`}
                                className="w-full h-full object-cover"
                              />
                              {/* Custom design indicator */}
                              <div className="absolute top-1 left-1 bg-green-500 text-white text-xs px-1 py-0.5 rounded text-[10px] font-bold shadow-md">
                                CUSTOM
                              </div>
                            </>
                          ) : image ? (
                            <img
                              src={image.url}
                              alt={image.altText || item.merchandise.product.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Product Details */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 text-sm truncate">
                            {customImageUrl ? `Custom ${item.merchandise.product.title}` : item.merchandise.product.title}
                          </h4>
                          {customStyle && (
                            <p className="text-xs text-blue-600 font-medium mt-1">
                              {customStyle} Style
                            </p>
                          )}
                          {position && (
                            <p className="text-xs text-green-600 font-medium mt-1">
                              Position: {position.charAt(0).toUpperCase() + position.slice(1)}
                            </p>
                          )}
                          {(color || size) && (
                            <p className="text-xs text-gray-600 mt-1">
                              {[color, size].filter(Boolean).join(' • ')}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <span className="font-medium text-gray-900 text-sm">
                              ${parseFloat(item.merchandise.price.amount).toFixed(2)}
                            </span>
                            
                            {/* Quantity Controls */}
                            <div className="flex items-center gap-1">
                              {(() => {
                                // Display quantity: show 1 if quantity is 0 (workaround for Shopify issue)
                                const displayQuantity = item.quantity === 0 ? 1 : item.quantity;
                                
                                return (
                                  <>
                                    <button
                                      onClick={() => updateQuantity(item.id, Math.max(0, displayQuantity - 1))}
                                      disabled={updating === item.id || displayQuantity <= 1}
                                      className="w-6 h-6 border-2 border-gray-400 rounded flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold text-black"
                                    >
                                      −
                                    </button>
                                    <span className="w-8 text-center text-sm font-bold text-gray-900">
                                      {updating === item.id ? '...' : displayQuantity}
                                    </span>
                                    <button
                                      onClick={() => updateQuantity(item.id, displayQuantity + 1)}
                                      disabled={updating === item.id}
                                      className="w-6 h-6 border-2 border-gray-400 rounded flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold text-black"
                                    >
                                      +
                                    </button>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                          
                          {/* Remove Button */}
                          <button
                            onClick={() => removeItem(item.id)}
                            disabled={updating === item.id}
                            className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed mt-1"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {cart && cart.lines.edges.length > 0 && (
          <div className="border-t border-gray-200 p-4 space-y-3">
            {/* Total */}
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="font-semibold text-gray-900">
                ${parseFloat(cart.cost.totalAmount.amount).toFixed(2)}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              {(() => {
                // Check for items with actual quantity > 0 OR items with quantity 0 (which we treat as 1)
                const hasItemsWithQuantity = cart.lines.edges.some(({ node }) => 
                  node.quantity > 0 || (node.quantity === 0 && cart.lines.edges.length > 0)
                );
                const canCheckout = cart.checkoutUrl && hasItemsWithQuantity;
                
                return (
                  <button
                    onClick={proceedToCheckout}
                    disabled={!canCheckout}
                    className={`w-full px-4 py-3 rounded-lg font-semibold transition-colors ${
                      canCheckout
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {canCheckout ? 'Checkout' : 'Add Items to Checkout'}
                  </button>
                );
              })()}
              <div className="flex gap-2">
                <button
                  onClick={viewFullCart}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors text-sm"
                >
                  View Cart
                </button>
                <button
                  onClick={continueShopping}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors text-sm"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
} 