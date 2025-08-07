'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

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

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCart();
  }, []);

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
        
        console.log('Cart page - Original totalQuantity:', data.cart.totalQuantity);
        console.log('Cart page - Corrected totalQuantity:', actualTotalQuantity);
        
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

  const proceedToCheckout = async () => {
    if (!cart) {
      setError('Cart not available');
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
    
    console.log('🚀 OFFICIAL SHOPIFY CHECKOUT - Creating checkout session...');
    
    try {
      const response = await fetch('/api/shopify/checkout-hosted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartId: cart.id })
      });
      
      const data = await response.json();
      
      if (data.success && data.checkout?.webUrl) {
        console.log('✅ API Response successful');
        console.log('📋 Full API response:', JSON.stringify(data, null, 2));
        console.log('🔗 URL from API:', data.checkout.webUrl);
        console.log('🎨 Custom items preserved:', data.checkout.customItemsCount);
        
        // CRITICAL: Log the exact URL we're about to redirect to
        console.log('🚀 ABOUT TO REDIRECT TO:', data.checkout.webUrl);
        console.log('🚀 URL TYPE:', typeof data.checkout.webUrl);
        console.log('🚀 URL LENGTH:', data.checkout.webUrl.length);
        
        // Add a small delay to ensure console.log appears
        setTimeout(() => {
          console.log('🚀 EXECUTING REDIRECT NOW TO:', data.checkout.webUrl);
          window.location.href = data.checkout.webUrl;
        }, 100);
      } else {
        console.error('❌ Failed to create checkout:', data.error);
        setError(`Failed to create checkout: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Checkout error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Network error: ${errorMessage}`);
    }
  };

  const fixCartQuantities = async () => {
    if (!cart) return;
    
    setError(null);
    try {
      const response = await fetch('/api/shopify/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'fix-quantities',
          cartId: cart.id
        })
      });

      if (response.ok) {
        await fetchCart(); // Refresh cart data
        setError('Cart quantities have been fixed! ✅');
        // Clear success message after 3 seconds
        setTimeout(() => setError(null), 3000);
      } else {
        throw new Error('Failed to fix cart quantities');
      }
    } catch (error) {
      console.error('Error fixing cart quantities:', error);
      setError('Failed to fix cart quantities');
    }
  };

  const debugVariant = async () => {
    if (!cart || cart.lines.edges.length === 0) return;
    
    const variantId = cart.lines.edges[0].node.merchandise.id;
    console.log('🔍 Debugging variant:', variantId);
    
    try {
      const response = await fetch('/api/shopify/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'debug-variant',
          variantId: variantId
        })
      });

      const data = await response.json();
      console.log('🔍 Variant debug results:', data);
      
      if (data.success && data.variant) {
        const v = data.variant;
        console.log('📊 VARIANT STATUS:');
        console.log('  - Available for sale:', v.availableForSale);
        console.log('  - Quantity available:', v.quantityAvailable);
        console.log('  - Inventory management:', v.inventoryManagement);
        console.log('  - Inventory policy:', v.inventoryPolicy);
        console.log('  - Inventory quantity:', v.inventoryQuantity);
        console.log('  - Currently not in stock:', v.currentlyNotInStock);
        console.log('  - Product status:', v.product?.status);
        
        setError(`Debug: Available=${v.availableForSale}, Qty=${v.quantityAvailable}, InStock=${!v.currentlyNotInStock} 🔍`);
        setTimeout(() => setError(null), 10000);
      }
    } catch (error) {
      console.error('Error debugging variant:', error);
      setError('Failed to debug variant');
    }
  };

  const listVariants = async () => {
    console.log('📋 Listing all Hoodie variants...');
    
    try {
      const response = await fetch('/api/shopify/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'list-variants',
          productId: 'gid://shopify/Product/9024970850525' // Hoodie product
        })
      });

      const data = await response.json();
      console.log('📋 All variants:', data);
      
      if (data.success && data.variants) {
        console.log('🎯 HOODIE VARIANTS SUMMARY:');
        console.log(`  Total variants: ${data.summary.total}`);
        console.log(`  ✅ Available: ${data.summary.available}`);
        console.log(`  ❌ Unavailable: ${data.summary.unavailable}`);
        
        data.variants.forEach((variant: any, index: number) => {
          const status = variant.availableForSale ? '✅' : '❌';
          const options = variant.selectedOptions.map((opt: any) => `${opt.name}: ${opt.value}`).join(', ');
          console.log(`  ${status} ${variant.title} (${options}) - ID: ${variant.id}`);
        });
        
        const availableVariants = data.variants.filter((v: any) => v.availableForSale);
        if (availableVariants.length > 0) {
          const firstAvailable = availableVariants[0];
          setError(`Found ${availableVariants.length} available variants! Try: ${firstAvailable.title} (${firstAvailable.id}) 📋`);
        } else {
          setError(`No available variants found! Please check Shopify admin and enable "Available for sale" 📋`);
        }
        setTimeout(() => setError(null), 15000);
      }
    } catch (error) {
      console.error('Error listing variants:', error);
      setError('Failed to list variants');
    }
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

      if (response.ok) {
        // Clear cart from localStorage and reset state
        localStorage.removeItem('pixelme-cart-id');
        setCart(null);
        setError('Cart cleared! Go back to the editor to add items. ✅');
        // Trigger cart update event
        window.dispatchEvent(new CustomEvent('cart-updated'));
        // Clear success message after 3 seconds
        setTimeout(() => setError(null), 3000);
      } else {
        throw new Error('Failed to clear cart');
      }
    } catch (error) {
      console.error('Error clearing cart:', error);
      setError('Failed to clear cart');
    }
  };

  const continueShopping = () => {
    router.push('/');
  };

  const getCustomAttribute = (attributes: Array<{key: string; value: string}>, key: string) => {
    return attributes.find(attr => attr.key === key)?.value || '';
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your cart...</p>
        </div>
      </main>
    );
  }

  if (!cart || cart.lines.edges.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Your Cart</h1>
                <p className="text-gray-600">Manage your PixelMe items</p>
              </div>
            </div>
          </div>

          {/* Empty cart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-600 mb-6">Start creating your custom PixelMe clothing!</p>
            <button
              onClick={continueShopping}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
            >
              Start Shopping
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Your Cart</h1>
              <p className="text-gray-600">{cart.totalQuantity} item{cart.totalQuantity !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className={`border rounded-lg p-4 mb-6 ${
            error.includes('✅') 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : error.includes('🔍')
              ? 'bg-blue-50 border-blue-200 text-blue-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center justify-between">
              <p>{error}</p>
              {/* Show fix button for quantity issues */}
              {!error.includes('✅') && !error.includes('🔍') && !error.includes('📋') && error.includes('quantity') && (
                <div className="flex gap-2">
                  <button
                    onClick={fixCartQuantities}
                    className="ml-4 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Fix Cart
                  </button>
                  <button
                    onClick={debugVariant}
                    className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                  >
                    Debug
                  </button>
                  <button
                    onClick={listVariants}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    List Variants
                  </button>
                  <button
                    onClick={clearCart}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                  >
                    Clear Cart
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Prominent warning for broken cart items */}
        {cart && cart.lines.edges.some(({ node }) => node.quantity === 0) && (
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-900 mb-2">
                  🚫 Cart Cannot Be Updated
                </h3>
                <p className="text-red-800 mb-4">
                  Your cart items are stuck at quantity 0 because the Shopify product variant is not configured as "Available for sale". 
                  The + button won't work until this is fixed.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={clearCart}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition-colors"
                  >
                    🗑️ Clear Cart & Start Fresh
                  </button>
                  <button
                    onClick={() => window.open('/edit', '_self')}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
                  >
                    🎨 Go Back to Editor
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Items</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {cart.lines.edges.map(({ node: item }) => {
                  const image = item.merchandise.product.images.edges[0]?.node;
                  const customImageUrl = getCustomAttribute(item.attributes, 'custom_design_url');
                  const customStyle = getCustomAttribute(item.attributes, 'style');
                  const clothingType = getCustomAttribute(item.attributes, 'clothing_type');
                  const position = getCustomAttribute(item.attributes, 'position');
                  const color = item.merchandise.selectedOptions.find(opt => opt.name === 'Color')?.value;
                  const size = item.merchandise.selectedOptions.find(opt => opt.name === 'Size')?.value;
                  
                  return (
                    <div key={item.id} className="p-6">
                      <div className="flex gap-4">
                        {/* Product Images Section */}
                        <div className="flex-shrink-0">
                          {/* Main Product Image */}
                          <div className="w-28 h-28 bg-gray-100 rounded-lg overflow-hidden relative">
                            {image ? (
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
                            
                            {/* Custom design indicator */}
                            {customImageUrl && (
                              <div className="absolute top-1 right-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded text-[10px] font-bold shadow-md">
                                CUSTOM
                              </div>
                            )}
                          </div>

                          {/* Custom Design Preview - shown as a patch below the main image */}
                          {customImageUrl && (
                            <div className="mt-3 w-28">
                              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                                <div className="px-2 py-1 bg-gray-50 border-b border-gray-200">
                                  <p className="text-xs font-medium text-gray-600 text-center">Custom Design</p>
                                  {position && (
                                    <p className="text-xs text-green-600 font-medium text-center mt-1">
                                      {position.charAt(0).toUpperCase() + position.slice(1)}
                                    </p>
                                  )}
                                </div>
                                <div className="p-2">
                                  <img
                                    src={customImageUrl}
                                    alt="Custom design preview"
                                    className="w-full h-16 object-cover rounded border border-gray-100"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Product Details */}
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">
                            {customImageUrl ? `Custom ${item.merchandise.product.title}` : item.merchandise.product.title}
                          </h3>
                          {customStyle && (
                            <p className="text-sm text-blue-600 font-medium mb-1">
                              {customStyle} Style
                            </p>
                          )}
                          <p className="text-sm text-gray-600 mb-2">
                            {item.merchandise.title}
                          </p>
                          {(color || size) && (
                            <div className="flex gap-4 text-sm text-gray-600 mb-2">
                              {color && <span>Color: {color}</span>}
                              {size && <span>Size: {size}</span>}
                            </div>
                          )}
                          <p className="text-lg font-semibold text-gray-900">
                            ${parseFloat(item.merchandise.price.amount).toFixed(2)}
                          </p>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-2">
                            {(() => {
                              // Display quantity: show 1 if quantity is 0 (workaround for Shopify issue)
                              const displayQuantity = item.quantity === 0 ? 1 : item.quantity;
                              
                              return (
                                <>
                                  <button
                                    onClick={() => updateQuantity(item.id, Math.max(0, displayQuantity - 1))}
                                    disabled={updating === item.id || displayQuantity <= 1}
                                    className="w-8 h-8 border-2 border-gray-400 rounded-md flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <svg className="w-4 h-4 stroke-black font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
                                    </svg>
                                  </button>
                                  <span className="w-8 text-center font-bold text-gray-900">
                                    {updating === item.id ? '...' : displayQuantity}
                                  </span>
                                  <button
                                    onClick={() => updateQuantity(item.id, displayQuantity + 1)}
                                    disabled={updating === item.id}
                                    className="w-8 h-8 border-2 border-gray-400 rounded-md flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <svg className="w-4 h-4 stroke-black font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                  </button>
                                </>
                              );
                            })()}
                          </div>
                          <button
                            onClick={() => removeItem(item.id)}
                            disabled={updating === item.id}
                            className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
              
              {/* Check if cart has broken quantity items */}
              {(() => {
                const hasBrokenItems = cart.lines.edges.some(({ node }) => 
                  node.quantity === 0 // Just check if any line item has quantity 0
                );
                
                if (hasBrokenItems) {
                  return (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                      <p className="text-yellow-800 text-sm mb-3">
                        ⚠️ Cart has configuration issues. Items can't be updated due to Shopify product settings.
                      </p>
                      <button
                        onClick={clearCart}
                        className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors text-sm"
                      >
                        Clear Cart & Start Fresh
                      </button>
                    </div>
                  );
                }
                return null;
              })()}
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({cart.totalQuantity} item{cart.totalQuantity !== 1 ? 's' : ''})</span>
                  <span>${parseFloat(cart.cost.subtotalAmount.amount).toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between font-semibold text-gray-900">
                    <span>Total</span>
                    <span>${parseFloat(cart.cost.totalAmount.amount).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {(() => {
                  // Check for items with actual quantity > 0 OR items with quantity 0 (which we treat as 1)
                  const hasItemsWithQuantity = cart.lines.edges.some(({ node }) => 
                    node.quantity > 0 || (node.quantity === 0 && cart.lines.edges.length > 0)
                  );
                  const canCheckout = hasItemsWithQuantity; // Removed cart.checkoutUrl dependency
                  
                  return (
                    <button
                      onClick={proceedToCheckout}
                      disabled={!canCheckout}
                      className={`w-full px-6 py-3 rounded-lg font-semibold transition-colors ${
                        canCheckout
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {canCheckout ? 'Proceed to Checkout' : 'Add Items to Checkout'}
                    </button>
                  );
                })()}
                <button
                  onClick={continueShopping}
                  className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
                >
                  Continue Shopping
                </button>

              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 