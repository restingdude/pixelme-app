import Link from 'next/link';
import Image from 'next/image';

export default function TermsOfService() {
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
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Terms of Service</h1>
          <p className="text-gray-500 mb-8">Last updated: {lastUpdated}</p>
          
          <div className="prose prose-gray max-w-none">
            <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-4">Agreement to Terms</h2>
            <p className="text-gray-600 mb-4">
              By using PixelMe services, you agree to these terms. If you do not agree to these terms, 
              please do not use our service.
            </p>

            <h2 className="text-xl font-semibold text-gray-800 mt-8 mb-4">Service Description</h2>
            <p className="text-gray-600 mb-4">
              PixelMe provides AI-powered image transformation services that convert your photos into cartoon/anime styles 
              and create custom clothing products featuring your personalized designs.
            </p>

            <h2 className="text-xl font-semibold text-gray-800 mt-8 mb-4">User Responsibilities</h2>
            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Acceptable Content</h3>
            <p className="text-gray-600 mb-2">You agree to only upload images that:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>You own or have permission to use</li>
              <li>Do not violate any laws or regulations</li>
              <li>Are not offensive, explicit, or inappropriate</li>
              <li>Do not infringe on others' intellectual property rights</li>
              <li>Are not misleading or fraudulent</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Prohibited Uses</h3>
            <p className="text-gray-600 mb-2">You may not:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Upload images of other people without their consent</li>
              <li>Create designs for commercial resale without proper licensing</li>
              <li>Use the service for any illegal or unauthorized purpose</li>
              <li>Attempt to reverse engineer or copy our AI technology</li>
              <li>Interfere with the proper functioning of our service</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-800 mt-8 mb-4">Intellectual Property</h2>
            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Your Content</h3>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>You retain ownership of your original uploaded images</li>
              <li>You grant PixelMe a license to process and transform your images</li>
              <li>Processed designs become your property for personal use</li>
              <li>You are responsible for ensuring you have rights to uploaded content</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Our Technology</h3>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>PixelMe retains all rights to our AI technology and processes</li>
              <li>Our style conversion algorithms are proprietary</li>
              <li>You may not attempt to copy or reproduce our technology</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-800 mt-8 mb-4">Orders and Payment</h2>
            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Custom Products</h3>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>All products are made-to-order based on your custom design</li>
              <li>Orders cannot be cancelled once production begins</li>
              <li>Production typically takes 5-10 business days</li>
              <li>Shipping times vary by location</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Pricing and Payment</h3>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>All prices are in AUD and include applicable taxes</li>
              <li>Payment is required at time of order</li>
              <li>We accept major credit cards and secure payment methods</li>
              <li>Prices may change without notice</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-800 mt-8 mb-4">Quality and Satisfaction</h2>
            <p className="text-gray-600 mb-4">
              While we strive for high-quality results, AI-generated designs may vary from expectations. 
              We provide preview images to help you make informed decisions before ordering.
            </p>

            <h2 className="text-xl font-semibold text-gray-800 mt-8 mb-4">Limitation of Liability</h2>
            <p className="text-gray-600 mb-4">
              PixelMe shall not be liable for any indirect, incidental, special, or consequential damages 
              arising from your use of our service. Our liability is limited to the amount you paid for the specific order.
            </p>

            <h2 className="text-xl font-semibold text-gray-800 mt-8 mb-4">Privacy</h2>
            <p className="text-gray-600 mb-4">
              Your privacy is important to us. Please review our Privacy Policy to understand how we collect, 
              use, and protect your personal information.
            </p>

            <h2 className="text-xl font-semibold text-gray-800 mt-8 mb-4">Termination</h2>
            <p className="text-gray-600 mb-4">
              We reserve the right to terminate or suspend access to our service for violations of these terms 
              or for any other reason at our discretion.
            </p>

            <h2 className="text-xl font-semibold text-gray-800 mt-8 mb-4">Changes to Terms</h2>
            <p className="text-gray-600 mb-4">
              We may update these terms from time to time. Changes will be posted on this page with an updated date. 
              Your continued use constitutes acceptance of any changes.
            </p>

            <h2 className="text-xl font-semibold text-gray-800 mt-8 mb-4">Contact Information</h2>
            <p className="text-gray-600 mb-2">
              If you have questions about these terms, please contact us:
            </p>
            <ul className="text-gray-600 space-y-1">
              <li>Email: help@pixelme.com</li>
              <li>Response time: Within 5 business days</li>
            </ul>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-6">
              <p className="text-red-800 text-sm">
                <strong>Governing Law:</strong> These terms are governed by Australian law. Any disputes will be 
                resolved in Australian courts.
              </p>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
