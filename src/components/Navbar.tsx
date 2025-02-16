'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FaMicrophone } from 'react-icons/fa';

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 relative flex items-center justify-center bg-blue-500 rounded-lg">
                <FaMicrophone className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-semibold text-gray-900">QuinScribe</span>
            </Link>
          </div>
          
          <div className="flex items-center gap-4">
            <a
              href="https://makersuite.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Get API Key
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
} 