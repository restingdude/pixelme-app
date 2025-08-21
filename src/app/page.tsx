'use client';

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import CartIcon from "../components/CartIcon";

export default function Home() {
  const router = useRouter();
  const [cachedClothing, setCachedClothing] = useState<string | null>(null);
  const [hoveredStyle, setHoveredStyle] = useState<string | null>(null);

  // Load cached data on component mount
  useEffect(() => {
    const clothing = localStorage.getItem('pixelme-selected-clothing');
    setCachedClothing(clothing);
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
      <div className="flex items-center justify-between p-6">
        <div className="w-40">
          <Image
            src="/logo.png"
            alt="PixelMe"
            width={160}
            height={64}
            className="h-12 w-auto"
            priority
          />
        </div>
        <CartIcon />
      </div>

      {/* Main Content - Overlay Layout */}
      <div className="flex-1 relative">
        {/* Background Hoodie - Much Larger */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <div className="relative translate-x-56">
            <img
              src="/clothes/hoodie.png"
              alt="Hoodie"
              className="w-auto h-[120vh] max-h-none opacity-20"
            />
            
            {/* Style Overlay */}
            {hoveredStyle && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-48 h-48 lg:w-56 lg:h-56">
                  <img
                    src={styles.find(s => s.id === hoveredStyle)?.image || ''}
                    alt="Style Preview"
                    className="w-full h-full object-contain transition-opacity duration-300 opacity-60"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Foreground Text Content */}
        <div className="relative z-10 flex items-center min-h-full">
          <div className="w-full max-w-7xl mx-auto px-6 lg:px-8 py-16">
            <div className="max-w-2xl">
              <div className="space-y-8">
                <div className="space-y-6">
                  <h1 className="text-5xl lg:text-7xl font-bold text-gray-900 leading-tight drop-shadow-sm">
                    Transform photos into 
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600"> pixel art</span>
                  </h1>
                  
                  <p className="text-xl lg:text-2xl text-gray-700 leading-relaxed drop-shadow-sm">
                    AI-powered cartoon conversion meets premium embroidery. 
                    Turn your favorite photos into wearable art.
                  </p>
                </div>

                {/* Simple Process */}
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>📸 Upload</span>
                  <div className="w-8 h-px bg-gray-400"></div>
                  <span>🎨 Convert</span>
                  <div className="w-8 h-px bg-gray-400"></div>
                  <span>👕 Embroider</span>
                </div>

                {/* Style Selection Buttons */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900 drop-shadow-sm">Choose Your Style</h3>
                  <div className="grid grid-cols-5 gap-2">
                    {styles.map((style) => (
                      <button
                        key={style.id}
                        onMouseEnter={() => setHoveredStyle(style.id)}
                        onMouseLeave={() => setHoveredStyle(null)}
                        className={`p-2 rounded-lg border-2 transition-all duration-200 bg-white/90 backdrop-blur-sm ${
                          hoveredStyle === style.id
                            ? 'border-purple-500 bg-purple-50/90'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        <div className="aspect-square relative">
                          <img
                            src={style.image}
                            alt={style.name}
                            className="w-full h-full object-cover rounded"
                          />
                        </div>
                        <p className="text-xs mt-2 font-medium text-gray-700">{style.name}</p>
                      </button>
                    ))}
                  </div>
                  <p className="text-sm text-gray-600">
                    Hover over styles to see preview on the hoodie
                  </p>
                </div>

                {/* CTA */}
                <div className="space-y-4">
                  <button
                    onClick={handleGetStarted}
                    className="bg-black text-white px-8 py-4 rounded-full font-medium text-lg hover:bg-gray-800 transition-colors inline-flex items-center gap-2 shadow-lg"
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