'use client';

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import CartIcon from "../../components/CartIcon";

interface Variant {
  id: string;
  title: string;
  price: string;
  sku: string;
  inventoryQuantity: number;
  selectedOptions: Array<{
    name: string;
    value: string;
  }>;
  image?: {
    url: string;
    altText: string;
  };
}

interface Product {
  id: string;
  title: string;
  handle: string;
  description: string;
  productType: string;
  vendor: string;
  status: string;
  options?: Array<{
    id: string;
    name: string;
    values: string[];
  }>;
  variants: {
    edges: Array<{
      node: Variant;
    }>
  };
  images?: {
    edges: Array<{
      node: {
        url: string;
        altText: string;
      }
    }>
  };
}

export default function Create() {
  const router = useRouter();
  const [cachedClothing, setCachedClothing] = useState<string | null>(null);
  const [cachedColor, setCachedColor] = useState<string | null>(null);
  const [cachedSize, setCachedSize] = useState<string | null>(null);
  const [cachedVariantId, setCachedVariantId] = useState<string | null>(null);
  const [cachedImage, setCachedImage] = useState<string | null>(null);
  const [cachedStyle, setCachedStyle] = useState<string | null>(null);
  const [cachedConversionResult, setCachedConversionResult] = useState<string | null>(null);
  const [cachedEditedImage, setCachedEditedImage] = useState<string | null>(null);
  const [cachedColorReducedImage, setCachedColorReducedImage] = useState<string | null>(null);
  const [cachedFinalImage, setCachedFinalImage] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  
  // Refs for auto-scrolling
  const colorSectionRef = useRef<HTMLDivElement>(null);
  const sizeSectionRef = useRef<HTMLDivElement>(null);

  // Load cached data and products on component mount
  useEffect(() => {
    const clothing = localStorage.getItem('pixelme-selected-clothing');
    const color = localStorage.getItem('pixelme-selected-color');
    const size = localStorage.getItem('pixelme-selected-size');
    const variantId = localStorage.getItem('pixelme-selected-variant-id');
    const image = localStorage.getItem('pixelme-uploaded-image');
    const style = localStorage.getItem('pixelme-selected-style');
    const conversionResult = localStorage.getItem('pixelme-conversion-result');
    const editedImage = localStorage.getItem('pixelme-edited-image');
    const colorReducedImage = localStorage.getItem('pixelme-color-reduced-image');
    const finalImage = localStorage.getItem('pixelme-final-image');
    
    setCachedClothing(clothing);
    setCachedColor(color);
    setCachedSize(size);
    setCachedVariantId(variantId);
    setCachedImage(image);
    setCachedStyle(style);
    setCachedConversionResult(conversionResult);
    setCachedEditedImage(editedImage);
    setCachedColorReducedImage(colorReducedImage);
    setCachedFinalImage(finalImage);

    // Set selected product, color, and size if we have cached data
    if (clothing) {
      setSelectedProduct(clothing);
    }
    if (color) {
      setSelectedColor(color);
    }
    if (size) {
      setSelectedSize(size);
    }

    // Fetch products from Shopify
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      // Try to load cached products first
      const cachedProducts = localStorage.getItem('pixelme-products-cache');
      if (cachedProducts) {
        try {
          const parsedProducts = JSON.parse(cachedProducts);
          setProducts(parsedProducts);
          setLoading(false);
        } catch (error) {
          console.warn('Failed to parse cached products:', error);
        }
      }
      
      const response = await fetch('/api/shopify/products');
      const data = await response.json();
      
      if (data.success) {
        setProducts(data.products || []);
        // Cache products for next time
        localStorage.setItem('pixelme-products-cache', JSON.stringify(data.products || []));
      } else {
        console.error('Failed to fetch products:', data.error);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (clothingType: string) => {
    setSelectedProduct(clothingType);
    setSelectedColor(null); // Reset color selection when product changes
    setSelectedSize(null); // Reset size selection when product changes
    // Cache the clothing selection but don't proceed yet
    localStorage.setItem('pixelme-selected-clothing', clothingType);
    localStorage.removeItem('pixelme-selected-color');
    localStorage.removeItem('pixelme-selected-size');
    localStorage.removeItem('pixelme-selected-variant-id');
    setCachedClothing(clothingType);
    setCachedColor(null);
    setCachedSize(null);
    setCachedVariantId(null);
    
    // Auto-scroll to color selection
    setTimeout(() => {
      colorSectionRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }, 100);
  };

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    setSelectedSize(null); // Reset size selection when color changes
    // Cache the color selection but don't proceed yet
    localStorage.setItem('pixelme-selected-color', color);
    localStorage.removeItem('pixelme-selected-size');
    localStorage.removeItem('pixelme-selected-variant-id');
    setCachedColor(color);
    setCachedSize(null);
    setCachedVariantId(null);
    
    // Auto-scroll to size selection
    setTimeout(() => {
      sizeSectionRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }, 100);
  };

  const handleSizeSelect = (size: string) => {
    if (!selectedProduct || !selectedColor) return;

    // Find the selected product
    const product = products.find(p => 
      p.title.toLowerCase().includes(selectedProduct) || 
      p.handle.toLowerCase().includes(selectedProduct)
    );

    if (!product) return;

    // Find the variant that matches the selected color and size
    const variant = product.variants.edges.find(edge => {
      const options = edge.node.selectedOptions;
      if (!options || !Array.isArray(options)) return false;
      const colorOption = options.find(opt => opt.name === 'Color');
      const sizeOption = options.find(opt => opt.name === 'Size');
      return colorOption?.value === selectedColor && sizeOption?.value === size;
    });

    if (!variant) {
      console.error('No variant found for color:', selectedColor, 'size:', size);
      return;
    }

    // Check if the variant is in stock
    if (variant.node.inventoryQuantity <= 0) {
      alert('Sorry, this size is currently out of stock. Please select a different size.');
      return;
    }

    // Cache the size and variant ID selection
    localStorage.setItem('pixelme-selected-size', size);
    localStorage.setItem('pixelme-selected-variant-id', variant.node.id);
    setCachedSize(size);
    setCachedVariantId(variant.node.id);
    
    // Now proceed to upload step
    router.push(`/upload?clothing=${selectedProduct}&color=${selectedColor}&size=${size}&variantId=${encodeURIComponent(variant.node.id)}`);
  };

  const handleClear = async () => {
    // Check if cart has items before clearing it
    const cartId = localStorage.getItem('pixelme-cart-id');
    let shouldPreserveCart = false;
    
    if (cartId) {
      try {
        const response = await fetch(`/api/shopify/cart?cartId=${encodeURIComponent(cartId)}`);
        const data = await response.json();
        
        if (data.success && data.cart && data.cart.lines.edges.length > 0) {
          shouldPreserveCart = true;
          console.log('🛒 Preserving cart with', data.cart.lines.edges.length, 'item(s) while clearing steps');
        }
      } catch (error) {
        console.error('Error checking cart status:', error);
        // If we can't check cart status, preserve it to be safe
        shouldPreserveCart = true;
      }
    }
    
    // Clear all editing session data
    localStorage.removeItem('pixelme-uploaded-image');
    localStorage.removeItem('pixelme-selected-style');
    localStorage.removeItem('pixelme-current-step');
    localStorage.removeItem('pixelme-selected-clothing');
    localStorage.removeItem('pixelme-selected-color');
    localStorage.removeItem('pixelme-selected-size');
    localStorage.removeItem('pixelme-selected-variant-id');
    localStorage.removeItem('pixelme-conversion-result');
    localStorage.removeItem('pixelme-edited-image');
    localStorage.removeItem('pixelme-color-reduced-image'); // Step 6 embroidery conversion
    localStorage.removeItem('pixelme-final-image'); // Final processed image
    localStorage.removeItem('pixelme-selected-position'); // Image positioning presets
    localStorage.removeItem('pixelme-zoom-level'); // Zoom level settings
    
    // Only clear cart if it's empty
    if (!shouldPreserveCart) {
      localStorage.removeItem('pixelme-cart-id');
      console.log('🗑️ Cleared empty cart');
    } else {
      console.log('🛒 Cart preserved - contains items for multiple orders');
    }
    
    // Reset local state
    setCachedClothing(null);
    setCachedColor(null);
    setCachedSize(null);
    setCachedVariantId(null);
    setCachedImage(null);
    setCachedStyle(null);
    setCachedConversionResult(null);
    setCachedEditedImage(null);
    setCachedColorReducedImage(null);
    setCachedFinalImage(null);
    setSelectedProduct(null);
    setSelectedColor(null);
    setSelectedSize(null);
  };

  // Get available colors for the selected product (all colors regardless of stock)
  const getAvailableColors = () => {
    if (!selectedProduct) return [];

    const product = products.find(p => 
      p.title.toLowerCase().includes(selectedProduct) || 
      p.handle.toLowerCase().includes(selectedProduct)
    );

    if (!product) return [];

    // Get all colors regardless of stock
    const allColors = new Set<string>();
    
    product.variants.edges.forEach(edge => {
      const variant = edge.node;
      
      if (variant.selectedOptions && Array.isArray(variant.selectedOptions)) {
        // Try different possible color option names
        const colorOption = variant.selectedOptions.find(opt => 
          opt.name === 'Color' || 
          opt.name === 'color' || 
          opt.name === 'Colour' || 
          opt.name === 'colour'
        );
        
        if (colorOption?.value) {
          allColors.add(colorOption.value);
        }
      }
    });

    return Array.from(allColors);
  };

  // Get available sizes for the selected product and color (all sizes regardless of stock)
  const getAvailableSizes = () => {
    if (!selectedProduct || !selectedColor) return [];

    const product = products.find(p => 
      p.title.toLowerCase().includes(selectedProduct) || 
      p.handle.toLowerCase().includes(selectedProduct)
    );

    if (!product) return [];

    // Find all variants that match the selected color regardless of stock
    const matchingVariants = product.variants.edges.filter(edge => {
      if (!edge.node.selectedOptions || !Array.isArray(edge.node.selectedOptions)) return false;
      const colorOption = edge.node.selectedOptions.find(opt => opt.name === 'Color');
      return colorOption?.value === selectedColor;
    });

    // Extract unique sizes from all matching variants
    const sizes = matchingVariants.map(edge => {
      if (!edge.node.selectedOptions || !Array.isArray(edge.node.selectedOptions)) return null;
      const sizeOption = edge.node.selectedOptions.find(opt => opt.name === 'Size');
      return sizeOption?.value;
    }).filter((size): size is string => Boolean(size));

    return [...new Set(sizes)];
  };


  // Get product image for a specific color
  const getProductImageForColor = (clothingType: string, color: string | null) => {
    const product = products.find(p => 
      p.title.toLowerCase().includes(clothingType) || 
      p.handle.toLowerCase().includes(clothingType)
    );

    if (!product || !product.images?.edges) {
      return `/clothes/${clothingType}.png`; // fallback to local image
    }

    // If no color selected, return first image
    if (!color) {
      return product.images.edges[0]?.node?.url || `/clothes/${clothingType}.png`;
    }

    // Try to find an image that matches the color in its alt text, filename, or by color-specific mapping
    const colorLower = color.toLowerCase();
    console.log(`🎨 Looking for images matching color: ${color} (${colorLower})`);
    console.log(`📷 Available images:`, product.images.edges.map(edge => ({
      url: edge.node.url,
      altText: edge.node.altText,
      filename: edge.node.url.split('/').pop()
    })));
    
    // Enhanced color matching - try multiple variations and patterns
    const colorImage = product.images.edges.find(edge => {
      const altText = edge.node.altText?.toLowerCase() || '';
      const url = edge.node.url.toLowerCase();
      const filename = url.split('/').pop() || '';
      
      console.log(`🔍 Checking image: ${filename}`);
      console.log(`   - altText: "${altText}"`);
      console.log(`   - url: "${url}"`);
      
      // Check if alt text or URL contains the color name as a standalone word
      // Use word boundaries to avoid partial matches like "white" in "white background"
      const colorRegex = new RegExp(`\\b${colorLower}\\b`, 'i');
      const filenameColorRegex = new RegExp(colorLower, 'i');
      
      // For filename, we want the color to be at the start (like "BlackHoodie.png")
      // For alt text, we want it as a standalone word describing the product color
      const filenameMatch = filenameColorRegex.test(filename) && filename.toLowerCase().startsWith(colorLower);
      const altTextMatch = colorRegex.test(altText) && altText.includes(`${colorLower} hoodie`);
      
      if (filenameMatch || altTextMatch) {
        console.log(`✅ Direct match found for ${colorLower} - filename: ${filenameMatch}, altText: ${altTextMatch}`);
        return true;
      }
      
      // Check for color variations (e.g., "Black" -> "black", "blk")
      const colorVariations: { [key: string]: string[] } = {
        'black': ['black', 'blk'],
        'white': ['white', 'wht'],
        'navy': ['navy', 'nvy'],
        'grey': ['grey', 'gray', 'gry'],
        'gray': ['grey', 'gray', 'gry'],
        'red': ['red'],
        'blue': ['blue', 'blu'],
        'green': ['green', 'grn'],
        'yellow': ['yellow', 'ylw'],
        'orange': ['orange', 'org'],
        'purple': ['purple', 'prpl'],
        'pink': ['pink'],
        'brown': ['brown', 'brn'],
        'maroon': ['maroon', 'mrn'],
        'charcoal': ['charcoal', 'char'],
        'heather': ['heather', 'hthr'],
        'beige': ['beige', 'cream', 'tan']
      };
      
      const variations = colorVariations[colorLower] || [colorLower];
      const hasVariationMatch = variations.some(variation => {
        const variationRegex = new RegExp(`\\b${variation}\\b`, 'i');
        const filenameVariationMatch = filename.toLowerCase().startsWith(variation);
        const altTextVariationMatch = variationRegex.test(altText) && altText.includes(`${variation} hoodie`);
        
        return filenameVariationMatch || altTextVariationMatch;
      });
      
      if (hasVariationMatch) {
        console.log(`✅ Color variation match found with: ${variations.join(', ')}`);
      }
      
      return hasVariationMatch;
    });

    // If we found a color-specific image, use it
    if (colorImage?.node?.url) {
      return colorImage.node.url;
    }

    // If no color-specific image found, check if there are images organized by variant
    console.log(`🔄 No color-specific image found, checking variants for color: ${color}`);
    
    // Find the variant that matches the selected color (pick any size, just for color)
    const variant = product.variants.edges.find(edge => {
      const options = edge.node.selectedOptions;
      if (!options || !Array.isArray(options)) return false;
      const colorOption = options.find(opt => opt.name === 'Color');
      return colorOption?.value === color;
    });

    if (variant?.node?.image?.url) {
      console.log(`✅ Using variant-specific image: ${variant.node.image.url}`);
      return variant.node.image.url;
    }

    // Return first available Shopify image or fallback
    const fallbackImage = product.images.edges[0]?.node?.url || `/clothes/${clothingType}.png`;
    console.log(`⚠️ Using fallback image: ${fallbackImage}`);
    return fallbackImage;
  };

  // Get inventory quantity for a specific color/size combination
  const getInventoryQuantity = (color: string, size: string) => {
    if (!selectedProduct) return 0;

    const product = products.find(p => 
      p.title.toLowerCase().includes(selectedProduct) || 
      p.handle.toLowerCase().includes(selectedProduct)
    );

    if (!product) return 0;

    const variant = product.variants.edges.find(edge => {
      const options = edge.node.selectedOptions;
      if (!options || !Array.isArray(options)) return false;
      const colorOption = options.find(opt => opt.name === 'Color');
      const sizeOption = options.find(opt => opt.name === 'Size');
      return colorOption?.value === color && sizeOption?.value === size;
    });

    return variant?.node.inventoryQuantity || 0;
  };

  // Get total inventory for a color (across all sizes)
  const getTotalInventoryForColor = (color: string) => {
    if (!selectedProduct) return 0;

    const product = products.find(p => 
      p.title.toLowerCase().includes(selectedProduct) || 
      p.handle.toLowerCase().includes(selectedProduct)
    );

    if (!product) return 0;

    return product.variants.edges
      .filter(edge => {
        if (!edge.node.selectedOptions || !Array.isArray(edge.node.selectedOptions)) return false;
        const colorOption = edge.node.selectedOptions.find(opt => opt.name === 'Color');
        return colorOption?.value === color;
      })
      .reduce((total, edge) => total + edge.node.inventoryQuantity, 0);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
      <button
        onClick={() => router.push('/')}
        className="mb-8 hover:opacity-80 transition-opacity"
        title="Go to homepage"
      >
        <Image
          src="/logo.png"
          alt="PixelMe Logo"
          width={200}
          height={80}
          className="w-40 h-auto sm:w-48 md:w-52"
          priority
        />
      </button>
      <div className="w-full max-w-6xl bg-white rounded-lg shadow p-4 sm:p-6 lg:p-8 flex flex-col items-center relative">
        <div className="w-full flex flex-col lg:flex-row lg:items-center gap-4 mb-6">
          {/* Step indicators - responsive layout */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 min-w-0 flex-shrink-0">
            <div className="flex items-center gap-2 min-w-max">
            {/* Step 0 - Welcome */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  router.push('/');
                }}
                className="text-xs sm:text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center border-2 border-transparent transition-all duration-200 cursor-pointer"
                title="Go back to welcome screen"
              >
                📋
              </button>
            </div>
            {cachedClothing ? (
                <div className="flex items-center justify-center p-1 bg-white rounded-lg border-2 border-dashed border-amber-600 w-16 h-16 sm:w-20 sm:h-20">
                {(() => {
                  const stepImage = getProductImageForColor(cachedClothing, cachedColor);
                  return stepImage.startsWith('/clothes/') ? (
                    <Image
                      src={stepImage}
                      alt={`${cachedClothing} ${cachedColor || ''}`}
                      width={60}
                      height={60}
                      className="object-contain w-12 h-12 sm:w-14 sm:h-14"
                      priority
                    />
                  ) : (
                    <img
                      src={stepImage}
                      alt={`${cachedClothing} ${cachedColor || ''}`}
                      className="object-contain w-12 h-12 sm:w-14 sm:h-14"
                    />
                  );
                })()}
              </div>
            ) : (
                <span className={`text-xs sm:text-sm font-semibold ${selectedProduct ? 'text-gray-600 bg-gray-100 border-dashed border-amber-600' : 'text-white bg-purple-600 border-purple-600'} rounded-lg w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center border-2`}>1</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {cachedImage ? (
              <button
                onClick={() => {
                  localStorage.setItem('pixelme-current-step', 'upload');
                  router.push(`/upload?clothing=${cachedClothing}&color=${cachedColor}&size=${cachedSize}&variantId=${encodeURIComponent(cachedVariantId || '')}`);
                }}
                  className="flex items-center justify-center p-1 bg-white rounded-lg border-2 border-transparent hover:shadow-lg transition-all duration-200 cursor-pointer w-16 h-16 sm:w-20 sm:h-20"
                title="Go to image upload step"
              >
                <img
                  src={cachedImage}
                  alt="Uploaded preview"
                    className="object-contain rounded-lg w-12 h-12 sm:w-16 sm:h-16"
                />
              </button>
            ) : (
                <span className={`text-xs sm:text-sm font-semibold ${cachedImage ? 'text-gray-600' : 'text-gray-400'} bg-gray-100 rounded-lg w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center border-2 border-transparent`}>2</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {cachedStyle ? (
              <button
                onClick={() => {
                  localStorage.setItem('pixelme-current-step', 'style');
                  router.push(`/upload?clothing=${cachedClothing}&color=${cachedColor}&size=${cachedSize}&variantId=${encodeURIComponent(cachedVariantId || '')}`);
                }}
                  className="flex items-center justify-center p-1 bg-white rounded-lg border-2 border-transparent hover:shadow-lg transition-all duration-200 cursor-pointer w-16 h-16 sm:w-20 sm:h-20"
                title="Go to style selection step"
              >
                <Image
                  src={`/styles/${cachedStyle === 'Anime Fantasy' ? 'ghibli' : cachedStyle === 'Paper Animation' ? 'southpark' : cachedStyle === 'Animated Comedy' ? 'familyguy' : cachedStyle === 'Action Anime' ? 'dragonball' :  'simpsons'}.png`}
                  alt={`${cachedStyle} Style`}
                  width={60}
                  height={60}
                    className="object-contain rounded-lg w-12 h-12 sm:w-14 sm:h-14"
                />
              </button>
            ) : (
                <span className={`text-xs sm:text-sm font-semibold ${cachedStyle ? 'text-gray-600' : 'text-gray-400'} bg-gray-100 rounded-lg w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center border-2 border-transparent`}>3</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {cachedConversionResult ? (
              <button
                onClick={() => {
                  localStorage.setItem('pixelme-current-step', 'convert');
                  router.push(`/upload?clothing=${cachedClothing}&color=${cachedColor}&size=${cachedSize}&variantId=${encodeURIComponent(cachedVariantId || '')}`);
                }}
                  className="flex items-center justify-center p-1 bg-white rounded-lg border-2 border-transparent hover:shadow-lg transition-all duration-200 cursor-pointer w-16 h-16 sm:w-20 sm:h-20"
                title="Go to convert step"
              >
                <img
                  src={cachedConversionResult}
                  alt="Converted preview"
                  width={60}
                  height={60}
                    className="object-contain rounded-lg w-12 h-12 sm:w-16 sm:h-16"
                />
              </button>
            ) : cachedClothing && cachedImage && cachedStyle ? (
              <button
                onClick={() => {
                  localStorage.setItem('pixelme-current-step', 'convert');
                  router.push(`/upload?clothing=${cachedClothing}&color=${cachedColor}&size=${cachedSize}&variantId=${encodeURIComponent(cachedVariantId || '')}`);
                }}
                  className="text-xs sm:text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center border-2 border-transparent hover:shadow-lg transition-all duration-200 cursor-pointer"
                title="Go to convert step"
              >
                4
              </button>
            ) : (
                <span className="text-xs sm:text-sm font-semibold text-gray-400 bg-gray-100 rounded-lg w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center border-2 border-transparent">4</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {cachedEditedImage ? (
              <button
                onClick={() => {
                  localStorage.setItem('pixelme-current-step', 'edit');
                  router.push('/edit');
                }}
                  className="flex items-center justify-center p-1 bg-white rounded-lg border-2 border-transparent hover:shadow-lg transition-all duration-200 cursor-pointer w-16 h-16 sm:w-20 sm:h-20"
                title="Go to edit step"
              >
                <img
                  src={cachedEditedImage}
                  alt="Edited image preview"
                    className="object-contain rounded-lg w-12 h-12 sm:w-16 sm:h-16"
                />
              </button>
            ) : cachedConversionResult ? (
              <button
                onClick={() => {
                  localStorage.setItem('pixelme-current-step', 'edit');
                  router.push('/edit');
                }}
                  className="text-xs sm:text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center border-2 border-transparent hover:shadow-lg transition-all duration-200 cursor-pointer"
                title="Go to edit step"
              >
                5
              </button>
            ) : (
                <span className="text-xs sm:text-sm font-semibold text-gray-400 bg-gray-100 rounded-lg w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center border-2 border-transparent">5</span>
            )}
          </div>

          {/* Step 6 - Color Reduction */}
          <div className="flex items-center gap-2">
            {cachedColorReducedImage ? (
              <button
                onClick={() => {
                  localStorage.setItem('pixelme-current-step', 'color-reduce');
                  router.push('/edit');
                }}
                className="flex items-center justify-center p-1 bg-white rounded-lg border-2 border-transparent hover:shadow-lg transition-all duration-200 cursor-pointer w-16 h-16 sm:w-20 sm:h-20"
                title="Go to color reduction step"
              >
                <img
                  src={cachedColorReducedImage}
                  alt="Color reduced preview"
                  className="object-contain rounded-lg w-12 h-12 sm:w-16 sm:h-16"
                />
              </button>
            ) : cachedEditedImage ? (
              <button
                onClick={() => {
                  localStorage.setItem('pixelme-current-step', 'color-reduce');
                  router.push('/edit');
                }}
                className="text-xs sm:text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center border-2 border-transparent hover:shadow-lg transition-all duration-200 cursor-pointer"
                title="Go to color reduction step"
              >
                6
              </button>
            ) : (
              <span className="text-xs sm:text-sm font-semibold text-gray-400 bg-gray-100 rounded-lg w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center border-2 border-transparent">6</span>
            )}
          </div>
          
          {/* Step 7 - Preview */}
          <div className="flex items-center gap-2">
            {cachedFinalImage ? (
              <button
                onClick={() => {
                  localStorage.setItem('pixelme-current-step', 'preview');
                  router.push('/edit');
                }}
                className="flex items-center justify-center p-1 bg-white rounded-lg border-2 border-transparent hover:shadow-lg transition-all duration-200 cursor-pointer w-16 h-16 sm:w-20 sm:h-20"
                title="Go to preview step"
              >
                <img
                  src={cachedFinalImage}
                  alt="Final preview"
                  className="object-contain rounded-lg w-12 h-12 sm:w-16 sm:h-16"
                />
              </button>
            ) : cachedColorReducedImage ? (
              <button
                onClick={() => {
                  localStorage.setItem('pixelme-current-step', 'preview');
                  router.push('/edit');
                }}
                className="text-xs sm:text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center border-2 border-transparent hover:shadow-lg transition-all duration-200 cursor-pointer"
                title="Go to preview step"
              >
                7
              </button>
            ) : (
              <span className="text-xs sm:text-sm font-semibold text-gray-400 bg-gray-100 rounded-lg w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center border-2 border-transparent">7</span>
            )}
          </div>
          </div>
          
          {/* Cart and Clear Buttons */}
          <div className="flex items-center gap-3 lg:ml-auto">
            <button
              onClick={handleClear}
              className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center"
              title="Clear all cached data"
            >
              <Image
                src="/redo.png"
                alt="Clear"
                width={32}
                height={32}
                className="object-contain w-6 h-6 sm:w-8 sm:h-8"
              />
            </button>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center gap-8 w-full">
          {loading ? (
            // Loading state
            <div className="flex flex-col sm:flex-row gap-8">
              {[1, 2].map((index) => (
                <div key={index} className="w-full sm:w-80 h-80 bg-gray-200 rounded-lg animate-pulse flex items-center justify-center">
                  <span className="text-gray-400">Loading...</span>
                </div>
              ))}
            </div>
          ) : (
            <>

              {/* Product Selection */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-8 w-full">
                {['hoodie', 'trackies'].map((clothingType) => {
                  // Find the first product for this clothing type
                  const product = products.find(p => 
                    p.title.toLowerCase().includes(clothingType) || 
                    p.handle.toLowerCase().includes(clothingType)
                  );

                  const firstVariantPrice = product?.variants?.edges?.[0]?.node?.price || '29.99';
                  const productImage = getProductImageForColor(clothingType, selectedProduct === clothingType ? selectedColor : null);
                  const isSelected = selectedProduct === clothingType;

                  return (
                    <button 
                      key={clothingType}
                      onClick={() => handleProductSelect(clothingType)}
                      className={`bg-white rounded-lg p-4 flex flex-col items-center justify-center border-2 ${
                        isSelected 
                          ? 'border-dashed border-amber-600 shadow-lg' 
                          : cachedClothing === clothingType 
                          ? 'border-dashed border-green-600' 
                          : 'border-transparent'
                      } hover:border-dashed hover:border-amber-600 hover:shadow-lg transition-all duration-200 cursor-pointer w-full max-w-sm h-64 sm:w-80 sm:h-80`}
                    >
                      {productImage.startsWith('/clothes/') ? (
                        <Image
                          src={productImage}
                          alt={clothingType.charAt(0).toUpperCase() + clothingType.slice(1)}
                          width={240}
                          height={240}
                          className="object-contain max-w-full h-32 sm:max-h-60 mb-4"
                          priority
                        />
                      ) : (
                        <img
                          src={productImage}
                          alt={product?.title || clothingType}
                          className="object-contain max-w-full h-32 sm:max-h-60 mb-4"
                        />
                      )}
                      <div className="text-center">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">
                          {clothingType.charAt(0).toUpperCase() + clothingType.slice(1)}
                        </h3>
                        <p className="text-sm text-gray-500">${firstVariantPrice}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Color Selection - Show when a product is selected */}
              {selectedProduct && (
                <div ref={colorSectionRef} className="w-full max-w-lg mt-6 px-4">
                  <h4 className="text-lg font-semibold text-gray-700 mb-4 text-center">Select Color</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {getAvailableColors().map((color) => {
                      const totalInventory = getTotalInventoryForColor(color);
                      const isOutOfStock = totalInventory === 0;
                      const isLowStock = totalInventory > 0 && totalInventory <= 10;
                      
                      return (
                        <button
                          key={color}
                          onClick={() => handleColorSelect(color)}
                          className={`py-3 px-2 sm:px-4 rounded-lg font-semibold border-2 transition-all duration-200 relative text-sm sm:text-base ${
                            selectedColor === color
                              ? 'border-amber-600 bg-amber-50 text-amber-700'
                              : cachedColor === color
                              ? 'border-green-600 bg-green-50 text-green-700'
                              : isOutOfStock
                              ? 'border-gray-300 bg-gray-50 text-gray-400 cursor-not-allowed'
                              : 'border-gray-300 bg-white text-gray-700 hover:border-amber-600 hover:bg-amber-50'
                          }`}
                          disabled={isOutOfStock}
                        >
                          <div className="flex flex-col items-center">
                            <span className="text-center">{color}</span>
                            {isOutOfStock && (
                              <span className="text-xs text-red-600 mt-1">
                                Out of stock
                              </span>
                            )}
                            {!isOutOfStock && isLowStock && (
                              <span className="text-xs text-orange-600 mt-1">
                                Low stock
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {getAvailableColors().length === 0 && (
                    <div className="text-center py-4">
                      <span className="text-gray-500 text-sm">
                        No color options available for this item.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Size Selection - Show when both product and color are selected */}
              {selectedProduct && selectedColor && (
                <div ref={sizeSectionRef} className="w-full max-w-lg mt-6 px-4">
                  <h4 className="text-lg font-semibold text-gray-700 mb-4 text-center">Select Size</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {getAvailableSizes().map((size) => {
                      const inventory = getInventoryQuantity(selectedColor, size);
                      const isOutOfStock = inventory === 0;
                      const isLowStock = inventory > 0 && inventory <= 5;
                      
                      return (
                        <button
                          key={size}
                          onClick={() => handleSizeSelect(size)}
                          className={`py-3 px-2 sm:px-4 rounded-lg font-semibold border-2 transition-all duration-200 relative text-sm sm:text-base ${
                            cachedSize === size
                              ? 'border-green-600 bg-green-50 text-green-700'
                              : isOutOfStock
                              ? 'border-gray-300 bg-gray-50 text-gray-400 cursor-not-allowed'
                              : 'border-gray-300 bg-white text-gray-700 hover:border-amber-600 hover:bg-amber-50'
                          }`}
                          disabled={isOutOfStock}
                        >
                          <div className="flex flex-col items-center">
                            <span>{size}</span>
                            {isOutOfStock && (
                              <span className="text-xs text-red-600 mt-1">
                                Out of stock
                              </span>
                            )}
                            {!isOutOfStock && isLowStock && (
                              <span className="text-xs text-orange-600 mt-1">
                                Only {inventory} left
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {getAvailableSizes().length === 0 && (
                    <div className="text-center py-4">
                      <span className="text-gray-500 text-sm">
                        No size options available for {selectedColor}.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Floating Cart Button */}
      <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50">
        <CartIcon />
      </div>
    </main>
  );
}