"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import AnonymousWorkspacePanel from "@/components/AnonymousWorkspacePanel";

type Precursor = {
  id: string;
  name: string;
  cnCode: string;
  country: string;
  massTonnes: string;
  source: "default" | "exempt";
  productionYear: number;
  route: string;
};

type CountryOption = { name: string; normalized: string };
type YearOption = {
  year: number;
  priceCadence?: "quarterly" | "weekly";
  readiness?: "official" | "planning-ready" | "data-pending";
  productionYearChoices?: number[];
};
type PriceRecord = {
  year: number;
  periodType?: string;
  periodKey?: string;
  quarter?: string;
  week?: number;
  periodStart?: string | null;
  periodEnd?: string | null;
  price: number;
  official: boolean;
};

const ACTUAL_CBAM_VERSION = "CBAM-Actual-V1";
const CBAM_WORKSPACE_VERSION = "Workspace-V2.7";

const routeOptions = [
  ["", "Auto / not specified"],
  ["A", "A — grey clinker / cement"],
  ["B", "B — white clinker / cement"],
  ["C", "C — Carbon Steel BF/BOF"],
  ["D", "D — Carbon Steel DRI/EAF"],
  ["E", "E — Carbon Steel Scrap/EAF"],
  ["F", "F — Low alloy Steel BF/BOF"],
  ["G", "G — Low alloy Steel DRI/EAF"],
  ["H", "H — Low alloy Steel Scrap/EAF"],
  ["J", "J — High alloy Steel EAF"],
  ["K", "K — primary Aluminium"],
  ["L", "L — secondary Aluminium"],
] as const;

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const fallbackYears = (): YearOption[] => {
  const currentYear = Math.max(2026, new Date().getUTCFullYear());
  const horizon = Math.max(2034, currentYear + 1);
  return Array.from({ length: horizon - 2026 + 1 }, (_, i) => {
    const year = 2026 + i;
    return {
      year,
      priceCadence: year === 2026 ? "quarterly" : "weekly",
      productionYearChoices: Array.from({ length: year - 2026 + 1 }, (_, j) => 2026 + j),
    };
  });
};

const priceLabel = (row: PriceRecord) => {
  if (row.quarter) return `${row.quarter} ${row.year}${row.official ? " — official" : " — provisional"}`;
  if (row.week) return `Week ${row.week}, ${row.year}${row.official ? " — official" : " — provisional"}`;
  return `${row.periodKey || row.year}${row.official ? " — official" : " — provisional"}`;
};

