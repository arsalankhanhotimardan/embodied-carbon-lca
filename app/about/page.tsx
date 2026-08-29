import React from 'react';

export default function AboutUs() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-12 text-gray-800">
      <h1 className="text-4xl font-bold text-green-700 mb-6">About Us</h1>
      
      <section className="space-y-6 text-lg leading-relaxed">
        <p>
          Welcome to Green Engineering Tools (GET), a dedicated SaaS platform built to bridge the gap between advanced software development and sustainable engineering practices.
        </p>
        <p>
          Founded and developed by Engr. Arsalan Khan, the platform was born out of a commitment to making complex environmental calculations accessible, accurate, and highly efficient. With a deep background in full-stack web and desktop software engineering, our mission is to empower professionals with robust digital utilities.
        </p>
        <p>
          From the Embodied Carbon LCA tool to the Smart Solar Load Calculator, we engineer solutions that help builders, architects, and energy-conscious individuals make data-driven decisions. By leveraging modern cloud infrastructure and precise calculation models, we aim to streamline sustainable project planning worldwide.
        </p>
      </section>
    </main>
  );
}