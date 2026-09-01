"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";

type CountryOption = { name: string; normalized: string };
type YearOption = { year: number; readiness?: string; priceCadence?: string };
type PriceRecord = { year: number; periodKey?: string; quarter?: string; week?: number; periodStart?: string | null; price: number; official: boolean };

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const fallbackYears = (): YearOption[] => {
  const currentYear = Math.max(2026, new Date().getUTCFullYear());
  const horizon = Math.max(2034, currentYear + 1);
  return Array.from({ length: horizon - 2026 + 1 }, (_, i) => ({ year: 2026 + i, priceCadence: i === 0 ? "quarterly" : "weekly" }));
};

const priceLabel = (row: PriceRecord) => row.quarter ? `${row.quarter} ${row.year}` : row.week ? `Week ${row.week}, ${row.year}` : row.periodKey || String(row.year);

export default function ElectricityCbamPage() {
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [years, setYears] = useState<YearOption[]>(fallbackYears);
  const [country, setCountry] = useState("");
  const [year, setYear] = useState(2026);
  const [mwh, setMwh] = useState("");
  const [mode, setMode] = useState<"default" | "actual">("default");
  const [ef, setEf] = useState("");
  const [ppa, setPpa] = useState(false);
  const [connection, setConnection] = useState(false);
  const [nomination, setNomination] = useState(false);
  const [verifier, setVerifier] = useState(false);

  const [priceRecords, setPriceRecords] = useState<PriceRecord[]>([]);
  const [selectedPriceKey, setSelectedPriceKey] = useState("planning");
  const [planningPrice, setPlanningPrice] = useState("");
  const [priceLoading, setPriceLoading] = useState(false);

  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const initialise = async () => {
      const params = new URLSearchParams(window.location.search);
      const paramCountry = params.get("country")?.trim() || "";
      const paramYear = toNumber(params.get("reportingYear"));
      if (paramCountry) setCountry(paramCountry);

      try {
        const [yearsRes, countriesRes] = await Promise.all([
          fetch("/api/cbam/years", { cache: "no-store", signal: controller.signal }),
          fetch("/api/cbam/reference/options", { cache: "no-store", signal: controller.signal }),
        ]);
        if (yearsRes.ok) {
          const json = await yearsRes.json();
          if (json?.success && Array.isArray(json.years) && json.years.length) {
            setYears(json.years);
            const allowed = new Set<number>(json.years.map((x: any) => Number(x.year)));
            setYear(paramYear && allowed.has(paramYear) ? paramYear : Number(json.defaultYear) || 2026);
          }
        }
        if (countriesRes.ok) {
          const json = await countriesRes.json();
          if (json?.success && Array.isArray(json.countries)) setCountries(json.countries);
        }
      } catch (e) {
        if ((e as Error)?.name !== "AbortError") setError("Could not load CBAM country/year options.");
      }
    };
    initialise();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const loadPrices = async () => {
      setPriceLoading(true);
      try {
        const res = await fetch(`/api/cbam?year=${year}`, { cache: "no-store", signal: controller.signal });
        if (!res.ok) throw new Error();
        const json = await res.json();
        if (!json?.success) throw new Error();
        const rows: PriceRecord[] = Array.isArray(json.prices)
          ? json.prices.map((r: any) => ({ year: Number(r.year), periodKey: r.periodKey, quarter: r.quarter, week: r.week == null ? undefined : Number(r.week), periodStart: r.periodStart ?? null, price: Number(r.price), official: Boolean(r.official) })).filter((r: PriceRecord) => r.year === year && Number.isFinite(r.price))
          : [];
        setPriceRecords(rows);
        const planning = toNumber(json.planningEtsPrice) ?? toNumber(json.etsPrice);
        setPlanningPrice(planning === null ? "" : String(planning));
        const official = [...rows].filter((r) => r.official).sort((a, b) => (b.periodStart ? Date.parse(b.periodStart) : 0) - (a.periodStart ? Date.parse(a.periodStart) : 0) || (b.week || 0) - (a.week || 0))[0];
        setSelectedPriceKey(official?.periodKey || "planning");
      } catch {
        setPriceRecords([]);
        setSelectedPriceKey("planning");
        setPlanningPrice("");
      } finally {
        setPriceLoading(false);
      }
    };
    loadPrices();
    return () => controller.abort();
  }, [year]);

  const selectedPriceRecord = useMemo(() => priceRecords.find((x) => x.periodKey === selectedPriceKey) || null, [priceRecords, selectedPriceKey]);
  const effectivePrice = selectedPriceRecord ? selectedPriceRecord.price : toNumber(planningPrice);

  const calculate = async () => {
    setError(""); setResult(null);
    const mwhN = toNumber(mwh);
    const efN = toNumber(ef);
    if (!country) return setError("Select the country of origin.");
    if (mwhN === null || mwhN <= 0) return setError("Imported electricity must be greater than zero MWh.");
    if (effectivePrice === null || effectivePrice < 0) return setError("Select a certificate-price period or enter a planning price.");
    if (mode === "actual" && (efN === null || efN < 0)) return setError("Enter a valid actual electricity emission factor.");

    setLoading(true);
    try {
      const res = await fetch("/api/cbam/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "electricity",
          country,
          reportingYear: year,
          mwh: mwhN,
          certificatePriceEur: effectivePrice,
          mode,
          actualEmissionFactorTco2PerMwh: mode === "actual" ? efN : undefined,
          actualCriteria: mode === "actual" ? { ppa, directConnectionOrNoCongestion: connection, firmlyNominatedSameHour: nomination, accreditedVerifierCertification: verifier } : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Electricity calculation failed.");
      setResult(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Calculation failed.");
    } finally {
      setLoading(false);
    }
  };

  return <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><div className="text-xs font-black uppercase tracking-widest text-blue-700">Dedicated sector methodology</div><h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">CBAM electricity calculator</h1><p className="mt-3 max-w-3xl text-slate-600">Electricity is measured in MWh. No demonstration country, MWh quantity, emission factor or certificate price is preloaded.</p></div>
      <Link href="/cbam-calculator" className="rounded-xl border border-slate-300 px-4 py-2 font-bold">← Main calculator</Link>
    </div>
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Country of origin"><select className="input" value={country} onChange={(e) => setCountry(e.target.value)}><option value="">Select country</option>{country && !countries.some((x) => x.name === country) && <option value={country}>{country}</option>}{countries.map((item) => <option key={item.normalized} value={item.name}>{item.name}</option>)}</select></Field>
          <Field label="Import / reporting year"><select className="input" value={year} onChange={(e) => setYear(Number(e.target.value))}>{years.map((y) => <option key={y.year} value={y.year}>{y.year}{y.readiness === "data-pending" ? " — data pending" : ""}</option>)}</select></Field>
          <Field label="Imported electricity (MWh)"><input className="input" type="number" min="0" value={mwh} onChange={(e) => setMwh(e.target.value)} placeholder="Enter MWh" /></Field>
          <Field label="Certificate-price period"><select className="input" value={selectedPriceKey} onChange={(e) => setSelectedPriceKey(e.target.value)} disabled={priceLoading}><option value="planning">Planning price / manual</option>{priceRecords.map((row) => <option key={row.periodKey} value={row.periodKey}>{priceLabel(row)} {row.official ? "— official" : "— provisional"} — €{row.price.toFixed(2)}</option>)}</select></Field>
          <Field label={selectedPriceRecord ? "Selected price (€ / tCO₂e)" : "Planning price (€ / tCO₂e)"}><input className="input read-only:bg-slate-100" type="number" min="0" value={selectedPriceRecord ? String(selectedPriceRecord.price) : planningPrice} readOnly={Boolean(selectedPriceRecord)} onChange={(e) => setPlanningPrice(e.target.value)} placeholder="Enter planning price" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1"><button type="button" onClick={() => setMode("default")} className={`rounded-lg p-2 font-black ${mode === "default" ? "bg-white shadow" : ""}`}>Official default EF</button><button type="button" onClick={() => setMode("actual")} className={`rounded-lg p-2 font-black ${mode === "actual" ? "bg-white shadow" : ""}`}>Actual electricity</button></div>
        {mode === "actual" && <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4"><Field label="Actual emission factor (tCO₂/MWh)"><input className="input" type="number" min="0" step="0.001" value={ef} onChange={(e) => setEf(e.target.value)} placeholder="Enter verified factor" /></Field><Check value={ppa} set={setPpa} label="Power Purchase Agreement (PPA) criterion satisfied"/><Check value={connection} set={setConnection} label="Direct connection / no relevant congestion criterion satisfied"/><Check value={nomination} set={setNomination} label="Firmly nominated interconnection capacity and same-hour production criterion satisfied"/><Check value={verifier} set={setVerifier} label="Accredited-verifier certification / evidence criterion satisfied"/><p className="text-xs text-blue-900">If an actual-electricity eligibility criterion fails, the engine returns a planning scenario and withholds a declaration-style final value.</p></div>}
        <button type="button" onClick={calculate} disabled={loading} className="w-full rounded-xl bg-blue-700 px-5 py-3 font-black text-white disabled:opacity-50">{loading ? "Calculating…" : "Calculate electricity"}</button>
        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-black">Result</h2>{!result ? <p className="mt-4 text-sm text-slate-500">Enter the country, quantity and price period. Default mode requires an active official Annex III electricity-factor dataset and will fail safely if none is active.</p> : <div className="mt-5 space-y-3"><Metric label="Emission factor" value={`${Number(result.emissionFactorTco2PerMwh).toFixed(4)} tCO₂/MWh`}/><Metric label="Embedded emissions" value={`${Number(result.embeddedEmissionsTco2e).toFixed(3)} tCO₂e`}/><Metric label="Free-allocation adjustment" value="0 tCO₂e"/><Metric label="Certificates before Article 9" value={Number(result.certificatesBeforeCarbonPriceReduction).toFixed(3)}/><Metric label="Gross estimated exposure" value={`€${Number(result.grossEstimatedExposureEur).toLocaleString(undefined,{maximumFractionDigits:2})}`}/><div className={`rounded-xl p-4 text-sm ${result.declarationReady ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}><strong>{result.declarationReady ? "Eligibility checks passed for this engine" : "Planning scenario only"}</strong>{result.warnings?.length > 0 && <ul className="mt-2 list-disc pl-5">{result.warnings.map((w:string,i:number) => <li key={i}>{w}</li>)}</ul>}</div><details className="rounded-xl border border-slate-200 p-4"><summary className="cursor-pointer font-black">Source / JSON detail</summary><pre className="mt-3 overflow-auto text-xs">{JSON.stringify(result,null,2)}</pre></details></div>}</section>
    </div>
    <style jsx global>{`.input{width:100%;border:1px solid rgb(203 213 225);border-radius:.65rem;padding:.7rem .8rem;background:white}`}</style>
  </main>;
}

function Field({label,children}:{label:string;children:ReactNode}){return <label><span className="mb-1 block text-xs font-black text-slate-600">{label}</span>{children}</label>}
function Check({value,set,label}:{value:boolean;set:(v:boolean)=>void;label:string}){return <label className="flex gap-2 text-sm"><input type="checkbox" checked={value} onChange={(e)=>set(e.target.checked)}/>{label}</label>}
function Metric({label,value}:{label:string;value:string}){return <div className="rounded-xl bg-slate-50 p-4"><div className="text-xs font-bold text-slate-500">{label}</div><div className="mt-1 font-mono text-lg font-black">{value}</div></div>}
