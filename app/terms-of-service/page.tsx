import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | Green Engineering Tools",
  description:
    "Read the terms for using Green Engineering Tools engineering calculators, planning utilities, reference data, exports and related services.",
  alternates: { canonical: "https://greenengineeringtools.com/terms" },
  robots: { index: true, follow: true },
};

const termsSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Terms of Service",
  url: "https://greenengineeringtools.com/terms",
  description:
    "Terms governing access to and use of Green Engineering Tools calculators and related services.",
  dateModified: "2026-09-10",
};

export default function TermsOfService() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(termsSchema) }}
      />

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
            Green Engineering Tools
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            Terms of Service
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
            These terms explain the permitted use and important limitations of
            Green Engineering Tools calculators, guides, exports and related
            services.
          </p>
          <p className="mt-6 text-sm font-bold text-slate-500">
            Effective date: September 10, 2026
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-10 px-4 py-12 sm:px-6 sm:py-16">
        <section>
          <h2 className="text-2xl font-black text-slate-950">1. Agreement and service scope</h2>
          <div className="mt-4 space-y-4 leading-8 text-slate-600">
            <p>
              By accessing or using greenengineeringtools.com and a related tool
              that links to these terms, you agree to use the service lawfully and
              responsibly. If you do not agree, please do not use the service.
            </p>
            <p>
              Green Engineering Tools provides web-based calculators, reference
              lookups, educational explanations and planning utilities for areas
              such as embodied carbon, building performance, electrical work,
              solar planning and CBAM analysis. Core tools are generally available
              without creating an account.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-black text-slate-950">2. Estimates are not professional approval</h2>
          <div className="mt-4 space-y-4 leading-8 text-slate-600">
            <p>
              Results are estimates or planning scenarios based on the values,
              units, formulas, reference records and assumptions available to the
              selected tool. They are not a guarantee of performance, compliance,
              savings, emissions, cost, certificate liability or equipment safety.
            </p>
            <p>
              You remain responsible for checking results against applicable
              building and electrical codes, customs and environmental rules,
              manufacturer instructions, project conditions, contracts, source
              documents and the review of an appropriately qualified professional.
              A result must not be used alone to select protective devices, size
              life-safety systems, submit a regulatory declaration or approve a
              construction change.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-black text-slate-950">3. Inputs, outputs and saved workspaces</h2>
          <ul className="mt-4 list-disc space-y-3 pl-6 leading-8 text-slate-600">
            <li>
              You are responsible for the accuracy, legality and completeness of
              the values and files you enter or upload.
            </li>
            <li>
              Do not enter passwords, API keys, identity documents, payment card
              details or confidential client information.
            </li>
            <li>
              Some tools may save an anonymous workspace in your browser or allow
              a local export/import file. You are responsible for protecting any
              exported file and checking it before sharing.
            </li>
            <li>
              You should retain your own project records. A browser workspace is
              not a guaranteed backup or document-management system.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-black text-slate-950">4. Reference data and external services</h2>
          <p className="mt-4 leading-8 text-slate-600">
            Some tools use public, official, commercial or third-party reference
            data, including environmental product information, market values,
            regulatory publications and external APIs. Availability, coverage,
            licensing, precision and update timing can differ by source. A source
            link or label does not mean that Green Engineering Tools endorses or
            controls the external provider.
          </p>
          <p className="mt-4 leading-8 text-slate-600">
            We may change, correct, remove or version a reference record when new
            evidence or an updated source becomes available. Users should check
            the current official publication before relying on a result for a
            formal submission.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-black text-slate-950">5. Acceptable use</h2>
          <p className="mt-4 leading-8 text-slate-600">You must not:</p>
          <ul className="mt-4 list-disc space-y-3 pl-6 leading-8 text-slate-600">
            <li>Use the service for unlawful, fraudulent or harmful activity.</li>
            <li>Upload malware or attempt to gain unauthorized access to systems.</li>
            <li>Overload, probe, scrape or automate requests in a way that harms the service.</li>
            <li>Misrepresent a Green Engineering Tools result as an official government approval, verified declaration or guaranteed design.</li>
            <li>Copy, republish or commercially redistribute site content or data without the rights and permissions required for that material.</li>
            <li>Interfere with advertisements, consent choices, navigation or another user’s access.</li>
          </ul>
          <p className="mt-4 leading-8 text-slate-600">
            We may restrict or suspend access when reasonably necessary to protect
            users, providers, data or service availability.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-black text-slate-950">6. Intellectual property</h2>
          <p className="mt-4 leading-8 text-slate-600">
            The Green Engineering Tools name, original page content, interface
            design, software, presentation and code are owned by or licensed to
            Green Engineering Tools and are protected by applicable intellectual-
            property laws. These terms give you a limited, non-exclusive right to
            access the service for personal, educational, internal business or
            project-planning use. They do not transfer ownership.
          </p>
          <p className="mt-4 leading-8 text-slate-600">
            You retain rights in information you provide, subject to the rights
            needed by the service and its providers to process a requested
            calculation or support message. If you send feedback, you allow us to
            use it to operate and improve the service without revealing private
            project information.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-black text-slate-950">7. Availability and changes</h2>
          <p className="mt-4 leading-8 text-slate-600">
            We aim to keep the site useful and available, but access may be
            interrupted by maintenance, hosting failures, network problems,
            security events, data-source changes or circumstances outside our
            control. Features, formulas, source records and page content may be
            updated or discontinued without guaranteeing a particular version or
            availability period.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-black text-slate-950">8. Privacy and advertising</h2>
          <p className="mt-4 leading-8 text-slate-600">
            Our collection and use of information are described in the{" "}
            <Link href="/privacy-policy" className="font-bold text-emerald-700 underline">
              Privacy Policy
            </Link>
            . If advertising is enabled, it must be implemented with the required
            disclosures, consent choices and ad-placement safeguards. Users must
            not click, manipulate or encourage others to interact with ads for the
            purpose of increasing revenue.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-black text-slate-950">9. Disclaimers and limitation of liability</h2>
          <p className="mt-4 leading-8 text-slate-600">
            To the extent permitted by law, the service is provided on an
            “as-available” and “as-is” basis without warranties that every result
            will be complete, current, error-free, suitable for a particular
            project or accepted by an authority. Green Engineering Tools is not an
            official EU CBAM Registry, customs authority, utility, standards body,
            manufacturer, verifier or engineering approval service.
          </p>
          <p className="mt-4 leading-8 text-slate-600">
            To the extent permitted by applicable law, Green Engineering Tools and
            its contributors are not liable for indirect, incidental, special,
            consequential or punitive loss arising from use of, reliance on or
            inability to use the service. Nothing in these terms excludes a right
            or liability that cannot lawfully be excluded.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-black text-slate-950">10. Governing law</h2>
          <p className="mt-4 leading-8 text-slate-600">
            Subject to mandatory consumer or other applicable law, these terms are
            intended to be governed by the laws applicable in Pakistan. Disputes
            should be brought before a competent court in Khyber Pakhtunkhwa,
            Pakistan, unless applicable law requires another forum. Obtain local
            legal advice before relying on this clause for a commercial agreement.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-black text-slate-950">11. Contact</h2>
          <p className="mt-4 leading-8 text-slate-600">
            Questions about these terms can be sent to{" "}
            <a
              href="mailto:contact@greenengineeringtools.com"
              className="font-bold text-emerald-700 underline"
            >
              contact@greenengineeringtools.com
            </a>
            . Please do not include passwords, API keys or unnecessary sensitive
            information.
          </p>
        </section>

        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm leading-7 text-amber-950">
          <strong>Professional-use reminder:</strong> These terms do not create an
          engineer-client, legal-adviser, customs-adviser, verifier-client or
          other professional relationship. Use the tools as part of a documented
          review process appropriate to the risk of your project.
        </section>
      </div>
    </main>
  );
}
