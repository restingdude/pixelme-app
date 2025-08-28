'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface OrderDetails {
  id: number;
  orderNumber: string;
  name: string;
  customerName: string;
  customerEmail: string;
  createdAt: string;
  totalPrice: string;
  currency: string;
  financialStatus: string;
  fulfillmentStatus: string;
  customItemsCount: number;
  totalItems: number;
  pixelMeItems: Array<{
    title: string;
    quantity: number;
    price: string;
    customDesignUrl: string;
    style: string;
    position: string;
    clothingType: string;
    designSize: string;
  }>;
  shippingAddress?: any;
  billingAddress?: any;
  note?: string;
  jobAccepted?: boolean;
  jobApproved?: boolean;
  jobCompleted?: boolean;
  modificationsRequested?: boolean;
  pendingApproval?: boolean;
  digitizerName?: string;
  modificationMessage?: string;
}

export default function DigitizerPage() {
  const params = useParams();
  const router = useRouter();
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [digitizerName, setDigitizerName] = useState('');
  const [digitizerRules, setDigitizerRules] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadNote, setUploadNote] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  const token = params.token as string;

  useEffect(() => {
    if (token) {
      fetchOrderDetails();
      fetchDigitizerRules();
    }
  }, [token]);

  // Start polling for approval status when job is accepted but not approved/completed
  useEffect(() => {
    if (orderDetails && orderDetails.jobAccepted && !orderDetails.jobApproved && !orderDetails.jobCompleted && !pollingInterval) {
      const interval = setInterval(() => {
        fetchOrderDetails();
      }, 10000); // Poll every 10 seconds
      setPollingInterval(interval);
    }
    
    // Clean up polling when job is approved/completed or component unmounts
    if (orderDetails && (orderDetails.jobApproved || orderDetails.jobCompleted) && pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [orderDetails?.jobAccepted, orderDetails?.jobApproved, orderDetails?.jobCompleted, pollingInterval]);

  const fetchDigitizerRules = async () => {
    try {
      const response = await fetch('/api/digitizer/rules');
      const data = await response.json();
      
      if (data.success) {
        setDigitizerRules(data.rules || '');
      }
    } catch (error) {
      console.error('Error fetching digitizer rules:', error);
    }
  };

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/digitizer/${token}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to load order details');
        return;
      }

      setOrderDetails(data.order);
    } catch (error) {
      console.error('Error fetching order details:', error);
      setError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const acceptJob = async () => {
    if (!orderDetails || !digitizerName.trim()) {
      alert('Please enter your name before accepting the job.');
      return;
    }

    try {
      setAccepting(true);
      
      const response = await fetch(`/api/digitizer/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          digitizerNote: `Job accepted by ${digitizerName.trim()}`,
          digitizerName: digitizerName.trim()
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to accept job');
      }
      
      alert('Job accepted successfully! Your request is now pending admin approval. Please wait for approval before starting work.');
      
      // Refresh the order details to show upload interface
      fetchOrderDetails();
    } catch (error) {
      console.error('Error accepting job:', error);
      alert(`Failed to accept job: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setAccepting(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) {
      alert('Please select at least one file to upload.');
      return;
    }

    try {
      setUploading(true);
      setUploadMessage('');

      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });
      formData.append('note', uploadNote);

      const response = await fetch(`/api/digitizer/${token}`, {
        method: 'PUT',
        body: formData
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload files');
      }

      setUploadMessage('Files uploaded successfully! The order status has been updated to "Completed".');
      setSelectedFiles([]);
      setUploadNote('');
      
      // Refresh order details
      fetchOrderDetails();

    } catch (error) {
      console.error('Error uploading files:', error);
      setUploadMessage(`Failed to upload files: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Link Invalid</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Please contact the administrator for a new link.</p>
        </div>
      </div>
    );
  }

  if (!orderDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No order details found.</p>
        </div>
      </div>
    );
  }

  // Show pending approval state if files uploaded but not yet approved
  if (orderDetails.pendingApproval) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          {/* Pending Approval Icon */}
          <div className="w-16 h-16 mx-auto mb-6 bg-amber-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          {/* Pending Approval Message */}
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Files Uploaded!</h1>
          <p className="text-gray-600 mb-4">
            <strong>Order #{orderDetails.orderNumber}</strong>
          </p>
          <p className="text-gray-600 mb-6">
            Your digitization files have been successfully uploaded and are now pending admin approval. 
            You will be notified once the admin reviews and approves your work.
          </p>

          {/* Job Details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-medium text-gray-900 mb-2">Job Summary:</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Digitizer:</strong> {orderDetails.digitizerName}</p>
              <p><strong>Customer:</strong> {orderDetails.customerName}</p>
              <p><strong>Custom Designs:</strong> {orderDetails.customItemsCount}</p>
              <p><strong>Order Date:</strong> {formatDate(orderDetails.createdAt)}</p>
              <p><strong>Status:</strong> <span className="text-amber-600 font-medium">Pending Approval</span></p>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-amber-900 mb-2">What happens next?</h4>
            <ul className="text-sm text-amber-800 space-y-1 text-left">
              <li>• Admin will review your uploaded files</li>
              <li>• Files will be approved or feedback will be provided</li>
              <li>• You'll receive notification of the decision</li>
              <li>• This page will update automatically when status changes</li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="text-sm text-gray-500">
            <p>If you have questions about your submission, please contact the administrator.</p>
          </div>
        </div>
      </div>
    );
  }

  // Show completed state if job is completed
  if (orderDetails.jobCompleted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          {/* Completed Icon */}
          <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Completed Message */}
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Job Completed!</h1>
          <p className="text-gray-600 mb-4">
            <strong>Order #{orderDetails.orderNumber}</strong>
          </p>
          <p className="text-gray-600 mb-6">
            This digitization job has been completed and the files have been uploaded. 
            The link is no longer active.
          </p>

          {/* Job Details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-medium text-gray-900 mb-2">Job Summary:</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Digitizer:</strong> {orderDetails.digitizerName}</p>
              <p><strong>Customer:</strong> {orderDetails.customerName}</p>
              <p><strong>Custom Designs:</strong> {orderDetails.customItemsCount}</p>
              <p><strong>Order Date:</strong> {formatDate(orderDetails.createdAt)}</p>
            </div>
          </div>

          {/* Contact Info */}
          <div className="text-sm text-gray-500">
            <p>If you need to access this job again, please contact the administrator.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Digitization Job Request</h1>
              <p className="text-gray-600 mt-1">Order #{orderDetails.orderNumber} • {formatDate(orderDetails.createdAt)}</p>
              <p className="text-gray-600">Customer: {orderDetails.customerName}</p>
              <p className="text-gray-600">{orderDetails.customerEmail}</p>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-sm text-gray-500">{orderDetails.customItemsCount} custom design{orderDetails.customItemsCount !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Design Items */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Custom Design Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {orderDetails.pixelMeItems.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Design Preview */}
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

                {/* Item Details */}
                <div className="p-4 space-y-3">
                  <h3 className="font-medium text-gray-900">{item.title}</h3>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Quantity:</span>
                      <span className="font-medium text-gray-900">{item.quantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Price:</span>
                      <span className="font-medium text-gray-900">${parseFloat(item.price).toFixed(2)}</span>
                    </div>
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
                    <div className="flex justify-between">
                      <span className="text-gray-500">Embroidery Size:</span>
                      <span className="font-medium text-purple-600">{item.designSize}</span>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">Original Design URL:</p>
                    <a 
                      href={item.customDesignUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-purple-600 hover:text-purple-700 break-all"
                    >
                      {item.customDesignUrl}
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Digitizer Rules */}
          {digitizerRules && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Important Guidelines</h3>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="whitespace-pre-wrap text-sm text-gray-700">
                  {digitizerRules}
                </div>
              </div>
              
              <div className="flex items-center text-sm text-gray-600">
                <svg className="w-4 h-4 mr-1 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L5.232 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Please review these guidelines carefully before accepting the job.
              </div>
            </div>
          )}

          {/* Action Section */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            {!orderDetails.jobAccepted ? (
              // Job not accepted - show acceptance form
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">
                    By accepting this job, you confirm that you can digitize these designs for embroidery production.
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    The order status will be updated to "Assigned" and the customer will be notified.
                  </p>
                </div>
                
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <label htmlFor="digitizerName" className="block text-sm font-medium text-gray-700 mb-2">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      id="digitizerName"
                      value={digitizerName}
                      onChange={(e) => setDigitizerName(e.target.value)}
                      placeholder="Enter your name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-black"
                      disabled={accepting}
                    />
                  </div>
                  
                  <button
                    onClick={acceptJob}
                    disabled={accepting || !digitizerName.trim()}
                    className={`px-8 py-3 rounded-lg font-medium text-white ${
                      accepting || !digitizerName.trim()
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {accepting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block mr-2"></div>
                        Accepting Job...
                      </>
                    ) : (
                      'Accept Digitization Job'
                    )}
                  </button>
                </div>
              </div>
            ) : !orderDetails.jobApproved ? (
              // Job accepted but not approved - show pending state or modification requests
              <div className="space-y-4">
                {orderDetails.modificationsRequested && orderDetails.modificationMessage ? (
                  // Show modification request prominently
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L5.232 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-red-800 font-medium mb-2">
                          🔄 Modifications Requested by Admin
                        </p>
                        <div className="bg-white border border-red-200 rounded-lg p-3 mb-3">
                          <p className="text-sm font-medium text-gray-900 mb-1">Admin Message:</p>
                          <p className="text-gray-800 text-sm whitespace-pre-wrap">{orderDetails.modificationMessage}</p>
                        </div>
                        <p className="text-red-700 text-sm">
                          Please review the feedback above and make the requested changes. The job status has been reset to allow you to resubmit.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Show normal pending state
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-amber-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L5.232 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <div>
                        <p className="text-amber-800 font-medium">
                          Job Accepted - Pending Admin Approval
                        </p>
                        <p className="text-amber-700 text-sm">
                          Thank you {orderDetails.digitizerName}! Your request has been submitted and is waiting for admin approval.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="text-center">
                    {orderDetails.modificationsRequested && orderDetails.modificationMessage ? (
                      // Show modification-specific guidance
                      <>
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </div>
                        
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Action Required: Make Modifications</h3>
                        <p className="text-gray-600 mb-4">
                          The admin has reviewed your work and requested specific changes. Please address the feedback above and resubmit when ready.
                        </p>
                        
                        <div className="bg-red-50 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-2">Next Steps:</h4>
                          <ul className="text-sm text-gray-600 space-y-1 text-left">
                            <li>• Review the admin's message above carefully</li>
                            <li>• Make the requested modifications to your work</li>
                            <li>• Upload your revised files when ready</li>
                            <li>• Admin will review the updated submission</li>
                          </ul>
                        </div>
                      </>
                    ) : (
                      // Show normal waiting state guidance
                      <>
                        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Waiting for Admin Approval</h3>
                        <p className="text-gray-600 mb-4">
                          The admin will review your request and either approve the job or request modifications.
                          You will be able to start working once the job is approved.
                        </p>
                        
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-2">What happens next?</h4>
                          <ul className="text-sm text-gray-600 space-y-1 text-left">
                            <li>• Admin will review the job requirements</li>
                            <li>• You'll receive approval to start work, or</li>
                            <li>• Admin may request modifications to the requirements</li>
                            <li>• This page will update automatically when status changes</li>
                          </ul>
                        </div>
                      </>
                    )}
                    
                    <div className="mt-4 flex items-center justify-center text-sm text-gray-500">
                      <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse mr-2"></div>
                      Checking for updates every 10 seconds...
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Job approved - show upload interface
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <div>
                      <p className="text-green-800 font-medium">
                        Job Accepted by {orderDetails.digitizerName}
                      </p>
                      <p className="text-green-700 text-sm">
                        You can now upload your finished digitization files below.
                      </p>
                    </div>
                  </div>
                </div>

                {/* File Upload Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Upload Digitization Files</h3>
                  
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors">
                    <div className="text-center">
                      <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <div className="mb-2">
                        <label htmlFor="file-upload" className="cursor-pointer">
                          <span className="text-purple-600 hover:text-purple-700 font-medium">
                            Click to select files
                          </span>
                          <span className="text-gray-500"> or drag and drop</span>
                        </label>
                        <input
                          id="file-upload"
                          type="file"
                          multiple
                          onChange={handleFileSelect}
                          className="sr-only"
                          accept=".dst,.exp,.pes,.jef,.vp3,.xxx,.emb,.hus,.pcs,.sew,.vip,.art,.csd,.dat,.emd,.gnc,.inb,.ksm,.pxf,.tap,.tbf"
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        Supported formats: DST, EXP, PES, JEF, VP3, XXX, EMB, HUS, PCS, SEW, VIP, and more
                      </p>
                    </div>
                  </div>

                  {/* Selected Files */}
                  {selectedFiles.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900">Selected Files ({selectedFiles.length})</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                                <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                              </div>
                            </div>
                            <button
                              onClick={() => removeFile(index)}
                              className="p-1 text-red-500 hover:text-red-700 rounded-full hover:bg-red-50"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upload Note */}
                  <div>
                    <label htmlFor="uploadNote" className="block text-sm font-medium text-gray-700 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      id="uploadNote"
                      value={uploadNote}
                      onChange={(e) => setUploadNote(e.target.value)}
                      placeholder="Add any notes about the digitization files..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-black"
                    />
                  </div>

                  {/* Upload Button */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={uploadFiles}
                      disabled={uploading || selectedFiles.length === 0}
                      className={`px-6 py-3 rounded-lg font-medium text-white ${
                        uploading || selectedFiles.length === 0
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-purple-600 hover:bg-purple-700'
                      }`}
                    >
                      {uploading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block mr-2"></div>
                          Uploading Files...
                        </>
                      ) : (
                        `Upload ${selectedFiles.length > 0 ? selectedFiles.length : ''} File${selectedFiles.length !== 1 ? 's' : ''}`
                      )}
                    </button>

                    {uploadMessage && (
                      <span className={`text-sm ${
                        uploadMessage.includes('success') ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {uploadMessage}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}