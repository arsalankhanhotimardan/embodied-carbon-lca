import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

/** Dark hero for tool hubs (electrical, building envelope, guides, CBAM). */
export default function HubHero({
  eyebrow,
  title,
  intro,
  icon: Icon,
  ctas = [],
  chips = [],
}: {
  eyebrow: string;
  title: string;
  intro: string;
  icon?: LucideIcon;
  ctas?: { label: string; href: string; primary?: boolean }[];
  chips?: string[];
}) {
  return (
    <section className="hero-dark hero-grid overflow-x-clip text-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="flex items-center gap-3">
          {Icon ? (
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30">
              <Icon className="h-6 w-6" aria-hidden="true" />
            </span>
          ) : null}
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">{eyebrow}</p>
        </div>
        <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight sm:text-5xl lg:text-[3.4rem] lg:leading-[1.05]">{title}</h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">{intro}</p>
        {ctas.length ? (
          <div className="mt-8 flex flex-wrap gap-3">
            {ctas.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className={
                  c.primary
                    ? "inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-400"
                    : "inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-black text-white transition hover:bg-white/10"
                }
              >
                {c.label} {c.primary ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
              </Link>
            ))}
          </div>
        ) : null}
        {chips.length ? (
          <ul className="mt-7 flex flex-wrap gap-2 text-xs font-bold text-slate-300">
            {chips.map((c) => (
              <li key={c} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">{c}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
