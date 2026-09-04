"use client";

import Link from "next/link";
import Papa from "papaparse";
import { useEffect, useMemo, useRef, useState } from "react";
import AnonymousWorkspacePanel from "@/components/AnonymousWorkspacePanel";

type CsvRow = {
  Supplier?: string;
  Country?: string;
  CN_Code?: string;
  Tonnes?: string | number;
  Reporting_Year?: string | number;
  Production_Year?: string | number;
  Certificate_Price_EUR?: string | number;
  Prior_YTD_Eligible_Mass?: string | number;
};
type YearOption = { year: number; readiness?: string };
type PriceRecord = { year: number; periodKey?: string; quarter?: string; week?: number; periodStart?: string | null; price: number; official: boolean };

const BULK_CBAM_VERSION = "CBAM-Bulk-V1";
const CBAM_WORKSPACE_VERSION = "Workspace-V2.7";

const numberOr = (value: unknown, fallback: number): number => {
  if (value === undefined || value === null || String(value).trim() === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};
const numberOrNull = (value: unknown): number | null => {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};
const fallbackYears = () => {
  const current = Math.max(2026, new Date().getUTCFullYear());
  const horizon = Math.max(2034, current + 1);
  return Array.from({ length: horizon - 2026 + 1 }, (_, i) => ({ year: 2026 + i }));
};
const priceLabel = (row: PriceRecord) => row.quarter ? `${row.quarter} ${row.year}` : row.week ? `Week ${row.week}, ${row.year}` : row.periodKey || String(row.year);

export default function OfficialBulkCbamPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [years, setYears] = useState<YearOption[]>(fallbackYears);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [defaultYear, setDefaultYear] = useState(2026);
  const [priceRecords, setPriceRecords] = useState<PriceRecord[]>([]);
  const [selectedPriceKey, setSelectedPriceKey] = useState("planning");
  const [planningPrice, setPlanningPrice] = useState("");

  const anonymousWorkspaceSnapshot = useMemo(
    () => ({
      workspaceVersion: CBAM_WORKSPACE_VERSION,
      appVersion: BULK_CBAM_VERSION,
      defaultYear,
      selectedPriceKey,
      planningPrice,
      rows,
      results,
    }),
    [defaultYear, selectedPriceKey, planningPrice, rows, results]
  );

  const restoreAnonymousWorkspace = (raw: any) => {
    if (!raw || typeof raw !== "object") return;
    const restoredYear = Number(raw.defaultYear);
    if (Number.isInteger(restoredYear) && restoredYear >= 2026 && restoredYear <= 2100) {
      setDefaultYear(restoredYear);
    }
    setSelectedPriceKey(
      typeof raw.selectedPriceKey === "string" ? raw.selectedPriceKey : "planning"
    );
    setPlanningPrice(
      typeof raw.planningPrice === "string" ? raw.planningPrice : String(raw.planningPrice ?? "")
    );
    setRows(Array.isArray(raw.rows) ? raw.rows.slice(0, 200) : []);
    setResults(Array.isArray(raw.results) ? raw.results.slice(0, 200) : []);
    setErrors([]);
  };

  useEffect(() => {
    const controller = new AbortController();
    const loadYears = async () => {
      try {
        const res = await fetch("/api/cbam/years", { cache: "no-store", signal: controller.signal });
        if (!res.ok) return;
        const json = await res.json();
        if (json?.success && Array.isArray(json.years) && json.years.length) {
          setYears(json.years);
          setDefaultYear(Number(json.defaultYear) || 2026);
        }
      } catch (e) {
        if ((e as Error)?.name !== "AbortError") setErrors(["Could not load dynamic CBAM years."]);
      }
    };
    loadYears();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const loadPrices = async () => {
      try {
        const res = await fetch(`/api/cbam?year=${defaultYear}`, { cache: "no-store", signal: controller.signal });
        if (!res.ok) throw new Error();
        const json = await res.json();
        if (!json?.success) throw new Error();
        const priceRows: PriceRecord[] = Array.isArray(json.prices)
          ? json.prices.map((r: any) => ({ year: Number(r.year), periodKey: r.periodKey, quarter: r.quarter, week: r.week == null ? undefined : Number(r.week), periodStart: r.periodStart ?? null, price: Number(r.price), official: Boolean(r.official) })).filter((r: PriceRecord) => r.year === defaultYear && Number.isFinite(r.price))
          : [];
        setPriceRecords(priceRows);
        const plan = numberOrNull(json.planningEtsPrice) ?? numberOrNull(json.etsPrice);
        setPlanningPrice(plan === null ? "" : String(plan));
        const official = [...priceRows].filter((x) => x.official).sort((a, b) => (b.periodStart ? Date.parse(b.periodStart) : 0) - (a.periodStart ? Date.parse(a.periodStart) : 0) || (b.week || 0) - (a.week || 0))[0];
        setSelectedPriceKey(official?.periodKey || "planning");
      } catch {
        setPriceRecords([]);
        setSelectedPriceKey("planning");
        setPlanningPrice("");
      }
    };
    loadPrices();
    return () => controller.abort();
  }, [defaultYear]);

  const selectedPriceRecord = useMemo(() => priceRecords.find((x) => x.periodKey === selectedPriceKey) || null, [priceRecords, selectedPriceKey]);
  const fallbackPrice = selectedPriceRecord ? selectedPriceRecord.price : numberOrNull(planningPrice);

  const upload = (file?: File) => {
    if (!file) return;
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (parsed) => {
        const cleaned = (parsed.data || []).slice(0, 200);
        setRows(cleaned);
        setResults([]);
        setErrors((parsed.errors || []).map((e) => `CSV row ${e.row ?? "?"}: ${e.message}`));
      },
    });
  };

  const calculate = async () => {
    setErrors([]); setResults([]);
    if (!rows.length) return setErrors(["Select a CSV file first."]);

    const clientErrors: string[] = [];
    const payload = rows.map((row, index) => {
      const reportingYear = numberOr(row.Reporting_Year, defaultYear);
      const productionYear = numberOr(row.Production_Year, reportingYear);
      const rowPrice = numberOrNull(row.Certificate_Price_EUR);
      const price = rowPrice ?? (reportingYear === defaultYear ? fallbackPrice : null);
      const country = String(row.Country || "").trim();
      const cnCode = String(row.CN_Code || "").trim();
      const tonnes = numberOrNull(row.Tonnes);

      if (!country) clientErrors.push(`Row ${index + 1}: Country is required.`);
      if (cnCode.replace(/\D/g, "").length < 4) clientErrors.push(`Row ${index + 1}: a valid CN_Code is required.`);
      if (tonnes === null || tonnes <= 0) clientErrors.push(`Row ${index + 1}: Tonnes must be greater than zero.`);
      if (price === null || price < 0) clientErrors.push(`Row ${index + 1}: Certificate_Price_EUR is missing. The selected fallback price only applies to fallback reporting year ${defaultYear}.`);
      if (productionYear > reportingYear) clientErrors.push(`Row ${index + 1}: Production_Year cannot be later than Reporting_Year.`);

      return {
        supplier: String(row.Supplier || ""),
        country,
        cnCode,
        tonnes: tonnes ?? 0,
        reportingYear,
        productionYear,
        certificatePriceEur: price ?? 0,
        priorYtdEligibleMassTonnes: numberOr(row.Prior_YTD_Eligible_Mass, 0),
      };
    });

    if (clientErrors.length) return setErrors(clientErrors.slice(0, 50));

    setLoading(true);
    try {
      const res = await fetch("/api/cbam/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows: payload }) });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Bulk calculation failed.");
      setResults(json.results || []);
    } catch (e) {
      setErrors([e instanceof Error ? e.message : "Bulk calculation failed."]);
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!results.length) return;
    const csv = Papa.unparse(results.map((r) => ({ Row: r.row, Success: r.success, Supplier: r.supplier || "", Country: r.country || "", CN_Code: r.cnCode || "", Matched_CN: r.matchedCn || "", Sector: r.sector || "", Reporting_Year: r.reportingYear || "", Production_Year: r.productionYear || "", Regulatory_Year: r.regulatoryYear || "", Tonnes: r.tonnes ?? "", EF: r.ef ?? "", SEFA: r.sefa ?? "", Embedded_tCO2e: r.embeddedEmissionsTco2e ?? "", FAA_tCO2e: r.freeAllocationAdjustmentTco2e ?? "", Certificates: r.certificates ?? "", Estimated_Exposure_EUR: r.estimatedExposureEur ?? "", Threshold_Exempt: r.threshold?.exempt ?? "", Error: r.error || "" })));
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "cbam-official-bulk-results.csv"; a.click(); URL.revokeObjectURL(url);
  };

  return <main className="mx-auto min-w-0 max-w-7xl overflow-x-hidden px-3 py-6 sm:px-6 sm:py-10">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="text-xs font-black uppercase tracking-widest text-emerald-700">Official reference workflow</div><h1 className="mt-2 break-words text-2xl font-black sm:text-4xl">CBAM bulk CSV calculator</h1><p className="mt-3 max-w-3xl text-slate-600">No stale demonstration certificate price is preloaded. Choose a fallback year and price period, or provide Certificate_Price_EUR per CSV row.</p></div><Link href="/cbam-calculator" className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-center font-bold sm:w-auto">← Main calculator</Link></div>

    <AnonymousWorkspacePanel
      toolId="cbam-bulk"
      toolLabel="CBAM bulk CSV"
      toolVersion={`${BULK_CBAM_VERSION} · ${CBAM_WORKSPACE_VERSION}`}
      snapshot={anonymousWorkspaceSnapshot}
      onRestore={restoreAnonymousWorkspace}
      defaultSaveName="CBAM bulk project"
      className="mt-6"
    />

    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label><span className="text-xs font-black text-slate-600">Fallback reporting year</span><select value={defaultYear} onChange={(e) => setDefaultYear(Number(e.target.value))} className="input">{years.map((y) => <option key={y.year} value={y.year}>{y.year}{y.readiness === "data-pending" ? " — data pending" : ""}</option>)}</select></label>
        <label><span className="text-xs font-black text-slate-600">Fallback price period</span><select value={selectedPriceKey} onChange={(e) => setSelectedPriceKey(e.target.value)} className="input"><option value="planning">Planning price / manual</option>{priceRecords.map((row) => <option key={row.periodKey} value={row.periodKey}>{priceLabel(row)} {row.official ? "— official" : "— provisional"} — €{row.price.toFixed(2)}</option>)}</select></label>
        <label><span className="text-xs font-black text-slate-600">Fallback certificate price €</span><input type="number" min="0" value={selectedPriceRecord ? String(selectedPriceRecord.price) : planningPrice} readOnly={Boolean(selectedPriceRecord)} onChange={(e) => setPlanningPrice(e.target.value)} placeholder="Enter fallback price" className="input read-only:bg-slate-100" /></label>
      </div>
      <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm"><strong>Required:</strong> <code>Country, CN_Code, Tonnes</code>. Recommended: <code>Supplier, Reporting_Year, Production_Year, Certificate_Price_EUR, Prior_YTD_Eligible_Mass</code>. If a row uses a reporting year different from the fallback year, provide <code>Certificate_Price_EUR</code> on that row.</div>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:flex sm:flex-wrap"><input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => upload(e.target.files?.[0])}/><button type="button" onClick={() => inputRef.current?.click()} className="w-full rounded-xl bg-slate-900 px-5 py-3 font-black text-white sm:w-auto">Select CSV</button><button type="button" onClick={calculate} disabled={!rows.length || loading} className="w-full rounded-xl bg-emerald-700 px-5 py-3 font-black text-white disabled:opacity-40 sm:w-auto">{loading ? "Calculating…" : `Calculate ${rows.length || 0} rows`}</button>{results.length > 0 && <button type="button" onClick={download} className="w-full rounded-xl border border-emerald-300 px-5 py-3 font-black text-emerald-800 sm:w-auto">Download results CSV</button>}</div>
      {errors.length > 0 && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><ul className="list-disc pl-5">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul></div>}
    </section>

    {rows.length > 0 && <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-200 p-4 font-black">Input preview ({rows.length})</div><div className="max-h-72 overflow-auto"><table className="min-w-[760px] w-full text-left text-xs"><thead className="sticky top-0 bg-slate-100"><tr>{["Supplier","Country","CN_Code","Tonnes","Reporting_Year","Production_Year","Certificate_Price_EUR"].map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i} className="border-t"><td className="p-3">{r.Supplier}</td><td className="p-3">{r.Country}</td><td className="p-3 font-mono">{r.CN_Code}</td><td className="p-3">{r.Tonnes}</td><td className="p-3">{r.Reporting_Year || defaultYear}</td><td className="p-3">{r.Production_Year || r.Reporting_Year || defaultYear}</td><td className="p-3">{r.Certificate_Price_EUR || (numberOr(r.Reporting_Year, defaultYear) === defaultYear ? fallbackPrice ?? "" : "required")}</td></tr>)}</tbody></table></div></section>}
    {results.length > 0 && <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-200 p-4 font-black">Official calculation results</div><div className="overflow-auto"><table className="min-w-[1050px] w-full text-left text-xs"><thead className="bg-slate-100"><tr>{["Row","Status","Supplier","Country","CN","Matched","Sector","EF","SEFA","Certificates","Exposure €","Threshold","Error"].map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{results.map((r: any) => <tr key={r.row} className="border-t"><td className="p-3">{r.row}</td><td className={`p-3 font-black ${r.success ? "text-emerald-700" : "text-red-700"}`}>{r.success ? "OK" : "ERROR"}</td><td className="p-3">{r.supplier}</td><td className="p-3">{r.country}</td><td className="p-3 font-mono">{r.cnCode}</td><td className="p-3 font-mono">{r.matchedCn}</td><td className="p-3">{r.sector}</td><td className="p-3">{r.ef == null ? "" : Number(r.ef).toFixed(4)}</td><td className="p-3">{r.sefa == null ? "Pending" : Number(r.sefa).toFixed(4)}</td><td className="p-3">{r.certificates == null ? "Pending" : Number(r.certificates).toFixed(3)}</td><td className="p-3">{r.estimatedExposureEur == null ? "Pending" : Number(r.estimatedExposureEur).toFixed(2)}</td><td className="p-3">{r.threshold?.exempt ? "Exempt" : "In scope"}</td><td className="p-3 text-red-700">{r.error}</td></tr>)}</tbody></table></div></section>}
    <style jsx global>{`.input{display:block;width:100%;min-width:0;margin-top:.3rem;border:1px solid rgb(203 213 225);border-radius:.65rem;padding:.75rem .8rem;background:white;font-size:16px}`}</style>
  </main>;
}
