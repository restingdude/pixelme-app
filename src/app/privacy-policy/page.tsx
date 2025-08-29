import Link from 'next/link';
import Image from 'next/image';

export default function PrivacyPolicy() {
  const lastUpdated = "January 2025";

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
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-gray-500 mb-8">Last updated: {lastUpdated}</p>
          
          <div className="prose prose-gray max-w-none">
            <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-4">Information We Collect</h2>
            
            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Personal Information</h3>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Name and contact information for order processing</li>
              <li>Shipping address for product delivery</li>
              <li>Payment information (processed securely through our payment providers)</li>
              <li>Email address for order updates and customer support</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Images and Design Data</h3>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Photos you upload for custom design creation</li>
              <li>Style preferences and design choices</li>
              <li>Generated cartoon/anime versions of your images</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Automatically Collected Information</h3>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Browser type and device information</li>
              <li>IP address and location data</li>
              <li>Usage patterns and site interactions</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-800 mt-8 mb-4">How We Use Your Information</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Process and fulfill your custom clothing orders</li>
              <li>Create personalized cartoon/anime designs from your photos</li>
              <li>Communicate about your orders and provide customer support</li>
              <li>Improve our AI conversion technology and user experience</li>
              <li>Send marketing communications (with your consent)</li>
              <li>Comply with legal obligations and prevent fraud</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-800 mt-8 mb-4">Data Storage and Security</h2>
            <p className="text-gray-600 mb-4">
              We implement industry-standard security measures to protect your personal information and uploaded images. 
              Your data is stored securely and accessed only by authorized personnel for legitimate business purposes.
            </p>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Image Retention</h3>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Original uploaded photos are deleted after successful order completion</li>
              <li>Processed design images are retained for order fulfillment and customer service</li>
              <li>You can request deletion of your design data at any time</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-800 mt-8 mb-4">Information Sharing</h2>
            <p className="text-gray-600 mb-4">We do not sell, trade, or rent your personal information. We may share data with:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Payment processors for secure transaction handling</li>
              <li>Shipping partners for order delivery</li>
              <li>AI service providers for image processing (with strict privacy agreements)</li>
              <li>Legal authorities when required by law</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-800 mt-8 mb-4">Your Rights</h2>
            <p className="text-gray-600 mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Access and review your personal data</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your data</li>
              <li>Opt out of marketing communications</li>
              <li>Request a copy of your data</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-800 mt-8 mb-4">Cookies</h2>
            <p className="text-gray-600 mb-4">
              We use cookies to enhance your browsing experience, remember your preferences, and analyze site usage. 
              You can control cookie settings through your browser preferences.
            </p>

            <h2 className="text-xl font-semibold text-gray-800 mt-8 mb-4">Contact Us</h2>
            <p className="text-gray-600 mb-2">
              If you have questions about this privacy policy or how we handle your data, please contact us:
            </p>
            <ul className="text-gray-600 space-y-1">
              <li>Email: help@pixelme.store</li>
              <li>Response time: Within 72 hours</li>
            </ul>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6">
              <p className="text-amber-800 text-sm">
                <strong>Important:</strong> We may update this privacy policy periodically. Any changes will be posted 
                on this page with an updated "Last modified" date. Your continued use of our service constitutes 
                acceptance of any changes.
              </p>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
