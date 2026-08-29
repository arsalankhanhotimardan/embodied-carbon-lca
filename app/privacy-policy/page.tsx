import React from 'react';

export default function PrivacyPolicy() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-12 text-gray-800">
      <h1 className="text-4xl font-bold text-green-700 mb-6">Privacy Policy</h1>
      <p className="mb-4"><strong>Effective Date:</strong> August 29, 2026</p>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">1. Introduction</h2>
        <p className="mb-4">
          Welcome to Green Engineering Tools ("GET"), operating at greenengineeringtools.com and solar.greenengineeringtools.com. 
          This Privacy Policy explains how we collect, use, and protect your information when you use our SaaS applications, 
          including the Embodied Carbon LCA and the Smart Solar Load Calculator.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">2. Information We Collect</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Provided Data:</strong> Data you input into our calculators (e.g., appliance loads, building materials, Revit structural data). This data is processed to generate your reports.</li>
          <li><strong>Usage Data:</strong> We may collect non-identifiable information such as IP addresses, browser types, and usage patterns via Google Analytics to improve our tools.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">3. Third-Party Services & Google AdSense</h2>
        <p className="mb-4">
          We use third-party services to operate and monetize our platform:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Google AdSense:</strong> Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to this website or other websites. Google's use of advertising cookies enables it and its partners to serve ads based on your browsing history. You may opt-out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" className="text-blue-600 underline">Google Ads Settings</a>.</li>
          <li><strong>External APIs:</strong> Our LCA tool connects to the EC3 API to retrieve environmental product data.</li>
          <li><strong>Database Hosting:</strong> Application data is securely processed and stored using Neon (Serverless PostgreSQL) and Cloudflare edge infrastructure.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">4. Contact Information</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact:<br/>
          <strong>Engr. Arsalan Khan</strong><br/>
          Mardan, Khyber Pakhtunkhwa, Pakistan<br/>
          Email: [Insert Your Email Here]
        </p>
      </section>
    </main>
  );
}