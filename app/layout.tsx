import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

const siteUrl = 'https://greenengineeringtools.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: 'Free Embodied Carbon Calculator | Green Engineering Tools',
    template: '%s | Green Engineering Tools',
  },

  description:
    'Free embodied carbon and whole-building LCA tools for construction. Upload CSV/BIM quantities, work with EPD data, compare lifecycle scenarios, and explore EC3 material workflows.',

  authors: [
    {
      name: 'Engr. Arsalan Khan',
      url: siteUrl,
    },
  ],

  creator: 'Green Engineering Tools',
  publisher: 'Green Engineering Tools',

  alternates: {
    canonical: '/',
  },

  openGraph: {
    title: 'Free Embodied Carbon Calculator | Green Engineering Tools',
    description:
      'Embodied carbon, EPD, BIM and whole-building LCA tools for construction professionals, engineers, architects and students.',
    url: siteUrl,
    siteName: 'Green Engineering Tools',
    locale: 'en_US',
    type: 'website',
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Free Embodied Carbon Calculator | Green Engineering Tools',
    description:
      'Calculate embodied carbon from construction quantities, EPD data and lifecycle modules.',
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
};

const footerGuideLinks = [
  { href: '/embodied-carbon-calculator', label: 'Embodied Carbon Calculator' },
  { href: '/a1-a3-embodied-carbon', label: 'A1-A3 Embodied Carbon' },
  { href: '/epd-carbon-calculator', label: 'EPD Carbon Calculator' },
  { href: '/ec3-epd-guide', label: 'EC3 EPD Guide' },
  { href: '/bim-embodied-carbon', label: 'BIM Embodied Carbon' },
  { href: '/whole-building-lca', label: 'Whole-Building LCA' },
  { href: '/module-d-lca', label: 'Module D Explained' },
  { href: '/leed-whole-building-lca', label: 'LEED Whole-Building LCA' },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen flex flex-col bg-slate-50`}>

        {/* GLOBAL HEADER */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm w-full">
          <nav aria-label="Main navigation">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-20">

                {/* LOGO */}
                <Link
                  href="/"
                  aria-label="Green Engineering Tools home"
                  className="flex items-center cursor-pointer z-50 shrink-0"
                >
                  <div className="bg-emerald-500 p-2 rounded-lg mr-2 sm:mr-3 shadow-inner shadow-emerald-700/50">
                    <svg
                      className="w-6 h-6 sm:w-7 sm:h-7 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.5"
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                  </div>

                  <span className="font-black text-lg sm:text-2xl tracking-tight text-slate-900">
                    GreenEngineering
                    <span className="text-emerald-600">LCA</span>
                  </span>
                </Link>

                {/* DESKTOP MENU */}
                <div className="hidden lg:flex items-center gap-6">
                  <Link
                    href="/"
                    className="text-sm font-bold transition-colors text-slate-600 hover:text-emerald-600"
                  >
                    The Engine
                  </Link>

                  <Link
                    href="/cbam-calculator"
                    className="text-sm font-bold transition-colors text-slate-600 hover:text-emerald-600"
                  >
                    CBAM Estimator
                  </Link>

                  <Link
                    href="/guides"
                    className="text-sm font-bold transition-colors text-slate-600 hover:text-emerald-600"
                  >
                    Guides
                  </Link>

                  <Link
                    href="/methodology"
                    className="text-sm font-bold transition-colors text-slate-600 hover:text-emerald-600"
                  >
                    Methodology
                  </Link>

                  <Link
                    href="/about"
                    className="text-sm font-bold transition-colors text-slate-600 hover:text-emerald-600"
                  >
                    About
                  </Link>

                  <Link
                    href="/contact"
                    className="text-sm font-bold transition-colors text-slate-600 hover:text-emerald-600"
                  >
                    Contact
                  </Link>

                  <Link
                    href="/#calculator-workspace"
                    className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-md text-sm font-bold shadow-md transition-all whitespace-nowrap"
                  >
                    Launch Workspace
                  </Link>
                </div>

                {/* MOBILE / TABLET HAMBURGER MENU */}
                <details className="lg:hidden group relative">
                  <summary
                    aria-label="Open navigation menu"
                    className="list-none cursor-pointer p-2 text-slate-600 hover:text-emerald-600 focus:outline-none transition-colors"
                  >
                    <svg
                      className="w-7 h-7 block group-open:hidden"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.5"
                        d="M4 6h16M4 12h16M4 18h16"
                      />
                    </svg>

                    <svg
                      className="w-7 h-7 hidden group-open:block"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.5"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </summary>

                  {/* Mobile Dropdown Panel */}
                  <div className="fixed top-20 left-0 right-0 max-h-[calc(100vh-5rem)] overflow-y-auto bg-white border-b border-slate-200 shadow-xl z-40">
                    <div className="max-w-7xl mx-auto px-5 sm:px-6 py-6">
                      <div className="grid gap-1">
                        {/* PRIMARY MOBILE TOOLS */}
                        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                          <div className="px-2 pb-2 text-[11px] font-black uppercase tracking-widest text-slate-400">
                            Calculators
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Link
                              href="/#calculator-workspace"
                              className="rounded-lg bg-slate-900 px-4 py-3.5 text-center text-sm font-black text-white hover:bg-slate-800 transition-colors"
                            >
                              LCA Calculator
                            </Link>

                            <Link
                              href="/cbam-calculator"
                              className="rounded-lg bg-emerald-600 px-4 py-3.5 text-center text-sm font-black text-white hover:bg-emerald-500 transition-colors"
                            >
                              CBAM Calculator
                            </Link>
                          </div>
                        </div>

                        <Link
                          href="/"
                          className="mt-2 rounded-lg px-3 py-3 text-base font-bold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50"
                        >
                          The Engine
                        </Link>

                        <Link
                          href="/cbam-calculator"
                          className="rounded-lg px-3 py-3 text-base font-bold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50"
                        >
                          CBAM Calculator
                        </Link>

                        <Link
                          href="/guides"
                          className="rounded-lg px-3 py-3 text-base font-bold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50"
                        >
                          LCA Guides
                        </Link>

                        <Link
                          href="/methodology"
                          className="rounded-lg px-3 py-3 text-base font-bold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50"
                        >
                          Methodology
                        </Link>

                        {/* Mobile learning shortcuts */}
                        <div className="mt-2 rounded-xl bg-slate-50 border border-slate-200 p-3">
                          <div className="px-2 pb-2 text-[11px] font-black uppercase tracking-widest text-slate-400">
                            Popular learning guides
                          </div>

                          <Link
                            href="/embodied-carbon-calculator"
                            className="block rounded-lg px-2 py-2.5 text-sm font-semibold text-slate-600 hover:text-emerald-700 hover:bg-white"
                          >
                            Embodied Carbon Calculator Guide
                          </Link>

                          <Link
                            href="/a1-a3-embodied-carbon"
                            className="block rounded-lg px-2 py-2.5 text-sm font-semibold text-slate-600 hover:text-emerald-700 hover:bg-white"
                          >
                            A1-A3 Embodied Carbon
                          </Link>

                          <Link
                            href="/epd-carbon-calculator"
                            className="block rounded-lg px-2 py-2.5 text-sm font-semibold text-slate-600 hover:text-emerald-700 hover:bg-white"
                          >
                            EPD Carbon Calculator
                          </Link>

                          <Link
                            href="/whole-building-lca"
                            className="block rounded-lg px-2 py-2.5 text-sm font-semibold text-slate-600 hover:text-emerald-700 hover:bg-white"
                          >
                            Whole-Building LCA
                          </Link>
                        </div>

                        <Link
                          href="/about"
                          className="mt-2 rounded-lg px-3 py-3 text-base font-bold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50"
                        >
                          About Us
                        </Link>

                        <Link
                          href="/contact"
                          className="rounded-lg px-3 py-3 text-base font-bold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50"
                        >
                          Contact
                        </Link>
                      </div>

                      <div className="pt-5 mt-4 border-t border-slate-200">
                        <Link
                          href="/#calculator-workspace"
                          className="block text-center bg-slate-900 hover:bg-slate-800 text-white px-5 py-4 rounded-lg text-base font-bold shadow-md transition-all"
                        >
                          Launch LCA Workspace
                        </Link>
                      </div>
                    </div>
                  </div>
                </details>

              </div>
            </div>
          </nav>
        </header>

        {/* PAGE CONTENT */}
        <div className="flex-1">
          {children}
        </div>

        {/* GLOBAL FOOTER */}
        <footer className="bg-slate-950 text-slate-400 border-t border-slate-800 w-full mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-14">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-9 lg:gap-8">

              {/* BRAND */}
              <div className="sm:col-span-2 lg:col-span-1">
                <Link href="/" className="inline-flex items-center">
                  <svg
                    className="w-7 h-7 text-emerald-500 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>

                  <span className="font-black text-white tracking-tight">
                    GreenEngineering Tools
                  </span>
                </Link>

                <p className="mt-4 max-w-xs text-sm leading-6 text-slate-400">
                  Browser-based tools and practical guides for embodied carbon,
                  EPD data, BIM material workflows and whole-building life-cycle assessment.
                </p>

                <Link
                  href="/#calculator-workspace"
                  className="mt-5 inline-flex text-sm font-black text-emerald-400 hover:text-emerald-300"
                >
                  Open LCA calculator →
                </Link>
              </div>

              {/* TOOLS */}
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-white">
                  Tools
                </h2>
                <nav className="mt-4 space-y-3 text-sm" aria-label="Footer tools navigation">
                  <Link href="/" className="block hover:text-white transition-colors">
                    LCA Engine
                  </Link>
                  <Link href="/cbam-calculator" className="block hover:text-white transition-colors">
                    CBAM Estimator
                  </Link>
                  <Link href="/methodology" className="block hover:text-white transition-colors">
                    Methodology
                  </Link>
                  <Link href="/guides" className="block hover:text-white transition-colors">
                    All Guides
                  </Link>
                </nav>
              </div>

              {/* LEARN */}
              <div className="sm:col-span-2 lg:col-span-1">
                <h2 className="text-xs font-black uppercase tracking-widest text-white">
                  Learn
                </h2>
                <nav className="mt-4 space-y-3 text-sm" aria-label="Footer learning navigation">
                  {footerGuideLinks.slice(0, 4).map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block hover:text-white transition-colors"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>

              {/* MORE GUIDES */}
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-white">
                  More Guides
                </h2>
                <nav className="mt-4 space-y-3 text-sm" aria-label="Footer additional guides">
                  {footerGuideLinks.slice(4).map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block hover:text-white transition-colors"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>

              {/* COMPANY / LEGAL */}
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-white">
                  Company
                </h2>
                <nav className="mt-4 space-y-3 text-sm" aria-label="Footer company navigation">
                  <Link href="/about" className="block hover:text-white transition-colors">
                    About Us
                  </Link>
                  <Link href="/contact" className="block hover:text-white transition-colors">
                    Contact
                  </Link>
                  <Link href="/privacy-policy" className="block hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                  <Link href="/terms" className="block hover:text-white transition-colors">
                    Terms
                  </Link>
                </nav>
              </div>
            </div>

            <div className="mt-10 pt-7 border-t border-slate-800 flex flex-col md:flex-row gap-4 justify-between items-center">
              <p className="text-xs text-slate-500 text-center md:text-left">
                &copy; {new Date().getFullYear()} Green Engineering Tools. All rights reserved.
              </p>

              <p className="max-w-2xl text-xs leading-5 text-slate-500 text-center md:text-right">
                Engineering decision-support tools for EN 15804-aligned lifecycle analysis
                and LEED whole-building LCA workflows. Formal certification and compliance
                remain subject to project-specific requirements and independent review.
              </p>
            </div>
          </div>
        </footer>

      </body>
    </html>
  );
}