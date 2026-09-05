"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const primaryLinks = [
  { href: "/", label: "LCA Engine" },
  { href: "/cbam-calculator", label: "CBAM Calculator" },
  { href: "/building-envelope", label: "Building Envelope Tools" },
  { href: "/building-envelope/insulation-calculator", label: "Insulation Calculator" },
  { href: "/building-envelope/u-value-calculator", label: "U-Value Calculator" },
  { href: "/building-envelope/heat-loss-calculator", label: "Heat Loss Calculator" },
  { href: "/electrical", label: "Electrical Tools" },
  { href: "/electrical/voltage-drop-calculator", label: "Voltage Drop Calculator" },
  { href: "/electrical/wire-size-calculator", label: "Wire Size Calculator" },
  { href: "/cbam-calculator/actual-data", label: "CBAM Actual / Complex Goods" },
  { href: "/cbam-calculator/electricity", label: "CBAM Electricity" },
  { href: "/cbam-calculator/bulk", label: "CBAM Bulk CSV" },
  { href: "/guides", label: "Guides" },
  { href: "/methodology", label: "Methodology" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

const learningLinks = [
  { href: "/building-envelope/methodology", label: "Building Envelope Methodology" },
  { href: "/embodied-carbon-calculator", label: "Embodied Carbon Calculator" },
  { href: "/a1-a3-embodied-carbon", label: "A1-A3 Embodied Carbon" },
  { href: "/epd-carbon-calculator", label: "EPD Carbon Calculator" },
  { href: "/ec3-epd-guide", label: "EC3 EPD Guide" },
  { href: "/whole-building-lca", label: "Whole-Building LCA" },
  { href: "/electrical/methodology", label: "Electrical Methodology" },
];

export default function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const closeMenu = () => setOpen(false);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const mobileLinkClass = (href: string) => {
    const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
    return [
      "block rounded-xl px-4 py-3 text-sm font-bold transition-colors",
      active ? "bg-emerald-50 text-emerald-700" : "text-slate-700 hover:bg-slate-50 hover:text-emerald-700",
    ].join(" ");
  };

  return (
    <div className="shrink-0 xl:hidden">
      <button
        type="button"
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={open}
        aria-controls="mobile-navigation-panel"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 transition-colors hover:bg-slate-100 hover:text-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
      >
        {open ? (
          <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
        ) : (
          <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" /></svg>
        )}
      </button>

      {open && (
        <>
          <button type="button" aria-label="Close navigation menu" onClick={closeMenu} className="fixed inset-x-0 bottom-0 top-16 z-[55] bg-slate-950/25 sm:top-20" />
          <div id="mobile-navigation-panel" className="fixed inset-x-0 top-16 z-[60] max-h-[calc(100vh-4rem)] overflow-y-auto overscroll-contain border-b border-slate-200 bg-white shadow-2xl sm:top-20 sm:max-h-[calc(100vh-5rem)]">
            <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-6">
              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
                <p className="px-1 pb-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Core calculators</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Link href="/#calculator-workspace" onClick={closeMenu} className="rounded-xl bg-slate-900 px-4 py-3.5 text-center text-sm font-black text-white hover:bg-slate-800">LCA Workspace</Link>
                  <Link href="/cbam-calculator" onClick={closeMenu} className="rounded-xl bg-emerald-600 px-4 py-3.5 text-center text-sm font-black text-white hover:bg-emerald-500">CBAM Calculator</Link>
                  <Link href="/building-envelope" onClick={closeMenu} className="rounded-xl bg-orange-600 px-4 py-3.5 text-center text-sm font-black text-white hover:bg-orange-500">Building Envelope</Link>
                  <Link href="/electrical" onClick={closeMenu} className="rounded-xl bg-blue-700 px-4 py-3.5 text-center text-sm font-black text-white hover:bg-blue-600">Electrical Tools</Link>
                  <a href="https://solarcalculator.greenengineeringtools.com" onClick={closeMenu} className="rounded-xl bg-sky-600 px-4 py-3.5 text-center text-sm font-black text-white hover:bg-sky-500 sm:col-span-2">Solar Calculator ↗</a>
                </div>
              </section>

              <nav className="mt-4 grid grid-cols-1 gap-1 sm:grid-cols-2" aria-label="Mobile primary navigation">
                {primaryLinks.map((item) => <Link key={item.href} href={item.href} onClick={closeMenu} className={mobileLinkClass(item.href)}>{item.label}</Link>)}
              </nav>

              <section className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
                <p className="px-1 pb-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Learning & methodology</p>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {learningLinks.map((item) => <Link key={item.href} href={item.href} onClick={closeMenu} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-white hover:text-emerald-700">{item.label}</Link>)}
                </div>
              </section>

              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-200 pt-4">
                <Link href="/privacy-policy" onClick={closeMenu} className="rounded-lg px-3 py-2.5 text-center text-xs font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-800">Privacy</Link>
                <Link href="/terms-of-service" onClick={closeMenu} className="rounded-lg px-3 py-2.5 text-center text-xs font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-800">Terms</Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
