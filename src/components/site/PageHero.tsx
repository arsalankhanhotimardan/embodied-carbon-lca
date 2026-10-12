import Link from "next/link";
import { Check, ChevronRight, type LucideIcon } from "lucide-react";

export type Crumb = { label: string; href?: string };

const DEFAULT_BADGES = ["Free", "No signup", "Runs in your browser", "Formulas shown"];

/** Light hero used on calculator, guide and reference pages. */
export default function PageHero({
  crumbs,
  eyebrow,
  title,
  intro,
  badges = DEFAULT_BADGES,
  icon: Icon,
  tint = "bg-emerald-50 text-emerald-700",
  ring = "ring-emerald-100",
  maxWidth = "max-w-5xl",
}: {
  crumbs: Crumb[];
  eyebrow: string;
  title: string;
  intro: string;
  badges?: string[];
  icon?: LucideIcon;
  tint?: string;
  ring?: string;
  maxWidth?: string;
}) {
  return (
    <section className="hero-light border-b border-slate-200/70">
      <div className={`mx-auto w-full ${maxWidth} px-4 pb-10 pt-7 sm:px-6 sm:pb-14 sm:pt-10 lg:px-8`}>
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs font-bold text-slate-500">
          <Link href="/" className="hover:text-emerald-700">Home</Link>
          {crumbs.map((c) => (
            <span key={c.label} className="contents">
              <ChevronRight className="h-3.5 w-3.5 text-slate-300" aria-hidden="true" />
              {c.href ? <Link href={c.href} className="hover:text-emerald-700">{c.label}</Link> : <span className="text-slate-700">{c.label}</span>}
            </span>
          ))}
        </nav>

        <div className="mt-6 flex items-start gap-5">
          {Icon ? (
            <span className={`hidden h-14 w-14 shrink-0 place-items-center rounded-2xl ring-1 sm:grid ${tint} ${ring}`}>
              <Icon className="h-7 w-7" aria-hidden="true" />
            </span>
          ) : null}
          <div className="min-w-0 max-w-3xl">
            <p className="inline-flex rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700">{eyebrow}</p>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl sm:leading-[1.05]">{title}</h1>
            <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">{intro}</p>
            {badges.length ? (
              <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold text-slate-600">
                {badges.map((b) => (
                  <li key={b} className="inline-flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-600" strokeWidth={3} aria-hidden="true" /> {b}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
