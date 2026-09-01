import type { Metadata } from "next";
import type { ReactNode } from "react";

const canonical = "https://greenengineeringtools.com/cbam-calculator";

export const metadata: Metadata = {
  title: "EU CBAM Calculator | Official Data & Future Price Periods",
  description:
    "EU CBAM calculator for 2026 onward. Estimate embedded emissions, certificate exposure, the annual 50-tonne threshold and future reporting periods using official EU reference data.",
  alternates: {
    canonical,
  },
  openGraph: {
    title: "EU CBAM Calculator | Green Engineering Tools",
    description:
      "Plan EU CBAM exposure from 2026 onward with official country/CN reference data, automatic reporting years and official certificate-price periods as they are published.",
    url: canonical,
    type: "website",
    siteName: "Green Engineering Tools",
  },
  twitter: {
    card: "summary_large_image",
    title: "EU CBAM Calculator",
    description:
      "Official-data CBAM planning calculator with automatic reporting years and certificate-price updates.",
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

export default function CbamCalculatorLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return children;
}
