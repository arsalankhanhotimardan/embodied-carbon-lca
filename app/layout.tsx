import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import MobileNav from "@/components/MobileNav";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

const siteUrl = "https://greenengineeringtools.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: "Free Embodied Carbon Calculator | Green Engineering Tools",
    template: "%s | Green Engineering Tools",
  },

  description:
    "Free embodied carbon and whole-building LCA tools for construction. Upload CSV/BIM quantities, work with EPD data, compare lifecycle scenarios, and explore EC3 material workflows.",

  authors: [
    {
      name: "Engr. Arsalan Khan",
      url: siteUrl,
    },
  ],

  creator: "Green Engineering Tools",
  publisher: "Green Engineering Tools",

  openGraph: {
    title: "Free Embodied Carbon Calculator | Green Engineering Tools",
    description:
      "Embodied carbon, EPD, BIM and whole-building LCA tools for construction professionals, engineers, architects and students.",
    url: siteUrl,
    siteName: "Green Engineering Tools",
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Free Embodied Carbon Calculator | Green Engineering Tools",
    description:
      "Calculate embodied carbon from construction quantities, EPD data and lifecycle modules.",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

const footerGuideLinks = [
  { href: "/embodied-carbon-calculator", label: "Embodied Carbon Calculator" },
  { href: "/a1-a3-embodied-carbon", label: "A1-A3 Embodied Carbon" },
  { href: "/epd-carbon-calculator", label: "EPD Carbon Calculator" },
  { href: "/ec3-epd-guide", label: "EC3 EPD Guide" },
  { href: "/bim-embodied-carbon", label: "BIM Embodied Carbon" },
  { href: "/whole-building-lca", label: "Whole-Building LCA" },
  { href: "/module-d-lca", label: "Module D Explained" },
  { href: "/leed-whole-building-lca", label: "LEED Whole-Building LCA" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} flex min-h-screen w-full min-w-0 flex-col overflow-x-hidden bg-slate-50 text-slate-900`}
      >
        {/* GLOBAL HEADER */}
        <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white shadow-sm">
          <nav aria-label="Main navigation">
            <div className="mx-auto w-full max-w-7xl px-3 sm:px-6 lg:px-8">
              <div className="flex h-16 min-w-0 items-center justify-between gap-2 sm:h-20 sm:gap-4">
                {/* LOGO */}
                <Link
                  href="/"
                  aria-label="Green Engineering Tools home"
                  className="flex min-w-0 max-w-[calc(100%-3.25rem)] items-center sm:max-w-none"
                >
                  <div className="mr-2 shrink-0 rounded-lg bg-emerald-500 p-1.5 shadow-inner shadow-emerald-700/50 sm:mr-3 sm:p-2">
                    <svg
                      className="h-6 w-6 text-white sm:h-7 sm:w-7"
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

                  <span className="min-w-0 truncate text-[15px] font-black tracking-tight text-slate-900 min-[360px]:text-base sm:text-2xl">
                    GreenEngineering
                    <span className="text-emerald-600">LCA</span>
                  </span>
                </Link>

                {/* DESKTOP MENU */}
                <div className="hidden items-center gap-5 lg:flex xl:gap-6">
                  <Link
                    href="/"
                    className="whitespace-nowrap text-sm font-bold text-slate-600 transition-colors hover:text-emerald-600"
                  >
                    The Engine
                  </Link>

                  <Link
                    href="/cbam-calculator"
                    className="whitespace-nowrap text-sm font-bold text-slate-600 transition-colors hover:text-emerald-600"
                  >
                    CBAM Estimator
                  </Link>

                  <Link
                    href="/guides"
                    className="whitespace-nowrap text-sm font-bold text-slate-600 transition-colors hover:text-emerald-600"
                  >
                    Guides
                  </Link>

                  <Link
                    href="/methodology"
                    className="whitespace-nowrap text-sm font-bold text-slate-600 transition-colors hover:text-emerald-600"
                  >
                    Methodology
                  </Link>

                  <Link
                    href="/about"
                    className="whitespace-nowrap text-sm font-bold text-slate-600 transition-colors hover:text-emerald-600"
                  >
                    About
                  </Link>

                  <Link
                    href="/contact"
                    className="whitespace-nowrap text-sm font-bold text-slate-600 transition-colors hover:text-emerald-600"
                  >
                    Contact
                  </Link>

                  <Link
                    href="/#calculator-workspace"
                    className="whitespace-nowrap rounded-md bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-slate-800"
                  >
                    Launch Workspace
                  </Link>
                </div>

                <MobileNav />
              </div>
            </div>
          </nav>
        </header>

        {/* PAGE CONTENT
            min-w-0 + overflow-x-clip prevents wide tables/cards from pushing
            the entire mobile viewport sideways. Individual data tables should
            still use their own overflow-x-auto wrappers where needed. */}
        <main className="w-full min-w-0 flex-1 overflow-x-clip">{children}</main>

        {/* GLOBAL FOOTER */}
        <footer className="mt-auto w-full border-t border-slate-800 bg-slate-950 text-slate-400">
          <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
            <div className="grid grid-cols-1 gap-8 text-center sm:grid-cols-2 sm:text-left lg:grid-cols-5 lg:gap-8">
              {/* BRAND */}
              <div className="sm:col-span-2 lg:col-span-1">
                <Link href="/" className="inline-flex items-center justify-center sm:justify-start">
                  <svg
                    className="mr-2 h-7 w-7 shrink-0 text-emerald-500"
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

                  <span className="font-black tracking-tight text-white">
                    GreenEngineering Tools
                  </span>
                </Link>

                <p className="mx-auto mt-4 max-w-xs text-sm leading-6 text-slate-400 sm:mx-0">
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
                  <Link href="/" className="block hover:text-white">
                    LCA Engine
                  </Link>
                  <Link href="/cbam-calculator" className="block hover:text-white">
                    CBAM Estimator
                  </Link>
                  <Link href="/cbam-calculator/actual-data" className="block hover:text-white">
                    Actual / Complex Goods
                  </Link>
                  <Link href="/cbam-calculator/electricity" className="block hover:text-white">
                    CBAM Electricity
                  </Link>
                  <Link href="/cbam-calculator/bulk" className="block hover:text-white">
                    Official Bulk CSV
                  </Link>
                </nav>
              </div>

              {/* LEARN */}
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-white">
                  Learn
                </h2>
                <nav className="mt-4 space-y-3 text-sm" aria-label="Footer learning navigation">
                  {footerGuideLinks.slice(0, 4).map((item) => (
                    <Link key={item.href} href={item.href} className="block hover:text-white">
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
                    <Link key={item.href} href={item.href} className="block hover:text-white">
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
                  <Link href="/about" className="block hover:text-white">
                    About Us
                  </Link>
                  <Link href="/contact" className="block hover:text-white">
                    Contact
                  </Link>
                  <Link href="/privacy-policy" className="block hover:text-white">
                    Privacy Policy
                  </Link>
                  <Link href="/terms-of-service" className="block hover:text-white">
                    Terms of Service
                  </Link>
                </nav>
              </div>
            </div>

            <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-800 pt-7 md:flex-row">
              <p className="text-center text-xs text-slate-500 md:text-left">
                &copy; {new Date().getFullYear()} Green Engineering Tools. All rights reserved.
              </p>

              <p className="max-w-2xl text-center text-xs leading-5 text-slate-500 md:text-right">
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
