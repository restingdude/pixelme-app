'use client';

import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Footer Content */}
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-6 sm:space-y-0">
          
          {/* Brand & Copyright */}
          <div className="text-center sm:text-left">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">PixelMe</h3>
            <p className="text-gray-500 text-sm">© {currentYear} All rights reserved.</p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <Link href="/return-policy" className="text-gray-600 hover:text-gray-900 transition-colors">
              Return Policy
            </Link>
            <Link href="/privacy-policy" className="text-gray-600 hover:text-gray-900 transition-colors">
              Privacy
            </Link>
            <Link href="/terms-of-service" className="text-gray-600 hover:text-gray-900 transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
