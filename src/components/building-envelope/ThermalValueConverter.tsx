"use client";

import { useMemo, useState } from "react";
import { formatNumber, rsiToRUs, rsiToUValue, rUsToRsi, uValueToRsi } from "@/lib/building-envelope/envelope-engine";

type InputMode = "r-us" | "rsi" | "u";

export default function ThermalValueConverter({ defaultMode = "r-us" }: { defaultMode?: InputMode }) {
  const [mode, setMode] = useState<InputMode>(defaultMode);
  const [value, setValue] = useState(defaultMode === "u" ? 0.25 : defaultMode === "rsi" ? 5 : 30);
  const [lambda, setLambda] = useState(0.04);

  const result = useMemo(() => {
    try {
      const rsi = mode === "r-us" ? rUsToRsi(value) : mode === "u" ? uValueToRsi(value) : value;
      if (!(rsi > 0)) throw new Error("Enter a value greater than zero.");
      return {
        rsi,
        rUs: rsiToRUs(rsi),
        u: rsiToUValue(rsi),
        thicknessMm: lambda > 0 ? rsi * lambda * 1000 : null,
        error: null as string | null,
      };
    } catch (error) {
      return { rsi: null, rUs: null, u: null, thicknessMm: null, error: error instanceof Error ? error.message : "Invalid input." };
    }
  }, [mode, value, lambda]);

  return (
    <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <label className="block min-w-0 flex-1">
          <span className="mb-1.5 block text-sm font-black text-slate-900">I know</span>
          <select value={mode} onChange={(e) => setMode(e.target.value as InputMode)} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold">
            <option value="r-us">R-value (US / ft²·°F·h/BTU)</option>
            <option value="rsi">RSI (m²·K/W)</option>
            <option value="u">U-value (W/m²·K)</option>
          </select>
        </label>
        <label className="block min-w-0 flex-1">
          <span className="mb-1.5 block text-sm font-black text-slate-900">Value</span>
          <input type="number" min="0.0001" step="any" value={value} onChange={(e) => setValue(Number(e.target.value))} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold" />
        </label>
        <label className="block min-w-0 flex-1">
          <span className="mb-1.5 block text-sm font-black text-slate-900">Optional λ (W/m·K)</span>
          <input type="number" min="0.001" step="0.001" value={lambda} onChange={(e) => setLambda(Number(e.target.value))} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold" />
        </label>
      </div>
      {result.error ? <p className="mt-4 rounded-xl bg-rose-100 p-3 text-sm font-bold text-rose-800">{result.error}</p> : (
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl bg-white p-4"><div className="text-xs font-black uppercase tracking-wider text-slate-500">R-value US</div><div className="mt-1 text-xl font-black text-slate-950">R-{formatNumber(result.rUs, 2)}</div></div>
          <div className="rounded-2xl bg-white p-4"><div className="text-xs font-black uppercase tracking-wider text-slate-500">RSI</div><div className="mt-1 text-xl font-black text-slate-950">{formatNumber(result.rsi, 3)}</div></div>
          <div className="rounded-2xl bg-white p-4"><div className="text-xs font-black uppercase tracking-wider text-slate-500">U-value</div><div className="mt-1 text-xl font-black text-slate-950">{formatNumber(result.u, 3)} W/m²·K</div></div>
          <div className="rounded-2xl bg-white p-4"><div className="text-xs font-black uppercase tracking-wider text-slate-500">Thickness at λ</div><div className="mt-1 text-xl font-black text-slate-950">{formatNumber(result.thicknessMm, 0)} mm</div><div className="mt-1 text-xs text-slate-500">Homogeneous layer only.</div></div>
        </div>
      )}
    </section>
  );
}
