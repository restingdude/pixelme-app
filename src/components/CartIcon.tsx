'use client';

import { useState } from 'react';
import { useCart } from '../hooks/useCart';
import CartPopup from './CartPopup';

export default function CartIcon() {
  const { cartCount, cartTotal, loading } = useCart();
  const [showCartPopup, setShowCartPopup] = useState(false);
  
  console.log('CartIcon - cartCount:', cartCount, 'cartTotal:', cartTotal, 'loading:', loading);

  const handleCartClick = () => {
    setShowCartPopup(true);
  };

  return (
    <>
      <button
        onClick={handleCartClick}
        className="relative p-3 sm:p-4 bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 group touch-manipulation"
        title={`Cart - ${cartCount} item${cartCount !== 1 ? 's' : ''} - $${parseFloat(cartTotal).toFixed(2)}`}
      >
        {/* Cart Icon */}
        <svg 
          className="w-5 h-5 sm:w-7 sm:h-7 text-white transition-colors" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5M17 21a2 2 0 100-4 2 2 0 000 4zM9 21a2 2 0 100-4 2 2 0 000 4z" 
          />
        </svg>
        
        {/* Cart Count Badge */}
        {cartCount > 0 && (
          <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-red-500 text-white text-xs font-bold rounded-full min-w-[1.25rem] sm:min-w-[1.5rem] h-5 sm:h-6 flex items-center justify-center px-1 border-2 border-white shadow-lg z-10">
            {cartCount > 99 ? '99+' : cartCount}
          </span>
        )}
        
        {/* Loading indicator */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-blue-600 bg-opacity-75 rounded-full">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </button>

      {/* Cart Popup */}
      <CartPopup 
        isOpen={showCartPopup} 
        onClose={() => setShowCartPopup(false)} 
      />
    </>
  );
} 