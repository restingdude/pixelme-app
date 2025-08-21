'use client';

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import CartIcon from "../components/CartIcon";

export default function Home() {
  const router = useRouter();
  const [cachedClothing, setCachedClothing] = useState<string | null>(null);
  const [hoveredStyle, setHoveredStyle] = useState<string | null>(null);
  const [scrollY, setScrollY] = useState(0);

  // Load cached data on component mount
  useEffect(() => {
    const clothing = localStorage.getItem('pixelme-selected-clothing');
    setCachedClothing(clothing);
  }, []);

  // Handle scroll for hoodie parallax effect
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleGetStarted = () => {
    // Mark that user has seen the welcome screen
    localStorage.setItem('pixelme-seen-welcome', 'true');
    router.push('/create');
  };

  const styles = [
    { id: 'style1', name: 'Classic Cartoon', image: '/Homepage/style1.png' },
    { id: 'style2', name: 'Animated Comedy', image: '/Homepage/style2.png' },
    { id: 'style3', name: 'Anime Fantasy', image: '/Homepage/style3.png' },
    { id: 'style4', name: 'Paper Animation', image: '/Homepage/style4.png' },
    { id: 'style5', name: 'Action Anime', image: '/Homepage/style5.png' },
  ];

  return (
    <main className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-center p-6 relative">
        <div className="absolute right-6">
          <CartIcon />
        </div>
        <div>
          <Image
            src="/logo.png"
            alt="PixelMe"
            width={160}
            height={64}
            className="h-12 w-auto"
            priority
          />
        </div>
      </div>

      {/* Main Content - Responsive Layout */}
      <div className="flex-1 relative">
        {/* Background Hoodie - Always Visible, Responsive */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 flex items-start justify-center">
            <div 
              className="relative translate-x-8 sm:translate-x-16 md:translate-x-32 lg:translate-x-48 xl:translate-x-56 transition-transform duration-200"
              style={{
                transform: `translateY(${-128 + scrollY * 0.8}px)`
              }}
            >
              <img
                src="/clothes/hoodie.png"
                alt="Hoodie"
                className="h-auto w-[180vw] sm:w-[160vw] md:w-[140vw] lg:w-[120vw] xl:w-[100vw] max-w-[1200px] opacity-45 sm:opacity-50"
              />
              
              {/* Style Overlay - Consistent Ratio */}
              {hoveredStyle && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-[30vw] h-[30vw] sm:w-[28vw] sm:h-[28vw] md:w-[25vw] md:h-[25vw] lg:w-[20vw] lg:h-[20vw] xl:w-[18vw] xl:h-[18vw] max-w-[250px] max-h-[250px]">
                    <img
                      src={styles.find(s => s.id === hoveredStyle)?.image || ''}
                      alt="Style Preview"
                      className="w-full h-full object-contain transition-opacity duration-300 opacity-85 sm:opacity-90"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Foreground Text Content */}
        <div className="relative z-10 flex items-center min-h-full">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-16">
            <div className="max-w-2xl">
              <div className="space-y-6 lg:space-y-8 text-left">
                <div className="space-y-4 lg:space-y-6">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-7xl font-bold text-gray-900 leading-tight drop-shadow-sm">
                    Transform photos into 
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600"> pixel art</span>
                  </h1>
                  
                  <p className="text-lg sm:text-xl lg:text-2xl text-gray-700 leading-relaxed drop-shadow-sm px-4 lg:px-0">
                    AI-powered cartoon conversion meets premium embroidery. 
                    <br className="hidden sm:block" />Turn your favorite photos into wearable art.
                  </p>
                </div>

                {/* Simple Process */}
                <div className="flex items-center justify-start gap-3 lg:gap-4 text-xs sm:text-sm text-gray-600">
                  <span>📸 Upload</span>
                  <div className="w-6 lg:w-8 h-px bg-gray-400"></div>
                  <span>🎨 Convert</span>
                  <div className="w-6 lg:w-8 h-px bg-gray-400"></div>
                  <span>👕 Embroider</span>
                </div>

                {/* Style Selection Buttons */}
                <div className="space-y-4 px-4 lg:px-0">
                  <h3 className="text-lg lg:text-xl font-semibold text-gray-900 drop-shadow-sm">Choose Your Style</h3>
                  <div className="flex flex-col lg:flex-row lg:flex-wrap lg:justify-start gap-2 lg:gap-4">
                    {styles.map((style) => (
                      <button
                        key={style.id}
                        onMouseEnter={() => setHoveredStyle(style.id)}
                        onMouseLeave={() => setHoveredStyle(null)}
                        onTouchStart={() => setHoveredStyle(style.id)}
                        onTouchEnd={() => setHoveredStyle(null)}
                        className={`px-3 py-1.5 rounded-full border-2 transition-all duration-200 bg-transparent text-left lg:text-center w-fit ${
                          hoveredStyle === style.id
                            ? 'border-purple-500 text-purple-700 bg-purple-50/30'
                            : 'border-gray-300 text-gray-700 hover:border-purple-300 hover:text-purple-600'
                        }`}
                      >
                        <span className="text-sm font-medium whitespace-nowrap">{style.name}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs lg:text-sm text-gray-600">
                    <span className="lg:hidden">Tap styles to see preview</span>
                    <span className="hidden lg:inline">Hover over styles to see preview on the hoodie</span>
                  </p>
                </div>

                {/* CTA */}
                <div className="space-y-4 px-4 lg:px-0">
                  <button
                    onClick={handleGetStarted}
                    className="bg-black text-white px-6 lg:px-8 py-3 lg:py-4 rounded-full font-medium text-base lg:text-lg hover:bg-gray-800 transition-colors inline-flex items-center gap-2 shadow-lg w-auto"
                  >
                    {cachedClothing ? 'Continue Design' : 'Start Creating'}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  
                  {cachedClothing && (
                    <p className="text-sm text-gray-600">
                      Welcome back! You have a design in progress.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </main>
  );
}