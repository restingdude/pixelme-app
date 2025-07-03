import { useState, useEffect } from 'react';

interface CartData {
  id: string;
  totalQuantity: number;
  cost: {
    totalAmount: {
      amount: string;
      currencyCode: string;
    };
  };
}

export function useCart() {
  const [cartData, setCartData] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCartData = async () => {
    const cartId = localStorage.getItem('pixelme-cart-id');
    if (!cartId) {
      setCartData(null);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/shopify/cart?cartId=${encodeURIComponent(cartId)}`);
      const data = await response.json();

      console.log('useCart - Raw API response:', data);
      console.log('useCart - Cart object:', data.cart);
      console.log('useCart - totalQuantity:', data.cart?.totalQuantity);

      if (data.success && data.cart) {
        // WORKAROUND: Use line count instead of totalQuantity since Shopify is returning quantity: 0
        const actualLineCount = data.cart.lines?.edges?.length || 0;
        const shopifyTotalQuantity = data.cart.totalQuantity;
        
        console.log('Cart data updated:', shopifyTotalQuantity, 'items (Shopify count)');
        console.log('Actual line items:', actualLineCount, 'lines');
        console.log('Using line count as workaround for cart count');
        
        setCartData({
          id: data.cart.id,
          totalQuantity: actualLineCount, // Use line count instead of Shopify's totalQuantity
          cost: data.cart.cost
        });
      } else {
        console.log('useCart - Cart data invalid or missing:', data);
        // Cart might be expired or invalid
        localStorage.removeItem('pixelme-cart-id');
        setCartData(null);
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
      setCartData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCartData();
    
    // Listen for cart updates
    const handleCartUpdate = () => {
      console.log('Cart update event received, refetching cart data...');
      fetchCartData();
    };
    
    window.addEventListener('cart-updated', handleCartUpdate);
    window.addEventListener('storage', handleCartUpdate); // Listen for localStorage changes
    
    return () => {
      window.removeEventListener('cart-updated', handleCartUpdate);
      window.removeEventListener('storage', handleCartUpdate);
    };
  }, []);

  const refreshCart = () => {
    fetchCartData();
  };

  return {
    cartData,
    loading,
    refreshCart,
    cartCount: cartData?.totalQuantity || 0,
    cartTotal: cartData?.cost?.totalAmount?.amount || '0'
  };
} 