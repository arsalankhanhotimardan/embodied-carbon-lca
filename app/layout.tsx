import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import MobileNav from "@/components/MobileNav";
import DesktopNav from "@/components/site/DesktopNav";
import BrandLogo from "@/components/site/BrandLogo";
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
    "Free engineering tools for embodied carbon, whole-building LCA, EU CBAM, building-envelope thermal performance and electrical calculations, with transparent methods for professionals, students and technical decision-making.",
  authors: [{ name: "Engr. Arsalan Khan", url: siteUrl }],
  creator: "Green Engineering Tools",
  publisher: "Green Engineering Tools",
  openGraph: {
    title: "Green Engineering Tools",
    description:
      "Free browser-based engineering calculators for carbon, CBAM, building-envelope, electrical systems and sustainable design.",
    url: siteUrl,
    siteName: "Green Engineering Tools",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Green Engineering Tools",
    description:
      "Free engineering calculators for embodied carbon, CBAM, building physics and electrical design.",
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
  { href: "/house-carbon-footprint-calculator", label: "House Carbon Footprint" },
  { href: "/embodied-carbon-calculator", label: "Embodied Carbon Calculator" },
  { href: "/a1-a3-embodied-carbon", label: "A1-A3 Embodied Carbon" },
  { href: "/epd-carbon-calculator", label: "EPD Carbon Calculator" },
  { href: "/ec3-epd-guide", label: "EC3 EPD Guide" },
];

const electricalLinks = [
  { href: "/electrical/voltage-drop-calculator", label: "Voltage Drop" },
  { href: "/electrical/wire-size-calculator", label: "Wire Size" },
  { href: "/electrical/dc-wire-size-calculator", label: "DC Wire Size" },
  { href: "/electrical/kw-to-amps-calculator", label: "kW to Amps" },
  { href: "/electrical/breaker-size-calculator", label: "Breaker Size" },
  { href: "/electrical/awg-to-mm2-calculator", label: "AWG to mm²" },
  { href: "/electrical#converters", label: "All converters" },
];

const buildingLinks = [
  { href: "/building-envelope/insulation-calculator", label: "Insulation Calculator" },
  { href: "/building-envelope/u-value-calculator", label: "U-Value Calculator" },
  { href: "/building-envelope/heat-loss-calculator", label: "Heat Loss Calculator" },
  { href: "/building-envelope/carbon-payback-calculator", label: "Carbon Payback" },
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.className} flex min-h-screen w-full min-w-0 flex-col overflow-x-hidden bg-slate-50 text-slate-900`}>
        <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/85 backdrop-blur-xl supports-[backdrop-filter]:bg-white/75">
          <nav aria-label="Main navigation">
            <div className="mx-auto w-full max-w-7xl px-3 sm:px-6 lg:px-8">
              <div className="flex h-16 min-w-0 items-center justify-between gap-2 sm:h-20 sm:gap-4">
                <Link href="/" aria-label="Green Engineering Tools home" className="flex min-w-0 max-w-[calc(100%_-_3.25rem)] items-center sm:max-w-none">
                  <BrandLogo />
                </Link>
                <DesktopNav />
                <MobileNav />
              </div>
            </div>
          </nav>
        </header>

        <main className="w-full min-w-0 flex-1 overflow-x-clip">{children}</main>

        <footer className="mt-auto w-full bg-slate-950 text-slate-400">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
          <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
            <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-6 lg:gap-8">
              <div className="sm:col-span-2 lg:col-span-2">
                <Link href="/" aria-label="Green Engineering Tools home" className="inline-flex">
                  <BrandLogo tone="dark" />
                </Link>
                <p className="mt-5 max-w-sm text-sm leading-6 text-slate-400">Free browser-based engineering tools for carbon, building physics, electrical systems and sustainable design. No signup, with the formulas shown.</p>
                <a href="https://solarcalculator.greenengineeringtools.com" className="mt-5 inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-black text-slate-200 transition hover:border-amber-400/50 hover:text-white">
                  <span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden="true" /> Solar Calculator ↗
                </a>
              </div>

              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-white">Core tools</h2>
                <nav className="mt-4 space-y-3 text-sm" aria-label="Footer core tools navigation">
                  <Link href="/" className="block hover:text-white">LCA Engine</Link>
                  <Link href="/cbam-calculator" className="block hover:text-white">CBAM Estimator</Link>
                  <Link href="/cbam" className="block hover:text-white">CBAM Tools & Guides</Link>
                  <Link href="/building-envelope" className="block hover:text-white">Building Envelope</Link>
                  <Link href="/electrical" className="block hover:text-white">Electrical Tools</Link>
                </nav>
              </div>

              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-white">Building</h2>
                <nav className="mt-4 space-y-3 text-sm" aria-label="Footer building-envelope navigation">
                  {buildingLinks.map((item) => <Link key={item.href} href={item.href} className="block hover:text-white">{item.label}</Link>)}
                </nav>
              </div>

              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-white">Electrical</h2>
                <nav className="mt-4 space-y-3 text-sm" aria-label="Footer electrical navigation">
                  {electricalLinks.map((item) => <Link key={item.href} href={item.href} className="block hover:text-white">{item.label}</Link>)}
                </nav>
              </div>

              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-white">Learn</h2>
                <nav className="mt-4 space-y-3 text-sm" aria-label="Footer LCA learning navigation">
                  {lcaGuideLinks.map((item) => <Link key={item.href} href={item.href} className="block hover:text-white">{item.label}</Link>)}
                  <Link href="/about" className="block hover:text-white">About Us</Link>
                  <Link href="/contact" className="block hover:text-white">Contact</Link>
                </nav>
              </div>
            </div>

            <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-800 pt-7 md:flex-row">
              <p className="text-center text-xs text-slate-500 md:text-left">© {new Date().getFullYear()} Green Engineering Tools · <Link href="/privacy-policy" className="hover:text-slate-300">Privacy</Link> · <Link href="/terms-of-service" className="hover:text-slate-300">Terms</Link></p>
              <p className="max-w-2xl text-center text-xs leading-5 text-slate-500 md:text-right">Engineering decision-support tools. Formal compliance, certification and site-specific design remain subject to applicable standards, manufacturer data and qualified professional review.</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