export default function ActualDataCbamPage() {
  const [years, setYears] = useState<YearOption[]>(fallbackYears);
  const [reportingYear, setReportingYear] = useState(2026);
  const [productionYear, setProductionYear] = useState(2026);

  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [country, setCountry] = useState("");
  const [cnCode, setCnCode] = useState("");
  const [route, setRoute] = useState("");

  const [activity, setActivity] = useState("");
  const [direct, setDirect] = useState("");
  const [indirect, setIndirect] = useState("0");
  const [verified, setVerified] = useState(false);
  const [importedMass, setImportedMass] = useState("");
  const [priorYtd, setPriorYtd] = useState("0");

  const [priceRecords, setPriceRecords] = useState<PriceRecord[]>([]);
  const [selectedPriceKey, setSelectedPriceKey] = useState("planning");
  const [planningPrice, setPlanningPrice] = useState("");
  const [priceLoading, setPriceLoading] = useState(false);

  const [precursors, setPrecursors] = useState<Precursor[]>([]);
  const [claimCarbonPrice, setClaimCarbonPrice] = useState(false);
  const [carbonPriceEur, setCarbonPriceEur] = useState("0");
  const [paymentEvidence, setPaymentEvidence] = useState(false);
  const [independentCertification, setIndependentCertification] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const anonymousWorkspaceSnapshot = useMemo(
    () => ({
      workspaceVersion: CBAM_WORKSPACE_VERSION,
      appVersion: ACTUAL_CBAM_VERSION,
      reportingYear,
      productionYear,
      country,
      cnCode,
      route,
      activity,
      direct,
      indirect,
      verified,
      importedMass,
      priorYtd,
      selectedPriceKey,
      planningPrice,
      precursors,
      claimCarbonPrice,
      carbonPriceEur,
      paymentEvidence,
      independentCertification,
    }),
    [
      reportingYear,
      productionYear,
      country,
      cnCode,
      route,
      activity,
      direct,
      indirect,
      verified,
      importedMass,
      priorYtd,
      selectedPriceKey,
      planningPrice,
      precursors,
      claimCarbonPrice,
      carbonPriceEur,
      paymentEvidence,
      independentCertification,
    ]
  );

  const restoreAnonymousWorkspace = (raw: any) => {
    if (!raw || typeof raw !== "object") return;
    const reportYear = Number(raw.reportingYear);
    const prodYear = Number(raw.productionYear);
    if (Number.isInteger(reportYear) && reportYear >= 2026 && reportYear <= 2100) {
      setReportingYear(reportYear);
    }
    if (Number.isInteger(prodYear) && prodYear >= 2026 && prodYear <= 2100) {
      setProductionYear(prodYear);
    }
    setCountry(typeof raw.country === "string" ? raw.country : "");
    setCnCode(typeof raw.cnCode === "string" ? raw.cnCode : "");
    setRoute(
      typeof raw.route === "string" && routeOptions.some(([value]) => value === raw.route)
        ? raw.route
        : ""
    );
    setActivity(typeof raw.activity === "string" ? raw.activity : String(raw.activity ?? ""));
    setDirect(typeof raw.direct === "string" ? raw.direct : String(raw.direct ?? ""));
    setIndirect(typeof raw.indirect === "string" ? raw.indirect : String(raw.indirect ?? "0"));
    setVerified(Boolean(raw.verified));
    setImportedMass(
      typeof raw.importedMass === "string" ? raw.importedMass : String(raw.importedMass ?? "")
    );
    setPriorYtd(typeof raw.priorYtd === "string" ? raw.priorYtd : String(raw.priorYtd ?? "0"));
    setSelectedPriceKey(
      typeof raw.selectedPriceKey === "string" ? raw.selectedPriceKey : "planning"
    );
    setPlanningPrice(
      typeof raw.planningPrice === "string" ? raw.planningPrice : String(raw.planningPrice ?? "")
    );
    setPrecursors(
      Array.isArray(raw.precursors)
        ? raw.precursors
            .filter((row: any) => row && typeof row === "object")
            .slice(0, 100)
            .map((row: any) => ({
              id: typeof row.id === "string" ? row.id : crypto.randomUUID(),
              name: typeof row.name === "string" ? row.name : "",
              cnCode: typeof row.cnCode === "string" ? row.cnCode : "",
              country: typeof row.country === "string" ? row.country : "",
              massTonnes:
                typeof row.massTonnes === "string"
                  ? row.massTonnes
                  : String(row.massTonnes ?? ""),
              source: row.source === "exempt" ? "exempt" : "default",
              productionYear:
                Number.isInteger(Number(row.productionYear)) && Number(row.productionYear) >= 2026
                  ? Number(row.productionYear)
                  : prodYear || reportYear || 2026,
              route:
                typeof row.route === "string" && routeOptions.some(([value]) => value === row.route)
                  ? row.route
                  : "",
            }))
        : []
    );
    setClaimCarbonPrice(Boolean(raw.claimCarbonPrice));
    setCarbonPriceEur(
      typeof raw.carbonPriceEur === "string"
        ? raw.carbonPriceEur
        : String(raw.carbonPriceEur ?? "0")
    );
    setPaymentEvidence(Boolean(raw.paymentEvidence));
    setIndependentCertification(Boolean(raw.independentCertification));
    setResult(null);
    setError("");
  };

  useEffect(() => {
    const controller = new AbortController();

    const initialise = async () => {
      // Context is only carried when the user explicitly selected it on the main calculator.
      const params = new URLSearchParams(window.location.search);
      const paramCountry = params.get("country")?.trim() || "";
      const paramCn = params.get("cn")?.trim() || "";
      const paramRoute = params.get("route")?.trim().toUpperCase() || "";
      const paramReporting = toNumber(params.get("reportingYear"));
      const paramProduction = toNumber(params.get("productionYear"));

      if (paramCountry) setCountry(paramCountry);
      if (paramCn) setCnCode(paramCn);
      if (paramRoute && routeOptions.some(([value]) => value === paramRoute)) setRoute(paramRoute);

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
            const requested = paramReporting && allowed.has(paramReporting) ? paramReporting : Number(json.defaultYear) || 2026;
            setReportingYear(requested);
            const info = json.years.find((x: any) => Number(x.year) === requested);
            const choices: number[] = Array.isArray(info?.productionYearChoices)
              ? info.productionYearChoices.map(Number)
              : Array.from({ length: requested - 2026 + 1 }, (_, i) => 2026 + i);
            setProductionYear(paramProduction && choices.includes(paramProduction) ? paramProduction : choices.at(-1) || requested);
          }
        }

        if (countriesRes.ok) {
          const json = await countriesRes.json();
          if (json?.success && Array.isArray(json.countries)) setCountries(json.countries);
        }
      } catch (e) {
        if ((e as Error)?.name !== "AbortError") {
          setError("Could not load CBAM reference options. You can still retry after the backend is available.");
        }
      }
    };

    initialise();
    return () => controller.abort();
  }, []);

  const productionYearChoices = useMemo(() => {
    const info = years.find((x) => x.year === reportingYear);
    if (Array.isArray(info?.productionYearChoices) && info!.productionYearChoices!.length) {
      return info!.productionYearChoices!;
    }
    return Array.from({ length: Math.max(1, reportingYear - 2026 + 1) }, (_, i) => 2026 + i);
  }, [years, reportingYear]);

  useEffect(() => {
    if (!productionYearChoices.includes(productionYear)) {
      setProductionYear(productionYearChoices.at(-1) || reportingYear);
    }
  }, [productionYearChoices, productionYear, reportingYear]);

  useEffect(() => {
    const controller = new AbortController();
    const loadPrices = async () => {
      setPriceLoading(true);
      try {
        const res = await fetch(`/api/cbam?year=${reportingYear}`, { cache: "no-store", signal: controller.signal });
        if (!res.ok) throw new Error("Price API unavailable");
        const json = await res.json();
        if (!json?.success) throw new Error(json?.error || "Price API failed");

        const rows: PriceRecord[] = Array.isArray(json.prices)
          ? json.prices
              .map((r: any) => ({
                year: Number(r.year),
                periodType: r.periodType,
                periodKey: r.periodKey,
                quarter: r.quarter,
                week: r.week == null ? undefined : Number(r.week),
                periodStart: r.periodStart ?? null,
                periodEnd: r.periodEnd ?? null,
                price: Number(r.price),
                official: Boolean(r.official),
              }))
              .filter((r: PriceRecord) => r.year === reportingYear && Number.isFinite(r.price))
          : [];
        setPriceRecords(rows);

        const planning = toNumber(json.planningEtsPrice) ?? toNumber(json.etsPrice);
        setPlanningPrice(planning === null ? "" : String(planning));

        const official = [...rows]
          .filter((r) => r.official)
          .sort((a, b) => {
            const aDate = a.periodStart ? Date.parse(a.periodStart) : 0;
            const bDate = b.periodStart ? Date.parse(b.periodStart) : 0;
            if (aDate !== bDate) return bDate - aDate;
            return (b.week || 0) - (a.week || 0);
          })[0];
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
  }, [reportingYear]);

  const selectedPriceRecord = priceRecords.find((r) => r.periodKey === selectedPriceKey) || null;
  const effectivePrice = selectedPriceRecord ? selectedPriceRecord.price : toNumber(planningPrice);

  const addPrecursor = () =>
    setPrecursors((rows) => [
      ...rows,
      {
        id: crypto.randomUUID(),
        name: "",
        cnCode: "",
        country,
        massTonnes: "",
        source: "default",
        productionYear,
        route: "",
      },
    ]);

  const updatePrecursor = (id: string, patch: Partial<Precursor>) =>
    setPrecursors((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  const calculate = async () => {
    setError("");
    setResult(null);

    const activityN = toNumber(activity);
    const directN = toNumber(direct);
    const indirectN = toNumber(indirect) ?? 0;
    const importedMassN = toNumber(importedMass);
    const priorYtdN = toNumber(priorYtd) ?? 0;
    const carbonPriceN = toNumber(carbonPriceEur) ?? 0;
    const normalizedCn = cnCode.replace(/\D/g, "");

    if (!country) return setError("Select the country of origin.");
    if (normalizedCn.length < 4) return setError("Enter a valid CN / TARIC code with at least 4 digits.");
    if (activityN === null || activityN <= 0) return setError("Installation activity level must be greater than zero.");
    if (directN === null || directN < 0) return setError("Enter valid process direct emissions.");
    if (indirectN < 0) return setError("Process indirect emissions cannot be negative.");
    if (importedMassN === null || importedMassN <= 0) return setError("Imported mass must be greater than zero.");
    if (priorYtdN < 0) return setError("Earlier YTD eligible mass cannot be negative.");
    if (effectivePrice === null || effectivePrice < 0) return setError("Select an official certificate-price period or enter a planning price.");

    for (const [index, row] of precursors.entries()) {
      const mass = toNumber(row.massTonnes);
      if (!row.cnCode.replace(/\D/g, "") && row.source !== "exempt") return setError(`Precursor ${index + 1}: enter a CN code.`);
      if (!row.country && row.source !== "exempt") return setError(`Precursor ${index + 1}: enter a country.`);
      if (mass === null || mass < 0) return setError(`Precursor ${index + 1}: enter a valid mass.`);
    }

    setLoading(true);
    try {
      const body = {
        kind: "actual",
        reportingYear,
        tonnes: importedMassN,
        certificatePriceEur: effectivePrice,
        priorYtdEligibleMassTonnes: priorYtdN,
        good: {
          cnCode: normalizedCn,
          country,
          productionYear,
          productionRouteIndicator: route || null,
          activityLevelTonnes: activityN,
          processDirectEmissionsTco2e: directN,
          processIndirectEmissionsTco2e: indirectN,
          verified,
          precursors: precursors.map((row) => ({
            name: row.name || undefined,
            cnCode: row.cnCode.replace(/\D/g, ""),
            country: row.country,
            massTonnes: toNumber(row.massTonnes) ?? 0,
            source: row.source,
            productionYear: row.productionYear,
            productionRouteIndicator: row.route || null,
          })),
        },
        carbonPriceClaim: {
          claimRequested: claimCarbonPrice,
          carbonPriceMode: "effectively_paid",
          netCarbonPriceEurPerTco2e: carbonPriceN,
          paymentEvidence,
          independentCertification,
        },
      };

      const response = await fetch("/api/cbam/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || "Actual-data calculation failed.");
      setResult(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Calculation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto min-w-0 max-w-6xl overflow-x-hidden px-3 py-6 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-black uppercase tracking-widest text-indigo-700">Advanced CBAM methodology</div>
          <h1 className="mt-2 break-words text-2xl font-black text-slate-950 sm:text-4xl">Actual & complex-goods calculator</h1>
          <p className="mt-3 max-w-3xl text-slate-600">Enter your own installation and supplier data. This page no longer loads demonstration country, CN code, route, emissions, mass or price values.</p>
        </div>
        <Link href="/cbam-calculator" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-center font-bold text-slate-700 sm:w-auto">← Main calculator</Link>
      </div>

      <AnonymousWorkspacePanel
        toolId="cbam-actual"
        toolLabel="CBAM actual / complex goods"
        toolVersion={`${ACTUAL_CBAM_VERSION} · ${CBAM_WORKSPACE_VERSION}`}
        snapshot={anonymousWorkspaceSnapshot}
        onRestore={restoreAnonymousWorkspace}
        defaultSaveName={cnCode ? `CBAM actual ${cnCode}` : "CBAM actual project"}
        className="mt-6"
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="min-w-0 space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-xl font-black">Good & process data</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Country of origin">
              <select value={country} onChange={(e) => setCountry(e.target.value)} className="input">
                <option value="">Select country</option>
                {country && !countries.some((x) => x.name === country) && <option value={country}>{country}</option>}
                {countries.map((item) => <option key={item.normalized} value={item.name}>{item.name}</option>)}
              </select>
            </Field>
            <Field label="CN / TARIC code"><input value={cnCode} onChange={(e) => setCnCode(e.target.value)} placeholder="e.g. 7208" className="input font-mono" /></Field>
            <Field label="Reporting / import year">
              <select value={reportingYear} onChange={(e) => setReportingYear(Number(e.target.value))} className="input">
                {years.map((y) => <option key={y.year} value={y.year}>{y.year}{y.readiness === "data-pending" ? " — data pending" : ""}</option>)}
              </select>
            </Field>
            <Field label="Production year">
              <select value={productionYear} onChange={(e) => setProductionYear(Number(e.target.value))} className="input">
                {productionYearChoices.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </Field>
            <Field label="Production route">
              <select value={route} onChange={(e) => setRoute(e.target.value)} className="input">
                {routeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            <Field label="Installation activity level (t)"><input type="number" min="0.0001" value={activity} onChange={(e) => setActivity(e.target.value)} placeholder="Enter activity level" className="input" /></Field>
            <Field label="Process direct emissions (tCO₂e)"><input type="number" min="0" value={direct} onChange={(e) => setDirect(e.target.value)} placeholder="Enter direct emissions" className="input" /></Field>
            <Field label="Process indirect emissions (tCO₂e)"><input type="number" min="0" value={indirect} onChange={(e) => setIndirect(e.target.value)} className="input" /></Field>
            <Field label="Imported mass (t)"><input type="number" min="0" value={importedMass} onChange={(e) => setImportedMass(e.target.value)} placeholder="Enter imported mass" className="input" /></Field>
            <Field label="Earlier YTD threshold-eligible mass (t)"><input type="number" min="0" value={priorYtd} onChange={(e) => setPriorYtd(e.target.value)} className="input" /></Field>
            <Field label="Certificate-price period">
              <select value={selectedPriceKey} onChange={(e) => setSelectedPriceKey(e.target.value)} className="input" disabled={priceLoading}>
                <option value="planning">Planning price / manual</option>
                {priceRecords.map((row) => <option key={row.periodKey} value={row.periodKey}>{priceLabel(row)} — €{row.price.toFixed(2)}</option>)}
              </select>
            </Field>
            <Field label={selectedPriceRecord ? "Selected official/provisional price (€ / tCO₂e)" : "Planning price (€ / tCO₂e)"}>
              <input type="number" min="0" value={selectedPriceRecord ? String(selectedPriceRecord.price) : planningPrice} readOnly={Boolean(selectedPriceRecord)} onChange={(e) => setPlanningPrice(e.target.value)} placeholder="Enter planning price" className="input read-only:bg-slate-100" />
            </Field>
          </div>

          <label className="flex gap-3 rounded-xl border border-slate-200 p-4 text-sm">
            <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} />
            <span><strong>Actual emissions are supported by an accredited-verifier workflow.</strong><br/><span className="text-slate-500">This records your confirmation only; the tool does not itself perform verification.</span></span>
          </label>

          <div className="border-t border-slate-200 pt-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div><h3 className="font-black">Precursors</h3><p className="text-xs text-slate-500">Add only precursors that belong to this actual-data calculation.</p></div>
              <button type="button" onClick={addPrecursor} className="w-full rounded-lg bg-slate-900 px-3 py-2.5 text-sm font-black text-white sm:w-auto">+ Add</button>
            </div>
            <div className="mt-4 space-y-4">
              {precursors.map((row) => (
                <div key={row.id} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                  <Field label="Precursor name">
                    <input placeholder="e.g. Grey cement clinker" value={row.name} onChange={(e) => updatePrecursor(row.id, { name: e.target.value })} className="input" />
                  </Field>
                  <Field label="Precursor CN / TARIC code">
                    <input placeholder="e.g. 25231000" value={row.cnCode} onChange={(e) => updatePrecursor(row.id, { cnCode: e.target.value })} className="input font-mono" />
                  </Field>
                  <Field label="Precursor country">
                    <select value={row.country} onChange={(e) => updatePrecursor(row.id, { country: e.target.value })} className="input"><option value="">Select precursor country</option>{countries.map((item) => <option key={item.normalized} value={item.name}>{item.name}</option>)}</select>
                  </Field>
                  <Field label="Total precursor mass used (t)">
                    <input type="number" min="0" placeholder="e.g. 80" value={row.massTonnes} onChange={(e) => updatePrecursor(row.id, { massTonnes: e.target.value })} className="input" />
                  </Field>
                  <Field label="Precursor source">
                    <select value={row.source} onChange={(e) => updatePrecursor(row.id, { source: e.target.value as Precursor["source"] })} className="input"><option value="default">Official default precursor</option><option value="exempt">Exempt / no CBAM precursor contribution</option></select>
                  </Field>
                  <Field label="Precursor production year">
                    <select value={row.productionYear} onChange={(e) => updatePrecursor(row.id, { productionYear: Number(e.target.value) })} className="input">{productionYearChoices.map((year) => <option key={year} value={year}>{year}</option>)}</select>
                  </Field>
                  <Field label="Precursor production route">
                    <select value={row.route} onChange={(e) => updatePrecursor(row.id, { route: e.target.value })} className="input">{routeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                  </Field>
                  <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-xs text-indigo-900">
                    <div className="font-black">Specific precursor mass</div>
                    <div className="mt-1 font-mono text-sm">
                      {toNumber(activity) && toNumber(activity)! > 0 && toNumber(row.massTonnes) !== null
                        ? `${(Number(toNumber(row.massTonnes)) / Number(toNumber(activity))).toFixed(4)} t precursor / t final good`
                        : "Enter activity level and precursor mass"}
                    </div>
                  </div>
                  <button type="button" onClick={() => setPrecursors((rows) => rows.filter((x) => x.id !== row.id))} className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-left text-sm font-bold text-red-700 sm:w-auto">Remove precursor</button>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-200 pt-5">
            <label className="flex gap-3 text-sm"><input type="checkbox" checked={claimCarbonPrice} onChange={(e) => setClaimCarbonPrice(e.target.checked)} /><span><strong>Claim a qualifying carbon price paid in the country of origin</strong></span></label>
            {claimCarbonPrice && <div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Net carbon price effectively paid (€ / tCO₂e)"><input type="number" min="0" value={carbonPriceEur} onChange={(e) => setCarbonPriceEur(e.target.value)} className="input" /></Field><div className="space-y-2"><label className="flex gap-2 text-sm"><input type="checkbox" checked={paymentEvidence} onChange={(e) => setPaymentEvidence(e.target.checked)} /> Payment evidence available</label><label className="flex gap-2 text-sm"><input type="checkbox" checked={independentCertification} onChange={(e) => setIndependentCertification(e.target.checked)} /> Independent certification available</label></div></div>}
          </div>

          <button type="button" onClick={calculate} disabled={loading} className="w-full rounded-xl bg-indigo-700 px-5 py-3.5 font-black text-white disabled:opacity-50">{loading ? "Calculating…" : "Calculate actual / complex goods"}</button>
          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
        </section>

        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-xl font-black">Result</h2>
          {!result ? <p className="mt-4 text-sm text-slate-500">Enter your data and run a calculation. No country, CN code, route, mass, emissions or price is preloaded as a demonstration value.</p> : <div className="mt-5 space-y-3"><Metric label="Specific embedded emissions" value={`${Number(result.actual?.specificEmbeddedEmissions ?? 0).toFixed(4)} tCO₂e/t`} /><Metric label="SEFA" value={result.actual?.sefa == null ? "Pending / incomplete" : `${Number(result.actual.sefa).toFixed(4)} tCO₂e/t`} /><Metric label="Embedded emissions" value={`${Number(result.embeddedEmissionsTco2e ?? 0).toFixed(3)} tCO₂e`} /><Metric label="Certificates before Article 9" value={result.certificatesAfterThresholdBeforeCarbonPrice == null ? "Pending" : Number(result.certificatesAfterThresholdBeforeCarbonPrice).toFixed(3)} /><Metric label="Estimated exposure" value={result.finalEstimatedExposureEur == null ? "Pending" : `€${Number(result.finalEstimatedExposureEur).toLocaleString(undefined, { maximumFractionDigits: 2 })}`} /><details className="rounded-xl border border-slate-200 p-4"><summary className="cursor-pointer font-black">Calculation detail</summary><pre className="mt-3 max-w-full overflow-auto whitespace-pre text-xs">{JSON.stringify(result, null, 2)}</pre></details></div>}
        </section>
      </div>
      <style jsx global>{`.input{width:100%;min-width:0;border:1px solid rgb(203 213 225);border-radius:.65rem;padding:.75rem .8rem;background:white;font-size:16px}`}</style>
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <label><span className="mb-1 block text-xs font-black text-slate-600">{label}</span>{children}</label>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-slate-50 p-4"><div className="text-xs font-bold text-slate-500">{label}</div><div className="mt-1 font-mono text-lg font-black">{value}</div></div>; }
