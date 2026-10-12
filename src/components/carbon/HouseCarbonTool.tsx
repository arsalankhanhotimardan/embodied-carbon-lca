"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BENCHMARK_OPTIONS, FT2_PER_M2, LETI_RESIDENTIAL, estimate, optionById } from "@/data/house-carbon-benchmarks";

const inputCls =
  "w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200";

const fmt = (v: number, digits = 1) => v.toLocaleString("en-US", { maximumFractionDigits: digits });

export default function HouseCarbonTool() {
  const [optionId, setOptionId] = useState("house-timber");
  const [unit, setUnit] = useState<"m2" | "ft2">("m2");
  const [area, setArea] = useState("150");
  const [copied, setCopied] = useState(false);

  const areaM2 = unit === "m2" ? Number(area) : Number(area) / FT2_PER_M2;
  const result = useMemo(() => estimate(optionId, areaM2), [optionId, areaM2]);
  const option = optionById(optionId)!;
  const barMax = Math.max(option.high, option.residential ? LETI_RESIDENTIAL.y2020 : 0, 100) * 1.1;

  const summary = result ? `${option.label}, ${fmt(areaM2, 0)} m²: about ${fmt(result.typicalT)} tCO₂e (${fmt(result.lowT)}–${fmt(result.highT)} t), ${option.scope} screening estimate` : "";

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
      <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-2">
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-black text-slate-600">Building type and structure</span>
            <select value={optionId} onChange={(e) => setOptionId(e.target.value)} className={inputCls}>
              {(["House", "Other building"] as const).map((group) => (
                <optgroup key={group} label={group === "House" ? "Houses" : "Other buildings"}>
                  {BENCHMARK_OPTIONS.filter((o) => o.group === group).map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-black text-slate-600">Gross internal floor area</span>
              <input type="number" inputMode="decimal" min={1} step="any" value={area} onChange={(e) => setArea(e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-black text-slate-600">Unit</span>
              <select
                value={unit}
                onChange={(e) => {
                  const next = e.target.value as "m2" | "ft2";
                  const current = Number(area);
                  if (Number.isFinite(current) && current > 0 && next !== unit) setArea(String(Math.round(next === "ft2" ? current * FT2_PER_M2 : current / FT2_PER_M2)));
                  setUnit(next);
                }}
                className={inputCls}
              >
                <option value="m2">m²</option>
                <option value="ft2">sq ft</option>
              </select>
            </label>
          </div>
          <div className="rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-600">
            <div className="font-black text-slate-800">Basis ({option.scope}, confidence: {option.confidence})</div>
            <p className="mt-1">{option.basis}</p>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-950 p-5 text-white sm:p-6" role="status" aria-live="polite">
          <p className="text-xs font-black uppercase tracking-widest text-emerald-300">Screening estimate</p>
          {result ? (
            <>
              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-xs font-bold text-slate-400">Typical embodied carbon ({option.scope})</p>
                <p className="mt-1 font-mono text-3xl font-black sm:text-4xl">
                  {fmt(result.typicalT)} <span className="text-xl text-emerald-300">tCO₂e</span>
                </p>
                <p className="mt-1 text-xs text-slate-400">Range {fmt(result.lowT)} – {fmt(result.highT)} tCO₂e · {fmt(option.typical, 0)} kgCO₂e/m²</p>
              </div>

              <div className="mt-4" aria-hidden="true">
                <div className="mb-1 flex justify-between text-[11px] text-slate-400"><span>kgCO₂e per m²</span><span>{fmt(barMax, 0)}</span></div>
                <div className="relative h-4 rounded-full bg-slate-800">
                  <div className="absolute inset-y-0 rounded-full bg-emerald-500/40" style={{ left: `${(option.low / barMax) * 100}%`, width: `${((option.high - option.low) / barMax) * 100}%` }} />
                  <div className="absolute inset-y-0 w-1 rounded bg-emerald-300" style={{ left: `${(option.typical / barMax) * 100}%` }} />
                  {option.residential
                    ? [LETI_RESIDENTIAL.y2020, LETI_RESIDENTIAL.y2030].map((t) => (
                        <div key={t} className="absolute -inset-y-1 w-0.5 bg-amber-300" style={{ left: `${(t / barMax) * 100}%` }} />
                      ))
                    : null}
                </div>
                {option.residential ? <p className="mt-2 text-[11px] text-amber-200">Amber lines: LETI residential targets, {LETI_RESIDENTIAL.y2020} (2020) and {LETI_RESIDENTIAL.y2030} (2030) kgCO₂e/m², scope A1–A5.</p> : null}
              </div>

              <p className="mt-4 text-xs leading-5 text-slate-300">
                {option.scope === "A1–A3"
                  ? "A1–A3 is the product stage only. Transport to site, construction (A4–A5), replacement, use and end of life add to this, so treat it as a lower bound of whole-life carbon."
                  : "A1–A5 covers products, transport to site and construction. Use, replacement and end of life are not included."}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(summary);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    } catch {
                      // Clipboard can be blocked; ignore.
                    }
                  }}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-black text-slate-200 hover:bg-slate-800"
                >
                  {copied ? "Copied ✓" : "Copy result"}
                </button>
                <Link href="/#calculator-workspace" className="text-xs font-black text-emerald-300 underline underline-offset-4">Calculate from your own materials →</Link>
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-slate-400">Enter a floor area above zero.</p>
          )}
        </div>
      </div>
    </div>
  );
}
