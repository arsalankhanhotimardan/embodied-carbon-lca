import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Green Engineering Tools | Enterprise LCA & Embodied Carbon Calculator',
  description: 'Calculate embodied carbon, reconcile EC3 databases, and generate LEED v4 compliance matrices with our EN-15804 compliant Life Cycle Assessment software.',
  keywords: ['LCA software', 'embodied carbon calculator', 'LEED v4 compliance', 'EC3 database integration', 'BIM Revit LCA', 'sustainable architecture', 'Module D circular economy'],
  authors: [{ name: 'Engr. Arsalan Khan', url: 'https://greenengineeringtools.com' }],
  openGraph: {
    title: 'Green Engineering Tools | LCA Software',
    description: 'Enterprise Embodied Carbon Calculator for modern architectural engineering.',
    url: 'https://greenengineeringtools.com',
    siteName: 'Green Engineering Tools',
    locale: 'en_US',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen flex flex-col bg-slate-50`}>
        {/* GLOBAL HEADER */}
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-20">
              <Link href="/" className="flex items-center cursor-pointer">
                <div className="bg-emerald-500 p-2 rounded-lg mr-3 shadow-inner shadow-emerald-700/50">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                </div>
                <span className="font-black text-2xl tracking-tight text-slate-900">GreenEngineering<span className="text-emerald-600">LCA</span></span>
              </Link>
              <div className="hidden md:flex items-center space-x-8">
                <Link href="/" className="text-sm font-bold transition-colors text-slate-600 hover:text-emerald-600">The Engine</Link>
                <Link href="/about" className="text-sm font-bold transition-colors text-slate-600 hover:text-emerald-600">About Us</Link>
                <Link href="/contact" className="text-sm font-bold transition-colors text-slate-600 hover:text-emerald-600">Contact</Link>
                <Link href="/#calculator-workspace" className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-md text-sm font-bold shadow-md transition-all">Launch Workspace</Link>
              </div>
            </div>
          </div>
        </nav>

        {/* PAGE CONTENT */}
        <div className="flex-1">
          {children}
        </div>

        {/* GLOBAL FOOTER */}
        <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800 w-full mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center mb-6 md:mb-0">
                <svg className="w-6 h-6 text-emerald-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                <span className="font-bold text-white tracking-tight">GreenEngineering Tools</span>
              </div>
              <div className="flex flex-wrap justify-center gap-6 text-sm font-semibold">
                  <Link href="/" className="hover:text-white transition-colors">Home</Link>
                  <Link href="/about" className="hover:text-white transition-colors">About Us</Link>
                  <Link href="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link>
                  <Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
                  <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
              </div>
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 text-center text-xs text-slate-600">
              &copy; {new Date().getFullYear()} Green Engineering Tools. All rights reserved. Compliant with EN 15804 and LEED v4 assessment standards.
          </div>
        </footer>
      </body>
    </html>
  );
}