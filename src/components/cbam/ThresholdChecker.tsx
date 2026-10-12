"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { isMassThresholdEligibleSector } from "@/lib/cbam-regulatory-calendar";

const SECTORS = [
  { key: "cement", label: "Cement" },
  { key: "iron_steel", label: "Iron & steel" },
  { key: "aluminium", label: "Aluminium" },
  { key: "fertiliser", label: "Fertilisers" },
  { key: "hydrogen", label: "Hydrogen" },
  { key: "electricity", label: "Electricity" },
] as const;

type Role = "eu-importer" | "non-eu" | "unsure";

const tonnesFrom = (value: string) => Math.max(0, Number(value) || 0);

export default function ThresholdChecker() {
  const [role, setRole] = useState<Role>("eu-importer");
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  const result = useMemo(() => {
    const eligible = SECTORS.filter((s) => isMassThresholdEligibleSector(s.key)).reduce((sum, s) => sum + tonnesFrom(amounts[s.key] ?? ""), 0);
    const outside = SECTORS.filter((s) => !isMassThresholdEligibleSector(s.key)).reduce((sum, s) => sum + tonnesFrom(amounts[s.key] ?? ""), 0);
    const any = eligible + outside > 0;
    return { eligible, outside, any, below: eligible <= 50 && outside === 0 };
  }, [amounts]);

  return (
    <section className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="checker-heading">
      <h2 id="checker-heading" className="text-lg font-black text-slate-950">Check your position</h2>

      <fieldset className="mt-4">
        <legend className="text-sm font-bold text-slate-700">Which best describes you?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {([
            ["eu-importer", "I import goods into the EU"],
            ["non-eu", "I export to the EU from outside it"],
            ["unsure", "Not sure"],
          ] as [Role, string][]).map(([value, text]) => (
            <label
              key={value}
              className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-bold ${role === value ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-emerald-400"}`}
            >
              <input type="radio" name="role" value={value} checked={role === value} onChange={() => setRole(value)} className="sr-only" />
              {text}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-5">
        <div className="text-sm font-bold text-slate-700">Net mass imported into the EU in one calendar year (tonnes)</div>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          {SECTORS.map((s) => (
            <label key={s.key} className="block text-sm font-semibold text-slate-700">
              {s.label}
              <input
                type="number"
                inputMode="decimal"
                min={0}
                placeholder="0"
                value={amounts[s.key] ?? ""}
                onChange={(e) => setAmounts((prev) => ({ ...prev, [s.key]: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="mt-6" role="status" aria-live="polite">
        {!result.any ? (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Enter your yearly tonnage to see whether you are above or below the 50-tonne threshold.</p>
        ) : result.below ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
            <div className="text-lg font-black">Likely below the 50-tonne threshold</div>
            <p className="mt-1 text-sm leading-6">
              Your threshold-eligible goods total {result.eligible.toLocaleString("en-GB")} t. Importers at or under 50 tonnes of cement, iron and steel,
              aluminium and fertilisers per calendar year are exempt from authorised-declarant status, the annual declaration and certificates.
              {result.eligible > 40 ? " You are close to the limit, so track every shipment through the year." : ""}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
            <div className="text-lg font-black">CBAM obligations likely apply</div>
            <p className="mt-1 text-sm leading-6">
              {result.outside > 0
                ? "Hydrogen and electricity are not covered by the 50-tonne exemption, so any import of them is in scope. "
                : `Your threshold-eligible goods total ${result.eligible.toLocaleString("en-GB")} t, above the 50-tonne limit. `}
              Expect to need authorised-declarant status, an annual CBAM declaration and certificates covering the embedded emissions.
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-sm font-black">
              <Link href="/cbam/deadlines" className="text-amber-900 underline underline-offset-4">See deadlines and checklist</Link>
              <Link href="/cbam-calculator" className="text-amber-900 underline underline-offset-4">Estimate your cost</Link>
            </div>
          </div>
        )}
        {role === "non-eu" ? (
          <p className="mt-3 rounded-2xl bg-sky-50 p-4 text-sm leading-6 text-sky-950">
            CBAM obligations fall on the EU importer, not the exporter. Your EU customers will still ask you for verified emissions data per
            product and installation, so see the{" "}
            <Link href="/cbam/cn-code-lookup" className="font-bold underline underline-offset-2">default values for your country</Link> and consider
            reporting actual emissions, which can lower their cost.
          </p>
        ) : null}
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-500">
        Scope depends on the CN code, so confirm your goods in the{" "}
        <Link href="/cbam/cn-code-lookup" className="font-bold text-emerald-700 underline underline-offset-2">CN code lookup</Link>. Nothing you enter leaves your browser.
      </p>
    </section>
  );
}
