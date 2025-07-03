'use client';

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import CartIcon from "../../components/CartIcon";

export default function Edit() {
  const router = useRouter();
  const [selectedClothing, setSelectedClothing] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [conversionResult, setConversionResult] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isFilling, setIsFilling] = useState(false);
  const [brushSize, setBrushSize] = useState(20);
  const [activeMode, setActiveMode] = useState<'remove' | 'crop' | 'background' | 'fill'>('remove');
  const [previousImage, setPreviousImage] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [cropArea, setCropArea] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [cropStartPos, setCropStartPos] = useState<{ x: number; y: number } | null>(null);
  const [step, setStep] = useState<'edit' | 'color-reduce' | 'preview' | 'before'>('edit');
  const [selectedPosition, setSelectedPosition] = useState<string>('middle-chest');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [hasReachedPreview, setHasReachedPreview] = useState<boolean>(false);
  const [finalImagePreview, setFinalImagePreview] = useState<string | null>(null);
  const [colorReducedImage, setColorReducedImage] = useState<string | null>(null);
  const [isColorReducing, setIsColorReducing] = useState<boolean>(false);
  const [aiFillPrompt, setAiFillPrompt] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('Black'); // Default to Black
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [variantPrice, setVariantPrice] = useState<string>('29.99');
  const [isCheckingOut, setIsCheckingOut] = useState<boolean>(false);
  
  // Custom presets state
  const [customPresets, setCustomPresets] = useState<{[key: string]: {name: string, x: number, y: number, size: number}}>({});
  const [presetsLoading, setPresetsLoading] = useState<boolean>(false);
  
  // Pan functionality for zoom
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Brush cursor position
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [showBrushCursor, setShowBrushCursor] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [actualImageSize, setActualImageSize] = useState({ width: 0, height: 0 });

  // Load custom presets from Shopify metafields
  const loadCustomPresets = async (clothingType: string) => {
    try {
      console.log('📥 Loading custom presets for:', clothingType);
      setPresetsLoading(true);
      const response = await fetch(`/api/shopify/metafields?namespace=pixelme&key=custom_presets&_t=${Date.now()}`);
      const data = await response.json();
      
      if (data.success && data.metafield?.parsedValue) {
        const allPresets = data.metafield.parsedValue;
        const productSpecificPresets = allPresets[clothingType] || {};
        
        console.log('✅ Loaded presets for', clothingType, ':', productSpecificPresets);
        setCustomPresets(productSpecificPresets);
      } else {
        console.log('ℹ️ No presets found, using empty state');
        setCustomPresets({});
      }
    } catch (error) {
      console.error('❌ Error loading custom presets:', error);
      setCustomPresets({});
    } finally {
      setPresetsLoading(false);
    }
  };

  // Load cached data on component mount
  useEffect(() => {
    const cachedClothing = localStorage.getItem('pixelme-selected-clothing');
    const cachedImage = localStorage.getItem('pixelme-uploaded-image');
    const cachedStyle = localStorage.getItem('pixelme-selected-style');
    const cachedConversionResult = localStorage.getItem('pixelme-conversion-result');
    const cachedEditedImage = localStorage.getItem('pixelme-edited-image');
    const cachedColorReducedImage = localStorage.getItem('pixelme-color-reduced-image');
    const cachedStep = localStorage.getItem('pixelme-current-step');
    
    setSelectedClothing(cachedClothing);
    setUploadedImage(cachedImage);
    setSelectedStyle(cachedStyle);
    setConversionResult(cachedConversionResult);
    setEditedImage(cachedEditedImage);
    setColorReducedImage(cachedColorReducedImage);
    
    // Check if we should be in preview mode or color-reduce mode
    if (cachedStep === 'preview') {
      setStep('preview');
      setHasReachedPreview(true);
    } else if (cachedStep === 'color-reduce') {
      setStep('color-reduce');
    }
    
    // Load saved position
    const cachedPosition = localStorage.getItem('pixelme-selected-position');
    if (cachedPosition) {
      setSelectedPosition(cachedPosition);
    }
    
    // Load saved zoom level
    const cachedZoom = localStorage.getItem('pixelme-zoom-level');
    if (cachedZoom) {
      const zoomValue = Number(cachedZoom);
      // Ensure zoom level is within new range (100-500%)
      setZoomLevel(Math.max(100, Math.min(500, zoomValue)));
    }

    // Check if preview has been reached
    const finalImage = localStorage.getItem('pixelme-final-image');
    if (finalImage) {
      setHasReachedPreview(true);
      setFinalImagePreview(finalImage);
    }

    // Load saved size selection
    const cachedSize = localStorage.getItem('pixelme-selected-size');
    if (cachedSize) {
      setSelectedSize(cachedSize);
    }

    // Load saved variant ID
    const cachedVariantId = localStorage.getItem('pixelme-selected-variant-id');
    if (cachedVariantId) {
      setSelectedVariantId(cachedVariantId);
    }

    // Load saved color and size selections
    const savedColor = localStorage.getItem('pixelme-selected-color');
    if (savedColor) {
      setSelectedColor(savedColor);
    }
    
    const savedSize = localStorage.getItem('pixelme-selected-size');
    if (savedSize) {
      setSelectedSize(savedSize);
    }
  }, []);

  // Fetch variant price when variant ID is available
  useEffect(() => {
    const fetchVariantPrice = async () => {
      if (!selectedVariantId || !selectedClothing) return;

      try {
        // Extract the numeric part from the Shopify variant ID
        const numericVariantId = selectedVariantId.replace('gid://shopify/ProductVariant/', '');
        
        // Fetch all products to find the one with our variant
        const response = await fetch('/api/shopify/products');
        const data = await response.json();
        
        if (data.success && data.products) {
          // Find the product that contains our variant
          for (const product of data.products) {
            const variant = product.variants?.edges?.find((edge: any) => 
              edge.node.id === selectedVariantId || 
              edge.node.id.includes(numericVariantId)
            );
            
            if (variant) {
              setVariantPrice(variant.node.price);
              break;
            }
          }
        }
      } catch (error) {
        console.error('Error fetching variant price:', error);
        // Keep default price on error
      }
    };

    fetchVariantPrice();
  }, [selectedVariantId, selectedClothing]);

  // Load custom presets when clothing type changes
  useEffect(() => {
    if (selectedClothing) {
      loadCustomPresets(selectedClothing);
    }
  }, [selectedClothing]);

  // Update selected position if it doesn't exist in loaded presets
  useEffect(() => {
    if (!presetsLoading && Object.keys(customPresets).length > 0 && selectedPosition) {
      // Check if current position exists in custom presets
      if (!customPresets[selectedPosition]) {
        // If not, select the first available preset
        const firstPresetKey = Object.keys(customPresets)[0];
        if (firstPresetKey) {
          console.log(`🔄 Switching from "${selectedPosition}" to "${firstPresetKey}" (custom preset)`);
          setSelectedPosition(firstPresetKey);
          localStorage.setItem('pixelme-selected-position', firstPresetKey);
        }
      }
    }
  }, [customPresets, presetsLoading, selectedPosition]);

  // Reset pan offset when zoom level changes to 100%
  useEffect(() => {
    if (zoomLevel <= 100) {
      setPanOffset({ x: 0, y: 0 });
    }
  }, [zoomLevel]);

  // Global mouse event listeners for crop mode
  useEffect(() => {
    if (activeMode === 'crop' && isCropping) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        if (!canvasRef.current || !cropStartPos) return;
        
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        
        // Clamp coordinates to canvas boundaries
        const rawX = e.clientX - rect.left;
        const rawY = e.clientY - rect.top;
        const currentX = Math.max(0, Math.min(canvas.width, rawX));
        const currentY = Math.max(0, Math.min(canvas.height, rawY));
        
        const width = currentX - cropStartPos.x;
        const height = currentY - cropStartPos.y;
        
        setCropArea({
          x: cropStartPos.x,
          y: cropStartPos.y,
          width,
          height
        });
        
        // Draw crop selection rectangle
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
          ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
          ctx.lineWidth = 2;
          ctx.fillRect(cropStartPos.x, cropStartPos.y, width, height);
          ctx.strokeRect(cropStartPos.x, cropStartPos.y, width, height);
        }
      };

      const handleGlobalMouseUp = () => {
        setIsCropping(false);
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [activeMode, isCropping, cropStartPos]);

  // Global mouse event listeners for panning
  useEffect(() => {
    if (isPanning && zoomLevel > 100) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        
        // Slow down panning by applying a sensitivity factor
        const panSensitivity = 0.3; // Reduce to make panning slower
        const slowDeltaX = deltaX * panSensitivity;
        const slowDeltaY = deltaY * panSensitivity;
        
        // Apply pan offset with bounds checking
        const maxPanX = (500 * (zoomLevel - 100)) / 100 / 2;
        const maxPanY = (500 * (zoomLevel - 100)) / 100 / 2;
        
        setPanOffset({
          x: Math.max(-maxPanX, Math.min(maxPanX, slowDeltaX)),
          y: Math.max(-maxPanY, Math.min(maxPanY, slowDeltaY))
        });
      };

      const handleGlobalMouseUp = () => {
        setIsPanning(false);
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isPanning, dragStart, zoomLevel]);

  const handleBack = () => {
    router.push(`/upload?clothing=${selectedClothing}`);
  };

  const handleGoHome = () => {
    router.push('/');
  };

  const handleClear = () => {
    // Clear all cached data - this is intentional for "clear all and start over"
    localStorage.removeItem('pixelme-uploaded-image');
    localStorage.removeItem('pixelme-selected-style');
    localStorage.removeItem('pixelme-current-step');
    localStorage.removeItem('pixelme-selected-clothing');
    localStorage.removeItem('pixelme-conversion-result');
    localStorage.removeItem('pixelme-edited-image');
    localStorage.removeItem('pixelme-color-reduced-image');
    localStorage.removeItem('pixelme-final-image');
    setPreviousImage(null); // Clear undo state
    
    // Go back to homepage
    router.push('/');
  };

  const handleResetColorReduction = () => {
    setColorReducedImage(null);
    localStorage.removeItem('pixelme-color-reduced-image');
    localStorage.removeItem('pixelme-final-image');
    setHasReachedPreview(false);
  };

  const handleColorReduction = async () => {
    const sourceImage = editedImage || conversionResult;
    if (!sourceImage) {
      alert('No image available for color reduction');
      return;
    }

    setIsColorReducing(true);

    try {
      // Convert URL to data URL if needed
      let imageDataUrl: string;
      if (sourceImage.startsWith('http')) {
        console.log('Converting URL to data URL for color reduction...');
        try {
          imageDataUrl = await convertUrlToDataUrl(sourceImage);
        } catch (error) {
          console.error('Failed to convert URL to data URL:', error);
          throw new Error('Failed to prepare image for color reduction');
        }
      } else {
        imageDataUrl = sourceImage;
      }

      const response = await fetch('/api/reduce-colors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: imageDataUrl
        }),
      });

      if (!response.ok) {
        throw new Error('Color reduction failed');
      }

      const result = await response.json();

      if (result.success && result.imageUrl) {
        setColorReducedImage(result.imageUrl);
        localStorage.setItem('pixelme-color-reduced-image', result.imageUrl);
        // Stay on color-reduce step to show preview
      } else {
        throw new Error(result.error || 'Color reduction failed');
      }
    } catch (error) {
      console.error('Error during color reduction:', error);
      alert('Color reduction failed. Please try again.');
    } finally {
      setIsColorReducing(false);
    }
  };

  const handleColorReductionContinue = async () => {
    if (!colorReducedImage) return;

    setIsFilling(true);

    try {
             // First, run background removal on the embroidery-converted image
       const response = await fetch('/api/remove-background', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
         },
         body: JSON.stringify({
           imageData: colorReducedImage as string,
         }),
       });

      const backgroundRemovedData = await response.json();

      if (response.ok && backgroundRemovedData.success) {
        // Use the background-removed image as the final image
        const finalImageUrl = backgroundRemovedData.imageUrl;
        
        // Set the processed image as the final image for preview
        setFinalImagePreview(finalImageUrl);
        localStorage.setItem('pixelme-final-image', finalImageUrl);
        
        console.log('Background removal completed successfully after embroidery conversion');
      } else {
        // Fallback to original embroidery-converted image if background removal fails
        console.warn('Background removal failed, using embroidery-converted image:', backgroundRemovedData.error);
        setFinalImagePreview(colorReducedImage);
        localStorage.setItem('pixelme-final-image', colorReducedImage as string);
      }
      
      // Set default position if not already set
      if (selectedClothing && !localStorage.getItem('pixelme-selected-position')) {
        const defaultPosition = getDefaultPosition(selectedClothing);
        setSelectedPosition(defaultPosition);
        localStorage.setItem('pixelme-selected-position', defaultPosition);
      }
      
      // Ensure zoom level is within range
      if (zoomLevel < 100) {
        setZoomLevel(100);
        localStorage.setItem('pixelme-zoom-level', '100');
      } else if (zoomLevel > 500) {
        setZoomLevel(500);
        localStorage.setItem('pixelme-zoom-level', '500');
      }
      
      setStep('preview');
      localStorage.setItem('pixelme-current-step', 'preview');
      setHasReachedPreview(true);
    } catch (error) {
      console.error('Error during background removal after embroidery conversion:', error);
      // Fallback to using color-reduced image directly
      if (colorReducedImage) {
        setFinalImagePreview(colorReducedImage);
        localStorage.setItem('pixelme-final-image', colorReducedImage as string);
      }
      
      setStep('preview');
      localStorage.setItem('pixelme-current-step', 'preview');
      setHasReachedPreview(true);
    } finally {
      setIsFilling(false);
    }
  };

  const handleStepChange = (step: string) => {
    localStorage.setItem('pixelme-current-step', step);
    if (step === 'convert') {
      // Don't clear edited image data - preserve user's step 5 edits when navigating
      // The edited image will only be cleared when actually re-running conversion
      router.push(`/upload?clothing=${selectedClothing}`);
    } else if (step === 'upload' || step === 'style') {
      router.push(`/upload?clothing=${selectedClothing}`);
    } else if (step === 'before') {
      setStep('before');
    } else if (step === 'edit') {
      setStep('edit');
    } else if (step === 'color-reduce') {
      setStep('color-reduce');
    }
  };

  const initializeCanvas = () => {
    if (!imageRef.current || !canvasRef.current) return;
    
    const img = imageRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    // Store actual image dimensions
    setActualImageSize({ width: img.naturalWidth, height: img.naturalHeight });
    
    // Set canvas size to match displayed image
    canvas.width = img.clientWidth;
    canvas.height = img.clientHeight;
    setCanvasSize({ width: img.clientWidth, height: img.clientHeight });
    
    // Clear canvas with transparent background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeMode === 'remove' || activeMode === 'fill') {
      setIsDrawing(true);
      draw(e);
    } else if (activeMode === 'crop') {
      startCrop(e);
    }
    // No interaction needed for background mode
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Update mouse position for brush cursor
    if (activeMode === 'remove' || activeMode === 'fill') {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setMousePosition({ x, y });
    }
    
    if ((activeMode === 'remove' || activeMode === 'fill') && isDrawing && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      ctx.globalCompositeOperation = 'source-over';
      // Use different colors for different modes
      ctx.fillStyle = activeMode === 'fill' ? 'rgba(147, 51, 234, 0.8)' : 'rgba(255, 255, 255, 0.8)'; // Purple for fill, white for remove
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, 2 * Math.PI);
      ctx.fill();
      
      // Mark that we have a selection
      if (!hasSelection) {
        setHasSelection(true);
      }
    } else if (activeMode === 'crop' && isCropping) {
      updateCrop(e);
    }
  };

  const stopDrawing = () => {
    if (activeMode === 'remove' || activeMode === 'fill') {
      setIsDrawing(false);
    } else if (activeMode === 'crop') {
      stopCrop();
    }
  };

  const handleMouseLeave = () => {
    if (activeMode === 'remove' || activeMode === 'fill') {
      setIsDrawing(false);
      setShowBrushCursor(false);
    }
    // Don't stop cropping when mouse leaves - let user continue cropping
  };

  const handleMouseEnter = () => {
    if (activeMode === 'remove' || activeMode === 'fill') {
      setShowBrushCursor(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeMode === 'remove' || activeMode === 'fill') {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setMousePosition({ x, y });
    }
  };

  const startCrop = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsCropping(true);
    setCropStartPos({ x, y });
    setCropArea({ x, y, width: 0, height: 0 });
    
    // Clear canvas for crop selection
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const updateCrop = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // For crop mode, the global event listeners handle the mouse movement
    // This function is kept for consistency but the actual logic is in useEffect
    if (activeMode === 'crop' && isCropping) {
      // The global mouse move handler will take care of this
      return;
    }
  };

  const stopCrop = () => {
    setIsCropping(false);
  };

  const clearMask = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setCropArea(null);
    setCropStartPos(null);
    setHasSelection(false);
  };

  const handleUndo = () => {
    if (previousImage) {
      setEditedImage(previousImage);
      localStorage.setItem('pixelme-edited-image', previousImage);
      setPreviousImage(null); // Clear previous image after undo
    }
  };

  const handlePanStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (zoomLevel > 100) {
      setIsPanning(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  };

  const handleCropImage = async () => {
    const sourceImage = currentImage; // Use current edited image, not original
    if (!cropArea || !sourceImage || Math.abs(cropArea.width) < 10 || Math.abs(cropArea.height) < 10) {
      alert('Please select a valid crop area');
      return;
    }

    // Save current image for undo
    setPreviousImage(sourceImage);
    setIsFilling(true);

    try {
      // Load image
      const img = document.createElement('img');
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = sourceImage;
      });

      // Calculate actual crop coordinates
      const scaleX = img.naturalWidth / canvasSize.width;
      const scaleY = img.naturalHeight / canvasSize.height;
      
      const actualCropX = Math.max(0, Math.min(cropArea.x, cropArea.x + cropArea.width) * scaleX);
      const actualCropY = Math.max(0, Math.min(cropArea.y, cropArea.y + cropArea.height) * scaleY);
      const actualCropWidth = Math.abs(cropArea.width) * scaleX;
      const actualCropHeight = Math.abs(cropArea.height) * scaleY;

      // Create cropped canvas
      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = actualCropWidth;
      cropCanvas.height = actualCropHeight;
      const cropCtx = cropCanvas.getContext('2d');
      
      if (!cropCtx) {
        throw new Error('Failed to create crop canvas context');
      }
      
      // Draw cropped portion
      cropCtx.drawImage(
        img,
        actualCropX, actualCropY, actualCropWidth, actualCropHeight,
        0, 0, actualCropWidth, actualCropHeight
      );

      const croppedImageUrl = cropCanvas.toDataURL('image/png');
      
      setEditedImage(croppedImageUrl);
      localStorage.setItem('pixelme-edited-image', croppedImageUrl);
      
      // Clear crop selection
      clearMask();
      
    } catch (error) {
      console.error('Crop error:', error);
      alert('Crop failed: ' + error);
    } finally {
      setIsFilling(false);
    }
  };

  // Function to convert URL to data URL
  const convertUrlToDataUrl = async (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to create canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('Failed to load image from URL'));
      img.src = url;
    });
  };

  // Function to add checkered background to transparent images
  const addCheckeredBackground = async (imageUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = document.createElement('img');
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve(imageUrl);
          return;
        }
        
        // Draw checkered background first
        const checkSize = 20;
        for (let x = 0; x < canvas.width; x += checkSize) {
          for (let y = 0; y < canvas.height; y += checkSize) {
            const isEven = Math.floor(x / checkSize) % 2 === Math.floor(y / checkSize) % 2;
            ctx.fillStyle = isEven ? '#e5e5e5' : '#cccccc';
            ctx.fillRect(x, y, checkSize, checkSize);
          }
        }
        
        // Draw the image on top - the API should have already handled transparency correctly
        // We don't modify the image data at all, just composite it over the checkered background
        ctx.drawImage(img, 0, 0);
        
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(imageUrl);
      img.src = imageUrl;
    });
  };

  const handleBackgroundRemoval = async () => {
    const sourceImage = currentImage; // Use current edited image, not original
    if (!sourceImage) return;

    // Save current image for undo
    setPreviousImage(sourceImage);
    setIsFilling(true);

    try {
      // Load image and get dimensions
      const img = document.createElement('img');
      img.crossOrigin = 'anonymous';
      
      // Wait for image to load
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = sourceImage;
      });

      // Create image canvas with actual dimensions
      const imageCanvas = document.createElement('canvas');
      imageCanvas.width = img.naturalWidth;
      imageCanvas.height = img.naturalHeight;
      const imageCtx = imageCanvas.getContext('2d');
      
      if (!imageCtx) {
        throw new Error('Failed to create image canvas context');
      }
      
      imageCtx.drawImage(img, 0, 0);
      const imageDataUrl = imageCanvas.toDataURL('image/jpeg', 0.95);
      
      const response = await fetch('/api/remove-background', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: imageDataUrl,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Create image with checkered background to show transparency
        const transparentImage = await addCheckeredBackground(data.imageUrl);
        setEditedImage(transparentImage);
        localStorage.setItem('pixelme-edited-image', transparentImage);
        
        console.log('Background removal completed successfully using 851-labs/background-remover');
      } else {
        console.error('Background removal failed:', data.error);
        alert('Background removal failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Background removal error:', error);
      alert('Background removal failed: Network error');
    } finally {
      setIsFilling(false);
    }
  };

  const handleAIFill = async () => {
    const sourceImage = currentImage; // Use current edited image, not original
    if (!sourceImage || !canvasRef.current) return;

    // Save current image for undo
    setPreviousImage(sourceImage);
    setIsFilling(true);

    try {
      // Load image and get dimensions
      const img = document.createElement('img');
      img.crossOrigin = 'anonymous';
      
      // Wait for image to load
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = sourceImage;
      });

      // Create image canvas with actual dimensions
      const imageCanvas = document.createElement('canvas');
      imageCanvas.width = img.naturalWidth;
      imageCanvas.height = img.naturalHeight;
      const imageCtx = imageCanvas.getContext('2d');
      
      if (!imageCtx) {
        throw new Error('Failed to create image canvas context');
      }
      
      imageCtx.drawImage(img, 0, 0);
      const imageDataUrl = imageCanvas.toDataURL('image/jpeg', 0.95);

      // Create properly scaled mask for FLUX Fill Pro
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = img.naturalWidth;
      maskCanvas.height = img.naturalHeight;
      const maskCtx = maskCanvas.getContext('2d');
      
      if (!maskCtx) {
        throw new Error('Failed to create mask canvas context');
      }

      // Fill with black background first (areas to keep)
      maskCtx.fillStyle = 'black';
      maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

      // Scale and draw the user's mask
      const scaleX = img.naturalWidth / canvasSize.width;
      const scaleY = img.naturalHeight / canvasSize.height;
      
      // Get the drawn mask data
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvasRef.current!.width;
      tempCanvas.height = canvasRef.current!.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) throw new Error('Failed to create temp canvas context');
      
      tempCtx.drawImage(canvasRef.current!, 0, 0);
      const tempImageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      const tempPixelData = tempImageData.data;
      
      // Draw white areas where user drew (areas to fill)
      maskCtx.fillStyle = 'white';
      for (let y = 0; y < tempCanvas.height; y++) {
        for (let x = 0; x < tempCanvas.width; x++) {
          const index = (y * tempCanvas.width + x) * 4;
          const alpha = tempPixelData[index + 3];
          
          if (alpha > 128) { // User drew here - should be filled
            const scaledX = x * scaleX;
            const scaledY = y * scaleY;
            maskCtx.fillRect(scaledX, scaledY, scaleX, scaleY);
          }
        }
      }

      const maskDataUrl = maskCanvas.toDataURL('image/png');
      
      const response = await fetch('/api/fill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: imageDataUrl,
          maskData: maskDataUrl,
          prompt: aiFillPrompt || 'Remove all objects and content within the masked areas, then intelligently fill the empty space by extending and continuing the background elements from the surrounding areas. Analyze the context around the masked region and seamlessly blend the background patterns, textures, colors, and structures to naturally fill the void where the removed objects were. Focus on extending background elements like walls, floors, clothing, sky, or other environmental details rather than the removed foreground objects.'
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setEditedImage(data.imageUrl);
        localStorage.setItem('pixelme-edited-image', data.imageUrl);
        // Clear the mask after successful fill
        clearMask();
        
        console.log('Smart remove & fill completed successfully using FLUX Fill Pro');
      } else {
        console.error('Smart remove & fill failed:', data.error);
        alert('Smart remove & fill failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Smart remove & fill error:', error);
      alert('Smart remove & fill failed: Network error');
    } finally {
      setIsFilling(false);
    }
  };

  const handleGenerativeFill = async () => {
    const sourceImage = currentImage; // Use current edited image, not original
    if (!sourceImage || !canvasRef.current) return;

    // Save current image for undo
    setPreviousImage(sourceImage);
    setIsFilling(true);

    try {
      // Load image and get dimensions
      const img = document.createElement('img');
      img.crossOrigin = 'anonymous';
      
      // Wait for image to load
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = sourceImage;
      });

      // Create image canvas with actual dimensions
      const imageCanvas = document.createElement('canvas');
      imageCanvas.width = img.naturalWidth;
      imageCanvas.height = img.naturalHeight;
      const imageCtx = imageCanvas.getContext('2d');
      
      if (!imageCtx) {
        throw new Error('Failed to create image canvas context');
      }
      
      imageCtx.drawImage(img, 0, 0);
      const imageDataUrl = imageCanvas.toDataURL('image/jpeg', 0.95);

      // Create properly scaled mask for LaMa model
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = img.naturalWidth;
      maskCanvas.height = img.naturalHeight;
      const maskCtx = maskCanvas.getContext('2d');
      
      if (!maskCtx) {
        throw new Error('Failed to create mask canvas context');
      }

      // Fill with black background first (areas to keep)
      maskCtx.fillStyle = 'black';
      maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

      // Scale and draw the user's mask
      const scaleX = img.naturalWidth / canvasSize.width;
      const scaleY = img.naturalHeight / canvasSize.height;
      
      // Get the drawn mask data
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvasRef.current!.width;
      tempCanvas.height = canvasRef.current!.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) throw new Error('Failed to create temp canvas context');
      
      tempCtx.drawImage(canvasRef.current!, 0, 0);
      const tempImageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      const tempPixelData = tempImageData.data;
      
      // Draw white areas where user drew (areas to remove)
      maskCtx.fillStyle = 'white';
      for (let y = 0; y < tempCanvas.height; y++) {
        for (let x = 0; x < tempCanvas.width; x++) {
          const index = (y * tempCanvas.width + x) * 4;
          const alpha = tempPixelData[index + 3];
          
          if (alpha > 128) { // User drew here - should be removed
            const scaledX = x * scaleX;
            const scaledY = y * scaleY;
            maskCtx.fillRect(scaledX, scaledY, scaleX, scaleY);
          }
        }
      }

      const maskDataUrl = maskCanvas.toDataURL('image/png');
      
      // Use Remove Objects API with LaMa model
      const response = await fetch('/api/remove-objects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: imageDataUrl,
          maskData: maskDataUrl
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setEditedImage(data.imageUrl);
        localStorage.setItem('pixelme-edited-image', data.imageUrl);
        // Clear the mask after successful removal
        clearMask();
        
        console.log('Object removal completed successfully using LaMa model');
      } else {
        console.error('Object removal failed:', data.error);
        alert('Object removal failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Object removal error:', error);
      alert('Object removal failed: Network error');
    } finally {
      setIsFilling(false);
    }
  };

  const currentImage = editedImage || conversionResult;

  // Get available positions for clothing type (using custom presets)
  const getAvailablePositions = (clothingType: string) => {
    if (presetsLoading) {
      return []; // Return empty array while loading
    }
    
    // If custom presets are available, use them
    if (Object.keys(customPresets).length > 0) {
      return Object.entries(customPresets).map(([key, preset]) => ({
        id: key,
        name: preset.name
      }));
    }
    
    // Fallback to hardcoded presets if no custom presets are available
    switch (clothingType) {
      case 'hoodie':
        return [
          { id: 'middle-chest', name: 'Middle Chest' },
          { id: 'left-chest', name: 'Left Chest' }
        ];
      case 'trackies':
        return [
          { id: 'left-leg', name: 'Left Leg' },
          { id: 'right-leg', name: 'Right Leg' }
        ];
      default:
        return [{ id: 'center', name: 'Center' }];
    }
  };

  // Get positioning styles for each position (using custom presets)
  const getPositionStyles = (clothingType: string, position: string) => {
    // If custom presets are available, use them
    if (Object.keys(customPresets).length > 0 && customPresets[position]) {
      const preset = customPresets[position];
      return {
        top: `${preset.y}%`,
        left: `${preset.x}%`,
        transform: 'translate(-50%, -50%)'
      };
    }
    
    // Fallback to hardcoded positions if no custom presets are available
    if (clothingType === 'hoodie') {
      switch (position) {
        case 'middle-chest':
          return {
            top: '45%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
          };
        case 'left-chest':
          return {
            top: '45%',
            right: '26%',
            transform: 'translate(-50%, -50%)'
          };
        default:
          return {
            top: '45%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
          };
      }
    } else if (clothingType === 'trackies') {
      switch (position) {
        case 'left-leg':
          return {
            top: '37%',
            left: '39%',
            transform: 'translate(-50%, -50%)'
          };
        case 'right-leg':
          return {
            top: '37%',
            left: '61%',
            transform: 'translate(-50%, -50%)'
          };
        default:
          return {
            top: '65%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
          };
      }
    }
    
    // Default center position
    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)'
    };
  };

  // Get design size based on custom presets
  const getDesignSize = (position: string) => {
    // If custom presets are available, use them
    if (Object.keys(customPresets).length > 0 && customPresets[position]) {
      const preset = customPresets[position];
      // Convert percentage size to pixels (base size of clothing image is ~400px)
      return Math.round((preset.size / 100) * 400);
    }
    
    // Default size
    return 50;
  };

  // Get default position for clothing type (prioritizing custom presets)
  const getDefaultPosition = (clothingType: string) => {
    // If custom presets are available, use the first one
    if (Object.keys(customPresets).length > 0) {
      return Object.keys(customPresets)[0];
    }
    
    // Fallback to hardcoded defaults
    return clothingType === 'hoodie' ? 'middle-chest' : 'left-leg';
  };

  // Step 7 - Preview on Clothing
  if (step === 'preview') {
    const finalImage = localStorage.getItem('pixelme-final-image') || currentImage;
    
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <Image
          src="/logo.png"
          alt="PixelMe Logo"
          width={200}
          height={80}
          className="mb-8"
          priority
        />
        
        <div className="w-[1000px] bg-white rounded-lg shadow p-8 flex flex-col items-center relative">
          <div className="w-full flex items-center gap-4 mb-6">
            {/* Step indicators */}
            {selectedClothing && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGoHome}
                  className="flex items-center justify-center p-1 bg-white rounded-lg border-2 border-green-600 hover:shadow-lg transition-all duration-200 cursor-pointer w-20 h-20"
                  title="Change clothing style"
                >
                  <Image
                    src={`/clothes/${selectedClothing}.png`}
                    alt={selectedClothing}
                    width={60}
                    height={60}
                    className="object-contain"
                    priority
                  />
                </button>
              </div>
            )}
            
            {uploadedImage && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleStepChange('upload')}
                  className="flex items-center justify-center p-1 bg-white rounded-lg border-2 border-green-600 hover:shadow-lg transition-all duration-200 cursor-pointer w-20 h-20"
                  title="Change uploaded photo"
                >
                  <img
                    src={uploadedImage}
                    alt="Uploaded preview"
                    width={60}
                    height={60}
                    className="object-contain rounded-lg w-16 h-16"
                  />
                </button>
              </div>
            )}
            
            {selectedStyle && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleStepChange('style')}
                  className="flex items-center justify-center p-1 bg-white rounded-lg border-2 border-green-600 hover:shadow-lg transition-all duration-200 cursor-pointer w-20 h-20"
                  title="Change style selection"
                >
                  <Image
                    src={`/styles/${selectedStyle === 'Studio Ghibli' ? 'ghibli' : selectedStyle === 'South Park' ? 'southpark' : selectedStyle === 'Family Guy' ? 'familyguy' : selectedStyle === 'Dragon Ball' ? 'dragonball' : selectedStyle === 'Anime' ? 'anime' : 'simpsons'}.png`}
                    alt={`${selectedStyle} Style`}
                    width={60}
                    height={60}
                    className="object-contain rounded-lg"
                  />
                </button>
              </div>
            )}
            
            {conversionResult && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleStepChange('convert')}
                  className="flex items-center justify-center p-1 bg-white rounded-lg border-2 border-green-600 hover:shadow-lg transition-all duration-200 cursor-pointer w-20 h-20"
                  title="Go back to convert step"
                >
                  <img
                    src={conversionResult}
                    alt="Converted preview"
                    width={60}
                    height={60}
                    className="object-contain rounded-lg w-16 h-16"
                  />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              {editedImage ? (
                <button
                  onClick={() => {
                    setStep('edit');
                    localStorage.setItem('pixelme-current-step', 'edit');
                  }}
                  className="flex items-center justify-center p-1 bg-white rounded-lg border-2 border-green-600 hover:shadow-lg transition-all duration-200 cursor-pointer w-20 h-20"
                  title="Go back to edit step"
                >
                  {editedImage && (
                    <img
                      src={editedImage}
                      alt="Edited image preview"
                      width={60}
                      height={60}
                      className="object-contain rounded-lg w-16 h-16"
                    />
                  )}
                </button>
              ) : (
                <button
                  onClick={() => {
                    setStep('edit');
                    localStorage.setItem('pixelme-current-step', 'edit');
                  }}
                  className="text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg w-20 h-20 flex items-center justify-center border-2 border-green-600 hover:shadow-lg transition-all duration-200 cursor-pointer"
                  title="Go back to edit step"
                >
                  5
                </button>
              )}
            </div>

            {/* Step 6 - Color Reduction */}
            <div className="flex items-center gap-2">
              {colorReducedImage ? (
                <button
                  onClick={() => {
                    setStep('color-reduce');
                    localStorage.setItem('pixelme-current-step', 'color-reduce');
                  }}
                  className="flex items-center justify-center p-1 bg-white rounded-lg border-2 border-green-600 hover:shadow-lg transition-all duration-200 cursor-pointer w-20 h-20"
                  title="Go back to color reduction step"
                >
                  <img
                    src={colorReducedImage}
                    alt="Color reduced image preview"
                    width={60}
                    height={60}
                    className="object-contain rounded-lg w-16 h-16"
                  />
                </button>
              ) : (
                <button
                  onClick={() => {
                    setStep('color-reduce');
                    localStorage.setItem('pixelme-current-step', 'color-reduce');
                  }}
                  className="text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg w-20 h-20 flex items-center justify-center border-2 border-green-600 hover:shadow-lg transition-all duration-200 cursor-pointer"
                  title="Go back to color reduction step"
                >
                  6
                </button>
              )}
            </div>

            {/* Step 7 - Preview */}
            <div className="flex items-center gap-2">
              <div className="relative flex items-center justify-center p-1 bg-white rounded-lg border-2 border-green-600 w-20 h-20">
                {selectedClothing && finalImage ? (
                  <div className="relative w-16 h-16">
                    <Image
                      src={`/clothes/${selectedClothing}.png`}
                      alt={selectedClothing}
                      width={64}
                      height={64}
                      className="object-contain w-full h-full"
                      priority
                    />
                    <div 
                      className="absolute"
                      style={{
                        ...getPositionStyles(selectedClothing, selectedPosition),
                        width: '12px',
                        height: '12px',
                        transform: 'translate(-50%, -50%) scale(0.24)'
                      }}
                    >
                      <img
                        src={finalImage}
                        alt="Design preview"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                ) : (
                  <span className="text-sm font-semibold text-green-600">7</span>
                )}
              </div>
            </div>
            
            {/* Product Info Display */}
            <div className="flex items-center gap-4 ml-auto mr-4">
              {(selectedClothing || selectedColor || selectedSize) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm">
                  <div className="font-semibold text-blue-800 mb-1">Current Selection:</div>
                  <div className="text-blue-700">
                    <div><span className="font-medium">Product:</span> {selectedClothing ? (selectedClothing.charAt(0).toUpperCase() + selectedClothing.slice(1)) : 'Not Selected'}</div>
                    <div><span className="font-medium">Color:</span> {selectedColor || 'Not Selected'}</div>
                    <div><span className="font-medium">Size:</span> {selectedSize || 'Not Selected'}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Clear Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleClear}
                className="w-20 h-20 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center"
                title="Clear all and start over"
              >
                <Image
                  src="/redo.png"
                  alt="Clear"
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center w-full">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-semibold text-gray-800 mb-2">Your Final Design</h3>
              <p className="text-gray-600">Here's your <span className="font-semibold text-green-600">{selectedStyle}</span> style image on your {selectedClothing || 'clothing'}</p>
              
              {/* Position Selection */}
              {selectedClothing && (
                <div className="mt-4">
                  <h4 className="text-lg font-semibold text-gray-700 mb-3">Choose Position</h4>
                  {presetsLoading ? (
                    <div className="flex items-center justify-center gap-2 py-4">
                      <div className="animate-spin h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full"></div>
                      <span className="text-sm text-gray-600">Loading positions...</span>
                    </div>
                  ) : (
                    <div className="flex gap-3 justify-center flex-wrap">
                      {getAvailablePositions(selectedClothing).map((position) => (
                        <button
                          key={position.id}
                          onClick={() => {
                            setSelectedPosition(position.id);
                            localStorage.setItem('pixelme-selected-position', position.id);
                          }}
                          className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                            selectedPosition === position.id
                              ? 'bg-green-600 text-white shadow-lg'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {position.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Preview of image on clothing with zoom control */}
            {selectedClothing && (
              <div className="flex items-start justify-center gap-4 w-full mb-6">
                {/* Clothing Preview - Fixed width container */}
                <div className="relative">
                  <div 
                    className={`relative overflow-hidden rounded-lg bg-white shadow-sm border border-gray-200 ${zoomLevel > 100 ? 'cursor-grab' : 'cursor-default'} ${isPanning ? 'cursor-grabbing' : ''}`}
                    style={{ 
                      width: '500px',
                      height: '500px',
                    }}
                    onMouseDown={handlePanStart}
                  >
                    <div 
                      className="absolute inset-0 transition-transform duration-200 flex items-center justify-center" 
                      style={{ 
                        transform: `scale(${zoomLevel / 100}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                        transformOrigin: 'center'
                      }}
                    >
                      <div className="relative">
                        <Image
                          src={`/clothes/${selectedClothing}.png`}
                          alt={selectedClothing}
                          width={400}
                          height={400}
                          className="object-contain"
                          priority
                        />
                        {finalImage && selectedClothing && (
                          <div 
                            className="absolute"
                            style={getPositionStyles(selectedClothing, selectedPosition)}
                          >
                            <img
                              src={finalImage}
                              alt="Your design"
                              style={{
                                width: `${getDesignSize(selectedPosition)}px`,
                                height: `${getDesignSize(selectedPosition)}px`,
                                objectFit: 'contain',
                                backgroundColor: 'transparent',
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Zoom Control - Fixed position, same height */}
                <div className="flex flex-col items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-gray-200" style={{ height: '500px', width: '80px', flexShrink: 0 }}>
                  {/* Top section with pan instruction */}
                  <div className="flex flex-col items-center justify-center" style={{ height: '80px' }}>
                    {zoomLevel > 100 ? (
                      <div className="text-xs text-gray-500 text-center whitespace-nowrap leading-tight" style={{ fontSize: '10px' }}>
                        Drag to<br />pan
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400 text-center whitespace-nowrap leading-tight" style={{ fontSize: '10px' }}>
                        Zoom to<br />explore
                      </div>
                    )}
                  </div>
                  
                  {/* Middle section with zoom slider */}
                  <div className="flex items-center justify-center" style={{ height: '320px' }}>
                    <input
                      type="range"
                      min="100"
                      max="500"
                      value={zoomLevel}
                      onChange={(e) => {
                        const newZoom = parseInt(e.target.value);
                        setZoomLevel(newZoom);
                        localStorage.setItem('pixelme-zoom-level', newZoom.toString());
                      }}
                      className="zoom-slider-vertical"
                      style={{
                        width: '320px',
                        height: '20px',
                        transform: 'rotate(-90deg)',
                        transformOrigin: 'center',
                        background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((zoomLevel - 100) / 400) * 100}%, #e5e7eb ${((zoomLevel - 100) / 400) * 100}%, #e5e7eb 100%)`
                      }}
                    />
                  </div>
                  
                  {/* Bottom section with zoom level indicator */}
                  <div className="flex flex-col items-center justify-center" style={{ height: '80px' }}>
                    <div className="text-xs text-gray-600 font-medium">
                      {zoomLevel}%
                    </div>
                  </div>
                  
                  <style jsx>{`
                    .zoom-slider-vertical {
                      appearance: none;
                      outline: none;
                      border-radius: 10px;
                      cursor: pointer;
                    }
                    
                    .zoom-slider-vertical::-webkit-slider-thumb {
                      appearance: none;
                      width: 20px;
                      height: 20px;
                      border-radius: 50%;
                      background: #3b82f6;
                      cursor: pointer;
                      border: 3px solid white;
                      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
                      transition: all 0.2s ease;
                    }
                    
                    .zoom-slider-vertical::-webkit-slider-thumb:hover {
                      background: #2563eb;
                      transform: scale(1.2);
                      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                    }
                    
                    .zoom-slider-vertical::-moz-range-thumb {
                      width: 20px;
                      height: 20px;
                      border-radius: 50%;
                      background: #3b82f6;
                      cursor: pointer;
                      border: 3px solid white;
                      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
                      transition: all 0.2s ease;
                    }
                    
                    .zoom-slider-vertical::-moz-range-thumb:hover {
                      background: #2563eb;
                      transform: scale(1.2);
                      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                    }
                    
                    .zoom-slider-vertical::-moz-range-track {
                      background: transparent;
                      border: none;
                      height: 20px;
                      border-radius: 10px;
                    }
                    
                    .zoom-slider-vertical::-webkit-slider-track {
                      background: transparent;
                      border: none;
                      height: 20px;
                      border-radius: 10px;
                    }
                  `}</style>
                </div>
              </div>
            )}

            {/* Checkout Section */}
            <div className="w-full max-w-md">
              {/* Price Display */}
              <div className="text-center mb-6">
                <div className="text-2xl font-bold text-gray-800">${variantPrice}</div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-3">
                {/* Add to Cart and Buy Now buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={async () => {
                      if (!selectedSize) {
                        alert('Size not found! Please go back to step 1 and select a size.');
                        return;
                      }
                      
                      setIsCheckingOut(true);
                      
                      try {
                                                                          // Get the final image for add to cart
                        const finalImage = localStorage.getItem('pixelme-final-image') || currentImage;
                        
                        // Use the basic clothing products that already exist and work
                        const existingProductResponse = await fetch('/api/shopify/products');
                        const existingProducts = await existingProductResponse.json();
                        console.log('All existing products:', existingProducts.products?.map((p: any) => p.title));
                        
                        // Find the basic clothing product (like "Hoodie" or "Trackies")
                        const basicProductName = selectedClothing === 'hoodie' ? 'Hoodie' : 'Trackies';
                        let product = existingProducts.products?.find((p: any) => 
                          p.title === basicProductName
                        );
                        
                        console.log('Looking for basic product:', basicProductName);
                        console.log('Found product:', product?.title || 'None');
                        
                        if (!product) {
                          // Fallback: try to find any product containing the clothing type
                          product = existingProducts.products?.find((p: any) => {
                            if (!selectedClothing) return false;
                            const titleLower = p.title.toLowerCase();
                            const clothingLower = selectedClothing.toLowerCase();
                            return titleLower.includes(clothingLower);
                          });
                          console.log('Fallback: found product:', product?.title || 'None');
                        }
                        
                        if (!product) {
                          throw new Error('Unable to create or find product');
                        }
                        
                        console.log('Product variants:', product.variants);
                        console.log('Looking for size:', selectedSize, 'and color:', selectedColor);
                        
                        // Find the variant for the selected size AND color
                        let variant = product.variants.edges.find((edge: any) => {
                          const title = edge.node.title || '';
                          const selectedOptions = edge.node.selectedOptions || [];
                          
                          // Check by title (like "L / Black")
                          const titleIncludesSize = title.includes(selectedSize);
                          const titleIncludesColor = title.toLowerCase().includes(selectedColor.toLowerCase());
                          
                          // Check by selectedOptions array
                          const hasSize = selectedOptions.some((opt: any) => 
                            opt.name === 'Size' && opt.value === selectedSize
                          );
                          const hasColor = selectedOptions.some((opt: any) => 
                            opt.name === 'Color' && opt.value.toLowerCase() === selectedColor.toLowerCase()
                          );
                          
                          return (titleIncludesSize && titleIncludesColor) || (hasSize && hasColor);
                        });
                        
                        // If not found by title, try by SKU with both size and color
                        if (!variant) {
                          variant = product.variants.edges.find((edge: any) => {
                            const sku = edge.node.sku || '';
                            return sku.includes(selectedSize) && sku.toLowerCase().includes(selectedColor.toLowerCase());
                          });
                        }
                        
                        // If still not found, find any variant with the selected color
                        if (!variant) {
                          console.log('Trying to find any variant with color:', selectedColor);
                          variant = product.variants.edges.find((edge: any) => {
                            const title = edge.node.title || '';
                            const selectedOptions = edge.node.selectedOptions || [];
                            return title.toLowerCase().includes(selectedColor.toLowerCase()) ||
                                   selectedOptions.some((opt: any) => 
                                     opt.name === 'Color' && opt.value.toLowerCase() === selectedColor.toLowerCase()
                                   );
                          });
                        }
                        
                        // Last resort: use the first available variant
                        if (!variant && product.variants.edges.length > 0) {
                          console.log('Using first available variant as fallback');
                          variant = product.variants.edges[0];
                        }
                        
                        if (!variant) {
                          console.error('No variants found in product:', product);
                          throw new Error('No variants available for this product');
                        }
                        
                        console.log('Selected variant:', variant);
                        const variantId = variant.node.id;
                        console.log('Variant ID for cart:', variantId);
                        // Simplified custom attributes to avoid Shopify validation issues
                        const customAttributes = [
                          { key: 'clothing_type', value: selectedClothing || 'hoodie' },
                          { key: 'style', value: selectedStyle || 'Dragon Ball' },
                          { key: 'size', value: selectedSize || 'M' }
                        ];
                        console.log('Custom attributes for cart:', customAttributes);
                        
                        // Check if cart exists
                        let cartId = localStorage.getItem('pixelme-cart-id');
                        
                        if (cartId) {
                          // Add to existing cart
                          const addToCartResponse = await fetch('/api/shopify/cart', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              action: 'add',
                              cartId,
                              variantId,
                              quantity: 1,
                              customAttributes
                            })
                          });
                          
                          if (!addToCartResponse.ok) {
                            // Cart might be expired, create new one
                            cartId = null;
                            localStorage.removeItem('pixelme-cart-id');
                          }
                        }
                        
                        if (!cartId) {
                          // Create new cart
                          const cartPayload = {
                            action: 'create',
                            variantId,
                            quantity: 1,
                            customAttributes
                          };
                          console.log('Creating cart with payload:', cartPayload);
                          
                          const createCartResponse = await fetch('/api/shopify/cart', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(cartPayload)
                          });
                          
                          if (!createCartResponse.ok) {
                            const errorData = await createCartResponse.text();
                            console.error('Cart creation failed:', errorData);
                            throw new Error(`Failed to create cart: ${errorData}`);
                          }
                          
                          const cartData = await createCartResponse.json();
                          console.log('Cart creation success response:', cartData);
                          
                          if (cartData.cart && cartData.cart.id) {
                            localStorage.setItem('pixelme-cart-id', cartData.cart.id);
                            console.log('Cart ID saved:', cartData.cart.id);
                          } else if (cartData.cartCreated) {
                            console.log('Cart creation initiated successfully (no ID yet)');
                          } else {
                            console.warn('Cart created but no cart ID returned:', cartData);
                          }
                        }
                        
                        // Refresh cart data for CartIcon
                        window.dispatchEvent(new CustomEvent('cart-updated'));
                        
                      } catch (error) {
                        console.error('Add to cart error:', error);
                        alert('Something went wrong adding to cart. Please try again.');
                      } finally {
                        setIsCheckingOut(false);
                      }
                    }}
                    disabled={isCheckingOut || !selectedSize}
                    className={`flex-1 px-6 py-4 rounded-lg font-semibold text-lg transition-all duration-200 ${
                      isCheckingOut || !selectedSize
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
                    }`}
                  >
                    {isCheckingOut ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Adding...
                      </div>
                    ) : selectedSize ? (
                      'Add to Cart'
                    ) : (
                      'Select Size'
                    )}
                  </button>

                  <button
                    onClick={async () => {
                      if (!selectedSize) {
                        alert('Size not found! Please go back to step 1 and select a size.');
                        return;
                      }
                      
                      setIsCheckingOut(true);
                      
                      try {
                        // Get the final image for checkout
                        const finalImage = localStorage.getItem('pixelme-final-image') || currentImage || '';
                        
                        // Use the same basic clothing products as Add to Cart
                        const existingProductResponse = await fetch('/api/shopify/products');
                        const existingProducts = await existingProductResponse.json();
                        console.log('Buy Now - All existing products:', existingProducts.products?.map((p: any) => p.title));
                        
                        // Find the basic clothing product (like "Hoodie" or "Trackies")
                        const basicProductName = selectedClothing === 'hoodie' ? 'Hoodie' : 'Trackies';
                        let product = existingProducts.products?.find((p: any) => 
                          p.title === basicProductName
                        );
                        
                        console.log('Buy Now - Looking for basic product:', basicProductName);
                        console.log('Buy Now - Found product:', product?.title || 'None');
                        
                        if (!product) {
                          // Fallback: try to find any product containing the clothing type
                          product = existingProducts.products?.find((p: any) => {
                            if (!selectedClothing) return false;
                            const titleLower = p.title.toLowerCase();
                            const clothingLower = selectedClothing.toLowerCase();
                            return titleLower.includes(clothingLower);
                          });
                          console.log('Buy Now - Fallback: found product:', product?.title || 'None');
                        }
                        
                        if (!product) {
                          throw new Error('Unable to find base product. Please ensure "Hoodie" product exists in Shopify.');
                        }
                        
                        console.log('Buy Now - Product variants:', product.variants);
                        console.log('Buy Now - Looking for size:', selectedSize, 'and color:', selectedColor);
                        
                        // Find the variant for the selected size AND color
                        let variant = product.variants.edges.find((edge: any) => {
                          const title = edge.node.title || '';
                          const selectedOptions = edge.node.selectedOptions || [];
                          
                          // Check by title (like "L / Black")
                          const titleIncludesSize = title.includes(selectedSize);
                          const titleIncludesColor = title.toLowerCase().includes(selectedColor.toLowerCase());
                          
                          // Check by selectedOptions array
                          const hasSize = selectedOptions.some((opt: any) => 
                            opt.name === 'Size' && opt.value === selectedSize
                          );
                          const hasColor = selectedOptions.some((opt: any) => 
                            opt.name === 'Color' && opt.value.toLowerCase() === selectedColor.toLowerCase()
                          );
                          
                          return (titleIncludesSize && titleIncludesColor) || (hasSize && hasColor);
                        });
                        
                        // If not found by title, try by SKU with both size and color
                        if (!variant) {
                          variant = product.variants.edges.find((edge: any) => {
                            const sku = edge.node.sku || '';
                            return sku.includes(selectedSize) && sku.toLowerCase().includes(selectedColor.toLowerCase());
                          });
                        }
                        
                        // If still not found, find any variant with the selected color
                        if (!variant) {
                          console.log('Buy Now - Trying to find any variant with color:', selectedColor);
                          variant = product.variants.edges.find((edge: any) => {
                            const title = edge.node.title || '';
                            const selectedOptions = edge.node.selectedOptions || [];
                            return title.toLowerCase().includes(selectedColor.toLowerCase()) ||
                                   selectedOptions.some((opt: any) => 
                                     opt.name === 'Color' && opt.value.toLowerCase() === selectedColor.toLowerCase()
                                   );
                          });
                        }
                        
                        // Last resort: use the first available variant
                        if (!variant && product.variants.edges.length > 0) {
                          console.log('Buy Now - Using first available variant as fallback');
                          variant = product.variants.edges[0];
                        }
                        
                        if (!variant) {
                          console.error('Buy Now - No variants found in product:', product);
                          throw new Error('No variants available for this product');
                        }
                        
                        console.log('Buy Now - Selected variant:', variant);
                        // Extract variant ID (remove the GraphQL prefix)
                        const variantId = variant.node.id.replace('gid://shopify/ProductVariant/', '');
                        
                        // Create checkout with custom attributes (style passed as attributes, not separate product)
                        const checkoutResponse = await fetch('/api/shopify/checkout', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            variantId,
                            quantity: 1,
                            customImageUrl: finalImage || undefined,
                            clothing: selectedClothing,
                            style: selectedStyle,
                            size: selectedSize,
                            color: selectedColor || 'Black'
                          })
                        });
                        
                        if (!checkoutResponse.ok) {
                          throw new Error('Failed to create checkout');
                        }
                        
                        const checkoutData = await checkoutResponse.json();
                        
                        // Redirect to Shopify checkout
                        window.location.href = checkoutData.checkout.webUrl;
                        
                      } catch (error) {
                        console.error('Checkout error:', error);
                        alert('Something went wrong during checkout. Please try again.');
                      } finally {
                        setIsCheckingOut(false);
                      }
                    }}
                    disabled={isCheckingOut || !selectedSize}
                    className={`flex-1 px-6 py-4 rounded-lg font-semibold text-lg transition-all duration-200 ${
                      isCheckingOut || !selectedSize
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700 shadow-lg hover:shadow-xl'
                    }`}
                  >
                    {isCheckingOut ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Creating Order...
                      </div>
                    ) : selectedSize ? (
                      'Buy Now'
                    ) : (
                      'Select Size'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Cart Button */}
        <div className="fixed bottom-6 right-6 z-50">
          <CartIcon />
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <Image
        src="/logo.png"
        alt="PixelMe Logo"
        width={200}
        height={80}
        className="mb-8"
        priority
      />
      
      <div className="w-[1000px] bg-white rounded-lg shadow p-8 flex flex-col items-center relative">
        <div className="w-full flex items-center gap-4 mb-6">
          {/* Step 1 - Clothing */}
          <div className="flex items-center gap-2">
            {selectedClothing ? (
              <button
                onClick={handleGoHome}
                className="flex items-center justify-center p-1 bg-white rounded-lg border-2 border-transparent hover:shadow-lg transition-all duration-200 cursor-pointer w-20 h-20"
                title="Change clothing style"
              >
                <Image
                  src={`/clothes/${selectedClothing}.png`}
                  alt={selectedClothing}
                  width={60}
                  height={60}
                  className="object-contain"
                  priority
                />
              </button>
            ) : (
              <span className="text-sm font-semibold text-gray-400 bg-gray-100 rounded-lg w-20 h-20 flex items-center justify-center border-2 border-transparent">1</span>
            )}
          </div>
          
          {/* Step 2 - Upload Image */}
          <div className="flex items-center gap-2">
            {uploadedImage ? (
              <button
                onClick={() => handleStepChange('upload')}
                className="flex items-center justify-center p-1 bg-white rounded-lg border-2 border-transparent hover:shadow-lg transition-all duration-200 cursor-pointer w-20 h-20"
                title="Change uploaded photo"
              >
                <img
                  src={uploadedImage}
                  alt="Uploaded preview"
                  width={60}
                  height={60}
                  className="object-contain rounded-lg w-16 h-16"
                />
              </button>
            ) : (
              <span className="text-sm font-semibold text-gray-400 bg-gray-100 rounded-lg w-20 h-20 flex items-center justify-center border-2 border-transparent">2</span>
            )}
          </div>
          
          {/* Step 3 - Style Selection */}
          <div className="flex items-center gap-2">
            {selectedStyle ? (
              <button
                onClick={() => handleStepChange('style')}
                className="flex items-center justify-center p-1 bg-white rounded-lg border-2 border-transparent hover:shadow-lg transition-all duration-200 cursor-pointer w-20 h-20"
                title="Change style selection"
              >
                <Image
                  src={`/styles/${selectedStyle === 'Studio Ghibli' ? 'ghibli' : selectedStyle === 'South Park' ? 'southpark' : selectedStyle === 'Family Guy' ? 'familyguy' : selectedStyle === 'Dragon Ball' ? 'dragonball' : selectedStyle === 'Anime' ? 'anime' : 'simpsons'}.png`}
                  alt={`${selectedStyle} Style`}
                  width={60}
                  height={60}
                  className="object-contain rounded-lg"
                />
              </button>
            ) : (
              <span className="text-sm font-semibold text-gray-400 bg-gray-100 rounded-lg w-20 h-20 flex items-center justify-center border-2 border-transparent">3</span>
            )}
          </div>
          
          {/* Step 4 - After Style Conversion */}
          <div className="flex items-center gap-2">
            {conversionResult ? (
              <button
                onClick={() => handleStepChange('before')}
                className={`flex items-center justify-center p-1 bg-white rounded-lg border-2 hover:shadow-lg transition-all duration-200 cursor-pointer w-20 h-20 ${
                  step === 'before' ? 'border-blue-600' : 'border-transparent'
                }`}
                title="View styled image before editing"
              >
                <img
                  src={conversionResult}
                  alt="Styled image preview"
                  width={60}
                  height={60}
                  className="object-contain rounded-lg w-16 h-16"
                />
              </button>
            ) : (
              <span className="text-sm font-semibold text-gray-400 bg-gray-100 rounded-lg w-20 h-20 flex items-center justify-center border-2 border-transparent">4</span>
            )}
          </div>

          {/* Step 5 - After Editing */}
          <div className="flex items-center gap-2">
            {editedImage ? (
              <button
                onClick={() => handleStepChange('edit')}
                className={`flex items-center justify-center p-1 bg-white rounded-lg border-2 hover:shadow-lg transition-all duration-200 cursor-pointer w-20 h-20 ${
                  step === 'edit' ? 'border-dashed border-amber-600' : 'border-transparent'
                }`}
                title="Go back to edit step"
              >
                <img
                  src={editedImage}
                  alt="Edited image preview"
                  width={60}
                  height={60}
                  className="object-contain rounded-lg w-16 h-16"
                />
              </button>
            ) : (
              <span className={`text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg w-20 h-20 flex items-center justify-center border-2 ${
                step === 'edit' ? 'border-dashed border-amber-600' : 'border-transparent'
              }`}>5</span>
            )}
          </div>

          {/* Step 6 - Color Reduction */}
          <div className="flex items-center gap-2">
            {colorReducedImage ? (
              <button
                onClick={() => handleStepChange('color-reduce')}
                className={`flex items-center justify-center p-1 bg-white rounded-lg border-2 hover:shadow-lg transition-all duration-200 cursor-pointer w-20 h-20 ${
                  step === 'color-reduce' ? 'border-dashed border-orange-600' : 'border-transparent'
                }`}
                title="Go to color reduction step"
              >
                <img
                  src={colorReducedImage}
                  alt="Color reduced image preview"
                  width={60}
                  height={60}
                  className="object-contain rounded-lg w-16 h-16"
                />
              </button>
            ) : editedImage ? (
              <button
                onClick={() => handleStepChange('color-reduce')}
                className={`text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg w-20 h-20 flex items-center justify-center border-2 hover:shadow-lg transition-all duration-200 cursor-pointer ${
                  step === 'color-reduce' ? 'border-dashed border-orange-600' : 'border-transparent'
                }`}
                title="Go to color reduction step"
              >
                6
              </button>
            ) : (
              <span className="text-sm font-semibold text-gray-400 bg-gray-100 rounded-lg w-20 h-20 flex items-center justify-center border-2 border-transparent">6</span>
            )}
          </div>

          {/* Step 7 - Preview */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (hasReachedPreview) {
                  setStep('preview');
                  localStorage.setItem('pixelme-current-step', 'preview');
                }
              }}
              disabled={!hasReachedPreview}
              className={`flex items-center justify-center p-1 bg-white rounded-lg border-2 transition-all duration-200 w-20 h-20 ${
                hasReachedPreview 
                  ? 'hover:shadow-lg cursor-pointer border-transparent' 
                  : 'cursor-not-allowed border-gray-300 opacity-60'
              }`}
              title={hasReachedPreview ? "Go to final preview" : "Complete color reduction to unlock preview"}
            >
              {finalImagePreview && selectedClothing ? (
                <div className="relative w-16 h-16">
                  <Image
                    src={`/clothes/${selectedClothing}.png`}
                    alt={selectedClothing}
                    width={64}
                    height={64}
                    className="object-contain w-full h-full"
                    priority
                  />
                  <div 
                    className="absolute"
                    style={{
                      ...getPositionStyles(selectedClothing, selectedPosition),
                      width: '12px',
                      height: '12px',
                      transform: 'translate(-50%, -50%) scale(0.24)'
                    }}
                  >
                    <img
                      src={finalImagePreview}
                      alt="Design preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              ) : (
                <span className={`text-sm font-semibold ${
                  hasReachedPreview ? 'text-green-600' : 'text-gray-400'
                }`}>7</span>
              )}
            </button>
          </div>
          
          {/* Product Info Display */}
          <div className="flex items-center gap-4 ml-auto mr-4">
            {(selectedClothing || selectedColor || selectedSize) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm">
                <div className="font-semibold text-blue-800 mb-1">Current Selection:</div>
                <div className="text-blue-700">
                  <div><span className="font-medium">Product:</span> {selectedClothing ? (selectedClothing.charAt(0).toUpperCase() + selectedClothing.slice(1)) : 'Not Selected'}</div>
                  <div><span className="font-medium">Color:</span> {selectedColor || 'Not Selected'}</div>
                  <div><span className="font-medium">Size:</span> {selectedSize || 'Not Selected'}</div>
                </div>
              </div>
            )}
          </div>

          {/* Clear Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleClear}
              className="w-20 h-20 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center"
              title="Clear all and start over"
            >
              <Image
                src="/redo.png"
                alt="Clear"
                width={32}
                height={32}
                className="object-contain"
              />
            </button>
          </div>
        </div>

        {/* Step 4 - After Style Conversion Content */}
        {step === 'before' && conversionResult && (
          <div className="flex flex-col items-center w-full">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Styled Image</h3>
              <p className="text-gray-600">This is your image converted to <span className="font-semibold text-blue-600">{selectedStyle}</span> style, ready for editing</p>
            </div>

            <div className="mb-6 relative inline-block">
              <img 
                src={conversionResult} 
                alt="Styled converted image"
                className="max-w-md h-auto rounded-lg shadow-lg"
              />
            </div>

            <div className="flex justify-center">
              <button
                onClick={() => handleStepChange('edit')}
                className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors duration-200 font-semibold"
              >
                Continue to Editing →
              </button>
            </div>
          </div>
        )}

        {/* Step 5 - Edit Content */}
        {step === 'edit' && (
          <div className="flex flex-col items-center w-full">
            <div className="text-center mb-8">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Edit Your Image</h3>
              <p className="text-gray-600">Edit your <span className="font-semibold text-amber-600">{selectedStyle}</span> image with powerful AI tools</p>
            </div>

            {/* Main Layout: Image + Sidebar */}
            <div className="flex gap-8 w-full max-w-6xl items-start">
              
              {/* Left Side - Image Display */}
              <div className="flex-1 flex flex-col items-center">
                {currentImage && (
                  <div className="relative inline-block">
                    <img 
                      ref={imageRef}
                      src={currentImage} 
                      alt={`${selectedStyle} converted image`}
                      className="max-w-lg h-auto rounded-lg shadow-lg"
                      onLoad={initializeCanvas}
                    />
                    <canvas
                      ref={canvasRef}
                      className={`absolute top-0 left-0 rounded-lg ${
                        activeMode === 'remove' ? 'cursor-none' : 
                        activeMode === 'fill' ? 'cursor-none' :
                        activeMode === 'crop' ? 'cursor-crosshair' : 
                        'cursor-default'
                      }`}
                      onMouseDown={activeMode === 'background' ? undefined : startDrawing}
                      onMouseMove={activeMode === 'background' ? undefined : (e) => {
                        handleMouseMove(e);
                        draw(e);
                      }}
                      onMouseUp={activeMode === 'background' ? undefined : stopDrawing}
                      onMouseLeave={activeMode === 'background' ? undefined : handleMouseLeave}
                      onMouseEnter={activeMode === 'background' ? undefined : handleMouseEnter}
                      style={{
                        width: canvasSize.width,
                        height: canvasSize.height,
                      }}
                    />
                    
                    {/* Brush Size Cursor */}
                    {showBrushCursor && (activeMode === 'remove' || activeMode === 'fill') && (
                      <div
                        className={`absolute pointer-events-none rounded-full border-2 ${
                          activeMode === 'fill' ? 'border-purple-500' : 'border-red-500'
                        } bg-transparent`}
                        style={{
                          left: mousePosition.x - brushSize / 2,
                          top: mousePosition.y - brushSize / 2,
                          width: brushSize,
                          height: brushSize,
                          transform: 'translate(0, 0)',
                        }}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Right Side - Control Sidebar */}
              <div className="w-80 min-w-80 flex-shrink-0 bg-white rounded-2xl shadow-lg border border-gray-200 p-6 h-fit min-h-[600px]">
                
                {/* Tools Section */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Tools</h4>
                  
                  {/* Tool Selection Grid */}
                  <div className="grid grid-cols-1 gap-3 mb-4">
                    <button
                      onClick={() => {
                        setActiveMode('background');
                        clearMask();
                        setShowBrushCursor(false);
                      }}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-300 ${
                        activeMode === 'background'
                          ? 'border-emerald-500 bg-emerald-50 shadow-md'
                          : 'border-gray-200 bg-white hover:border-emerald-300 hover:shadow-sm'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        activeMode === 'background' ? 'bg-emerald-500' : 'bg-gray-400'
                      }`}>
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <div className={`font-semibold ${
                          activeMode === 'background' ? 'text-emerald-700' : 'text-gray-700'
                        }`}>
                          Remove Background
                        </div>
                        <div className="text-sm text-gray-500">AI-powered background removal</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setActiveMode(activeMode === 'remove' || activeMode === 'fill' ? activeMode : 'remove');
                        clearMask();
                        setShowBrushCursor(false);
                      }}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-300 ${
                        activeMode === 'remove' || activeMode === 'fill'
                          ? 'border-purple-500 bg-purple-50 shadow-md'
                          : 'border-gray-200 bg-white hover:border-purple-300 hover:shadow-sm'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        activeMode === 'remove' || activeMode === 'fill' ? 'bg-purple-500' : 'bg-gray-400'
                      }`}>
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <div className={`font-semibold ${
                          activeMode === 'remove' || activeMode === 'fill' ? 'text-purple-700' : 'text-gray-700'
                        }`}>
                          Erase / Fill
                        </div>
                        <div className="text-sm text-gray-500">Remove objects or fill with AI</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setActiveMode('crop');
                        clearMask();
                        setShowBrushCursor(false);
                      }}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-300 ${
                        activeMode === 'crop'
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        activeMode === 'crop' ? 'bg-blue-500' : 'bg-gray-400'
                      }`}>
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <div className={`font-semibold ${
                          activeMode === 'crop' ? 'text-blue-700' : 'text-gray-700'
                        }`}>
                          Crop Image
                        </div>
                        <div className="text-sm text-gray-500">Crop to specific dimensions</div>
                      </div>
                    </button>
                  </div>

                  {/* Erase/Fill Sub-mode Toggle */}
                  {(activeMode === 'remove' || activeMode === 'fill') && (
                    <div className="mb-4">
                      <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1">
                        <button
                          onClick={() => {
                            setActiveMode('remove');
                            clearMask();
                          }}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex-1 ${
                            activeMode === 'remove'
                              ? 'bg-white text-red-600 shadow-sm'
                              : 'text-gray-600 hover:text-red-600'
                          }`}
                        >
                          Erase
                        </button>
                        <button
                          onClick={() => {
                            setActiveMode('fill');
                            clearMask();
                          }}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex-1 ${
                            activeMode === 'fill'
                              ? 'bg-white text-purple-600 shadow-sm'
                              : 'text-gray-600 hover:text-purple-600'
                          }`}
                        >
                          Fill
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tool-specific Controls */}
                <div className="mb-6 w-full">
                  {/* Background Removal Tool */}
                  {activeMode === 'background' && (
                    <div>
                      <h5 className="font-semibold text-gray-800 mb-3">Background Removal</h5>
                      <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200 mb-4">
                        <p className="text-sm text-emerald-700">AI will automatically remove the background and make it transparent.</p>
                      </div>
                      <button 
                        onClick={handleBackgroundRemoval}
                        disabled={isFilling || !conversionResult}
                        className={`w-full px-4 py-3 rounded-lg font-semibold transition-all duration-200 ${
                          isFilling || !conversionResult
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                            : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg hover:shadow-xl'
                        }`}
                      >
                        {isFilling ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Removing Background...
                          </div>
                        ) : (
                          'Remove Background'
                        )}
                      </button>
                    </div>
                  )}

                  {/* Erase Tool */}
                  {activeMode === 'remove' && (
                    <div>
                      <h5 className="font-semibold text-gray-800 mb-3">Erase Tool</h5>
                      <div className="space-y-4">
                        <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                          <label className="text-sm font-semibold text-gray-700">Brush Size:</label>
                          <input
                            type="range"
                            min="5"
                            max="50"
                            value={brushSize}
                            onChange={(e) => setBrushSize(Number(e.target.value))}
                            className="flex-1"
                          />
                          <span className="text-sm text-gray-600 w-8">{brushSize}</span>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={clearMask}
                            className="px-3 py-2 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 flex-1"
                          >
                            Clear Selection
                          </button>
                        </div>
                        <button 
                          onClick={handleGenerativeFill}
                          disabled={isFilling || !conversionResult || !hasSelection}
                          className={`w-full px-4 py-3 rounded-lg font-semibold transition-all duration-200 ${
                            isFilling || !conversionResult || !hasSelection
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                              : 'bg-red-600 text-white hover:bg-red-700 shadow-lg hover:shadow-xl'
                          }`}
                        >
                          {isFilling ? (
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Removing Objects...
                            </div>
                          ) : hasSelection ? (
                            'Remove Selected Areas'
                          ) : (
                            'Select Areas to Remove'
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Fill Tool */}
                  {activeMode === 'fill' && (
                    <div>
                      <h5 className="font-semibold text-gray-800 mb-3">AI Fill Tool</h5>
                      <div className="space-y-4">
                        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <p className="text-sm text-purple-700 mb-3">Paint over areas to remove and fill with AI</p>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">AI Fill Prompt:</label>
                          <textarea
                            value={aiFillPrompt}
                            onChange={(e) => setAiFillPrompt(e.target.value)}
                            placeholder="Remove all objects and content within the masked areas..."
                            className="w-full h-24 p-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm text-black placeholder-gray-400"
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => setAiFillPrompt('')}
                              className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
                            >
                              Clear
                            </button>
                            <button
                              onClick={() => setAiFillPrompt('Add beautiful flowers and plants to fill the selected areas')}
                              className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs hover:bg-purple-200"
                            >
                              Add Flowers
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                          <label className="text-sm font-semibold text-gray-700">Brush Size:</label>
                          <input
                            type="range"
                            min="5"
                            max="50"
                            value={brushSize}
                            onChange={(e) => setBrushSize(Number(e.target.value))}
                            className="flex-1"
                          />
                          <span className="text-sm text-gray-600 w-8">{brushSize}</span>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={clearMask}
                            className="px-3 py-2 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 flex-1"
                          >
                            Clear Selection
                          </button>
                        </div>
                        <button 
                          onClick={handleAIFill}
                          disabled={isFilling || !conversionResult || !hasSelection}
                          className={`w-full px-4 py-3 rounded-lg font-semibold transition-all duration-200 ${
                            isFilling || !conversionResult || !hasSelection
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                              : 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg hover:shadow-xl'
                          }`}
                        >
                          {isFilling ? (
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Removing & Filling...
                            </div>
                          ) : hasSelection ? (
                            'Remove & Fill Selected Areas'
                          ) : (
                            'Select Areas to Fill'
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Crop Tool */}
                  {activeMode === 'crop' && (
                    <div>
                      <h5 className="font-semibold text-gray-800 mb-3">Crop Tool</h5>
                      <div className="space-y-4">
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-sm text-blue-700">Click and drag on the image to select the area you want to keep.</p>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={clearMask}
                            className="px-3 py-2 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 flex-1"
                          >
                            Clear Selection
                          </button>
                        </div>
                        <button 
                          onClick={handleCropImage}
                          disabled={isFilling || !conversionResult || !cropArea || Math.abs(cropArea.width) < 10 || Math.abs(cropArea.height) < 10}
                          className={`w-full px-4 py-3 rounded-lg font-semibold transition-all duration-200 ${
                            isFilling || !conversionResult || !cropArea || Math.abs(cropArea.width) < 10 || Math.abs(cropArea.height) < 10
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
                          }`}
                        >
                          {isFilling ? (
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Cropping...
                            </div>
                          ) : (
                            'Crop Image'
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="border-t border-gray-200 pt-6">
                  <div className="space-y-3">
                    <button
                      onClick={handleUndo}
                      disabled={!previousImage}
                      className={`w-full px-4 py-3 rounded-lg font-semibold transition-all duration-200 ${
                        previousImage
                          ? 'bg-amber-500 text-white shadow-md hover:bg-amber-600 hover:shadow-lg'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      ↶ Undo
                    </button>
                    <button
                      onClick={() => {
                        if (!currentImage) return;
                        
                        // Save current edited image and move to color reduction step
                        setEditedImage(currentImage);
                        localStorage.setItem('pixelme-edited-image', currentImage);
                        setStep('color-reduce');
                        localStorage.setItem('pixelme-current-step', 'color-reduce');
                      }}
                      disabled={!currentImage || isFilling}
                      className={`w-full px-4 py-3 rounded-lg font-semibold transition-all duration-200 ${
                        currentImage && !isFilling
                          ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md hover:from-purple-700 hover:to-blue-700 hover:shadow-lg'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {isFilling ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Processing...
                        </div>
                      ) : (
                        '✓ Save & Continue'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 6 - Color Reduction Content */}
        {step === 'color-reduce' && (
          <div className="flex flex-col items-center w-full">
            <div className="text-center mb-8">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                {colorReducedImage ? 'Embroidery Conversion Complete' : 'Convert to Embroidery Style'}
              </h3>
              <p className="text-gray-600">
                {colorReducedImage ? (
                  <>Your image has been converted to <span className="font-semibold text-green-600">embroidery-ready style</span> with bold colors and clean edges perfect for digitization</>
                ) : (
                  <>Convert your image to <span className="font-semibold text-orange-600">embroidery-ready style</span> with under 10 colors, bold outlines, and flat fills</>
                )}
              </p>
            </div>

            {/* Before and After Comparison */}
            {colorReducedImage ? (
              <div className="mb-8 w-full max-w-4xl">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Original Edited Image */}
                    <div className="text-center">
                      <h4 className="text-lg font-semibold text-gray-700 mb-3">Before (Original)</h4>
                      <div className="relative inline-block">
                        {editedImage && (
                          <img 
                            src={editedImage} 
                            alt="Original edited image"
                            className="max-w-full h-auto rounded-lg shadow-lg"
                          />
                        )}
                      </div>
                    </div>
                    
                    {/* Embroidery Style Image */}
                    <div className="text-center">
                      <h4 className="text-lg font-semibold text-gray-700 mb-3">After (Embroidery Ready)</h4>
                      <div className="relative inline-block">
                        <img 
                          src={colorReducedImage} 
                          alt="Embroidery style image"
                          className="max-w-full h-auto rounded-lg shadow-lg"
                        />
                        <div className="absolute top-2 right-2 bg-green-600 text-white px-2 py-1 rounded-full text-xs font-semibold">
                          🧵 Embroidery Ready
                        </div>
                      </div>
                    </div>
                  </div>
              </div>
            ) : (
              <div className="mb-6 relative inline-block">
                {editedImage && (
                  <img 
                    src={editedImage} 
                    alt="Edited image"
                    className="max-w-md h-auto rounded-lg shadow-lg"
                  />
                )}
              </div>
            )}

            {!colorReducedImage && (
              <div className="text-center mb-6">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 max-w-2xl mx-auto">
                  <h4 className="text-lg font-semibold text-purple-800 mb-2">🧵 Embroidery Style Conversion</h4>
                  <p className="text-gray-700">
                    This step will convert your image to <strong>embroidery-ready style</strong> with under 10 colors, bold outlines, flat color fills, and clear boundaries. Perfect for embroidery digitization - eliminates fine details that can't be stitched and creates the clean, simplified style that digitizers need.
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-4 justify-center flex-wrap">
              <button
                onClick={() => {
                  setStep('edit');
                  localStorage.setItem('pixelme-current-step', 'edit');
                }}
                className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200 font-semibold"
              >
                ← Back to Editing
              </button>
              
              {/* Always show the Convert button */}
              <button
                onClick={colorReducedImage ? handleResetColorReduction : handleColorReduction}
                disabled={!editedImage || isColorReducing}
                className={`px-8 py-4 rounded-lg font-bold text-lg transition-colors duration-200 ${
                  editedImage && !isColorReducing
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transform hover:scale-105'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isColorReducing ? (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Converting to Embroidery Style...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🧵</span>
                    {colorReducedImage ? 'Try Different Embroidery Style' : 'Convert to Embroidery Style'}
                  </div>
                )}
              </button>
              
              {/* Show Continue button only when color reduction is complete */}
              {colorReducedImage && (
                <button
                  onClick={handleColorReductionContinue}
                  disabled={isFilling}
                  className={`px-6 py-3 rounded-lg font-semibold transition-colors duration-200 ${
                    !isFilling
                      ? 'bg-gradient-to-r from-green-600 to-blue-600 text-white hover:from-green-700 hover:to-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isFilling ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </div>
                  ) : (
                    'Continue to Preview →'
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating Cart Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <CartIcon />
      </div>
    </main>
  );
}
             