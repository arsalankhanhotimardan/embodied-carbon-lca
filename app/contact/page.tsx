import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Green Engineering Tools | Support",
  description:
    "Contact Green Engineering Tools for calculator support, data questions, corrections, feedback and custom engineering-tool enquiries.",
  alternates: { canonical: "https://greenengineeringtools.com/contact" },
  openGraph: {
    title: "Contact Green Engineering Tools",
    description:
      "Get support for Green Engineering Tools calculators and report technical issues or data corrections.",
    url: "https://greenengineeringtools.com/contact",
    type: "website",
  },
};

const contactSchema = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: "Contact Green Engineering Tools",
  url: "https://greenengineeringtools.com/contact",
  description:
    "Contact page for calculator support, corrections, feedback and feature enquiries.",
  mainEntity: {
    "@type": "Organization",
    name: "Green Engineering Tools",
    email: "contact@greenengineeringtools.com",
    telephone: "+92 333 9359980",
    url: "https://greenengineeringtools.com",
  },
};

export default function ContactUs() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactSchema) }}
      />

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
            Support and feedback
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-6xl">
            Contact Green Engineering Tools
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            Contact us if a calculator gives an unexpected result, a reference
            value needs review, a page is difficult to use, or you have a clear
            idea for a practical engineering tool. The more context you provide,
            the easier it is to investigate your request.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[.8fr_1.2fr] lg:py-16">
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-black text-slate-950">Get in touch</h2>
            <div className="mt-6 space-y-6 text-sm leading-7">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Email support
                </p>
                <a
                  href="mailto:contact@greenengineeringtools.com"
                  className="mt-1 inline-block break-all font-bold text-emerald-700 hover:underline"
                >
                  contact@greenengineeringtools.com
                </a>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                  WhatsApp
                </p>
                <a
                  href="https://wa.me/923339359980"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block font-bold text-emerald-700 hover:underline"
                >
                  +92 333 9359980
                </a>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Platform lead
                </p>
                <p className="mt-1 font-bold text-slate-900">Engr. Arsalan Khan</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-6 text-sm leading-7 text-indigo-950">
            <h2 className="text-lg font-black">For faster technical support</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Name the exact calculator or page URL.</li>
              <li>List the units and values you entered.</li>
              <li>Describe the result you expected and what appeared.</li>
              <li>Include your browser and device when the issue is visual.</li>
              <li>Remove private project data, passwords and API keys.</li>
            </ul>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-950">Open a support email</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                This form opens your default email application with the details
                you provide. It does not store the form in a website database.
                If no email application opens, use the direct email address on
                the left.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
              No account required
            </span>
          </div>

          <form
            action="mailto:contact@greenengineeringtools.com"
            method="post"
            encType="text/plain"
            className="mt-8 space-y-5"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-bold text-slate-700">Name</span>
                <input
                  name="Name"
                  type="text"
                  required
                  autoComplete="name"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  placeholder="Your name"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-bold text-slate-700">Email</span>
                <input
                  name="Email"
                  type="email"
                  required
                  autoComplete="email"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  placeholder="you@example.com"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-sm font-bold text-slate-700">Request type</span>
              <select
                name="Request type"
                required
                defaultValue="Calculator support"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              >
                <option>Calculator support</option>
                <option>Possible data or formula correction</option>
                <option>Page or accessibility issue</option>
                <option>Feature suggestion</option>
                <option>Custom engineering-tool enquiry</option>
                <option>Other</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-bold text-slate-700">Message</span>
              <textarea
                name="Message"
                required
                minLength={20}
                rows={7}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                placeholder="Tell us what happened, including the page, inputs, units and result."
              />
            </label>

            <label className="flex items-start gap-3 text-sm leading-6 text-slate-600">
              <input
                name="Privacy confirmation"
                type="checkbox"
                required
                className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>
                I confirm that I have removed passwords, API keys, identity
                documents and confidential client information from this message.
              </span>
            </label>

            <button
              type="submit"
              className="w-full rounded-xl bg-emerald-700 px-5 py-3.5 font-black text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-100"
            >
              Open email draft
            </button>
          </form>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-5 md:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <h2 className="text-lg font-black text-slate-950">Report a result issue</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                We can investigate a possible error more effectively when the
                exact inputs, units, formula mode and output are included.
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <h2 className="text-lg font-black text-slate-950">Ask about sources</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Reference datasets and regulations can change. Ask us which
                source or assumption a tool used when the page provides that
                detail.
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <h2 className="text-lg font-black text-slate-950">Suggest a tool</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Describe the users, inputs, units and decision the proposed tool
                should support. Clear use cases help us evaluate suggestions.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm leading-7 text-amber-950">
          <strong>Important:</strong> Contact support is not a substitute for an
          engineer, electrician, customs adviser, verifier or legal professional.
          Do not use this page to send emergency, safety-critical or confidential
          project information.
        </div>
      </section>
    </main>
  );
}
