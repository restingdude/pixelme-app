'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function DigitizerSuccess() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {/* Success Icon */}
        <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Success Message */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Job Accepted!</h1>
        <p className="text-gray-600 mb-6">
          Thank you for accepting the digitization job. The order status has been updated and the customer will be notified.
        </p>

        {/* Next Steps */}
        <div className="text-left bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-gray-900 mb-2">Next Steps:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Download and review the custom design files</li>
            <li>• Create the embroidery digitization files</li>
            <li>• Test the digitization for quality</li>
            <li>• Deliver the completed files to the client</li>
          </ul>
        </div>

        {/* Contact Info */}
        <div className="text-sm text-gray-500 mb-6">
          <p>If you have any questions about this job, please contact the administrator.</p>
        </div>

        {/* Action Button */}
        <button
          onClick={() => window.close()}
          className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
        >
          Close Window
        </button>
      </div>
    </div>
  );
}