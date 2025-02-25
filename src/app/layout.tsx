import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'QuinScribe - Voice to SOP',
  description: 'Convert voice recordings into professional Standard Operating Procedures',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-[url('/subtle-pattern.png')] bg-repeat`}>
        <Navbar />
        <div className="pt-16 pb-16">
          {children}
        </div>
        <footer className="border-t border-blue-100 bg-white py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center mb-4 md:mb-0">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 font-bold text-lg">QuinScribe</span>
                <span className="mx-2 text-gray-300">|</span>
                <span className="text-gray-500 text-sm">Voice to SOP Converter</span>
              </div>
              <div className="text-sm text-gray-500">
                &copy; {new Date().getFullYear()} LionLoop Media. All rights reserved.
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
