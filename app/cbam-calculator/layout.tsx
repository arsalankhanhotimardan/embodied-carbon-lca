import type { Metadata } from "next";
import type { ReactNode } from "react";

const canonical = "https://greenengineeringtools.com/cbam-calculator";

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "EU CBAM Calculator",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web Browser",
  url: canonical,
  description:
    "EU CBAM calculator for 2026 onward, with official country/CN reference data, dynamic reporting years, certificate-price periods, the 50-tonne threshold and portfolio analysis.",
  provider: {
    "@type": "Organization",
    name: "Green Engineering Tools",
    url: "https://greenengineeringtools.com",
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "EUR",
  },
  featureList: [
    "Multi-year CBAM certificate cost estimate",
    "50-tonne annual de minimis threshold",
    "CBAM default and actual emissions modes",
    "CBAM benchmark and free-allocation adjustment",
    "Iron and steel CBAM calculations",
    "Aluminium CBAM calculations",
    "Cement CBAM calculations",
    "Fertiliser CBAM calculations",
    "CSV bulk import",
    "Portfolio exposure analysis",
  ],
};

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
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      {children}
    </>
  );
}
