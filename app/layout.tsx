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
    "Free engineering tools for embodied carbon, whole-building LCA, EU CBAM and electrical calculations, with transparent methods for professionals, students and technical decision-making.",
  authors: [{ name: "Engr. Arsalan Khan", url: siteUrl }],
  creator: "Green Engineering Tools",
  publisher: "Green Engineering Tools",
  openGraph: {
    title: "Green Engineering Tools",
    description:
      "Free browser-based engineering calculators for carbon, CBAM, electrical systems and sustainable design.",
    url: siteUrl,
    siteName: "Green Engineering Tools",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Green Engineering Tools",
    description:
      "Free engineering calculators for embodied carbon, CBAM and electrical design.",
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

const lcaGuideLinks = [
  { href: "/embodied-carbon-calculator", label: "Embodied Carbon Calculator" },
  { href: "/a1-a3-embodied-carbon", label: "A1-A3 Embodied Carbon" },
  { href: "/epd-carbon-calculator", label: "EPD Carbon Calculator" },
  { href: "/ec3-epd-guide", label: "EC3 EPD Guide" },
];

const electricalLinks = [
  { href: "/electrical/voltage-drop-calculator", label: "Voltage Drop Calculator" },
  { href: "/electrical/wire-size-calculator", label: "Wire Size Calculator" },
  { href: "/electrical/dc-wire-size-calculator", label: "DC Wire Size" },
  { href: "/electrical/3-phase-voltage-drop-calculator", label: "3-Phase Voltage Drop" },
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.className} flex min-h-screen w-full min-w-0 flex-col overflow-x-hidden bg-slate-50 text-slate-900`}>
        <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white shadow-sm">
          <nav aria-label="Main navigation">
            <div className="mx-auto w-full max-w-7xl px-3 sm:px-6 lg:px-8">
              <div className="flex h-16 min-w-0 items-center justify-between gap-2 sm:h-20 sm:gap-4">
                <Link href="/" aria-label="Green Engineering Tools home" className="flex min-w-0 max-w-[calc(100%-3.25rem)] items-center sm:max-w-none">
                  <div className="mr-2 shrink-0 rounded-lg bg-emerald-500 p-1.5 shadow-inner shadow-emerald-700/50 sm:mr-3 sm:p-2">
                    <svg className="h-6 w-6 text-white sm:h-7 sm:w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7Z" />
                    </svg>
                  </div>
                  <span className="min-w-0 truncate text-[15px] font-black tracking-tight text-slate-900 min-[360px]:text-base sm:text-2xl">
                    GreenEngineering <span className="text-emerald-600">Tools</span>
                  </span>
                </Link>

                <div className="hidden items-center gap-4 xl:flex 2xl:gap-6">
                  <Link href="/" className="whitespace-nowrap text-sm font-bold text-slate-600 transition-colors hover:text-emerald-600">LCA</Link>
                  <Link href="/cbam-calculator" className="whitespace-nowrap text-sm font-bold text-slate-600 transition-colors hover:text-emerald-600">CBAM</Link>
                  <Link href="/electrical" className="whitespace-nowrap text-sm font-bold text-slate-600 transition-colors hover:text-emerald-600">Electrical</Link>
                  <a href="https://solarcalculator.greenengineeringtools.com" className="whitespace-nowrap text-sm font-bold text-slate-600 transition-colors hover:text-sky-600">Solar ↗</a>
                  <Link href="/guides" className="whitespace-nowrap text-sm font-bold text-slate-600 transition-colors hover:text-emerald-600">Guides</Link>
                  <Link href="/methodology" className="whitespace-nowrap text-sm font-bold text-slate-600 transition-colors hover:text-emerald-600">Methodology</Link>
                  <Link href="/about" className="whitespace-nowrap text-sm font-bold text-slate-600 transition-colors hover:text-emerald-600">About</Link>
                  <Link href="/#calculator-workspace" className="whitespace-nowrap rounded-md bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-slate-800">LCA Workspace</Link>
                </div>

                <MobileNav />
              </div>
            </div>
          </nav>
        </header>

        <main className="w-full min-w-0 flex-1 overflow-x-clip">{children}</main>

        <footer className="mt-auto w-full border-t border-slate-800 bg-slate-950 text-slate-400">
          <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
            <div className="grid grid-cols-1 gap-8 text-center sm:grid-cols-2 sm:text-left lg:grid-cols-5 lg:gap-8">
              <div className="sm:col-span-2 lg:col-span-1">
                <Link href="/" className="inline-flex items-center justify-center font-black tracking-tight text-white sm:justify-start">GreenEngineering Tools</Link>
                <p className="mx-auto mt-4 max-w-xs text-sm leading-6 text-slate-400 sm:mx-0">Free browser-based engineering tools for carbon, CBAM, electrical systems and sustainable design.</p>
                <Link href="/electrical" className="mt-5 inline-flex text-sm font-black text-emerald-400 hover:text-emerald-300">Explore electrical tools →</Link>
              </div>

              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-white">Core tools</h2>
                <nav className="mt-4 space-y-3 text-sm" aria-label="Footer core tools navigation">
                  <Link href="/" className="block hover:text-white">LCA Engine</Link>
                  <Link href="/cbam-calculator" className="block hover:text-white">CBAM Estimator</Link>
                  <Link href="/electrical" className="block hover:text-white">Electrical Tools</Link>
                  <a href="https://solarcalculator.greenengineeringtools.com" className="block hover:text-white">Solar Calculator ↗</a>
                </nav>
              </div>

              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-white">Electrical</h2>
                <nav className="mt-4 space-y-3 text-sm" aria-label="Footer electrical navigation">
                  {electricalLinks.map((item) => <Link key={item.href} href={item.href} className="block hover:text-white">{item.label}</Link>)}
                </nav>
              </div>

              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-white">LCA learning</h2>
                <nav className="mt-4 space-y-3 text-sm" aria-label="Footer LCA learning navigation">
                  {lcaGuideLinks.map((item) => <Link key={item.href} href={item.href} className="block hover:text-white">{item.label}</Link>)}
                </nav>
              </div>

              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-white">Company</h2>
                <nav className="mt-4 space-y-3 text-sm" aria-label="Footer company navigation">
                  <Link href="/about" className="block hover:text-white">About Us</Link>
                  <Link href="/contact" className="block hover:text-white">Contact</Link>
                  <Link href="/privacy-policy" className="block hover:text-white">Privacy Policy</Link>
                  <Link href="/terms-of-service" className="block hover:text-white">Terms of Service</Link>
                </nav>
              </div>
            </div>

            <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-800 pt-7 md:flex-row">
              <p className="text-center text-xs text-slate-500 md:text-left">© {new Date().getFullYear()} Green Engineering Tools. All rights reserved.</p>
              <p className="max-w-2xl text-center text-xs leading-5 text-slate-500 md:text-right">Engineering decision-support tools. Formal compliance, certification and site-specific electrical design remain subject to applicable standards, manufacturer data and qualified professional review.</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
