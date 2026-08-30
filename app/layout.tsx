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
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm w-full relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-20">
              
              {/* LOGO */}
              <Link href="/" className="flex items-center cursor-pointer z-50">
                <div className="bg-emerald-500 p-2 rounded-lg mr-2 sm:mr-3 shadow-inner shadow-emerald-700/50">
                  <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                </div>
                <span className="font-black text-xl sm:text-2xl tracking-tight text-slate-900">GreenEngineering<span className="text-emerald-600">LCA</span></span>
              </Link>

              {/* DESKTOP MENU (Hidden on Mobile) */}
              <div className="hidden md:flex items-center space-x-8">
                <Link href="/" className="text-sm font-bold transition-colors text-slate-600 hover:text-emerald-600">The Engine</Link>
                <Link href="/cbam-calculator" className="text-sm font-bold transition-colors text-slate-600 hover:text-emerald-600">CBAM Estimator</Link>
                <Link href="/about" className="text-sm font-bold transition-colors text-slate-600 hover:text-emerald-600">About Us</Link>
                <Link href="/contact" className="text-sm font-bold transition-colors text-slate-600 hover:text-emerald-600">Contact</Link>
                <Link href="/#calculator-workspace" className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-md text-sm font-bold shadow-md transition-all">Launch Workspace</Link>
              </div>

              {/* MOBILE HAMBURGER MENU (CSS-Only, No JS Required) */}
              <details className="md:hidden group">
                <summary className="list-none cursor-pointer p-2 text-slate-600 hover:text-emerald-600 focus:outline-none transition-colors">
                  {/* Hamburger Icon */}
                  <svg className="w-7 h-7 block group-open:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" /></svg>
                  {/* Close (X) Icon */}
                  <svg className="w-7 h-7 hidden group-open:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                </summary>
                
                {/* Mobile Dropdown Panel */}
                <div className="absolute top-[80px] left-0 w-full bg-white border-b border-slate-200 shadow-xl flex flex-col px-6 py-6 space-y-5 z-40">
                  <Link href="/" className="text-lg font-bold text-slate-700 hover:text-emerald-600">The Engine</Link>
                  <Link href="/cbam-calculator" className="text-lg font-bold text-slate-700 hover:text-emerald-600">CBAM Estimator</Link>
                  <Link href="/about" className="text-lg font-bold text-slate-700 hover:text-emerald-600">About Us</Link>
                  <Link href="/contact" className="text-lg font-bold text-slate-700 hover:text-emerald-600">Contact</Link>
                  <div className="pt-4 border-t border-slate-100">
                    <Link href="/#calculator-workspace" className="block text-center bg-slate-900 hover:bg-slate-800 text-white px-5 py-4 rounded-lg text-lg font-bold shadow-md transition-all">Launch Workspace</Link>
                  </div>
                </div>
              </details>

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
              <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-sm font-semibold">
                  <Link href="/" className="hover:text-white transition-colors">The Engine</Link>
                  <Link href="/cbam-calculator" className="hover:text-white transition-colors">CBAM Estimator</Link>
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