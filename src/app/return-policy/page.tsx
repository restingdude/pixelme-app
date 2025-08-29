import Link from 'next/link';
import Image from 'next/image';

export default function ReturnPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-center">
          <Link href="/" className="inline-block">
            <Image 
              src="/logo.png" 
              alt="PixelMe" 
              width={120} 
              height={40}
              className="hover:opacity-80 transition-opacity"
            />
          </Link>
        </div>
      </header>

      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Return Policy</h1>
          
          <div className="prose prose-gray max-w-none">
            <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-4">Custom Product Returns</h2>
            <p className="text-gray-600 mb-4">
              Since all PixelMe products are custom-made with your personalized design, we have a specific return policy 
              to ensure fairness while maintaining quality standards.
            </p>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Returns We Accept</h3>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Items damaged during shipping</li>
              <li>Items with manufacturing defects</li>
              <li>Items that significantly differ from the preview shown during ordering</li>
              <li>Wrong size or color sent (our error)</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Returns We Cannot Accept</h3>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Change of mind or customer preference</li>
              <li>Custom designs that match the preview but customer dislikes the result</li>
              <li>Size issues due to incorrect size selection by customer</li>
              <li>Items worn, washed, or damaged by customer</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Return Process</h3>
            <ol className="list-decimal pl-6 text-gray-600 space-y-2">
              <li>Contact our support team within 7 days of receiving your order</li>
              <li>Provide photos of the issue (for damaged or defective items)</li>
              <li>We'll review your case and provide return instructions if approved</li>
              <li>Send the item back in original packaging (if applicable)</li>
              <li>Refund or replacement will be processed once we receive the item</li>
            </ol>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Refund Timeline</h3>
            <p className="text-gray-600 mb-4">
              Approved refunds will be processed within 5-10 business days and returned to your original payment method. 
              Please note that it may take additional time for your bank or credit card company to process the refund.
            </p>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Contact Information</h3>
            <p className="text-gray-600 mb-2">
              For return requests or questions about our return policy, please contact us:
            </p>
            <ul className="text-gray-600 space-y-1">
              <li>Email: help@pixelme.store</li>
              <li>Response time: Within 24 hours</li>
            </ul>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
              <p className="text-blue-800 text-sm">
                <strong>Note:</strong> This return policy applies to all custom clothing items created through PixelMe. 
                We reserve the right to update this policy at any time. Please review before placing your order.
              </p>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
