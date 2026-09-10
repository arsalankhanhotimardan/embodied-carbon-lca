import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Green Engineering Tools",
  description:
    "Read how Green Engineering Tools handles calculator inputs, local browser storage, contact requests, analytics, cookies and Google advertising technologies.",
  alternates: {
    canonical: "https://greenengineeringtools.com/privacy-policy",
  },
  robots: { index: true, follow: true },
};

const privacySchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Privacy Policy",
  url: "https://greenengineeringtools.com/privacy-policy",
  description:
    "Privacy practices for Green Engineering Tools websites and engineering calculators.",
  dateModified: "2026-09-10",
};

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(privacySchema) }}
      />

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
            Green Engineering Tools
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
            This policy explains what information may be processed when you use
            Green Engineering Tools, how browser storage and third-party services
            may work, and how to contact us about a privacy request.
          </p>
          <p className="mt-6 text-sm font-bold text-slate-500">
            Effective date: September 10, 2026
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-10 px-4 py-12 sm:px-6 sm:py-16">
        <section>
          <h2 className="text-2xl font-black text-slate-950">1. Who this policy covers</h2>
          <div className="mt-4 space-y-4 leading-8 text-slate-600">
            <p>
              This policy applies to greenengineeringtools.com and to pages or
              related services that link to this policy, including engineering,
              sustainability, electrical, building-performance, solar and CBAM
              tools where applicable. A separate service may display additional
              notices if its data practices differ.
            </p>
            <p>
              Green Engineering Tools is an independent software and information
              platform led by Engr. Arsalan Khan. Core calculators are designed
              to be usable without creating an account or signing in.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-black text-slate-950">2. Information you choose to provide</h2>
          <p className="mt-4 leading-8 text-slate-600">
            Depending on the feature you use, you may choose to provide:
          </p>
          <ul className="mt-4 list-disc space-y-3 pl-6 leading-8 text-slate-600">
            <li>
              Contact details such as your name and email address when you email
              us or use the contact page.
            </li>
            <li>
              Calculator inputs such as dimensions, electrical values, material
              quantities, emissions data, country or product information.
            </li>
            <li>
              Feedback, correction requests, support details or feature ideas.
            </li>
          </ul>
          <p className="mt-4 leading-8 text-slate-600">
            Please do not enter passwords, API keys, identity documents, payment
            card details, confidential client information or other sensitive data
            into a calculator or support message.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-black text-slate-950">3. Calculator processing and browser storage</h2>
          <div className="mt-4 space-y-4 leading-8 text-slate-600">
            <p>
              Many tools calculate directly in your browser. Other tools may send
              the values needed for a calculation or reference lookup to an
              application endpoint. The information requested by a particular
              tool should be treated as necessary for that feature to work.
            </p>
            <p>
              Some tools may use local browser storage for an anonymous workspace,
              autosave or a backup/import feature. Local storage is kept on your
              device by the browser and is not, by itself, an account or a public
              profile. Clearing site data or using browser privacy controls may
              remove it.
            </p>
            <p>
              If you send a message by email, your email provider processes the
              message and its attachments. We use support messages to respond,
              investigate issues and improve the service.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-black text-slate-950">4. Technical information</h2>
          <p className="mt-4 leading-8 text-slate-600">
            Hosting, security and performance services may process technical
            information such as an IP address, browser type, device information,
            approximate region, requested URL, referral information, timestamps
            and error logs. This information helps deliver pages, prevent abuse,
            diagnose failures and maintain reliability.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-black text-slate-950">5. Analytics and cookies</h2>
          <div className="mt-4 space-y-4 leading-8 text-slate-600">
            <p>
              The website may use first-party storage and, when configured, third-
              party analytics or performance tools. These technologies can help
              us understand which pages work, measure performance and identify
              technical problems. We do not require an account to use the core
              calculators.
            </p>
            <p>
              If Google AdSense or another advertising service is enabled, those
              providers may use cookies, web beacons, IP addresses or similar
              identifiers to deliver, measure or personalize advertising. Google
              and other third-party vendors may use information about visits to
              this site or other sites as allowed by their settings and policies.
            </p>
            <p>
              You can review or change Google advertising personalization choices
              through{" "}
              <a
                href="https://adssettings.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-emerald-700 underline"
              >
                Google Ads Settings
              </a>
              . You can also review the advertising opt-out information at{" "}
              <a
                href="https://optout.aboutads.info/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-emerald-700 underline"
              >
                aboutads.info
              </a>
              .
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-black text-slate-950">6. Google advertising and consent</h2>
          <div className="mt-4 space-y-4 leading-8 text-slate-600">
            <p>
              Before enabling Google-served advertising, the site should have a
              working consent and privacy configuration appropriate to its
              visitors. For visitors in the European Economic Area, the United
              Kingdom and Switzerland, a consent-management message may be
              required before personalized advertising or certain storage and
              data uses. Where required, users are given a meaningful choice and
              advertising is configured according to that choice.
            </p>
            <p>
              The site does not place advertisements over calculator controls or
              use advertising as a substitute for the tool’s publisher content.
              Ads, if enabled, should be clearly distinguishable from navigation,
              buttons, inputs and calculation results.
            </p>
            <p>
              For Google’s current publisher disclosure requirements, read{" "}
              <a
                href="https://support.google.com/adsense/answer/1348695"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-emerald-700 underline"
              >
                Google AdSense required content guidance
              </a>
              .
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-black text-slate-950">7. Service providers and external sources</h2>
          <p className="mt-4 leading-8 text-slate-600">
            We may use service providers to host the application, protect and
            cache pages, store application data, deliver email, provide analytics,
            serve advertising or retrieve reference information. Depending on the
            tool, examples may include Cloudflare edge infrastructure, Neon
            serverless database hosting, the EC3 environmental-data service and
            Google services. Each provider may process information under its own
            privacy policy and contract terms.
          </p>
          <p className="mt-4 leading-8 text-slate-600">
            Tool pages may also link to official government, standards,
            manufacturer or data-provider websites. Those websites control their
            own content and privacy practices.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-black text-slate-950">8. How information is used</h2>
          <ul className="mt-4 list-disc space-y-3 pl-6 leading-8 text-slate-600">
            <li>To provide calculations, reference lookups, exports and support.</li>
            <li>To maintain security, prevent abuse and troubleshoot failures.</li>
            <li>To understand general usage and improve tools when analytics is enabled.</li>
            <li>To communicate about a support request or a material service change.</li>
            <li>To comply with applicable law or respond to lawful requests.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-black text-slate-950">9. Sharing, retention and security</h2>
          <div className="mt-4 space-y-4 leading-8 text-slate-600">
            <p>
              We do not publish your support messages or calculator entries. We
              may share information with providers that help us operate the site,
              when necessary to provide a requested feature, protect the service,
              comply with law or handle a support request.
            </p>
            <p>
              Information is retained only for as long as reasonably needed for
              the purpose for which it was collected, operational records,
              security, dispute handling or legal obligations. Exact retention
              periods can vary by provider and type of record.
            </p>
            <p>
              We use reasonable technical and organizational measures for the
              service, but no internet transmission or storage system can be
              guaranteed completely secure. Do not submit information that requires
              a level of confidentiality the website cannot provide.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-black text-slate-950">10. International users and children</h2>
          <p className="mt-4 leading-8 text-slate-600">
            Our providers may process information in countries different from
            where you live. By using the site, you acknowledge that technical
            processing may involve international service providers, subject to
            applicable legal safeguards.
          </p>
          <p className="mt-4 leading-8 text-slate-600">
            The platform is intended for a general audience and is not directed at
            children under 13. We do not knowingly request personal information
            from children under 13. If you believe a child has provided personal
            information, contact us so we can review the request.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-black text-slate-950">11. Your privacy requests</h2>
          <p className="mt-4 leading-8 text-slate-600">
            Depending on your location and applicable law, you may have rights to
            ask for access, correction, deletion, restriction or objection to
            certain processing. You can contact us about a request at{" "}
            <a
              href="mailto:contact@greenengineeringtools.com"
              className="font-bold text-emerald-700 underline"
            >
              contact@greenengineeringtools.com
            </a>
            . We may need enough information to verify and correctly handle the
            request. Browser-local workspace data can usually be removed through
            your browser’s site-data controls.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-black text-slate-950">12. Changes to this policy</h2>
          <p className="mt-4 leading-8 text-slate-600">
            We may update this policy when the service, providers, advertising
            configuration or legal requirements change. The effective date at the
            top of the page identifies the current version. Material changes will
            be reflected on this page before or when they take effect where
            required.
          </p>
        </section>

        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
          <h2 className="text-xl font-black text-emerald-950">Questions about privacy?</h2>
          <p className="mt-3 text-sm leading-7 text-emerald-950">
            Contact us with the page or feature involved and the privacy action
            you are requesting. Do not include passwords, API keys or unnecessary
            sensitive information.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href="mailto:contact@greenengineeringtools.com"
              className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white hover:bg-emerald-800"
            >
              Email privacy support
            </a>
            <Link
              href="/terms"
              className="rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm font-black text-emerald-800 hover:bg-emerald-100"
            >
              Read Terms of Service
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
