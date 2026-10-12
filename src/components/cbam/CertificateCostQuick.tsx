"use client";

import Link from "next/link";
import { useState } from "react";

const euro = new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export default function CertificateCostQuick({ price, periodLabel }: { price: number; periodLabel: string }) {
  const [emissions, setEmissions] = useState("1000");
  const tonnes = Math.max(0, Number(emissions) || 0);

  return (
    <section className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="quick-cost-heading">
      <h2 id="quick-cost-heading" className="text-lg font-black text-slate-950">Quick exposure check</h2>
      <p className="mt-1 text-sm text-slate-600">Gross certificate cost at the latest official price ({periodLabel}).</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-bold text-slate-700">
          Embedded emissions (tCO₂e)
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={emissions}
            onChange={(e) => setEmissions(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          />
        </label>
        <div className="rounded-2xl bg-emerald-50 p-4">
          <div className="text-xs font-black uppercase tracking-widest text-emerald-800">Gross cost</div>
          <div className="mt-1 text-3xl font-black text-emerald-950">{euro.format(tonnes * price)}</div>
          <div className="mt-1 text-xs text-emerald-900">{tonnes.toLocaleString("en-GB")} t × €{price.toFixed(2)}</div>
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">
        This is a gross figure. It ignores the free-allocation adjustment, any carbon price paid in the country of origin, and the
        50-tonne threshold. Use the{" "}
        <Link href="/cbam-calculator" className="font-bold text-emerald-700 underline underline-offset-2">full CBAM calculator</Link>{" "}
        for a net estimate by CN code and country.
      </p>
    </section>
  );
}
