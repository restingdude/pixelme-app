'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import CartIcon from '../../components/CartIcon';
import AdminAuth from '../../components/AdminAuth';

interface Product {
  id: string;
  title: string;
  handle: string;
  description: string;
  productType: string;
  vendor: string;
  status: string;
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        price: string;
        sku: string;
        inventoryQuantity: number;
      }
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

interface Order {
  id: number;
  orderNumber: string;
  name: string;
  email: string;
  createdAt: string;
  totalPrice: string;
  currency: string;
  financialStatus: string;
  fulfillmentStatus: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  tags?: string;
  isPixelMeOrder: boolean;
  pixelMeItems: Array<{
    title: string;
    customDesignUrl: string;
    style: string;
    position: string;
    clothingType: string;
  }>;
  customItemsCount: number;
  totalItems: number;
  digitizationStatus?: 'pending' | 'shared' | 'pending_approval' | 'assigned' | 'in_progress' | 'completed_unpaid' | 'completed_paid';
  digitizerToken?: string;
  digitizerName?: string;
  paymentAmount?: string;
}

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [showPositionModal, setShowPositionModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);
  const [selectedProductForPositioning, setSelectedProductForPositioning] = useState<Product | null>(null);
  const [positionSettings, setPositionSettings] = useState<{[productId: string]: {x: number, y: number, size: number}}>({});
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedOrderForStatus, setSelectedOrderForStatus] = useState<Order | null>(null);
  const [digitizerNameInput, setDigitizerNameInput] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [showPaymentInput, setShowPaymentInput] = useState(false);
  const [showFileReviewModal, setShowFileReviewModal] = useState(false);
  const [selectedOrderForReview, setSelectedOrderForReview] = useState<Order | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [modificationMessage, setModificationMessage] = useState('');
  const [showModifyInput, setShowModifyInput] = useState(false);
  const [customPresets, setCustomPresets] = useState<{[key: string]: {name: string, x: number, y: number, size: number}}>({});
  const [presetsLoading, setPresetsLoading] = useState(true);
  const [presetsSaving, setPresetsSaving] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [showEditPresetModal, setShowEditPresetModal] = useState(false);
  const [editingPresetKey, setEditingPresetKey] = useState<string | null>(null);
  const [editPresetName, setEditPresetName] = useState('');
  const [selectedPresetKey, setSelectedPresetKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Create product form state
  const [newProduct, setNewProduct] = useState({
    clothing: 'hoodie',
    style: 'Simpsons',
    price: '29.99',
    description: ''
  });

  // Fetch products and orders on load (presets loaded when modal opens)
  useEffect(() => {
    fetchProducts();
    fetchOrders();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/shopify/products');
      const data = await response.json();
      
      if (data.success) {
        setProducts(data.products || []);
        setMessage('');
      } else {
        setMessage('Failed to fetch products: ' + data.error);
      }
    } catch (error) {
      setMessage('Error fetching products: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      setOrdersLoading(true);
      const response = await fetch('/api/shopify/orders?limit=10&status=any');
      const data = await response.json();
      
      if (data.success) {
        setOrders(data.orders || []);
      } else {
        console.error('Failed to fetch orders:', data.error);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  };

  // Get current product type (hoodie or trackies)
  const getCurrentProductType = () => {
    if (!selectedProductForPositioning) return 'hoodie';
    return selectedProductForPositioning.title.toLowerCase().includes('hoodie') ? 'hoodie' : 'trackies';
  };

  // Load custom presets from Shopify metafields
  const loadCustomPresets = async (product?: Product) => {
    try {
      console.log('📥 Loading custom presets from Shopify...');
      console.log('📦 Product parameter:', product?.title || 'No product provided');
      setPresetsLoading(true);
      const response = await fetch(`/api/shopify/metafields?namespace=pixelme&key=custom_presets&_t=${Date.now()}`);
      const data = await response.json();
      
      console.log('📡 Response from server:', data);
      
      if (data.success && data.metafield?.parsedValue) {
        let allPresets = data.metafield.parsedValue;
        const currentProductType = product 
          ? (product.title.toLowerCase().includes('hoodie') ? 'hoodie' : 'trackies')
          : getCurrentProductType();
        
        console.log('✅ Raw presets from server:', allPresets);
        console.log('📦 Current product type:', currentProductType);
        console.log('📦 Product type determined from:', product ? `passed product "${product.title}"` : 'selectedProductForPositioning state');
        
        // Check if we need to migrate old root-level presets
        const needsMigration = Object.keys(allPresets).some(key => 
          typeof allPresets[key] === 'object' && 
          allPresets[key].name !== undefined && 
          allPresets[key].x !== undefined &&
          !['hoodie', 'trackies'].includes(key)
        );
        
        if (needsMigration) {
          console.log('🔄 Migrating old root-level presets...');
          
          // Separate product-type containers from old presets
          const newStructure = {
            hoodie: allPresets.hoodie || {},
            trackies: allPresets.trackies || {}
          };
          
          // Move old root-level presets to hoodie (they seem to be hoodie presets)
          Object.keys(allPresets).forEach(key => {
            const preset = allPresets[key];
            if (typeof preset === 'object' && 
                preset.name !== undefined && 
                preset.x !== undefined &&
                !['hoodie', 'trackies'].includes(key)) {
              console.log(`🔄 Moving old preset "${key}" to hoodie category`);
              newStructure.hoodie[key] = preset;
            }
          });
          
          allPresets = newStructure;
          
          console.log('✅ Migrated structure:', allPresets);
          
          // Save the cleaned up structure
          try {
            await fetch('/api/shopify/metafields', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                namespace: 'pixelme',
                key: 'custom_presets',
                value: allPresets
              })
            });
            console.log('✅ Migration saved successfully');
          } catch (migrationError) {
            console.error('❌ Failed to save migration:', migrationError);
          }
        }
        
        // Extract presets for current product type
        const productSpecificPresets = allPresets[currentProductType] || {};
        
        console.log('🎯 Product-specific presets:', productSpecificPresets);
        console.log('📊 Preset count for this product:', Object.keys(productSpecificPresets).length);
        
        setCustomPresets(productSpecificPresets);
      } else {
        // If no presets exist, keep empty state (defaults will be handled by the API)
        console.log('ℹ️ No presets found, using empty state');
        setCustomPresets({});
      }
    } catch (error) {
      console.error('❌ Error loading custom presets:', error);
      setMessage('Warning: Could not load custom presets');
    } finally {
      setPresetsLoading(false);
    }
  };

  // Save custom presets to Shopify metafields
  const saveCustomPresets = async (presets: typeof customPresets) => {
    try {
      console.log('Saving custom presets for current product:', presets);
      setPresetsSaving(true);
      
      const currentProductType = getCurrentProductType();
      console.log('📦 Current product type:', currentProductType);
      
      // First, load existing presets for all product types
      const existingResponse = await fetch(`/api/shopify/metafields?namespace=pixelme&key=custom_presets&_t=${Date.now()}`);
      const existingData = await existingResponse.json();
      
      let allPresets = {};
      if (existingData.success && existingData.metafield?.parsedValue) {
        allPresets = existingData.metafield.parsedValue;
        console.log('📋 Existing all presets:', allPresets);
      }
      
      // Update only the presets for the current product type
      const updatedAllPresets = {
        ...allPresets,
        [currentProductType]: presets
      };
      
      console.log('🔄 Updated all presets:', updatedAllPresets);
      
      const requestBody = {
        namespace: 'pixelme',
        key: 'custom_presets',
        value: updatedAllPresets
      };
      
      console.log('Request body:', requestBody);
      
      const response = await fetch('/api/shopify/metafields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      console.log('Response status:', response.status);
      
      const data = await response.json();
      console.log('Response data:', data);
      
      if (response.ok && data.success) {
        setMessage(data.message || `Custom presets saved successfully for ${currentProductType}!`);
        setTimeout(() => setMessage(''), 3000);
        console.log('✅ Custom presets saved successfully');
        console.log('💾 Saved metafield data:', data.metafield);
        
        // Verify the saved data matches what we sent
        if (data.metafield?.parsedValue) {
          const savedAllPresets = data.metafield.parsedValue;
          const savedProductPresets = savedAllPresets[currentProductType] || {};
          const expectedCount = Object.keys(presets).length;
          const actualCount = Object.keys(savedProductPresets).length;
          
          console.log(`📊 Expected ${expectedCount} presets for ${currentProductType}, got ${actualCount} presets`);
          console.log('📋 Expected presets:', Object.keys(presets));
          console.log('📋 Actual presets:', Object.keys(savedProductPresets));
          
          if (expectedCount !== actualCount) {
            console.warn('⚠️ Preset count mismatch! Deletion may not have been saved properly.');
          }
        }
        
        // Optionally refresh presets from server to ensure sync
        // await loadCustomPresets();
      } else {
        const errorMsg = data.error || `HTTP ${response.status}: ${response.statusText}`;
        setMessage('Failed to save custom presets: ' + errorMsg);
        console.error('❌ Failed to save custom presets:', errorMsg);
      }
    } catch (error) {
      console.error('❌ Error saving custom presets:', error);
      setMessage('Error saving custom presets: ' + error);
    } finally {
      setPresetsSaving(false);
    }
  };

  // Reset presets to defaults for current product type only
  const resetPresetsToDefaults = async () => {
    const currentProductType = getCurrentProductType();
    if (!confirm(`Are you sure you want to reset custom presets to defaults for ${currentProductType}? This cannot be undone.`)) {
      return;
    }

    try {
      setPresetsSaving(true);
      
      // Instead of deleting all presets, just clear presets for current product type
      await saveCustomPresets({});
      
      setMessage(`Custom presets reset to defaults for ${currentProductType} successfully!`);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error resetting presets:', error);
      setMessage('Error resetting presets: ' + error);
    } finally {
      setPresetsSaving(false);
    }
  };

  const createSingleProduct = async () => {
    setCreating(true);
    setMessage('Creating product...');
    
    try {
      const response = await fetch('/api/shopify/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clothing: newProduct.clothing,
          style: newProduct.style,
          price: newProduct.price,
          description: newProduct.description || `Custom ${newProduct.clothing} with ${newProduct.style} style design. Upload your photo and we'll create a personalized cartoon version just for you!`
        })
      });
      
      if (response.ok) {
        setMessage('Product created successfully!');
        setShowCreateForm(false);
        setNewProduct({
          clothing: 'hoodie',
          style: 'Simpsons',
          price: '29.99',
          description: ''
        });
        await fetchProducts();
      } else {
        const errorData = await response.json();
        setMessage('Failed to create product: ' + (errorData.error || 'Unknown error'));
      }
    } catch (error) {
      setMessage('Error creating product: ' + error);
    } finally {
      setCreating(false);
    }
  };



  const deleteSelected = async () => {
    if (selectedProducts.size === 0) {
      setMessage('No products selected');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedProducts.size} product(s)?`)) {
      return;
    }
    
    setCreating(true);
    setMessage('Deleting selected products...');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const productId of selectedProducts) {
      try {
        const response = await fetch(`/api/shopify/products?id=${productId.replace('gid://shopify/Product/', '')}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
        }
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        errorCount++;
      }
    }
    
    setMessage(`Deleted ${successCount} products. ${errorCount} errors.`);
    setSelectedProducts(new Set());
    setCreating(false);
    await fetchProducts();
  };

  const toggleProductSelection = (productId: string) => {
    const newSelection = new Set(selectedProducts);
    if (newSelection.has(productId)) {
      newSelection.delete(productId);
    } else {
      newSelection.add(productId);
    }
    setSelectedProducts(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const openPositionModal = (product: Product) => {
    setSelectedProductForPositioning(product);
    setShowPositionModal(true);
    
    // Load presets for this specific product type
    console.log('🔄 Loading presets for product:', product.title);
    loadCustomPresets(product);
    
    // Initialize default position if not set
    setPositionSettings(prev => {
      if (!prev[product.id]) {
        const clothingType = product.title.toLowerCase().includes('hoodie') ? 'hoodie' : 'trackies';
        const defaultSettings = clothingType === 'hoodie' 
          ? { x: 35, y: 25, size: 30 } // Center chest area
          : { x: 60, y: 30, size: 25 }; // Side leg area
        
        console.log('Initializing position settings for product:', product.id, defaultSettings);
        console.log('Product type:', clothingType);
        
        // Note: We'll find matching presets after they load
        setSelectedPresetKey(null);
        
        return {
          ...prev,
          [product.id]: defaultSettings
        };
      } else {
        // If position already exists, try to find matching preset
        const currentSettings = prev[product.id];
        const matchingPresetKey = Object.entries(customPresets).find(([key, preset]) => 
          preset.x === currentSettings.x && 
          preset.y === currentSettings.y && 
          preset.size === currentSettings.size
        )?.[0];
        
        if (matchingPresetKey) {
          setSelectedPresetKey(matchingPresetKey);
        } else {
          setSelectedPresetKey(null);
        }
      }
      return prev;
    });
  };

  const updatePosition = (productId: string, field: 'x' | 'y' | 'size', value: number) => {
    console.log(`🎚️ Updating ${field} to ${value} for product ${productId}`);
    console.log('🔑 editingPresetKey:', editingPresetKey);
    console.log('🎯 selectedPresetKey before:', selectedPresetKey);
    
    setPositionSettings(prev => {
      const newSettings = {
        ...prev,
        [productId]: {
          ...prev[productId],
          [field]: value
        }
      };
      console.log('📍 New position settings:', newSettings[productId]);
      return newSettings;
    });
    
    // Keep selected preset active if one is selected OR we're editing
    // Only clear selection if no preset is selected and we're not editing
    if (selectedPresetKey || editingPresetKey) {
      console.log('🎯 Keeping selectedPresetKey (preset is active)');
      console.log('🎯 selectedPresetKey:', selectedPresetKey);
      console.log('🎯 editingPresetKey:', editingPresetKey);
    } else {
      console.log('🎯 Clearing selectedPresetKey (manual adjustment without preset)');
      setSelectedPresetKey(null);
    }
  };

  const savePositionSettings = () => {
    // Here you would typically save to your backend/database
    console.log('Saving position settings:', positionSettings);
    setMessage('Position settings saved successfully!');
    setShowPositionModal(false);
    setNewPresetName('');
    setTimeout(() => setMessage(''), 3000);
  };

  const addCustomPreset = async () => {
    if (!newPresetName.trim() || !selectedProductForPositioning) {
      setMessage('Please enter a preset name and ensure a product is selected.');
      return;
    }
    
    const currentPosition = positionSettings[selectedProductForPositioning.id];
    if (!currentPosition) {
      setMessage('Error: Position settings not found. Please adjust the position first.');
      return;
    }

    // Check if preset name already exists and validate format
    const presetKey = newPresetName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!presetKey || presetKey.length < 2) {
      setMessage('Please enter a valid preset name (at least 2 characters, letters and numbers only).');
      return;
    }
    
    if (customPresets[presetKey]) {
      setMessage('A preset with this name already exists. Please choose a different name.');
      return;
    }

    try {
      const newPresets = {
        ...customPresets,
        [presetKey]: {
          name: newPresetName.trim(),
          x: currentPosition.x,
          y: currentPosition.y,
          size: currentPosition.size
        }
      };
      
      // Update local state immediately for better UX
      setCustomPresets(newPresets);
      setNewPresetName('');
      
      // Auto-select the newly created preset for visual feedback
      setSelectedPresetKey(presetKey);
      
      // Save to Shopify metafields
      await saveCustomPresets(newPresets);
      
      console.log('Custom preset saved:', newPresets[presetKey]);
    } catch (error) {
      console.error('Error in addCustomPreset:', error);
      setMessage('Failed to save custom preset: ' + error);
      // Revert local state if save failed
      setCustomPresets(customPresets);
      setNewPresetName(newPresetName.trim());
    }
  };

  const openEditPresetModal = (presetKey: string) => {
    const preset = customPresets[presetKey];
    if (preset) {
      console.log('📝 Opening edit modal for preset:', presetKey);
      console.log('📝 Preset data:', preset);
      console.log('📝 Preset name:', preset.name);
      console.log('🎯 Setting selectedPresetKey to:', presetKey);
      
      setEditingPresetKey(presetKey);
      console.log('🔤 Setting editPresetName to:', preset.name);
      setEditPresetName(preset.name);
      setSelectedPresetKey(presetKey);
      setShowEditPresetModal(true);
      
      // Also apply the preset position to ensure the sliders match
      if (selectedProductForPositioning) {
        console.log('🎯 Applying preset position for editing:', preset);
        setPositionSettings(prev => ({
          ...prev,
          [selectedProductForPositioning.id]: preset
        }));
      }
      
      // Verify the state was set correctly
      setTimeout(() => {
        console.log('✅ State verification after modal open:');
        console.log('✅ editingPresetKey:', presetKey);
        console.log('✅ editPresetName should be:', preset.name);
      }, 100);
    } else {
      console.error('❌ No preset found for key:', presetKey);
    }
  };

  const renamePreset = async () => {
    if (!editingPresetKey || !editPresetName.trim()) {
      console.error('❌ Cannot save: missing editingPresetKey or editPresetName');
      console.error('❌ editingPresetKey:', editingPresetKey);
      console.error('❌ editPresetName:', editPresetName);
      console.error('❌ editPresetName.trim():', editPresetName.trim());
      return;
    }
    
    console.log('🔍 Current state when saving:');
    console.log('- editingPresetKey:', editingPresetKey);
    console.log('- editPresetName:', editPresetName);
    console.log('- editPresetName.trim():', editPresetName.trim());
    console.log('- selectedProductForPositioning:', selectedProductForPositioning?.id);
    console.log('- positionSettings:', positionSettings);
    console.log('- customPresets before:', customPresets);
    console.log('- Original preset name:', customPresets[editingPresetKey]?.name);
    
    // Get current position settings for the product (if any)
    const currentPosition = selectedProductForPositioning 
      ? positionSettings[selectedProductForPositioning.id]
      : null;
    
    const originalPreset = customPresets[editingPresetKey];
    
    console.log('💾 Saving preset with data:');
    console.log('- Original preset:', originalPreset);
    console.log('- Current position from sliders:', currentPosition);
    console.log('- Will use position:', currentPosition || originalPreset);
    
    // Extract position data and create new preset with updated name
    const positionData = currentPosition || originalPreset;
    
    const newPresetData = {
      name: editPresetName.trim(),
      x: positionData.x,
      y: positionData.y,
      size: positionData.size
    };
    
    console.log('- Final preset data:', newPresetData);
    console.log('- Name change:', `"${originalPreset?.name}" → "${newPresetData.name}"`);
    
    const newPresets = {
      ...customPresets,
      [editingPresetKey]: newPresetData
    };
    
    console.log('- All presets after update:', newPresets);
    console.log('- Updated preset name:', newPresets[editingPresetKey]?.name);
    
    try {
      // Update local state immediately for better UX
      console.log('🎯 Updating local state...');
      setCustomPresets(newPresets);
      
      // Save to Shopify metafields
      console.log('🚀 Starting save to Shopify...');
      await saveCustomPresets(newPresets);
      console.log('✅ Save to Shopify completed');
      
      // Force a refresh of presets to make sure we have the latest data
      console.log('🔄 Force refreshing presets...');
      await loadCustomPresets(selectedProductForPositioning || undefined);
      
      // Only close modal and clear state after successful save
      setShowEditPresetModal(false);
      setEditingPresetKey(null);
      setEditPresetName('');
      setSelectedPresetKey(null);
      
    } catch (error) {
      console.error('❌ Failed to save preset changes:', error);
      // Revert local state if save failed
      setCustomPresets(customPresets);
      setMessage('Failed to save preset changes: ' + error);
    }
  };

  const deleteCustomPreset = async (presetKey: string) => {
    if (!confirm(`Are you sure you want to delete the preset "${customPresets[presetKey]?.name}"?`)) {
      return;
    }

    console.log('🗑️ Deleting preset:', presetKey);
    console.log('Before deletion:', customPresets);
    console.log('Preset exists before deletion:', presetKey in customPresets);
    
    const newPresets = { ...customPresets };
    delete newPresets[presetKey];
    
    console.log('After deletion:', newPresets);
    console.log('Preset exists after deletion:', presetKey in newPresets);
    console.log('Preset count before:', Object.keys(customPresets).length);
    console.log('Preset count after:', Object.keys(newPresets).length);
    
    // Double-check the deletion worked
    if (presetKey in newPresets) {
      console.error('❌ ERROR: Preset was not deleted from object!');
      setMessage('Error: Failed to delete preset from object');
      return;
    } else {
      console.log('✅ Preset successfully removed from object');
    }
    
    // Update local state immediately for better UX
    setCustomPresets(newPresets);
    
    setShowEditPresetModal(false);
    setEditingPresetKey(null);
    setEditPresetName('');
    setSelectedPresetKey(null);
    
    try {
      // Save to Shopify metafields
      console.log('💾 Saving deletion to Shopify...');
      await saveCustomPresets(newPresets);
      console.log('✅ Deletion saved successfully');
      
      setMessage(`Preset "${customPresets[presetKey]?.name}" deleted successfully!`);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('❌ Failed to save deletion:', error);
      // Revert local state if save failed
      setCustomPresets(customPresets);
      setMessage('Failed to delete preset: ' + error);
    }
  };

  const applyPreset = (preset: {x: number, y: number, size: number}, presetKey?: string) => {
    if (!selectedProductForPositioning) return;
    
    console.log('🎯 Applying preset:', presetKey, preset);
    console.log('🎯 Setting selectedPresetKey to:', presetKey);
    
    setPositionSettings(prev => ({
      ...prev,
      [selectedProductForPositioning.id]: preset
    }));
    
    // Also update the selected preset to show visual feedback
    if (presetKey) {
      setSelectedPresetKey(presetKey);
    }
  };

  const updateSelectedPreset = async () => {
    if (!selectedPresetKey || !selectedProductForPositioning) return;
    
    const currentPos = positionSettings[selectedProductForPositioning.id];
    const savedPreset = customPresets[selectedPresetKey];
    
    if (!currentPos || !savedPreset) return;
    
    console.log('💾 Quick update preset:', selectedPresetKey);
    console.log('📍 With position:', currentPos);
    
    const newPresets = {
      ...customPresets,
      [selectedPresetKey]: {
        ...savedPreset,
        ...currentPos
      }
    };
    
    setCustomPresets(newPresets);
    await saveCustomPresets(newPresets);
    setMessage(`Preset "${savedPreset.name}" updated successfully!`);
    setTimeout(() => setMessage(''), 3000);
  };

  // Filter products based on search and status
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.handle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Helper functions for orders
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'refunded': return 'bg-red-100 text-red-800';
      case 'fulfilled': return 'bg-blue-100 text-blue-800';
      case 'unfulfilled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const openOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetailsModal(true);
  };

  const closeOrderDetails = () => {
    setSelectedOrder(null);
    setShowOrderDetailsModal(false);
  };

  const shareWithDigitizer = async (order: Order) => {
    try {
      // Generate a unique token for the digitizer link
      const token = btoa(`${order.id}-${Date.now()}`).replace(/[^a-zA-Z0-9]/g, '');
      
      // Create the digitizer link
      const digitizerLink = `${window.location.origin}/digitizer/${token}`;
      
      // Copy to clipboard
      await navigator.clipboard.writeText(digitizerLink);

      alert(`Digitizer link copied to clipboard!\n\n${digitizerLink}`);
    } catch (error) {
      console.error('Failed to copy link:', error);
      alert('Failed to copy link to clipboard');
    }
  };

  const openStatusModal = (order: Order) => {
    setSelectedOrderForStatus(order);
    setDigitizerNameInput(order.digitizerName || '');
    setShowStatusModal(true);
  };

  const closeStatusModal = () => {
    setSelectedOrderForStatus(null);
    setShowStatusModal(false);
    setDigitizerNameInput('');
    setPaymentAmount('');
    setShowPaymentInput(false);
  };

  const openFileReviewModal = async (order: Order) => {
    setSelectedOrderForReview(order);
    setShowFileReviewModal(true);
    setReviewLoading(true);
    
    try {
      console.log('📁 Fetching uploaded files for order:', order.id);
      
      // Fetch uploaded files for this order using the new file management API
      const response = await fetch(`/api/orders/${order.id}/files/manage`);
      const data = await response.json();
      
      if (data.success) {
        setUploadedFiles(data.files || []);
        console.log('📁 Successfully loaded', data.files?.length || 0, 'files');
      } else {
        console.error('Failed to fetch files:', data.error);
        setUploadedFiles([]);
      }
    } catch (error) {
      console.error('Error fetching uploaded files:', error);
      setUploadedFiles([]);
    } finally {
      setReviewLoading(false);
    }
  };

  const closeFileReviewModal = () => {
    setSelectedOrderForReview(null);
    setShowFileReviewModal(false);
    setUploadedFiles([]);
    setModificationMessage('');
    setShowModifyInput(false);
  };


  const updateDigitizationStatus = async (newStatus: 'pending' | 'assigned' | 'pending_approval' | 'completed_unpaid' | 'completed_paid') => {
    if (!selectedOrderForStatus) return;

    try {
      let tags: string;
      let orderNote: string;
      const digitizerName = digitizerNameInput.trim() || 'Unknown';

      switch (newStatus) {
        case 'pending':
          tags = digitizerName !== 'Unknown' && digitizerName !== '' ? `digitizer:${digitizerName}` : '';
          orderNote = digitizerName !== 'Unknown' && digitizerName !== '' 
            ? `Digitization status reset to pending - Assigned to ${digitizerName}` 
            : 'Digitization status reset to pending';
          break;
        case 'assigned':
          tags = `digitizer-approved, digitizer:${digitizerName}`;
          orderNote = `Digitizer ${digitizerName} approved for this job`;
          break;
        case 'pending_approval':
          tags = `digitizer-pending-approval, digitizer:${digitizerName}`;
          orderNote = `Digitization files uploaded by ${digitizerName} - Pending admin approval`;
          break;
        case 'completed_unpaid':
          tags = `digitizer-completed-unpaid, digitizer:${digitizerName}`;
          orderNote = `Digitization completed by ${digitizerName} - Payment pending`;
          break;
        case 'completed_paid':
          if (!paymentAmount.trim()) {
            alert('Payment amount is required for paid status');
            return;
          }
          tags = `digitizer-completed-paid, digitizer:${digitizerName}`;
          orderNote = `Digitization completed by ${digitizerName} - Payment processed: $${paymentAmount.trim()}`;
          break;
        default:
          return;
      }

      const response = await fetch('/api/shopify/orders/update-digitizer-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: selectedOrderForStatus.id,
          status: newStatus,
          digitizerName: digitizerName,
          customTags: tags,
          customNote: orderNote
        })
      });

      if (response.ok) {
        closeStatusModal();
        fetchOrders(); // Refresh the orders list
      } else {
        alert('Failed to update status. Please try again.');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status. Please try again.');
    }
  };

  const approveDigitization = async () => {
    if (!selectedOrderForReview) return;
    
    try {
      const digitizerName = selectedOrderForReview.digitizerName || 'Unknown';
      
      const response = await fetch('/api/shopify/orders/update-digitizer-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: selectedOrderForReview.id,
          status: 'completed_unpaid',
          digitizerName: digitizerName,
          customTags: `digitizer-completed-unpaid, digitizer:${digitizerName}`,
          customNote: `Digitization approved and completed by ${digitizerName} - Payment pending`
        })
      });

      if (response.ok) {
        closeFileReviewModal();
        fetchOrders(); // Refresh the orders list
        alert('Digitization approved successfully!');
      } else {
        alert('Failed to approve digitization. Please try again.');
      }
    } catch (error) {
      console.error('Error approving digitization:', error);
      alert('Failed to approve digitization. Please try again.');
    }
  };

  const requestModifications = async () => {
    if (!selectedOrderForReview || !modificationMessage.trim()) return;
    
    try {
      const digitizerName = selectedOrderForReview.digitizerName || 'Unknown';
      
      console.log('📤 Sending modification request:', {
        orderId: selectedOrderForReview.id,
        status: 'assigned',
        digitizerName: digitizerName,
        customTags: `digitizer-modifications, digitizer:${digitizerName}`,
        customNote: `Modifications requested by admin: ${modificationMessage.trim()}\n\nPlease make the requested changes and upload new files.`,
        modificationMessage: modificationMessage.trim()
      });
      
      const response = await fetch('/api/shopify/orders/update-digitizer-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: selectedOrderForReview.id,
          status: 'assigned',
          digitizerName: digitizerName,
          customTags: `digitizer-modifications, digitizer:${digitizerName}`,
          customNote: `Modifications requested by admin: ${modificationMessage.trim()}\n\nPlease make the requested changes and upload new files.`,
          modificationMessage: modificationMessage.trim()
        })
      });

      if (response.ok) {
        closeFileReviewModal();
        fetchOrders(); // Refresh the orders list
        alert('Modification request sent successfully!');
      } else {
        alert('Failed to send modification request. Please try again.');
      }
    } catch (error) {
      console.error('Error requesting modifications:', error);
      alert('Failed to send modification request. Please try again.');
    }
  };

  const deleteFile = async (fileName: string, blobPath: string) => {
    if (!selectedOrderForReview) return;
    
    if (!confirm(`Are you sure you want to delete "${fileName}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      console.log('🗑️ Deleting file:', fileName);
      
      const response = await fetch(`/api/orders/${selectedOrderForReview.id}/files/manage`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: fileName,
          blobPath: blobPath
        })
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ File deleted successfully');
        
        // Remove the file from the current list
        setUploadedFiles(files => files.filter(f => f.blobId !== blobPath));
        
        alert(`File "${fileName}" deleted successfully!`);
      } else {
        console.error('Failed to delete file:', data.error);
        alert(`Failed to delete file: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Failed to delete file. Please try again.');
    }
  };

  const getDigitizationStatusBadge = (status?: string, digitizerName?: string, order?: Order) => {
    const handleStatusClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (order) {
        openStatusModal(order);
      }
    };

    switch (status) {
      case 'shared':
        return (
          <button onClick={handleStatusClick} className="hover:bg-blue-200 rounded-full transition-colors">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Shared</span>
          </button>
        );
      case 'pending_approval':
        return (
          <button onClick={handleStatusClick} className="hover:bg-amber-200 rounded-full transition-colors text-left">
            <div className="flex flex-col">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Pending Approval</span>
              {digitizerName && <span className="text-xs text-gray-500 mt-1 px-2">by {digitizerName}</span>}
            </div>
          </button>
        );
      case 'assigned':
        return (
          <button onClick={handleStatusClick} className="hover:bg-purple-200 rounded-full transition-colors text-left">
            <div className="flex flex-col">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Assigned</span>
              {digitizerName && <span className="text-xs text-gray-500 mt-1 px-2">by {digitizerName}</span>}
            </div>
          </button>
        );
      case 'pending_approval':
        return (
          <button onClick={handleStatusClick} className="hover:bg-amber-200 rounded-full transition-colors text-left">
            <div className="flex flex-col">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Pending Approval</span>
              {digitizerName && <span className="text-xs text-gray-500 mt-1 px-2">by {digitizerName}</span>}
            </div>
          </button>
        );
      case 'completed_unpaid':
        return (
          <button onClick={handleStatusClick} className="hover:bg-green-200 rounded-full transition-colors text-left">
            <div className="flex flex-col">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Completed - Unpaid</span>
              {digitizerName && <span className="text-xs text-gray-500 mt-1 px-2">by {digitizerName}</span>}
            </div>
          </button>
        );
      case 'completed_paid':
        return (
          <button onClick={handleStatusClick} className="hover:bg-blue-200 rounded-full transition-colors text-left">
            <div className="flex flex-col">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Completed - Paid</span>
              {digitizerName && <span className="text-xs text-gray-500 mt-1 px-2">by {digitizerName}{order?.paymentAmount && ` $${order.paymentAmount}`}</span>}
            </div>
          </button>
        );
      default:
        return (
          <button onClick={handleStatusClick} className="hover:bg-yellow-200 rounded-full transition-colors text-left">
            <div className="flex flex-col">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>
              {digitizerName && <span className="text-xs text-gray-500 mt-1 px-2">by {digitizerName}</span>}
            </div>
          </button>
        );
    }
  };

  return (
    <AdminAuth>
      {({ handleLogout }) => (
      <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Image
                src="/logo.png"
                alt="PixelMe Logo"
                width={120}
                height={48}
                priority
              />
              <div className="ml-6">
                <h1 className="text-2xl font-bold text-gray-900">Product Management</h1>
                <p className="text-sm text-gray-500">Manage your PixelMe custom clothing products</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* <CartIcon /> */}
              <button
                onClick={() => window.open('/admin/orders', '_blank')}
                className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-medium text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                View Orders
              </button>
              <button
                onClick={fetchProducts}
                disabled={loading}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {loading ? 'Loading...' : 'Refresh'}
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium text-sm flex items-center gap-2"
                title="Logout"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Messages */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg text-sm ${
            message.includes('Error') || message.includes('Failed')
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}>
            {message}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search products</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by title or handle..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>
        </div>



        {/* Products Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Products ({filteredProducts.length})
              </h2>
              {filteredProducts.length > 0 && (
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">{selectedProducts.size} of {filteredProducts.length} selected</span>
                  {selectedProducts.size > 0 && (
                    <button
                      onClick={deleteSelected}
                      disabled={creating}
                      className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm"
                    >
                      Delete Selected ({selectedProducts.size})
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading products...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <div className="mb-4">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-500">No products available to display.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={filteredProducts.length > 0 && selectedProducts.size === filteredProducts.length}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Inventory
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vendor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Image Position
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProducts.map((product) => {
                    const totalInventory = product.variants?.edges?.reduce((sum, edge) => 
                      sum + (edge.node.inventoryQuantity || 0), 0) || 0;
                    const variantCount = product.variants?.edges?.length || 0;
                    const firstVariantPrice = product.variants?.edges?.[0]?.node?.price || '0';
                    
                    return (
                      <tr 
                        key={product.id}
                        className={`hover:bg-gray-50 ${selectedProducts.has(product.id) ? 'bg-blue-50' : ''}`}
                      >
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedProducts.has(product.id)}
                            onChange={() => toggleProductSelection(product.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-12 w-12">
                              {product.images?.edges?.[0]?.node?.url ? (
                                <img
                                  src={product.images.edges[0].node.url}
                                  alt={product.images.edges[0].node.altText || product.title}
                                  className="h-12 w-12 rounded-lg object-cover"
                                />
                              ) : (
                                // Fallback to local images based on product title
                                <Image
                                  src={
                                    product.title.toLowerCase().includes('hoodie') 
                                      ? '/clothes/hoodie.png'
                                      : product.title.toLowerCase().includes('trackies')
                                      ? '/clothes/trackies.png'
                                      : '/clothes/hoodie.png' // default fallback
                                  }
                                  alt={product.title}
                                  width={48}
                                  height={48}
                                  className="h-12 w-12 rounded-lg object-cover"
                                />
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {product.title}
                              </div>
                              <div className="text-sm text-gray-500">
                                {product.handle}
                              </div>
                              <div className="text-sm text-gray-500">
                                ${firstVariantPrice} • {variantCount} variant{variantCount !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            product.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : product.status === 'draft'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {totalInventory} in stock
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {product.productType}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {product.vendor}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => openPositionModal(product)}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                            </svg>
                            Adjust Position
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Orders Section */}
        <div className="mt-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  Recent Orders ({orders.length})
                </h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={fetchOrders}
                    disabled={ordersLoading}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {ordersLoading ? 'Loading...' : 'Refresh'}
                  </button>
                  <button
                    onClick={() => window.open('/admin/orders', '_blank')}
                    className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-medium text-sm"
                  >
                    View All Orders
                  </button>
                </div>
              </div>
            </div>
            
            {ordersLoading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <div className="mb-4">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
                <p className="text-gray-500">Orders will appear here once customers make purchases.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Items
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Digitized
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium text-gray-900">
                              #{order.orderNumber}
                            </div>
                            {order.isPixelMeOrder && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                PixelMe
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">{order.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {order.customer?.firstName} {order.customer?.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{order.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(order.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.financialStatus)}`}>
                              {order.financialStatus}
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.fulfillmentStatus)}`}>
                              {order.fulfillmentStatus || 'unfulfilled'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          ${parseFloat(order.totalPrice).toFixed(2)} {order.currency}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {order.totalItems} item{order.totalItems !== 1 ? 's' : ''}
                          </div>
                          {order.isPixelMeOrder && (
                            <div className="text-xs text-purple-600 font-medium">
                              {order.customItemsCount} custom
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {order.isPixelMeOrder ? (
                            getDigitizationStatusBadge(order.digitizationStatus, order.digitizerName, order)
                          ) : (
                            <span className="text-gray-400 text-sm">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {order.isPixelMeOrder && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openOrderDetails(order)}
                                className="px-2 py-1 text-xs text-purple-700 hover:bg-purple-50 rounded transition-colors"
                                title="View Details"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => openFileReviewModal(order)}
                                className="px-2 py-1 text-xs text-blue-700 hover:bg-blue-50 rounded transition-colors"
                                title="View Files"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => shareWithDigitizer(order)}
                                className="px-2 py-1 text-xs text-green-700 hover:bg-green-50 rounded transition-colors"
                                title="Share"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* PixelMe Orders Summary */}
          {orders.filter(o => o.isPixelMeOrder).length > 0 && (
            <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-purple-900 mb-4">
                🎨 PixelMe Orders Summary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-600">
                    {orders.filter(o => o.isPixelMeOrder).length}
                  </div>
                  <div className="text-sm text-gray-600">Custom Orders</div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600">
                    ${orders
                      .filter(o => o.isPixelMeOrder && o.financialStatus === 'paid')
                      .reduce((sum, o) => sum + parseFloat(o.totalPrice), 0)
                      .toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">Revenue</div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600">
                    {orders
                      .filter(o => o.isPixelMeOrder)
                      .reduce((sum, o) => sum + o.customItemsCount, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Custom Designs</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Product Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Add new product</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Clothing Type</label>
                <select
                  value={newProduct.clothing}
                  onChange={(e) => setNewProduct({...newProduct, clothing: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="hoodie">Hoodie</option>
                  <option value="trackies">Trackies</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Style</label>
                <select
                  value={newProduct.style}
                  onChange={(e) => setNewProduct({...newProduct, style: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Simpsons">Simpsons</option>
                  <option value="Family Guy">Family Guy</option>
                  <option value="Studio Ghibli">Studio Ghibli</option>
                  <option value="South Park">South Park</option>
                  <option value="Dragon Ball">Dragon Ball</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <textarea
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                  placeholder="Custom description or leave blank for default..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={createSingleProduct}
                disabled={creating}
                className={`px-4 py-2 rounded-lg font-medium ${
                  creating
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {creating ? 'Creating...' : 'Create product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Position Adjustment Modal */}
      {showPositionModal && selectedProductForPositioning && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Adjust Image Position - {selectedProductForPositioning.title}</h3>
              <p className="text-sm text-gray-600 mt-1">Adjust where the custom image will be placed on this product</p>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Product Preview */}
                <div className="text-center">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Preview</h4>
                  <div className="relative inline-block bg-gray-50 p-4 rounded-lg">
                    {selectedProductForPositioning.images?.edges?.[0]?.node?.url ? (
                      <img
                        src={selectedProductForPositioning.images.edges[0].node.url}
                        alt={selectedProductForPositioning.title}
                        className="w-80 h-80 object-contain"
                      />
                    ) : (
                      <Image
                        src={
                          selectedProductForPositioning.title.toLowerCase().includes('hoodie') 
                            ? '/clothes/hoodie.png'
                            : '/clothes/trackies.png'
                        }
                        alt={selectedProductForPositioning.title}
                        width={320}
                        height={320}
                        className="object-contain"
                      />
                    )}
                    
                    {/* Position Overlay */}
                    {positionSettings[selectedProductForPositioning.id] && (
                      <div
                        className="absolute border-2 border-dashed border-red-500 bg-red-50 bg-opacity-70 rounded-lg flex items-center justify-center"
                        style={{
                          top: `${positionSettings[selectedProductForPositioning.id].y}%`,
                          left: `${positionSettings[selectedProductForPositioning.id].x}%`,
                          width: `${positionSettings[selectedProductForPositioning.id].size}%`,
                          height: `${positionSettings[selectedProductForPositioning.id].size}%`,
                          transform: 'translate(-50%, -50%)',
                        }}
                      >
                        <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>

                {/* Position Controls */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Position Controls</h4>
                  
                  {positionSettings[selectedProductForPositioning.id] && (
                    <div className="space-y-6">
                      {/* X Position */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Horizontal Position (X): {positionSettings[selectedProductForPositioning.id].x}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="70"
                          value={positionSettings[selectedProductForPositioning.id].x}
                          onChange={(e) => updatePosition(selectedProductForPositioning.id, 'x', parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      {/* Y Position */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Vertical Position (Y): {positionSettings[selectedProductForPositioning.id].y}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="70"
                          value={positionSettings[selectedProductForPositioning.id].y}
                          onChange={(e) => updatePosition(selectedProductForPositioning.id, 'y', parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      {/* Size (1:1 ratio) */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Size (1:1 ratio): {positionSettings[selectedProductForPositioning.id].size}%
                        </label>
                        <input
                          type="range"
                          min="10"
                          max="50"
                          value={positionSettings[selectedProductForPositioning.id].size}
                          onChange={(e) => updatePosition(selectedProductForPositioning.id, 'size', parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Controls both width and height to maintain square ratio
                        </p>
                      </div>

                      {/* Custom Presets */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Presets:
                          {presetsSaving && (
                            <span className="ml-2 text-xs text-blue-600">Saving...</span>
                          )}
                        </label>
                        
                        {/* Preset Controls */}
                        <div className="flex items-center justify-end mb-2">
                          <button
                            onClick={() => {
                              console.log('🔄 Manual refresh requested');
                              loadCustomPresets();
                            }}
                            disabled={presetsLoading}
                            className="text-xs text-blue-600 hover:text-blue-700 disabled:text-gray-400"
                          >
                            {presetsLoading ? 'Loading...' : 'Refresh'}
                          </button>
                        </div>

                        {/* Existing Presets */}
                        {presetsLoading ? (
                          <div className="flex items-center gap-2 py-4">
                            <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                            <span className="text-sm text-gray-600">Loading presets...</span>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {Object.entries(customPresets).length === 0 ? (
                              <div className="text-sm text-gray-500 py-2">
                                No custom presets saved yet. Create one below!
                              </div>
                            ) : (
                              Object.entries(customPresets).map(([key, preset]) => {
                                const isSelected = selectedPresetKey === key;
                                console.log(`🎨 Rendering preset ${key}: selectedPresetKey=${selectedPresetKey}, isSelected=${isSelected}`);
                                
                                return (
                                  <div key={key} className="relative group">
                                                                          <button
                                        onClick={() => applyPreset(preset, key)}
                                        disabled={presetsSaving}
                                        className={`px-3 py-2 rounded-lg text-xs pr-8 transition-all ${
                                          isSelected
                                            ? 'bg-blue-100 text-blue-800 border-2 border-blue-400 ring-1 ring-blue-300'
                                            : presetsSaving 
                                              ? 'bg-gray-50 text-gray-400 cursor-not-allowed' 
                                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                      >
                                        {preset.name}
                                      </button>
                                      <button
                                        onClick={() => openEditPresetModal(key)}
                                        disabled={presetsSaving}
                                        className={`absolute -top-2 -right-2 w-5 h-5 rounded-full text-xs flex items-center justify-center shadow-sm ${
                                          presetsSaving
                                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
                                            : 'bg-blue-500 text-white hover:bg-blue-600 opacity-0 group-hover:opacity-100'
                                        }`}
                                        title="Edit preset"
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                      </button>
                                    </div>
                                  );
                                })
                            )}
                          </div>
                        )}

                        {/* Update Selected Preset (if changes exist) */}
                        {selectedPresetKey && positionSettings[selectedProductForPositioning.id] && (() => {
                          const currentPos = positionSettings[selectedProductForPositioning.id];
                          const savedPreset = customPresets[selectedPresetKey];
                          const hasChanges = savedPreset && (
                            currentPos.x !== savedPreset.x || 
                            currentPos.y !== savedPreset.y || 
                            currentPos.size !== savedPreset.size
                          );
                          
                          return hasChanges ? (
                            <div className="border-t border-gray-200 pt-4 mb-4">
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-yellow-800">Update "{savedPreset?.name}"?</p>
                                    <p className="text-xs text-yellow-600">You've modified this preset's position</p>
                                  </div>
                                  <button
                                    onClick={updateSelectedPreset}
                                    disabled={presetsSaving}
                                    className={`px-3 py-1 rounded text-xs font-medium ${
                                      presetsSaving
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-yellow-600 text-white hover:bg-yellow-700'
                                    }`}
                                  >
                                    {presetsSaving ? 'Saving...' : 'Update'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : null;
                        })()}

                        {/* Add New Preset */}
                        <div className="border-t border-gray-200 pt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Create New Preset:</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newPresetName}
                              onChange={(e) => setNewPresetName(e.target.value)}
                              placeholder="Enter preset name..."
                              disabled={presetsSaving}
                              className={`flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-black bg-white ${
                                presetsSaving ? 'bg-gray-50 text-gray-400' : ''
                              }`}
                              onKeyPress={(e) => e.key === 'Enter' && !presetsSaving && addCustomPreset()}
                            />
                            <button
                              onClick={addCustomPreset}
                              disabled={!newPresetName.trim() || presetsSaving}
                              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                                newPresetName.trim() && !presetsSaving
                                  ? 'bg-green-600 text-white hover:bg-green-700'
                                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              }`}
                            >
                              {presetsSaving && (
                                <div className="animate-spin h-3 w-3 border border-white border-t-transparent rounded-full"></div>
                              )}
                              {presetsSaving ? 'Saving...' : 'Save Preset'}
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Adjust the position above, then save it as a custom preset
                          </p>
                          
                          {/* Reset to Defaults */}
                          {Object.entries(customPresets).length > 0 && !presetsLoading && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <button
                                onClick={resetPresetsToDefaults}
                                disabled={presetsSaving}
                                className={`text-xs font-medium ${
                                  presetsSaving
                                    ? 'text-gray-400 cursor-not-allowed'
                                    : 'text-red-600 hover:text-red-700'
                                }`}
                              >
                                {presetsSaving ? 'Resetting...' : `Reset ${getCurrentProductType().charAt(0).toUpperCase() + getCurrentProductType().slice(1)} Presets`}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                              <button
                  onClick={() => {
                    setShowPositionModal(false);
                    setNewPresetName('');
                    setSelectedPresetKey(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
              <button
                onClick={savePositionSettings}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Save Position
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Preset Modal */}
      {showEditPresetModal && editingPresetKey && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Edit Preset</h3>
              <p className="text-sm text-gray-600 mt-1">Rename preset, adjust position in the background, or delete this preset</p>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Preset Name</label>
                                    <input
                    type="text"
                    value={editPresetName}
                    onChange={(e) => {
                      console.log('🔤 Input onChange triggered!');
                      console.log('🔤 New value:', e.target.value);
                      console.log('🔤 Current editPresetName before change:', editPresetName);
                      setEditPresetName(e.target.value);
                      console.log('🔤 setEditPresetName called with:', e.target.value);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black bg-white"
                    placeholder="Enter preset name..."
                    onKeyPress={(e) => e.key === 'Enter' && renamePreset()}
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 mt-1">State value: "{editPresetName}"</p>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Position Settings:</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    {selectedProductForPositioning && positionSettings[selectedProductForPositioning.id] ? (
                      <>
                        <p><strong>Current (Live):</strong></p>
                        <p>X: {positionSettings[selectedProductForPositioning.id].x}%</p>
                        <p>Y: {positionSettings[selectedProductForPositioning.id].y}%</p>
                        <p>Size: {positionSettings[selectedProductForPositioning.id].size}% (1:1 ratio)</p>
                        
                        {/* Check if current position differs from saved preset */}
                        {(() => {
                          const current = positionSettings[selectedProductForPositioning.id];
                          const saved = customPresets[editingPresetKey];
                          const hasChanges = saved && (
                            current.x !== saved.x || 
                            current.y !== saved.y || 
                            current.size !== saved.size
                          );
                          
                          return hasChanges ? (
                            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                              <p className="text-xs text-yellow-700 font-medium">⚠️ You have unsaved changes!</p>
                              <p className="text-xs text-yellow-600">Click "Save Changes" to persist your adjustments.</p>
                            </div>
                          ) : (
                            <p className="text-xs text-green-600 mt-2">✅ Position matches saved preset</p>
                          );
                        })()}
                        
                        <p className="text-xs text-blue-600 mt-2">Adjust sliders in background to change these values</p>
                      </>
                    ) : (
                      <>
                        <p><strong>Saved:</strong></p>
                        <p>X: {customPresets[editingPresetKey]?.x}%</p>
                        <p>Y: {customPresets[editingPresetKey]?.y}%</p>
                        <p>Size: {customPresets[editingPresetKey]?.size}% (1:1 ratio)</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
                              <button
                  onClick={() => deleteCustomPreset(editingPresetKey)}
                  disabled={presetsSaving}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    presetsSaving
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {presetsSaving ? 'Deleting...' : 'Delete Preset'}
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowEditPresetModal(false);
                      setEditingPresetKey(null);
                      setEditPresetName('');
                      setSelectedPresetKey(null);
                    }}
                    disabled={presetsSaving}
                    className={`px-4 py-2 rounded-lg ${
                      presetsSaving
                        ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                        : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      console.log('🔴 Save Changes button clicked!');
                      console.log('🔴 editPresetName:', editPresetName);
                      console.log('🔴 editPresetName.trim():', editPresetName.trim());
                      console.log('🔴 editPresetName.trim() length:', editPresetName.trim().length);
                      console.log('🔴 editingPresetKey:', editingPresetKey);
                      console.log('🔴 presetsSaving:', presetsSaving);
                      console.log('🔴 Button disabled check:', !editPresetName.trim() || presetsSaving);
                      console.log('🔴 Current customPresets:', customPresets);
                      console.log('🔴 Original preset name:', customPresets[editingPresetKey]?.name);
                      renamePreset();
                    }}
                    disabled={!editPresetName.trim() || presetsSaving}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      editPresetName.trim() && !presetsSaving
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {presetsSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Design Details Modal */}
      {showOrderDetailsModal && selectedOrder && selectedOrder.isPixelMeOrder && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={closeOrderDetails}
        >
          <div 
            className={`bg-white rounded-lg shadow-xl w-fit max-w-5xl max-h-[80vh] overflow-hidden ${
              selectedOrder.pixelMeItems.length === 1 ? 'min-w-96 max-w-lg' :
              selectedOrder.pixelMeItems.length === 2 ? 'min-w-[48rem] max-w-4xl' :
              'min-w-[60rem] max-w-5xl'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Custom Design Details - #{selectedOrder.orderNumber}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedOrder.customer?.firstName} {selectedOrder.customer?.lastName} • {formatDate(selectedOrder.createdAt)}
                </p>
              </div>
              <button
                onClick={closeOrderDetails}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 max-h-[calc(80vh-120px)] overflow-y-auto">
              <div className={`grid gap-4 ${
                selectedOrder.pixelMeItems.length === 1 ? 'grid-cols-1' :
                selectedOrder.pixelMeItems.length === 2 ? 'grid-cols-2' :
                selectedOrder.pixelMeItems.length > 6 ? 'grid-cols-4' :
                'grid-cols-3'
              }`}>
                    {selectedOrder.pixelMeItems.map((item, index) => (
                      <div key={index} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        {item.customDesignUrl && (
                          <div className="relative aspect-square bg-gray-50">
                            <img 
                              src={item.customDesignUrl}
                              alt={`Custom design for ${item.title}`}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                e.currentTarget.src = '/logo.png';
                                e.currentTarget.onerror = null;
                              }}
                            />
                            <a 
                              href={item.customDesignUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow"
                              title="Open full size"
                            >
                              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          </div>
                        )}
                        
                        <div className="p-4 space-y-3">
                          <h5 className="font-medium text-gray-900">{item.title}</h5>
                          
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Style:</span>
                              <span className="font-medium text-gray-900">{item.style || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Clothing Type:</span>
                              <span className="font-medium text-gray-900">{item.clothingType || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Position:</span>
                              <span className="font-medium text-gray-900">{item.position || 'Default'}</span>
                            </div>
                          </div>
                          
                          {item.customDesignUrl && (
                            <div className="pt-3 border-t border-gray-100">
                              <p className="text-xs text-gray-500 mb-1">Design URL:</p>
                              <a 
                                href={item.customDesignUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-purple-600 hover:text-purple-700 break-all"
                              >
                                {item.customDesignUrl}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {showStatusModal && selectedOrderForStatus && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50"
          onClick={closeStatusModal}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Change Digitization Status</h3>
              <p className="text-sm text-gray-600 mt-1">
                Order #{selectedOrderForStatus.orderNumber} - {selectedOrderForStatus.customer?.firstName} {selectedOrderForStatus.customer?.lastName}
              </p>
            </div>
            
            <div className="p-6">
              {/* Digitizer Name Input */}
              <div className="mb-6">
                <label htmlFor="digitizerName" className="block text-sm font-medium text-gray-700 mb-2">
                  Digitizer Name
                </label>
                <input
                  type="text"
                  id="digitizerName"
                  value={digitizerNameInput}
                  onChange={(e) => setDigitizerNameInput(e.target.value)}
                  placeholder="Enter digitizer name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-black"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This name will be associated with the selected status
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => updateDigitizationStatus('pending')}
                  className="flex flex-col items-center p-4 border-2 border-yellow-200 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
                >
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 mb-2">
                    Pending
                  </span>
                  <p className="text-xs text-center text-gray-600">Reset to pending status</p>
                </button>

                <button
                  onClick={() => updateDigitizationStatus('assigned')}
                  className="flex flex-col items-center p-4 border-2 border-purple-200 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 mb-2">
                    Assigned
                  </span>
                  <p className="text-xs text-center text-gray-600">Job assigned to digitizer</p>
                </button>

                <button
                  onClick={() => updateDigitizationStatus('pending_approval')}
                  className="flex flex-col items-center p-4 border-2 border-amber-200 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
                >
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800 mb-2">
                    Pending Approval
                  </span>
                  <p className="text-xs text-center text-gray-600">Files uploaded, waiting for approval</p>
                </button>

                <button
                  onClick={() => updateDigitizationStatus('completed_unpaid')}
                  className="flex flex-col items-center p-4 border-2 border-green-200 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 mb-2">
                    Completed - Unpaid
                  </span>
                  <p className="text-xs text-center text-gray-600">Work complete, payment pending</p>
                </button>

                <button
                  onClick={() => setShowPaymentInput(!showPaymentInput)}
                  className="flex flex-col items-center p-4 border-2 border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 mb-2">
                    Completed - Paid
                  </span>
                  <p className="text-xs text-center text-gray-600">Work complete, payment processed</p>
                </button>
              </div>
            </div>

            {/* Payment Input Section */}
            {showPaymentInput && (
              <div className="px-6 py-4 border-t border-gray-200 bg-blue-50">
                <h3 className="text-md font-medium text-gray-900 mb-3">Payment Details</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Amount *
                    </label>
                    <div className="flex items-center">
                      <span className="text-gray-500 mr-1">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="0.00"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateDigitizationStatus('completed_paid')}
                      disabled={!paymentAmount.trim()}
                      className={`px-4 py-2 rounded-lg font-medium ${
                        paymentAmount.trim()
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      Confirm Payment
                    </button>
                    <button
                      onClick={() => {
                        setShowPaymentInput(false);
                        setPaymentAmount('');
                      }}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={closeStatusModal}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Review Modal */}
      {showFileReviewModal && selectedOrderForReview && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50"
          onClick={closeFileReviewModal}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">View Uploaded Files</h3>
              <p className="text-sm text-gray-600 mt-1">
                Order #{selectedOrderForReview.orderNumber} - {selectedOrderForReview.customer?.firstName} {selectedOrderForReview.customer?.lastName}
              </p>
              <p className="text-sm text-gray-500">
                Digitizer: {selectedOrderForReview.digitizerName}
              </p>
            </div>
            
            <div className="p-6">
              {reviewLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
                  <p className="ml-3 text-gray-600">Loading uploaded files...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Files Section */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-4">Uploaded Files</h4>
                    {uploadedFiles.length === 0 ? (
                      <div className="bg-gray-50 rounded-lg p-6 text-center">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-gray-500 mb-2">No files available for preview</p>
                        <p className="text-sm text-gray-400">Files may be stored in an external system</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {uploadedFiles.map((file, index) => (
                          <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                              <p className="text-xs text-gray-500 ml-2">{file.size}</p>
                            </div>
                            {/* File preview */}
                            <div className="bg-gray-100 rounded-lg h-40 flex items-center justify-center mb-3 cursor-pointer hover:bg-gray-200 transition-colors">
                              {file.type?.startsWith('image/') ? (
                                <img 
                                  src={file.url} 
                                  alt={file.name}
                                  className="max-w-full max-h-full object-contain rounded"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent) {
                                      parent.innerHTML = `
                                        <div class="text-center">
                                          <svg class="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                          </svg>
                                          <p class="text-xs text-gray-500">Image preview failed</p>
                                        </div>
                                      `;
                                    }
                                  }}
                                />
                              ) : (
                                <div className="text-center">
                                  <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <p className="text-xs text-gray-500">{file.type || 'Unknown type'}</p>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <button 
                                onClick={() => window.open(file.url, '_blank')}
                                className="flex-1 text-xs text-blue-600 hover:text-blue-700 font-medium py-1"
                                title="Download file"
                              >
                                Download
                              </button>
                              <button 
                                onClick={() => window.open(file.url, '_blank')}
                                className="flex-1 text-xs text-gray-600 hover:text-gray-700 font-medium py-1"
                                title="View full size"
                              >
                                View
                              </button>
                              <button 
                                onClick={() => deleteFile(file.name, file.blobId)}
                                className="flex-1 text-xs text-red-600 hover:text-red-700 font-medium py-1"
                                title="Delete file"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Approve/Modify Section for Pending Approval */}
                  {selectedOrderForReview.digitizationStatus === 'pending_approval' && (
                    <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <h4 className="text-md font-medium text-gray-900 mb-3">Review Action Required</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        The digitizer has uploaded files and is waiting for your approval. Please review the files above and choose an action.
                      </p>
                      
                      {showModifyInput ? (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Modification Request Message
                            </label>
                            <textarea
                              value={modificationMessage}
                              onChange={(e) => setModificationMessage(e.target.value)}
                              placeholder="Please describe what needs to be modified..."
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-black resize-none"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={requestModifications}
                              disabled={!modificationMessage.trim()}
                              className={`px-4 py-2 rounded-lg font-medium ${
                                modificationMessage.trim()
                                  ? 'bg-orange-600 text-white hover:bg-orange-700'
                                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              }`}
                            >
                              Send Modification Request
                            </button>
                            <button
                              onClick={() => {
                                setShowModifyInput(false);
                                setModificationMessage('');
                              }}
                              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-3">
                          <button
                            onClick={approveDigitization}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                          >
                            Approve Digitization
                          </button>
                          <button
                            onClick={() => setShowModifyInput(true)}
                            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
                          >
                            Request Modifications
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={closeFileReviewModal}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Cart Button - Hidden on admin panel */}
      {/* <div className="fixed top-6 right-6 z-50">
        <CartIcon />
      </div> */}
    </main>
      )}
    </AdminAuth>
  );
} 