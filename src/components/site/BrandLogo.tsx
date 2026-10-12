import { Zap } from "lucide-react";

/** Shared brand lockup, identical on the main site and the solar site. */
export default function BrandLogo({ tone = "light", sub }: { tone?: "light" | "dark"; sub?: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-1 ring-white/25 sm:h-10 sm:w-10">
        <Zap className="h-5 w-5" strokeWidth={2.6} aria-hidden="true" />
      </span>
      <span className="min-w-0 leading-tight">
        <span className={`block truncate text-[15px] font-black tracking-tight min-[360px]:text-base sm:text-lg ${tone === "dark" ? "text-white" : "text-slate-950"}`}>
          GreenEngineering <span className="text-emerald-500">Tools</span>
        </span>
        {sub ? <span className={`block text-[10px] font-bold uppercase tracking-[0.16em] ${tone === "dark" ? "text-slate-400" : "text-slate-500"}`}>{sub}</span> : null}
      </span>
    </span>
  );
}
