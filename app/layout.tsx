import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

// ENTERPRISE SEO: This is what Google Search and AdSense crawlers see first.
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
      {/* 
        Notice: The old <Header /> and <Footer /> components have been completely 
        removed from here. Only the raw {children} (our new App) is rendered.
      */}
      <body className={inter.className}>{children}</body>
    </html>
  );
}