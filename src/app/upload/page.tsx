'use client';

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import CartIcon from "../../components/CartIcon";

function UploadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedClothing = searchParams.get('clothing');
  const selectedColor = searchParams.get('color');
  const selectedSize = searchParams.get('size');
  const selectedVariantId = searchParams.get('variantId');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageRotation, setImageRotation] = useState(0);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [peopleCount, setPeopleCount] = useState<number>(1);
  const [peopleCountSelected, setPeopleCountSelected] = useState<boolean>(false); // Track if user has explicitly selected
  const [imageSize, setImageSize] = useState<string>('7cm');
  const [genders, setGenders] = useState<string[]>(['']);
  const [step, setStep] = useState<'upload' | 'style' | 'convert'>('upload');
  const [isConverting, setIsConverting] = useState(false);
  const [conversionResult, setConversionResult] = useState<string | null>(null);
  const [conversionError, setConversionError] = useState<string | null>(null);
  const [cachedEditedImage, setCachedEditedImage] = useState<string | null>(null);
  const [cachedColorReducedImage, setCachedColorReducedImage] = useState<string | null>(null);
  const [cachedFinalImage, setCachedFinalImage] = useState<string | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  const [showReferencePhoto, setShowReferencePhoto] = useState(false);
  const [showingOriginal, setShowingOriginal] = useState(false);
  const [productsLoading, setProductsLoading] = useState(true);
  const [generationHistory, setGenerationHistory] = useState<Array<{
    id: string;
    imageUrl: string;
    timestamp: number;
    style: string;
  }>>([]);
  
  // Rate limiting state
  const [rateLimitStatus, setRateLimitStatus] = useState<{
    remainingGenerations: number;
    timeUntilReset: number;
    maxGenerations: number;
  } | null>(null);

  // EXIF orientation correction utility
  const getOrientation = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const dataView = new DataView(arrayBuffer);
          
          // Check if it's a JPEG file
          if (dataView.getUint16(0, false) !== 0xFFD8) {
            resolve(1); // Default orientation for non-JPEG files
            return;
          }
          
          let offset = 2;
          let marker = dataView.getUint16(offset, false);
          
          while (offset < dataView.byteLength) {
            if (marker === 0xFFE1) { // EXIF marker
              const exifLength = dataView.getUint16(offset + 2, false);
              const exifData = new DataView(arrayBuffer, offset + 4, exifLength - 2);
              
              // Check for EXIF header
              if (exifData.getUint32(0, false) !== 0x45786966) {
                resolve(1);
                return;
              }
              
              // Determine endianness
              const tiffOffset = 6;
              const endianMarker = exifData.getUint16(tiffOffset, false);
              const littleEndian = endianMarker === 0x4949;
              
              // Find orientation tag (0x0112)
              const ifdOffset = tiffOffset + exifData.getUint32(tiffOffset + 4, littleEndian);
              const tagCount = exifData.getUint16(ifdOffset, littleEndian);
              
              for (let i = 0; i < tagCount; i++) {
                const tagOffset = ifdOffset + 2 + (i * 12);
                const tag = exifData.getUint16(tagOffset, littleEndian);
                
                if (tag === 0x0112) { // Orientation tag
                  const orientation = exifData.getUint16(tagOffset + 8, littleEndian);
                  console.log('📱 EXIF orientation detected:', orientation);
                  resolve(orientation);
                  return;
                }
              }
              break;
            }
            
            offset += 2 + dataView.getUint16(offset + 2, false);
            if (offset >= dataView.byteLength) break;
            marker = dataView.getUint16(offset, false);
          }
          
          resolve(1); // Default orientation if not found
        } catch (error) {
          console.warn('Error reading EXIF data:', error);
          resolve(1); // Default orientation on error
        }
      };
      reader.onerror = () => resolve(1);
      reader.readAsArrayBuffer(file);
    });
  };

  const correctImageOrientation = (file: File, orientation: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      const objectURL = URL.createObjectURL(file);
      
      img.onload = () => {
        try {
          URL.revokeObjectURL(objectURL); // Clean up memory
          
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            // Fallback to normal file reading
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
            return;
          }
          
          const { width, height } = img;
          console.log(`📱 Original image dimensions: ${width}x${height}, orientation: ${orientation}`);
          
          // Reset any existing transformations
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          
          // Set canvas dimensions and apply transformations based on orientation
          switch (orientation) {
            case 1:
              // Normal (no correction needed)
              canvas.width = width;
              canvas.height = height;
              ctx.drawImage(img, 0, 0);
              break;
            case 2:
              // Flip horizontal
              canvas.width = width;
              canvas.height = height;
              ctx.setTransform(-1, 0, 0, 1, width, 0);
              ctx.drawImage(img, 0, 0);
              break;
            case 3:
              // Rotate 180°
              canvas.width = width;
              canvas.height = height;
              ctx.setTransform(-1, 0, 0, -1, width, height);
              ctx.drawImage(img, 0, 0);
              break;
            case 4:
              // Flip vertical
              canvas.width = width;
              canvas.height = height;
              ctx.setTransform(1, 0, 0, -1, 0, height);
              ctx.drawImage(img, 0, 0);
              break;
            case 5:
              // Rotate 90° CCW + flip horizontal (portrait mode, camera upside down)
              canvas.width = height;
              canvas.height = width;
              ctx.setTransform(0, 1, 1, 0, 0, 0);
              ctx.drawImage(img, 0, 0);
              break;
            case 6:
              // Rotate 90° CW (portrait mode, camera rotated left)
              canvas.width = height;
              canvas.height = width;
              ctx.rotate(Math.PI / 2);
              ctx.translate(0, -height);
              ctx.drawImage(img, 0, 0);
              break;
            case 7:
              // Rotate 90° CW + flip horizontal
              canvas.width = height;
              canvas.height = width;
              ctx.rotate(Math.PI / 2);
              ctx.scale(-1, 1);
              ctx.translate(-height, -width);
              ctx.drawImage(img, 0, 0);
              break;
            case 8:
              // Rotate 90° CCW (portrait mode, camera rotated right)
              canvas.width = height;
              canvas.height = width;
              ctx.rotate(-Math.PI / 2);
              ctx.translate(-width, 0);
              ctx.drawImage(img, 0, 0);
              break;
            default:
              // Unknown orientation, use original
              canvas.width = width;
              canvas.height = height;
              ctx.drawImage(img, 0, 0);
              break;
          }
          
          console.log(`📱 Corrected image dimensions: ${canvas.width}x${canvas.height}`);
          
          // Convert to data URL with high quality
          const correctedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
          resolve(correctedDataUrl);
        } catch (error) {
          console.error('Error correcting orientation:', error);
          reject(error);
        }
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(objectURL);
        reject(new Error('Failed to load image'));
      };
      
      img.src = objectURL;
    });
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
    console.log(`📷 Available images:`, product.images.edges.map((edge: any) => ({
      url: edge.node.url,
      altText: edge.node.altText,
      filename: edge.node.url.split('/').pop()
    })));
    
    // Enhanced color matching - try multiple variations and patterns
    const colorImage = product.images.edges.find((edge: any) => {
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
    const variant = product.variants.edges.find((edge: any) => {
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

  // Fetch products from Shopify
  const fetchProducts = async () => {
    try {
      setProductsLoading(true);
      
      // Try to load cached products first
      const cachedProducts = localStorage.getItem('pixelme-products-cache');
      if (cachedProducts) {
        try {
          const parsedProducts = JSON.parse(cachedProducts);
          setProducts(parsedProducts);
          setProductsLoading(false);
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
      setProductsLoading(false);
    }
  };

  // Load cached data on component mount
  useEffect(() => {
    const cachedImage = localStorage.getItem('pixelme-uploaded-image');
    const cachedStyle = localStorage.getItem('pixelme-selected-style');
    const cachedPeopleCount = localStorage.getItem('pixelme-people-count');
    const cachedImageSize = localStorage.getItem('pixelme-image-size');
    const cachedGenders = localStorage.getItem('pixelme-genders');
    const cachedStep = localStorage.getItem('pixelme-current-step');
    const cachedConversionResult = localStorage.getItem('pixelme-conversion-result');
    const cachedEditedImage = localStorage.getItem('pixelme-edited-image');
    const cachedColorReducedImage = localStorage.getItem('pixelme-color-reduced-image');
    const cachedFinalImage = localStorage.getItem('pixelme-final-image');
    
    // Load generation history and clean expired entries
    const loadGenerationHistory = () => {
      try {
        const historyStr = localStorage.getItem('pixelme-generation-history');
        if (historyStr) {
          const history = JSON.parse(historyStr);
          const oneHour = 60 * 60 * 1000;
          const now = Date.now();
          // Filter out expired entries (older than 1 hour)
          const validHistory = history.filter((item: any) => 
            (now - item.timestamp) < oneHour
          );
          setGenerationHistory(validHistory);
          // Update localStorage with cleaned history
          if (validHistory.length !== history.length) {
            localStorage.setItem('pixelme-generation-history', JSON.stringify(validHistory));
          }
        }
      } catch (e) {
        console.error('Failed to load generation history:', e);
      }
    };
    loadGenerationHistory();
    
    if (cachedImage) {
      setUploadedImage(cachedImage);
    }
    if (cachedStyle) {
      setSelectedStyle(cachedStyle);
    }
    if (cachedPeopleCount) {
      const count = parseInt(cachedPeopleCount);
      setPeopleCount(count);
      setPeopleCountSelected(true); // User has previously selected
      // Initialize genders array if not cached
      if (!cachedGenders) {
        setGenders(new Array(count).fill(''));
      }
    }
    if (cachedImageSize) {
      setImageSize(cachedImageSize);
    }
    if (cachedGenders) {
      try {
        setGenders(JSON.parse(cachedGenders));
      } catch (e) {
        console.warn('Failed to parse cached genders');
      }
    }
    if (cachedStep && ['upload', 'style', 'convert'].includes(cachedStep)) {
      setStep(cachedStep as 'upload' | 'style' | 'convert');
    }
    if (cachedConversionResult) {
      setConversionResult(cachedConversionResult);
    }
    if (cachedEditedImage) {
      setCachedEditedImage(cachedEditedImage);
    }
    if (cachedColorReducedImage) {
      setCachedColorReducedImage(cachedColorReducedImage);
    }
    if (cachedFinalImage) {
      setCachedFinalImage(cachedFinalImage);
    }
    
    // Store all selection data from URL params to localStorage if provided
    if (selectedColor) {
      localStorage.setItem('pixelme-selected-color', selectedColor);
    }
    if (selectedSize) {
      localStorage.setItem('pixelme-selected-size', selectedSize);
    }
    if (selectedVariantId) {
      localStorage.setItem('pixelme-selected-variant-id', selectedVariantId);
    }

    // Fetch products for color-specific images
    fetchProducts();
  }, [selectedColor, selectedSize, selectedVariantId]);

  const handleBack = () => {
    // Save current selections to cache before navigating
    if (selectedClothing) {
      localStorage.setItem('pixelme-selected-clothing', selectedClothing);
    }
    if (selectedColor) {
      localStorage.setItem('pixelme-selected-color', selectedColor);
    }
    if (selectedSize) {
      localStorage.setItem('pixelme-selected-size', selectedSize);
    }
    if (selectedVariantId) {
      localStorage.setItem('pixelme-selected-variant-id', selectedVariantId);
    }
    router.push('/create');
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('📱 File selected:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: new Date(file.lastModified).toISOString()
      });
      
      try {
        // Check file size for Safari compatibility (recommend < 2MB for data URLs)
        const maxSizeForDataURL = 2 * 1024 * 1024; // 2MB
        const useCompression = file.size > maxSizeForDataURL;
        
        if (useCompression) {
          console.log('📱 Large file detected, will compress for Safari compatibility');
        }
        
        // Get EXIF orientation
        const orientation = await getOrientation(file);
        console.log('📱 EXIF orientation result:', orientation);
        
        // Process image with compression for Safari
        let imageData: string;
        
        if (orientation !== 1 || useCompression) {
          // Create image element to load the file
          const img = document.createElement('img');
          const objectURL = URL.createObjectURL(file);
          
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = objectURL;
          });
          
          // Create canvas for processing
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            throw new Error('Canvas context not available');
          }
          
          // Calculate dimensions (max 1024px for Safari compatibility)
          const maxDimension = 1024;
          let { width, height } = img;
          
          if (width > maxDimension || height > maxDimension) {
            const scale = Math.min(maxDimension / width, maxDimension / height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
            console.log(`📱 Resizing image from ${img.width}x${img.height} to ${width}x${height} for Safari`);
          }
          
          // Apply orientation correction
          switch (orientation) {
            case 6: // 90° CW
              canvas.width = height;
              canvas.height = width;
              ctx.rotate(Math.PI / 2);
              ctx.translate(0, -height);
              break;
            case 8: // 90° CCW
              canvas.width = height;
              canvas.height = width;
              ctx.rotate(-Math.PI / 2);
              ctx.translate(-width, 0);
              break;
            case 3: // 180°
              canvas.width = width;
              canvas.height = height;
              ctx.rotate(Math.PI);
              ctx.translate(-width, -height);
              break;
            default:
              canvas.width = width;
              canvas.height = height;
              break;
          }
          
          // Draw and compress image
          ctx.drawImage(img, 0, 0, width, height);
          
          // Use lower quality for larger files to ensure Safari compatibility
          const quality = useCompression ? 0.7 : 0.85;
          imageData = canvas.toDataURL('image/jpeg', quality);
          
          URL.revokeObjectURL(objectURL);
          console.log(`📱 Image processed: ${imageData.length} bytes (quality: ${quality})`);
          
        } else {
          // Small file, no orientation correction needed - direct read
          console.log('📱 Small file, using direct read');
          imageData = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const result = e.target?.result as string;
              if (result) {
                resolve(result);
              } else {
                reject(new Error('Failed to read file'));
              }
            };
            reader.onerror = () => reject(new Error('File reading failed'));
            reader.readAsDataURL(file);
          });
        }
        
        // Check if data URL is still too large for Safari localStorage
        if (imageData.length > 1024 * 1024) {
          console.warn('📱 Warning: Image may be too large for Safari localStorage');
        }
        
        console.log('📱 Image processing completed, data URL length:', imageData.length);
        setUploadedImage(imageData);
        
        // Try to store in localStorage with error handling for Safari
        try {
          localStorage.setItem('pixelme-uploaded-image', imageData);
        } catch (storageError) {
          console.error('📱 localStorage failed (Safari limit?), continuing without cache:', storageError);
          // Continue without localStorage - image is still in state
        }
        
        // Stay on upload step instead of auto-proceeding
        setStep('upload');
        localStorage.setItem('pixelme-current-step', 'upload');
        
      } catch (error) {
        console.error('📱 Error processing image:', error);
        alert('Failed to upload image. Please try a smaller image or different format.');
      }
    }
  };

  // Rate limiting functions
  const fetchRateLimitStatus = async () => {
    try {
      const response = await fetch('/api/convert/status');
      const data = await response.json();
      
      if (data.success) {
        setRateLimitStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch rate limit status:', error);
    }
  };

  // Update rate limit status when on convert step
  useEffect(() => {
    if (step === 'convert') {
      fetchRateLimitStatus();
      
      // Update every 10 seconds while on convert step
      const interval = setInterval(fetchRateLimitStatus, 10000);
      return () => clearInterval(interval);
    }
  }, [step]);

  // Update countdown every second when there's a time limit
  useEffect(() => {
    if (rateLimitStatus && rateLimitStatus.timeUntilReset > 0) {
      const interval = setInterval(() => {
        setRateLimitStatus(prev => {
          if (!prev || prev.timeUntilReset <= 1000) {
            // Time's up, refresh the status
            fetchRateLimitStatus();
            return prev;
          }
          return {
            ...prev,
            timeUntilReset: prev.timeUntilReset - 1000
          };
        });
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [rateLimitStatus?.timeUntilReset]);

  // Clean up expired generation history every minute
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const oneHour = 60 * 60 * 1000;
      const now = Date.now();
      
      setGenerationHistory(prev => {
        const validHistory = prev.filter(item => (now - item.timestamp) < oneHour);
        
        // Update localStorage if we removed any items
        if (validHistory.length !== prev.length) {
          try {
            localStorage.setItem('pixelme-generation-history', JSON.stringify(validHistory));
          } catch (e) {
            console.warn('Could not update generation history in localStorage');
          }
        }
        
        return validHistory;
      });
    }, 60000); // Check every minute
    
    return () => clearInterval(cleanupInterval);
  }, []);

  const handleStyleSelect = (style: string) => {
    setSelectedStyle(style);
    localStorage.setItem('pixelme-selected-style', style);
    // Don't auto-advance to convert, stay on style to select people count
    
    // Auto-scroll to people count section
    setTimeout(() => {
      const peopleCountSection = document.querySelector('[data-people-count-section]');
      if (peopleCountSection) {
        peopleCountSection.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }
    }, 100);
  };

  const handlePeopleCountSelect = (count: number) => {
    setPeopleCount(count);
    setPeopleCountSelected(true); // User has explicitly selected
    
    // Set image size based on people count
    let size = '7cm';
    if (count === 2) size = '10cm';
    else if (count === 3) size = '13cm';
    else if (count === 4) size = '16cm';
    else if (count >= 5) size = '19cm';
    
    setImageSize(size);
    localStorage.setItem('pixelme-people-count', count.toString());
    localStorage.setItem('pixelme-image-size', size);
    
    // Store the selected image size as a separate sizing option for variants
    localStorage.setItem('pixelme-selected-image-size', size);
    
    // Initialize genders array with empty values
    setGenders(new Array(count).fill(''));
    
    // Don't advance to convert yet - wait for gender selection
  };

  const handleGenderSelect = (personIndex: number, gender: string) => {
    const newGenders = [...genders];
    newGenders[personIndex] = gender;
    setGenders(newGenders);
    localStorage.setItem('pixelme-genders', JSON.stringify(newGenders));
    
    // Check if all genders are selected
    const allSelected = newGenders.every(g => g !== '' && g !== null && g !== undefined);
    console.log('Gender selection:', { newGenders, allSelected, peopleCount });
  };

  const handleConvert = async () => {
    if (!uploadedImage || !selectedStyle || !selectedClothing) {
      return;
    }

    // Only clear edited image data when actually generating a new conversion
    localStorage.removeItem('pixelme-edited-image');
    setCachedEditedImage(null);
    
    // Ensure we're using the original uploaded image, not any edited version
    // Try localStorage first, but fall back to state (Safari may fail localStorage)
    let imageToConvert = uploadedImage;
    try {
      const cachedImage = localStorage.getItem('pixelme-uploaded-image');
      if (cachedImage) {
        imageToConvert = cachedImage;
      }
    } catch (e) {
      console.warn('📱 Could not read from localStorage (Safari?), using state');
    }

    // Check if image data is valid before sending
    if (!imageToConvert || !imageToConvert.startsWith('data:image/')) {
      setConversionError('Invalid image data. Please re-upload your image.');
      return;
    }

    // Warn user if image is very large (Safari issue)
    if (imageToConvert.length > 2 * 1024 * 1024) {
      console.warn('📱 Large image detected, may have issues on Safari/iOS');
    }

    setIsConverting(true);
    setConversionError(null);
    setConversionResult(null);
    setShowingOriginal(false); // Reset to show converted result first

    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: imageToConvert,
          style: selectedStyle,
          clothing: selectedClothing,
          color: selectedColor,
          size: selectedSize,
          variantId: selectedVariantId,
          peopleCount: peopleCount,
          imageSize: imageSize,
          genders: genders,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const result = data.imageUrl || data.description; // Handle both image URL and demo descriptions
        setConversionResult(result);
        
        // Add to generation history
        if (result.startsWith('http')) {
          const newGeneration = {
            id: `gen-${Date.now()}`,
            imageUrl: result,
            timestamp: Date.now(),
            style: selectedStyle
          };
          
          // Update history (keep max 10 items for storage limits)
          const updatedHistory = [newGeneration, ...generationHistory].slice(0, 10);
          setGenerationHistory(updatedHistory);
          
          // Try to cache but don't fail if Safari blocks it
          try {
            localStorage.setItem('pixelme-conversion-result', result);
            localStorage.setItem('pixelme-generation-history', JSON.stringify(updatedHistory));
          } catch (e) {
            console.warn('📱 Could not cache conversion result (Safari?)');
          }
        }
        
        // Refresh rate limit status after successful conversion
        fetchRateLimitStatus();
      } else {
        // Handle rate limit errors specially
        if (response.status === 429 && data.rateLimitExceeded) {
          setConversionError(`⏰ ${data.error}`);
        } else if (response.status === 400 && data.error.includes('Invalid image')) {
          setConversionError('Image upload failed. Please try re-uploading your photo.');
        } else {
          setConversionError(data.error || 'Conversion failed');
        }
        // Refresh rate limit status after any API response
        fetchRateLimitStatus();
      }
    } catch (error) {
      console.error('Conversion error:', error);
      // Check if it's a network/size issue (common on Safari with large payloads)
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        setConversionError('Network error. Your image may be too large. Try uploading a smaller photo.');
      } else {
        setConversionError('Failed to connect to conversion service. Please try again.');
      }
    } finally {
      setIsConverting(false);
    }
  };

  const confirmClear = () => {
    setShowClearConfirmation(true);
  };

  const handleClear = async () => {
    setShowClearConfirmation(false);
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
    localStorage.removeItem('pixelme-people-count');
    localStorage.removeItem('pixelme-image-size');
    localStorage.removeItem('pixelme-genders');
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
    localStorage.removeItem('pixelme-generation-history'); // Clear generation history
    
    // Only clear cart if it's empty
    if (!shouldPreserveCart) {
      localStorage.removeItem('pixelme-cart-id');
      console.log('🗑️ Cleared empty cart');
    } else {
      console.log('🛒 Cart preserved - contains items for multiple orders');
    }
    
    // Reset state
    setUploadedImage(null);
    setImageRotation(0);
    setSelectedStyle(null);
    setPeopleCount(1);
    setPeopleCountSelected(false); // Reset selection flag
    setImageSize('7cm');
    setGenders(['']);
    setStep('upload');
    setConversionResult(null);
    setConversionError(null);
    setCachedEditedImage(null);
    setCachedColorReducedImage(null);
    setCachedFinalImage(null);
    setGenerationHistory([]);
    
    // Go back to homepage
    router.push('/');
  };

  const handleStepChange = (newStep: 'upload' | 'style' | 'convert') => {
    setStep(newStep);
    localStorage.setItem('pixelme-current-step', newStep);
  };

  const handleSelectHistoryImage = (imageUrl: string) => {
    setConversionResult(imageUrl);
    // Update cached result
    try {
      localStorage.setItem('pixelme-conversion-result', imageUrl);
    } catch (e) {
      console.warn('Could not cache selected image');
    }
  };

  const handleRotateImage = async (direction: 'left' | 'right') => {
    if (!uploadedImage) {
      return;
    }

    try {
      // Update rotation angle for display purposes
      const rotationChange = direction === 'right' ? 90 : -90;
      const newRotation = (imageRotation + rotationChange + 360) % 360;
      setImageRotation(newRotation);

      // Load current image
      const img = document.createElement('img');
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = uploadedImage;
      });

      // Create rotated canvas - swap dimensions for 90° rotation
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Failed to create canvas context');
      }

      // Limit dimensions for Safari compatibility
      const maxDimension = 1024;
      let width = img.naturalHeight;
      let height = img.naturalWidth;
      
      if (width > maxDimension || height > maxDimension) {
        const scale = Math.min(maxDimension / width, maxDimension / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
        console.log(`📱 Resizing rotated image to ${width}x${height} for Safari`);
      }

      canvas.width = width;
      canvas.height = height;

      // Apply incremental rotation transformation
      ctx.save();
      
      if (direction === 'right') {
        // Rotate 90° clockwise
        ctx.translate(canvas.width, 0);
        ctx.rotate(Math.PI / 2);
        ctx.scale(width / img.naturalHeight, height / img.naturalWidth);
      } else {
        // Rotate 90° counter-clockwise  
        ctx.translate(0, canvas.height);
        ctx.rotate(-Math.PI / 2);
        ctx.scale(width / img.naturalHeight, height / img.naturalWidth);
      }
      
      ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);
      ctx.restore();

      // Use JPEG with compression to reduce file size for Safari
      const quality = 0.75; // Lower quality for better Safari compatibility
      const rotatedImageUrl = canvas.toDataURL('image/jpeg', quality);
      
      console.log(`📱 Rotated image size: ${rotatedImageUrl.length} bytes`);
      
      setUploadedImage(rotatedImageUrl);
      
      // Try to store with error handling for Safari
      try {
        localStorage.setItem('pixelme-uploaded-image', rotatedImageUrl);
      } catch (storageError) {
        console.error('📱 localStorage failed after rotation (Safari limit?):', storageError);
        // Continue without localStorage
      }
      
    } catch (error) {
      console.error('Error rotating image:', error);
      alert('Failed to rotate image. Please try again.');
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <Image
        src="/logo.png"
        alt="PixelMe Logo"
        width={200}
        height={80}
        className="mb-8 w-40 h-auto sm:w-48 md:w-52"
        priority
      />
      
      <div className="w-full max-w-6xl bg-white rounded-lg shadow p-4 sm:p-6 lg:p-8 flex flex-col items-center relative">
        <div className="w-full flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 min-w-0">
            <div className="flex items-center gap-2 min-w-max">
            {/* Step 0 - Welcome */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/')}
                className="text-xs sm:text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center border-2 border-transparent transition-all duration-200 cursor-pointer"
                title="Go back to welcome screen"
              >
                📋
              </button>
            </div>
            {/* Step 1 - Clothing Selection */}
            <div className="flex items-center gap-2">
              {selectedClothing ? (
                <button
                  onClick={handleBack}
                    className="flex items-center justify-center p-1 bg-white rounded-lg border-2 border-transparent hover:shadow-lg transition-all duration-200 cursor-pointer w-16 h-16 sm:w-20 sm:h-20"
                  title="Change clothing style"
                >
                  {productsLoading ? (
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-200 rounded animate-pulse"></div>
                  ) : (() => {
                    const stepImage = getProductImageForColor(selectedClothing, selectedColor);
                    return stepImage.startsWith('/clothes/') ? (
                      <Image
                        src={stepImage}
                        alt={`${selectedClothing} ${selectedColor || ''}`}
                        width={60}
                        height={60}
                        className="object-contain w-12 h-12 sm:w-14 sm:h-14"
                        priority
                      />
                    ) : (
                      <img
                        src={stepImage}
                        alt={`${selectedClothing} ${selectedColor || ''}`}
                        className="object-contain w-12 h-12 sm:w-14 sm:h-14"
                      />
                    );
                  })()}
                </button>
              ) : (
                  <span className="text-xs sm:text-sm font-semibold text-gray-400 bg-gray-100 rounded-lg w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center border-2 border-transparent">1</span>
              )}
            </div>
            
            {/* Step 2 - Upload Image */}
            <div className="flex items-center gap-2">
              {uploadedImage ? (
                <button
                  onClick={() => handleStepChange('upload')}
                    className={`flex items-center justify-center p-1 bg-white rounded-lg border-2 ${step === 'upload' ? 'border-dashed border-amber-600' : 'border-transparent'} hover:shadow-lg transition-all duration-200 cursor-pointer w-16 h-16 sm:w-20 sm:h-20`}
                  title="Change uploaded photo"
                >
                  <img
                    src={uploadedImage}
                    alt="Uploaded preview"
                    width={60}
                    height={60}
                      className="object-contain rounded-lg w-12 h-12 sm:w-16 sm:h-16"
                  />
                </button>
              ) : (
                  <span className={`text-xs sm:text-sm font-semibold ${step === 'upload' ? 'text-gray-600 border-dashed border-amber-600' : 'text-gray-400 border-transparent'} bg-gray-100 rounded-lg w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center border-2`}>2</span>
              )}
            </div>
            
            {/* Step 3 - Style Selection */}
            <div className="flex items-center gap-2">
              {selectedStyle ? (
                <button
                  onClick={() => handleStepChange('style')}
                    className={`flex items-center justify-center p-1 bg-white rounded-lg border-2 ${step === 'style' ? 'border-dashed border-amber-600' : 'border-transparent'} hover:shadow-lg transition-all duration-200 cursor-pointer w-16 h-16 sm:w-20 sm:h-20`}
                  title="Go to style selection"
                >
                  <Image
                    src={`/styles/${selectedStyle === 'Anime Fantasy' ? 'ghibli' : selectedStyle === 'Paper Animation' ? 'southpark' : selectedStyle === 'Animated Comedy' ? 'familyguy' : selectedStyle === 'Action Anime' ? 'dragonball' : 'simpsons'}.png`}
                    alt={`${selectedStyle} Style`}
                    width={60}
                    height={60}
                      className="object-contain rounded-lg w-12 h-12 sm:w-14 sm:h-14"
                  />
                </button>
              ) : (
                  <span className={`text-xs sm:text-sm font-semibold ${step === 'style' ? 'text-gray-600 border-dashed border-amber-600' : 'text-gray-400 border-transparent'} bg-gray-100 rounded-lg w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center border-2`}>3</span>
              )}
            </div>
            
            {/* Step 4 - Convert */}
            <div className="flex items-center gap-2">
              {conversionResult ? (
                <button
                  onClick={() => {
                    handleStepChange('convert');
                  }}
                    className={`flex items-center justify-center p-1 bg-white rounded-lg border-2 ${step === 'convert' ? 'border-dashed border-amber-600' : 'border-transparent'} hover:shadow-lg transition-all duration-200 cursor-pointer w-16 h-16 sm:w-20 sm:h-20`}
                  title="Go to convert step"
                >
                  <img
                    src={conversionResult}
                    alt="Converted preview"
                    width={60}
                    height={60}
                      className="object-contain rounded-lg w-12 h-12 sm:w-16 sm:h-16"
                  />
                </button>
              ) : selectedClothing && uploadedImage && selectedStyle ? (
                <button
                  onClick={() => {
                    handleStepChange('convert');
                  }}
                    className={`text-xs sm:text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center border-2 ${step === 'convert' ? 'border-dashed border-amber-600' : 'border-transparent'} hover:shadow-lg transition-all duration-200 cursor-pointer`}
                  title="Go to convert step"
                >
                  4
                </button>
              ) : (
                  <span className={`text-xs sm:text-sm font-semibold ${step === 'convert' ? 'text-gray-600 border-dashed border-amber-600' : 'text-gray-400 border-transparent'} bg-gray-100 rounded-lg w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center border-2`}>4</span>
              )}
            </div>
            
            {/* Step 5 - Edit */}
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
              ) : conversionResult ? (
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
          </div>
          
          {/* Selection Info and Clear Button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Selection Info */}
            {(selectedClothing || selectedColor || selectedSize) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm w-full sm:w-auto">
                <div className="font-semibold text-blue-800 mb-1">Current Selection:</div>
                <div className="text-blue-700">
                  <div><span className="font-medium">Product:</span> {selectedClothing ? (selectedClothing.charAt(0).toUpperCase() + selectedClothing.slice(1)) : 'Not Selected'}</div>
                  <div><span className="font-medium">Color:</span> {selectedColor || 'Not Selected'}</div>
                  <div><span className="font-medium">Size:</span> {selectedSize || 'Not Selected'}</div>
                  {peopleCountSelected && (
                    <>
                      <div><span className="font-medium">Subjects:</span> {peopleCount} {peopleCount === 1 ? 'subject' : 'subjects'} ({(() => {
                        if (peopleCount === 1) return '7cm';
                        if (peopleCount === 2) return '10cm';
                        if (peopleCount === 3) return '13cm';
                        if (peopleCount === 4) return '16cm';
                        if (peopleCount >= 5) return '19cm';
                      })()})</div>
                      <div><span className="font-medium">Extra Cost:</span> {(() => {
                        if (peopleCount === 1) return '+$0';
                        if (peopleCount === 2) return '+$5';
                        if (peopleCount === 3) return '+$10';
                        if (peopleCount === 4) return '+$15';
                        if (peopleCount >= 5) return `+$${(peopleCount - 1) * 5}`;
                      })()}</div>
                    </>
                  )}
                </div>
              </div>
            )}
            
            {/* Clear Button */}
            <button
              onClick={confirmClear}
              className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center flex-shrink-0"
              title="Clear all and start over"
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

        <div className="flex flex-col lg:flex-row items-start gap-4 sm:gap-6 lg:gap-8 w-full">
          <div className="flex-1 flex flex-col items-center w-full">
            <div className="w-full max-w-md">
              {!uploadedImage ? (
                <div className="w-full">
                  <label className="flex flex-col items-center justify-center w-full h-48 sm:h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                      </svg>
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG or JPEG</p>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleImageUpload}
                    />
                  </label>
                  {/* Safari/iOS tip */}
                  {typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent) && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                      📱 <strong>iOS Tip:</strong> For best results, use photos under 2MB or take a new photo directly.
                    </div>
                  )}
                </div>
              ) : step === 'upload' ? (
                <div className="flex flex-col items-center w-full">
                  <div className="relative flex items-center justify-center w-full h-48 sm:h-64 bg-gray-100 rounded-lg mb-4">
                    <img
                      src={uploadedImage}
                      alt="Uploaded photo"
                      className="max-w-full max-h-full object-contain rounded-lg"
                    />
                    <button
                      onClick={() => {
                        setUploadedImage(null);
                        setImageRotation(0);
                        localStorage.removeItem('pixelme-uploaded-image');
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleRotateImage('left')}
                      className="p-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                      title="Rotate 90°"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                    
                    <button
                      onClick={() => {
                        setStep('style');
                        localStorage.setItem('pixelme-current-step', 'style');
                      }}
                      className="px-8 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors duration-200 font-semibold"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
            
            {step === 'style' && uploadedImage && (
              <div className="flex flex-col items-center w-full overflow-x-hidden">
                {/* Style selection */}
                <div className="w-full">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">Style & Details</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4 w-full max-w-4xl mx-auto mb-6 px-2">
                  <button
                    className={`relative aspect-square w-full max-w-[140px] mx-auto p-1 sm:p-2 rounded-lg transition-all duration-200 hover:scale-105 ${selectedStyle === 'Yellow Cartoon' ? 'ring-2 ring-amber-500 bg-amber-50' : 'hover:shadow-md'}`}
                    onClick={() => handleStyleSelect('Yellow Cartoon')}
                    title="Simpsons Style"
                  >
                    <Image
                      src="/styles/simpsons.png"
                      alt="Simpsons Style"
                      fill
                      className="object-contain rounded-lg"
                      priority
                    />
                  </button>
                  <button
                    className={`relative aspect-square w-full max-w-[140px] mx-auto p-1 sm:p-2 rounded-lg transition-all duration-200 hover:scale-105 ${selectedStyle === 'Animated Comedy' ? 'ring-2 ring-amber-500 bg-amber-50' : 'hover:shadow-md'}`}
                    onClick={() => handleStyleSelect('Animated Comedy')}
                    title="Family Guy Style"
                  >
                    <Image
                      src="/styles/familyguy.png"
                      alt="Family Guy Style"
                      fill
                      className="object-contain rounded-lg"
                      priority
                    />
                  </button>
                  <button
                    className={`relative aspect-square w-full max-w-[140px] mx-auto p-1 sm:p-2 rounded-lg transition-all duration-200 hover:scale-105 ${selectedStyle === 'Paper Animation' ? 'ring-2 ring-amber-500 bg-amber-50' : 'hover:shadow-md'}`}
                    onClick={() => handleStyleSelect('Paper Animation')}
                    title="South Park Style"
                  >
                    <Image
                      src="/styles/southpark.png"
                      alt="South Park Style"
                      fill
                      className="object-contain rounded-lg"
                      priority
                    />
                  </button>
                  <button
                    className={`relative aspect-square w-full max-w-[140px] mx-auto p-1 sm:p-2 rounded-lg transition-all duration-200 hover:scale-105 ${selectedStyle === 'Anime Fantasy' ? 'ring-2 ring-amber-500 bg-amber-50' : 'hover:shadow-md'}`}
                    onClick={() => handleStyleSelect('Anime Fantasy')}
                    title="Studio Ghibli Style"
                  >
                    <Image
                      src="/styles/ghibli.png"
                      alt="Studio Ghibli Style"
                      fill
                      className="object-contain rounded-lg"
                      priority
                    />
                  </button>
                  <button
                    className={`relative aspect-square w-full max-w-[140px] mx-auto p-1 sm:p-2 rounded-lg transition-all duration-200 hover:scale-105 ${selectedStyle === 'Action Anime' ? 'ring-2 ring-amber-500 bg-amber-50' : 'hover:shadow-md'}`}
                    onClick={() => handleStyleSelect('Action Anime')}
                    title="Dragon Ball Style"
                  >
                    <Image
                      src="/styles/dragonball.png"
                      alt="Dragon Ball Style"
                      fill
                      className="object-contain rounded-lg"
                      priority
                    />
                  </button>
                    </div>
                </div>

                {/* People count selection */}
                {selectedStyle && (
                  <div className="w-full max-w-lg mx-auto mb-4" data-people-count-section>
                    <div className="mb-3 text-center">
                      <p className="text-sm text-black font-medium mb-1">How many subjects in your photo?</p>
                      <p className="text-xs text-gray-600 mb-2">Choose carefully - more subjects = larger size for better embroidery quality</p>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3">
                        <p className="text-xs text-amber-800">
                          ⚠️ <strong>Important:</strong> If size is too small, design will have lower quality
                        </p>
                      </div>
                    </div>
                    {/* People count selector */}
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-4">
                        <button
                          onClick={() => {
                            const newCount = Math.max(1, peopleCount - 1);
                            handlePeopleCountSelect(newCount);
                          }}
                          className="w-12 h-12 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center text-xl font-bold text-black"
                        >
                          −
                        </button>
                        
                        <div className="flex flex-col items-center min-w-[120px]">
                          <div className="text-2xl font-bold text-black">
                            {peopleCount} {peopleCount === 1 ? 'subject' : 'subjects'}
                          </div>
                          <div className="text-sm text-gray-600">
                            {(() => {
                              if (peopleCount === 1) return '7cm size';
                              if (peopleCount === 2) return '10cm size';
                              if (peopleCount === 3) return '13cm size';
                              if (peopleCount === 4) return '16cm size';
                              if (peopleCount >= 5) return '19cm size';
                            })()}
                          </div>
                          <div className="text-xs font-medium text-black mt-1">
                            {(() => {
                              if (peopleCount === 1) return '+$0';
                              if (peopleCount === 2) return '+$5';
                              if (peopleCount === 3) return '+$10';
                              if (peopleCount === 4) return '+$15';
                              if (peopleCount >= 5) return `+$${(peopleCount - 1) * 5}`;
                            })()}
                          </div>
                        </div>
                        
                        <button
                          onClick={() => {
                            const newCount = Math.min(8, peopleCount + 1);
                            handlePeopleCountSelect(newCount);
                          }}
                          className="w-12 h-12 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center text-xl font-bold text-black"
                        >
                          +
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-3">Use +/− buttons to select 1-8 subjects</p>
                    </div>
                  </div>
                )}

                {/* Gender selection */}
                {selectedStyle && peopleCount && (
                  <div className="w-full max-w-lg mx-auto">
                    <div className="mb-3 text-center">
                      <p className="text-sm text-black font-medium mb-1">Select type for each subject</p>
                      <p className="text-xs text-gray-600">👈 From left to right in your photo 👉</p>
                      {uploadedImage && (
                        <button
                          onClick={() => setShowReferencePhoto(true)}
                          className="mt-2 px-3 py-1.5 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200 flex items-center gap-1 mx-auto"
                        >
                          <span>📷</span>
                          <span>View Reference Photo</span>
                        </button>
                      )}
                    </div>
                    <div className="grid gap-3">
                      {Array.from({ length: peopleCount }, (_, index) => (
                        <div key={index} className="flex items-center gap-2 bg-white p-3 rounded-lg shadow-sm">
                          <span className="text-sm font-medium text-black min-w-[80px]">
                            {peopleCount === 1 ? 'Subject' : 
                             peopleCount === 2 ? (index === 0 ? 'Left' : 'Right') :
                             peopleCount === 3 ? (index === 0 ? 'Left' : index === 1 ? 'Center' : 'Right') :
                             (index === 0 ? 'Left' : index === peopleCount - 1 ? 'Right' : `#${index + 1}`)}:
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleGenderSelect(index, 'male')}
                              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-all duration-200 hover:scale-105 ${
                                genders[index] === 'male' ? 'ring-2 ring-blue-500 bg-blue-50 text-blue-700' : 'bg-gray-50 hover:shadow-md text-black'
                              }`}
                            >
                              <span>👨</span>
                              <span>Male</span>
                            </button>
                            <button
                              onClick={() => handleGenderSelect(index, 'female')}
                              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-all duration-200 hover:scale-105 ${
                                genders[index] === 'female' ? 'ring-2 ring-pink-500 bg-pink-50 text-pink-700' : 'bg-gray-50 hover:shadow-md text-black'
                              }`}
                            >
                              <span>👩</span>
                              <span>Female</span>
                            </button>
                            <button
                              onClick={() => handleGenderSelect(index, 'animal')}
                              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-all duration-200 hover:scale-105 ${
                                genders[index] === 'animal' ? 'ring-2 ring-green-500 bg-green-50 text-green-700' : 'bg-gray-50 hover:shadow-md text-black'
                              }`}
                            >
                              <span>🐾</span>
                              <span>Animal</span>
                            </button>
                          </div>
                        </div>
                      ))}
                      
                      {/* Compact progress */}
                      <div className="mt-3">
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div 
                            className="bg-amber-500 h-1.5 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${(genders.filter(g => g !== '' && g !== null && g !== undefined).length / peopleCount) * 100}%` 
                            }}
                          ></div>
                        </div>
                        {genders.length === peopleCount && genders.every(g => g !== '' && g !== null && g !== undefined) && (
                          <div className="mt-4 text-center">
                            <p className="text-green-700 text-xs mb-3 font-medium">
                              ✓ All subjects selected!
                            </p>
                            <button
                              onClick={() => {
                                setStep('convert');
                                localStorage.setItem('pixelme-current-step', 'convert');
                              }}
                              className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors duration-200 font-semibold"
                            >
                              Proceed to Convert
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 'convert' && selectedStyle && (
              <div className="flex gap-6 w-full mt-6">
                {/* Main conversion area */}
                <div className="flex-1 flex flex-col items-center">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Ready to Convert</h3>
                    <p className="text-gray-600">Transform your photo into <span className="font-semibold text-amber-600">{selectedStyle}</span> style</p>
                    
                    {/* Preview of original image */}
                    {uploadedImage && !conversionResult && (
                      <div className="mt-4 flex justify-center px-4">
                        <div className="flex flex-col items-center w-full max-w-sm">
                          <p className="text-sm text-gray-500 mb-2">Your photo:</p>
                          <img 
                            src={uploadedImage} 
                            alt="Photo to convert"
                            className="w-full h-auto max-h-64 sm:max-h-80 object-contain rounded-lg shadow-md"
                          />
                        </div>
                      </div>
                    )}
                  
                  {/* Rate Limit Status */}
                  {rateLimitStatus && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg max-w-md mx-auto">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-blue-800 font-medium">
                          Generations left: {rateLimitStatus.remainingGenerations}/{rateLimitStatus.maxGenerations}
                        </span>
                        {rateLimitStatus.timeUntilReset > 0 && (
                          <span className="text-blue-600">
                            Resets in: {Math.ceil(rateLimitStatus.timeUntilReset / (60 * 1000))}m
                          </span>
                        )}
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${(rateLimitStatus.remainingGenerations / rateLimitStatus.maxGenerations) * 100}%` 
                          }}
                        ></div>
                      </div>
                      
                      {/* Countdown Timer */}
                      {rateLimitStatus.timeUntilReset > 0 && (
                        <div className="mt-2 text-xs text-blue-600 text-center">
                          Next reset: {new Date(Date.now() + rateLimitStatus.timeUntilReset).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {!conversionResult && !conversionError && (
                  <button 
                    onClick={() => {
                      // handleConvert will clear edited data when starting conversion
                      handleConvert();
                    }}
                    disabled={isConverting || (rateLimitStatus?.remainingGenerations === 0)}
                    className={`px-8 py-4 rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 ${
                      isConverting || (rateLimitStatus?.remainingGenerations === 0)
                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                        : 'bg-amber-600 text-white hover:bg-amber-700'
                    }`}
                  >
                    {isConverting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                        Converting...
                      </div>
                    ) : rateLimitStatus?.remainingGenerations === 0 ? (
                      'Rate Limit Reached'
                    ) : (
                      `Convert to ${selectedStyle}`
                    )}
                  </button>
                )}

                {conversionError && (
                  <div className={`mt-4 p-4 rounded-lg text-center max-w-md ${
                    conversionError.startsWith('⏰') 
                      ? 'bg-yellow-100 border border-yellow-300 text-yellow-800' 
                      : 'bg-red-100 border border-red-300 text-red-700'
                  }`}>
                    <p className="font-semibold mb-2">
                      {conversionError.startsWith('⏰') ? 'Rate Limit Reached' : 'Conversion Failed'}
                    </p>
                    <p className="text-sm">{conversionError}</p>
                    <button 
                      onClick={() => {
                        // handleConvert will clear edited data when starting conversion
                        handleConvert();
                      }}
                      className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
                    >
                      Try Again
                    </button>
                  </div>
                )}

                  {conversionResult && (
                    <div className="mt-4 flex flex-col items-center w-full">
                      {conversionResult.startsWith('http') ? (
                        <div className="flex flex-col items-center w-full">
                          {/* Editing tip */}
                          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg max-w-md">
                            <p className="text-sm text-blue-700">
                              💡 Don't worry if any details are wrong, you'll be able to edit it using our fill tool.
                            </p>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex gap-4 mb-6">
                            <button 
                              onClick={() => {
                                // handleConvert will clear edited data when starting new conversion
                                handleConvert();
                              }}
                              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 font-semibold"
                            >
                              Generate New
                            </button>
                            <button 
                              onClick={() => {
                                // Don't clear edited data when continuing to edit - preserve user's work
                                localStorage.setItem('pixelme-current-step', 'edit');
                                router.push('/edit');
                              }}
                              className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors duration-200 font-semibold"
                            >
                              Continue to Edit →
                            </button>
                          </div>
                          
                          {/* Interactive Before/After Image */}
                          <div className="flex flex-col items-center max-w-md mx-auto px-4">
                            {/* Toggle instruction */}
                            <div className="mb-4 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg text-center w-full">
                              <p className="text-sm sm:text-base text-green-700 font-medium mb-1">
                                👆 Tap image to compare
                              </p>
                              <p className="text-xs sm:text-sm text-green-600">
                                Currently showing: {showingOriginal ? 'Original Photo' : `${selectedStyle} Style`}
                              </p>
                            </div>
                            
                            {/* Clickable Image */}
                            <div 
                              className="relative cursor-pointer group touch-manipulation select-none"
                              onClick={() => setShowingOriginal(!showingOriginal)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setShowingOriginal(!showingOriginal);
                                }
                              }}
                            >
                              <img 
                                src={showingOriginal ? (uploadedImage || '') : (conversionResult || '')} 
                                alt={showingOriginal ? "Original uploaded photo" : `${selectedStyle} conversion`}
                                className="w-full max-w-md h-auto rounded-lg shadow-lg transition-opacity duration-300 hover:opacity-90"
                              />
                              
                              {/* Overlay indicator */}
                              <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 right-2 sm:right-4">
                                <div className="bg-black/70 text-white px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium text-center">
                                  {showingOriginal ? '📷 Original Photo' : `🎨 ${selectedStyle} Style`}
                                  <div className="text-xs opacity-80 mt-1">
                                    Tap to switch
                                  </div>
                                </div>
                              </div>
                              
                              {/* Hover/Focus/Active effects */}
                              <div className="absolute inset-0 rounded-lg border-2 border-transparent group-hover:border-amber-400 group-focus:border-amber-400 group-active:border-amber-600 transition-all duration-300"></div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{conversionResult}</p>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Generation History Sidebar - Desktop */}
                {generationHistory.filter(h => h.imageUrl !== conversionResult).length > 0 && (
                  <div className="w-80 flex-shrink-0 hidden lg:block">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center justify-between">
                        <span>Previous Generations</span>
                        <span className="text-xs text-gray-500 font-normal">(1 hour history)</span>
                      </h4>
                      <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
                        {generationHistory.map((item) => {
                          const minutesAgo = Math.floor((Date.now() - item.timestamp) / 60000);
                          const timeText = minutesAgo === 0 ? 'Just now' : 
                                         minutesAgo === 1 ? '1 minute ago' : 
                                         `${minutesAgo} minutes ago`;
                          const isSelected = conversionResult === item.imageUrl;
                          
                          return (
                            <div 
                              key={item.id}
                              className={`relative cursor-pointer transition-all duration-200 ${
                                isSelected 
                                  ? 'ring-2 ring-amber-600 rounded-lg' 
                                  : 'hover:opacity-90'
                              }`}
                              onClick={() => handleSelectHistoryImage(item.imageUrl)}
                            >
                              <img 
                                src={item.imageUrl} 
                                alt={`${item.style} generation`}
                                className="w-full h-auto rounded-lg shadow-sm"
                              />
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 rounded-b-lg">
                                <p className="text-xs text-white font-medium">{item.style}</p>
                                <p className="text-xs text-white/80">{timeText}</p>
                              </div>
                              {isSelected && (
                                <div className="absolute top-2 right-2 bg-amber-600 text-white rounded-full p-1">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Generation History - Mobile (Horizontal Scroll) */}
            {step === 'convert' && generationHistory.filter(h => h.imageUrl !== conversionResult).length > 0 && (
              <div className="lg:hidden w-full mt-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    Previous Generations <span className="text-xs text-gray-500 font-normal">(swipe to browse)</span>
                  </h4>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {generationHistory.map((item) => {
                      const minutesAgo = Math.floor((Date.now() - item.timestamp) / 60000);
                      const timeText = minutesAgo === 0 ? 'Just now' : 
                                     minutesAgo === 1 ? '1 min ago' : 
                                     `${minutesAgo} min ago`;
                      const isSelected = conversionResult === item.imageUrl;
                      
                      return (
                        <div 
                          key={item.id}
                          className={`relative flex-shrink-0 w-32 cursor-pointer transition-all duration-200 ${
                            isSelected 
                              ? 'ring-2 ring-amber-600 rounded-lg' 
                              : 'hover:opacity-90'
                          }`}
                          onClick={() => handleSelectHistoryImage(item.imageUrl)}
                        >
                          <img 
                            src={item.imageUrl} 
                            alt={`${item.style} generation`}
                            className="w-full h-32 object-cover rounded-lg shadow-sm"
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1 rounded-b-lg">
                            <p className="text-xs text-white truncate">{timeText}</p>
                          </div>
                          {isSelected && (
                            <div className="absolute top-1 right-1 bg-amber-600 text-white rounded-full p-0.5">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Cart Button */}
      <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50">
        <CartIcon />
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirmation && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-20 flex items-center justify-center z-50 p-4" onClick={() => setShowClearConfirmation(false)}>
          <div className="bg-white border border-gray-200 shadow-lg rounded-lg p-4 max-w-xs w-full" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm text-gray-900 mb-4 text-center">Clear all progress?</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setShowClearConfirmation(false)}
                className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 hover:border hover:border-gray-300 rounded transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleClear}
                className="px-3 py-1.5 text-xs text-red-600 hover:text-red-800 hover:border hover:border-red-300 rounded transition-all"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reference Photo Modal */}
      {showReferencePhoto && uploadedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setShowReferencePhoto(false)}>
          <div className="bg-white rounded-lg p-4 max-w-md w-full max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Reference Photo</h3>
              <button
                onClick={() => setShowReferencePhoto(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>
            <div className="flex justify-center">
              <img
                src={uploadedImage}
                alt="Reference photo"
                className="max-w-full max-h-96 object-contain rounded-lg"
              />
            </div>
            <p className="text-xs text-gray-600 text-center mt-3">
              Use this reference to identify subjects from left to right
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

export default function Upload() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <UploadContent />
    </Suspense>
  );
} 