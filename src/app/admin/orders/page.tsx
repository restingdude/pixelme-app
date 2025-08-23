'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminAuth from '../../../components/AdminAuth';

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

export default function AdminOrders() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all'); // all, pixelme, regular
  const [statusFilter, setStatusFilter] = useState('any');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [digitizerRules, setDigitizerRules] = useState('');
  const [savingRules, setSavingRules] = useState(false);
  const [rulesMessage, setRulesMessage] = useState('');
  const [showRulesModal, setShowRulesModal] = useState(false);
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

  useEffect(() => {
    fetchOrders();
    fetchDigitizerRules();
  }, [statusFilter]);

  const fetchDigitizerRules = async () => {
    try {
      const response = await fetch('/api/digitizer/rules');
      const data = await response.json();
      
      if (data.success) {
        setDigitizerRules(data.rules || '');
      }
    } catch (error) {
      console.error('Failed to fetch digitizer rules:', error);
    }
  };

  const saveDigitizerRules = async () => {
    try {
      setSavingRules(true);
      setRulesMessage('');
      
      const response = await fetch('/api/digitizer/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rules: digitizerRules })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setRulesMessage('Rules saved successfully!');
        setTimeout(() => {
          setRulesMessage('');
          setShowRulesModal(false);
        }, 1500);
      } else {
        setRulesMessage('Failed to save rules');
      }
    } catch (error) {
      console.error('Failed to save digitizer rules:', error);
      setRulesMessage('Failed to save rules');
    } finally {
      setSavingRules(false);
    }
  };


  const openStatusModal = (order: Order) => {
    setSelectedOrderForStatus(order);
    setDigitizerNameInput(order.digitizerName || '');
    setShowStatusModal(true);
  };

  const closeStatusModal = () => {
    setSelectedOrderForStatus(null);
    setDigitizerNameInput('');
    setPaymentAmount('');
    setShowPaymentInput(false);
    setShowStatusModal(false);
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
      const digitizerName = digitizerNameInput || 'Unknown';

      switch (newStatus) {
        case 'pending':
          tags = '';
          orderNote = 'Digitization status reset to pending';
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

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: '50',
        status: statusFilter
      });

      const response = await fetch(`/api/shopify/orders?${params}`);
      const data = await response.json();

      if (data.success) {
        setOrders(data.orders);
      } else {
        setError(data.error || 'Failed to load orders');
      }
    } catch (error) {
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    // Filter by order type
    if (filter === 'pixelme' && !order.isPixelMeOrder) return false;
    if (filter === 'regular' && order.isPixelMeOrder) return false;
    
    // Filter by status
    if (statusFilter !== 'any') {
      // Handle Shopify order statuses
      if (['open', 'closed', 'cancelled'].includes(statusFilter)) {
        return order.financialStatus === statusFilter || order.fulfillmentStatus === statusFilter;
      }
      // Handle digitization statuses
      if (['pending', 'assigned', 'pending_approval', 'completed_unpaid', 'completed_paid'].includes(statusFilter)) {
        if (!order.isPixelMeOrder) return false; // Only PixelMe orders have digitization status
        return order.digitizationStatus === statusFilter;
      }
    }
    
    return true;
  });

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
    setShowDetailsModal(true);
  };

  const closeOrderDetails = () => {
    setSelectedOrder(null);
    setShowDetailsModal(false);
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
      case 'in_progress':
        return (
          <button onClick={handleStatusClick} className="hover:bg-orange-200 rounded-full transition-colors text-left">
            <div className="flex flex-col">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">In Progress</span>
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminAuth>
      <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
            <p className="text-gray-600 mt-1">
              {filteredOrders.length} orders • {orders.filter(o => o.isPixelMeOrder).length} PixelMe orders
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowRulesModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Digitizer Rules
            </button>
            
            <button
              onClick={() => router.push('/admin')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Admin
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Order Type
              </label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              >
                <option value="all">All Orders</option>
                <option value="pixelme">PixelMe Orders</option>
                <option value="regular">Regular Orders</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              >
                <option value="any">Any Status</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
                <option value="cancelled">Cancelled</option>
                <optgroup label="Digitization Status">
                  <option value="pending">Pending</option>
                  <option value="assigned">Assigned</option>
                  <option value="pending_approval">Pending Approval</option>
                  <option value="completed_unpaid">Completed - Unpaid</option>
                  <option value="completed_paid">Completed - Paid</option>
                </optgroup>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={fetchOrders}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>


        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Orders List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {filteredOrders.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders found</h3>
              <p className="text-gray-600">No orders match your current filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
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
                      Payment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fulfillment
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
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
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
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {order.customer?.firstName} {order.customer?.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{order.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.financialStatus)}`}>
                          {order.financialStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.fulfillmentStatus)}`}>
                          {order.fulfillmentStatus || 'unfulfilled'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${parseFloat(order.totalPrice).toFixed(2)} {order.currency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-black">
                          {order.totalItems} item{order.totalItems !== 1 ? 's' : ''}
                        </div>
                        {order.isPixelMeOrder && (
                          <div className="text-xs text-black font-medium">
                            {order.customItemsCount} custom design{order.customItemsCount !== 1 ? 's' : ''}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {order.isPixelMeOrder ? (
                          getDigitizationStatusBadge(order.digitizationStatus, order.digitizerName, order)
                        ) : (
                          <span className="text-black text-sm">N/A</span>
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
          <div className="mt-8 bg-purple-50 border border-purple-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-purple-900 mb-4">
              🎨 PixelMe Orders Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-600">
                  {orders.filter(o => o.isPixelMeOrder).length}
                </div>
                <div className="text-sm text-gray-600">Total Custom Orders</div>
              </div>
              <div className="bg-white rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600">
                  ${orders
                    .filter(o => o.isPixelMeOrder && o.financialStatus === 'paid')
                    .reduce((sum, o) => sum + parseFloat(o.totalPrice), 0)
                    .toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">Revenue from Custom Orders</div>
              </div>
              <div className="bg-white rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {orders
                    .filter(o => o.isPixelMeOrder)
                    .reduce((sum, o) => sum + o.customItemsCount, 0)}
                </div>
                <div className="text-sm text-gray-600">Total Custom Designs</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Custom Design Details Modal */}
      {showDetailsModal && selectedOrder && selectedOrder.isPixelMeOrder && (
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
                              <span className="text-black">Clothing Type:</span>
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

      {/* Digitizer Rules Modal */}
      {showRulesModal && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowRulesModal(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Digitizer Rules & Guidelines</h3>
                <p className="text-sm text-gray-500 mt-1">These rules will be shown to digitizers before they accept jobs</p>
              </div>
              <button
                onClick={() => setShowRulesModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <textarea
                value={digitizerRules}
                onChange={(e) => setDigitizerRules(e.target.value)}
                placeholder="Enter rules and guidelines for digitizers here...

Example:
• All embroidery files must be in DST format
• Maximum stitch count: 15,000 stitches  
• Delivery within 24-48 hours
• Test digitization before final delivery
• Include thread color chart
• Provide both filled and outline versions"
                rows={12}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-black resize-none"
              />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={saveDigitizerRules}
                    disabled={savingRules}
                    className={`px-6 py-2 rounded-lg font-medium ${
                      savingRules
                        ? 'bg-gray-400 text-white cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {savingRules ? 'Saving...' : 'Save Rules'}
                  </button>
                  
                  <button
                    onClick={() => setShowRulesModal(false)}
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                  >
                    Cancel
                  </button>
                  
                  {rulesMessage && (
                    <span className={`text-sm ${
                      rulesMessage.includes('success') ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {rulesMessage}
                    </span>
                  )}
                </div>
                
                <div className="text-sm text-gray-500">
                  {digitizerRules.length} characters
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {showStatusModal && selectedOrderForStatus && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={closeStatusModal}
        >
          <div 
            className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Change Digitization Status</h3>
                <p className="text-sm text-gray-500 mt-1">Order #{selectedOrderForStatus.orderNumber}</p>
              </div>
              <button
                onClick={closeStatusModal}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-3">
              <p className="text-sm text-black mb-4">
                Current status: <strong>{selectedOrderForStatus.digitizationStatus || 'pending'}</strong>
                {selectedOrderForStatus.digitizerName && (
                  <span className="text-black"> by {selectedOrderForStatus.digitizerName}</span>
                )}
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Digitizer Name
                </label>
                <input
                  type="text"
                  value={digitizerNameInput}
                  onChange={(e) => setDigitizerNameInput(e.target.value)}
                  placeholder="Enter digitizer name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-black"
                />
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => updateDigitizationStatus('pending')}
                  className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:bg-yellow-50 hover:border-yellow-300 transition-colors"
                >
                  <div className="flex items-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mr-3">Pending</span>
                    <span className="text-sm text-gray-700">Reset to pending (no digitizer assigned)</span>
                  </div>
                </button>

                <button
                  onClick={() => updateDigitizationStatus('assigned')}
                  className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:bg-purple-50 hover:border-purple-300 transition-colors"
                >
                  <div className="flex items-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mr-3">Assigned</span>
                    <span className="text-sm text-gray-700">Job assigned to digitizer</span>
                  </div>
                </button>

                <button
                  onClick={() => updateDigitizationStatus('pending_approval')}
                  className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:bg-amber-50 hover:border-amber-300 transition-colors"
                >
                  <div className="flex items-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 mr-3">Pending Approval</span>
                    <span className="text-sm text-gray-700">Files uploaded, waiting for approval</span>
                  </div>
                </button>

                <button
                  onClick={() => updateDigitizationStatus('completed_unpaid')}
                  className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:bg-green-50 hover:border-green-300 transition-colors"
                >
                  <div className="flex items-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-3">Completed - Unpaid</span>
                    <span className="text-sm text-gray-700">Work complete, payment pending</span>
                  </div>
                </button>

                <button
                  onClick={() => setShowPaymentInput(!showPaymentInput)}
                  className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-3">Completed - Paid</span>
                    <span className="text-sm text-gray-700">Work complete, payment processed</span>
                  </div>
                </button>
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
    </div>
    </AdminAuth>
  );
} 