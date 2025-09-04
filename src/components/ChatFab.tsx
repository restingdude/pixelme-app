'use client';

import { useState, useEffect } from 'react';

// TypeScript declarations for Crisp
declare global {
  interface Window {
    $crisp?: any[];
    CRISP_WEBSITE_ID?: string;
  }
}

export default function ChatFab() {
  const [isOpen, setIsOpen] = useState(false);
  const [crispLoaded, setCrispLoaded] = useState(false);

  // Crisp Chat configuration
  const CRISP_WEBSITE_ID = "cfb892a7-c4e9-48a8-9dc1-35abb89a2f4e"; // Your Crisp Website ID

  useEffect(() => {
    // Load Crisp Chat script
    if (typeof window !== 'undefined' && !window.$crisp) {
      console.log('Loading Crisp Chat script...');
      window.$crisp = [];
      window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;
      
      const script = document.createElement('script');
      script.src = 'https://client.crisp.chat/l.js';
      script.async = true;
      
      script.onload = () => {
        console.log('Crisp script loaded');
        setCrispLoaded(true);
        // Wait a bit for Crisp to initialize
        setTimeout(() => {
          if (window.$crisp) {
            console.log('Crisp initialized and ready');
          }
        }, 1000);
      };
      
      script.onerror = (error) => {
        console.error('Failed to load Crisp script:', error);
      };
      
      document.head.appendChild(script);
    }
  }, []);

  const handleChatClick = () => {
    console.log('Chat button clicked');
    console.log('Crisp loaded:', crispLoaded);
    console.log('Window $crisp:', window.$crisp);
    
    if (window.$crisp) {
      // Open Crisp chat
      console.log('Opening Crisp chat');
      window.$crisp.push(['do', 'chat:show']);
      window.$crisp.push(['do', 'chat:open']);
    } else {
      console.log('Crisp not available, opening WhatsApp fallback');
      // Fallback to WhatsApp if Crisp isn't loaded
      const whatsappNumber = "6434671351";
      const message = "Hi! I need help with PixelMe.";
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  return (
    <>
      {/* Chat FAB Button */}
      <button
        onClick={handleChatClick}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-12 h-12 sm:w-14 sm:h-14 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group touch-manipulation"
        aria-label="Open live chat"
      >
        <svg 
          className="w-5 h-5 sm:w-6 sm:h-6" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
          />
        </svg>
        
        {/* Tooltip - hidden on mobile */}
        <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap hidden sm:block">
          Live Chat
          <div className="absolute top-full right-3 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      </button>

    </>
  );
}