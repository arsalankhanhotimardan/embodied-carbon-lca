"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Papa from "papaparse";

/**
 * Green Engineering Tools — CBAM Estimator V3
 *
 * Regulatory design:
 * - 2026 CBAM certificate prices are quarterly, not weekly.
 * - 2027 onward prices are weekly.
 * - 50 t de-minimis threshold is annual/cumulative per importer for
 *   iron & steel, aluminium, fertilisers and cement only.
 * - Electricity and hydrogen are excluded from the mass-based exemption.
 * - Definitive-period certificate quantities require the free-allocation
 *   adjustment; they are NOT simply embedded emissions × a phase-in %.
 *
 * IMPORTANT:
 * Official country/CN/TARIC default values and benchmarks are resolved through Neon.
 * Full compliance-grade calculations for complex goods require the backend
 * to return the correct official benchmark / SEFA data for the CN code,
 * production route and reporting year.
 */

type Sector =
  | "cement"
  | "iron_steel"
  | "aluminium"
  | "fertiliser"
  | "hydrogen"
  | "electricity"
  | "unknown";

type EmissionsMode = "default" | "actual";
type Quarter = "Q1" | "Q2" | "Q3" | "Q4";

interface Product {
  id: string;
  name: string;
  cn: string;

  // Recommended backend fields
  sector?: Sector | string;
  country?: string;
  productionRoute?: string;

  // Default EF:
  // Prefer an official already-marked-up year-specific value from backend.
  defaultEf2026?: number;
  defaultEf2027?: number;
  defaultEf2028Plus?: number;

  // Backward compatibility: assumed BASE default EF before markup.
  defaultEf?: number;

  // Do not call this "verified" unless backend explicitly says so.
  actualEf?: number;
  actualVerified?: boolean;

  // Official free-allocation data.
  benchmark?: number;
  benchmarkActual?: number;
  benchmarkDefault?: number;

  // Best option: backend-computed specific embedded free allocation (SEFA)
  // for the selected methodology/year, especially for complex goods.
  sefaActual2026?: number;
  sefaDefault2026?: number;

  // Runtime official-reference values resolved for the selected reporting year.
  resolvedOfficialDefaultEf?: number;
  resolvedOfficialSefa?: number;
  resolvedYear?: number;

  // Metadata
  source?: string;
  sourceVersion?: string;
  updatedAt?: string;
}

interface PriceRecord {
  year: number;
  periodType?: "quarterly" | "weekly" | string;
  periodKey?: string;
  quarter?: Quarter;
  week?: number;
  periodStart?: string | null;
  periodEnd?: string | null;
  price: number;
  official?: boolean;
  publishedAt?: string;
  source?: string;
}

interface YearOption {
  year: number;
  priceCadence: "quarterly" | "weekly";
  freeAllocationFactor: number | null;
  cscf: number | null;
  cscfOfficial: boolean;
  benchmarkCovered: boolean;
  defaultValuesAvailable: boolean;
  officialPriceCount: number;
  totalPriceCount: number;
  readiness: "official" | "planning-ready" | "data-pending";
  productionYearChoices?: number[];
}

interface OfficialCountryOption {
  name: string;
  normalized: string;
}

interface OfficialGoodOption {
  id: string;
  country: string;
  sector: Sector | string | null;
  cnCode: string;
  cnDigits: string;
  cnDigitsLength: number;
  description: string | null;
  rawDefault: {
    direct: number | null;
    indirect: number | null;
    total: number | null;
  };
  productionRouteIndicator: string | null;
  productionRouteLabel: string | null;
  sourceRegulation: string;
  sourceVersion: string;
}

interface OfficialReferenceData {
  found: boolean;
  ambiguous?: boolean;
  reason?: string;
  candidates?: Array<{
    cnCode: string;
    cnDigits: string;
    description?: string | null;
  }>;
  cnCode?: string;
  normalizedCn?: string;
  country?: string;
  year?: number;
  reportingYear?: number;
  productionYear?: number | null;
  regulatoryYear?: number;
  activeReferenceVersions?: {
    defaultValues?: string;
    benchmarks?: string;
  };
  mode?: EmissionsMode;
  defaultValue?: {
    countryUsed: string;
    fallbackUsed: boolean;
    cnMatchType?: "exact" | "parent" | "child" | null;
    requestedCn?: string;
    matchedCn?: string;
    matchedCnCode?: string;
    sector?: Sector | string | null;
    description?: string | null;
    directEmissions?: number | null;
    indirectEmissions?: number | null;
    totalEmissions?: number | null;
    markupMultiplier?: number | null;
    markedUpTotalEmissions?: number | null;
    productionRouteIndicator?: string | null;
    productionRouteLabel?: string | null;
    sourceRegulation?: string;
    sourceVersion?: string;
    sourceUrl?: string;
  };
  benchmark?: {
    kind: "actual" | "default";
    value: number | null;
    productionRouteIndicator?: string | null;
    productionRouteLabel?: string | null;
    productionYearFrom?: number;
    productionYearTo?: number;
    sourceRegulation?: string;
    sourceVersion?: string;
    sourceUrl?: string;
  } | null;
  simpleDefaultSefa?: number | null;
  warnings?: string[];
}

interface PortfolioItem {
  id: string;
  supplier: string;
  product: Product;
  volume: number;
  emissions: number;
  certificates: number | null;
  estimatedCost: number | null;
  emissionsMode: EmissionsMode;
  price: number;
  priceLabel: string;
  reportingYear: number;
  productionYear: number;
  periodKey: string;
  periodLabel: string;
  priorYtdEligibleMass: number;
  benchmarkUsed: number | null;
  freeAllocationAdjustment: number | null;
  eligibleForMassThreshold: boolean;
}

const OFFICIAL_2026_PRICES: Record<Quarter, number | null> = {
  Q1: 75.36,
  Q2: 75.28,
  Q3: null,
  Q4: null,
};

/**
 * Current adopted EU ETS free-allocation CBAM factor schedule.
 * This is the factor applied to free allocation, not the "CBAM cost phase-in %".
 *
 * 2026 97.5%, 2027 95%, 2028 90%, 2029 77.5%, 2030 51.5%,
 * 2031 39%, 2032 26.5%, 2033 14%, 2034 0%.
 *
 * Future EU legislation can amend this schedule. Forecasts are scenarios.
 */
const FREE_ALLOCATION_CBAM_FACTOR: Record<number, number> = {
  2026: 0.975,
  2027: 0.95,
  2028: 0.90,
  2029: 0.775,
  2030: 0.515,
  2031: 0.39,
  2032: 0.265,
  2033: 0.14,
  2034: 0,
};

/**
 * Commission Implementing Decision (EU) 2026/1862 sets CSCF = 100%
 * for 2026-2030. Later years are not hard-coded as legal facts here.
 */
const OFFICIAL_CSCF: Record<number, number> = {
  2026: 1,
  2027: 1,
  2028: 1,
  2029: 1,
  2030: 1,
};


const PRODUCTION_ROUTE_OPTIONS: Array<{
  code: string;
  label: string;
  sectors: Sector[];
}> = [
  { code: "A", label: "Grey clinker / cement", sectors: ["cement"] },
  { code: "B", label: "White clinker / cement", sectors: ["cement"] },
  { code: "C", label: "Carbon Steel — BF/BOF", sectors: ["iron_steel"] },
  { code: "D", label: "Carbon Steel — DRI/EAF", sectors: ["iron_steel"] },
  { code: "E", label: "Carbon Steel — Scrap/EAF", sectors: ["iron_steel"] },
  { code: "F", label: "Low-alloy Steel — BF/BOF", sectors: ["iron_steel"] },
  { code: "G", label: "Low-alloy Steel — DRI/EAF", sectors: ["iron_steel"] },
  { code: "H", label: "Low-alloy Steel — Scrap/EAF", sectors: ["iron_steel"] },
  { code: "J", label: "High-alloy Steel — EAF", sectors: ["iron_steel"] },
  { code: "K", label: "Primary Aluminium", sectors: ["aluminium"] },
  { code: "L", label: "Secondary Aluminium", sectors: ["aluminium"] },
];

const normalizeCn = (value: unknown) =>
  String(value ?? "")
    .replace(/\s+/g, "")
    .trim();

const safeNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const inferSector = (product: Product | null): Sector => {
  if (!product) return "unknown";

  const explicit = String(product.sector || "")
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (explicit.includes("cement")) return "cement";
  if (
    explicit.includes("iron") ||
    explicit.includes("steel") ||
    explicit === "iron_steel"
  )
    return "iron_steel";
  if (explicit.includes("aluminium") || explicit.includes("aluminum"))
    return "aluminium";
  if (explicit.includes("fertil")) return "fertiliser";
  if (explicit.includes("hydrogen")) return "hydrogen";
  if (explicit.includes("electric")) return "electricity";

  const haystack = `${product.id} ${product.name}`.toLowerCase();

  if (haystack.includes("cement") || haystack.includes("clinker")) return "cement";
  if (haystack.includes("steel") || haystack.includes("iron")) return "iron_steel";
  if (haystack.includes("aluminium") || haystack.includes("aluminum"))
    return "aluminium";
  if (haystack.includes("fertil") || haystack.includes("ammonia"))
    return "fertiliser";
  if (haystack.includes("hydrogen")) return "hydrogen";
  if (haystack.includes("electric")) return "electricity";

  return "unknown";
};

const sectorLabel = (sector: Sector) =>
  ({
    cement: "Cement",
    iron_steel: "Iron & Steel",
    aluminium: "Aluminium",
    fertiliser: "Fertilisers",
    hydrogen: "Hydrogen",
    electricity: "Electricity",
    unknown: "Unknown",
  }[sector]);

const isMassThresholdSector = (sector: Sector) =>
  ["cement", "iron_steel", "aluminium", "fertiliser"].includes(sector);

const defaultMarkup = (sector: Sector, year: number): number | null => {
  if (sector === "fertiliser") return 1.01;

  if (
    ["cement", "iron_steel", "aluminium", "hydrogen"].includes(sector)
  ) {
    if (year === 2026) return 1.10;
    if (year === 2027) return 1.20;
    if (year >= 2028) return 1.30;
  }

  // Electricity has a separate default methodology.
  if (sector === "electricity") return null;

  return null;
};

const getDefaultEf = (
  product: Product,
  sector: Sector,
  year: number
): { value: number | null; provenance: string } => {
  if (
    product.resolvedYear === year &&
    safeNumber(product.resolvedOfficialDefaultEf) !== null
  ) {
    return {
      value: safeNumber(product.resolvedOfficialDefaultEf),
      provenance: `Official EU reference resolved for ${year}`,
    };
  }

  if (year === 2026 && safeNumber(product.defaultEf2026) !== null) {
    return {
      value: safeNumber(product.defaultEf2026),
      provenance: "Official/year-specific value from database",
    };
  }

  if (year === 2027 && safeNumber(product.defaultEf2027) !== null) {
    return {
      value: safeNumber(product.defaultEf2027),
      provenance: "Official/year-specific value from database",
    };
  }

  if (year >= 2028 && safeNumber(product.defaultEf2028Plus) !== null) {
    return {
      value: safeNumber(product.defaultEf2028Plus),
      provenance: "Official/year-specific value from database",
    };
  }

  const base = safeNumber(product.defaultEf);
  const markup = defaultMarkup(sector, year);

  if (base !== null && markup !== null) {
    return {
      value: base * markup,
      provenance: `Base database EF × ${(markup - 1) * 100}% regulatory markup`,
    };
  }

  return {
    value: null,
    provenance: "No defensible default EF available",
  };
};

const getBenchmark = (
  product: Product,
  mode: EmissionsMode
): number | null => {
  const modeSpecific =
    mode === "actual"
      ? safeNumber(product.benchmarkActual)
      : safeNumber(product.benchmarkDefault);

  if (modeSpecific !== null) return modeSpecific;
  return safeNumber(product.benchmark);
};

const getSeFaForYear = (
  product: Product,
  mode: EmissionsMode,
  year: number
): number | null => {
  if (
    mode === "default" &&
    product.resolvedYear === year &&
    safeNumber(product.resolvedOfficialSefa) !== null
  ) {
    return safeNumber(product.resolvedOfficialSefa);
  }

  if (year !== 2026) return null;

  return mode === "actual"
    ? safeNumber(product.sefaActual2026)
    : safeNumber(product.sefaDefault2026);
};

const freeAllocationFactorForYear = (year: number): number | null => {
  if (year >= 2034) return 0;
  return FREE_ALLOCATION_CBAM_FACTOR[year] ?? null;
};

const fallbackYearOptions = (): YearOption[] => {
  const currentYear = Math.max(2026, new Date().getUTCFullYear());
  const horizon = Math.max(2034, currentYear + 1);

  return Array.from({ length: horizon - 2026 + 1 }, (_, index) => {
    const year = 2026 + index;
    const factor = freeAllocationFactorForYear(year);
    const cscf = OFFICIAL_CSCF[year] ?? null;

    return {
      year,
      priceCadence: year === 2026 ? "quarterly" : "weekly",
      freeAllocationFactor: factor,
      cscf,
      cscfOfficial: cscf !== null,
      benchmarkCovered: year <= 2030 || factor === 0,
      defaultValuesAvailable: true,
      officialPriceCount: year === 2026 ? 2 : 0,
      totalPriceCount: year === 2026 ? 2 : 0,
      readiness:
        factor === 0 || (year <= 2030 && cscf !== null)
          ? "planning-ready"
          : "data-pending",
    };
  });
};

const xmlEscape = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const eur = (value: number) =>
  value.toLocaleString("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  });

const num = (value: number, digits = 2) =>
  value.toLocaleString("en-IE", {
    maximumFractionDigits: digits,
  });

const buildAdvancedHref = (
  base: string,
  params: Record<string, string | number | null | undefined>
) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || String(value).trim() === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${base}?${query}` : base;
};

export default function CbamEstimatorV3() {
  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "EU CBAM Calculator",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web Browser",
    url: "https://greenengineeringtools.com/cbam-calculator",
    description:
      "EU CBAM calculator for 2026 onward, with official country/CN reference data, dynamic reporting years, certificate-price periods, the 50-tonne threshold and portfolio analysis.",
    provider: {
      "@type": "Organization",
      name: "Green Engineering Tools",
      url: "https://greenengineeringtools.com",
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
    },
    featureList: [
      "Multi-year CBAM certificate cost estimate",
      "50-tonne annual de minimis threshold",
      "CBAM default and actual emissions modes",
      "CBAM benchmark and free-allocation adjustment",
      "Iron and steel CBAM calculations",
      "Aluminium CBAM calculations",
      "Cement CBAM calculations",
      "Fertiliser CBAM calculations",
      "CSV bulk import",
      "Portfolio exposure analysis",
    ],
  };

  const [isLoading, setIsLoading] = useState(true);
  const [apiWarning, setApiWarning] = useState("");
  const [activeAppTab, setActiveAppTab] = useState<
    "calculator" | "portfolio" | "erp"
  >("calculator");
  const [productDatabase, setProductDatabase] = useState<Product[]>([]);
  const [priceRecords, setPriceRecords] = useState<PriceRecord[]>([]);
  const [availableYears, setAvailableYears] =
    useState<YearOption[]>(fallbackYearOptions);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [productionYear, setProductionYear] = useState(2026);
  const [selectedWeeklyPeriodKey, setSelectedWeeklyPeriodKey] =
    useState("planning");
  const [priceRefreshToken, setPriceRefreshToken] = useState(0);
  const [planningEtsPrice, setPlanningEtsPrice] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Official EU reference-data workflow
  const [officialCountries, setOfficialCountries] = useState<
    OfficialCountryOption[]
  >([]);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [officialGoods, setOfficialGoods] = useState<OfficialGoodOption[]>([]);
  const [goodsSearch, setGoodsSearch] = useState("");
  const [selectedOfficialGood, setSelectedOfficialGood] =
    useState<OfficialGoodOption | null>(null);
  const [officialReference, setOfficialReference] =
    useState<OfficialReferenceData | null>(null);
  const [officialOptionsLoading, setOfficialOptionsLoading] = useState(false);
  const [officialReferenceLoading, setOfficialReferenceLoading] =
    useState(false);
  const [officialDataError, setOfficialDataError] = useState("");
  const [actualProductionRoute, setActualProductionRoute] = useState("");

  const [volume, setVolume] = useState(50);
  const [priorYtdEligibleMass, setPriorYtdEligibleMass] = useState(0);
  const [supplierName, setSupplierName] = useState("");
  const [importQuarter, setImportQuarter] = useState<Quarter>("Q2");
  const [emissionsMode, setEmissionsMode] =
    useState<EmissionsMode>("default");
  const [actualEf, setActualEf] = useState(0);
  const [actualVerified, setActualVerified] = useState(false);

  /**
   * Foreign carbon price is deliberately NOT subtracted from the official
   * estimate in this frontend. The definitive implementing rules for converting
   * carbon price paid into certificate reduction need to be implemented
   * server-side once legally final and versioned.
   */
  const [foreignCarbonPrice, setForeignCarbonPrice] = useState(0);

  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [erpErrors, setErpErrors] = useState<string[]>([]);
  const erpFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadYears = async () => {
      try {
        const res = await fetch("/api/cbam/years", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!res.ok) return;

        const json = await res.json();

        if (json?.success && Array.isArray(json.years) && json.years.length) {
          setAvailableYears(json.years);

          const apiDefaultYear = Number(json.defaultYear);
          if (Number.isInteger(apiDefaultYear) && apiDefaultYear >= 2026) {
            setSelectedYear(apiDefaultYear);
            setProductionYear(apiDefaultYear === 2026 ? 2026 : apiDefaultYear);
          }

          // `/api/cbam/years` may have just synced a newly published price.
          // Force the year-specific `/api/cbam` price list to refresh.
          setPriceRefreshToken((value) => value + 1);
        }
      } catch (error) {
        if ((error as Error)?.name !== "AbortError") {
          console.warn("Could not load dynamic CBAM years; using local fallback.", error);
        }
      }
    };

    loadYears();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/cbam?year=${selectedYear}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error(`/api/cbam returned HTTP ${res.status}`);
        }

        const json = await res.json();

        if (!json?.success) {
          throw new Error(json?.error || "CBAM API returned success=false");
        }

        const products: Product[] = Array.isArray(json.products)
          ? json.products.map((p: any) => ({
              ...p,
              defaultEf: safeNumber(p.defaultEf) ?? undefined,
              defaultEf2026: safeNumber(p.defaultEf2026) ?? undefined,
              defaultEf2027: safeNumber(p.defaultEf2027) ?? undefined,
              defaultEf2028Plus: safeNumber(p.defaultEf2028Plus) ?? undefined,
              actualEf: safeNumber(p.actualEf) ?? undefined,
              benchmark: safeNumber(p.benchmark) ?? undefined,
              benchmarkActual: safeNumber(p.benchmarkActual) ?? undefined,
              benchmarkDefault: safeNumber(p.benchmarkDefault) ?? undefined,
              sefaActual2026: safeNumber(p.sefaActual2026) ?? undefined,
              sefaDefault2026: safeNumber(p.sefaDefault2026) ?? undefined,
            }))
          : [];

        const prices: PriceRecord[] = Array.isArray(json.prices)
          ? json.prices
              .map((r: any) => ({
                year: Number(r.year),
                periodType: r.periodType,
                periodKey: r.periodKey,
                quarter: r.quarter as Quarter | undefined,
                week: safeNumber(r.week) ?? undefined,
                periodStart: r.periodStart ?? null,
                periodEnd: r.periodEnd ?? null,
                price: Number(r.price),
                official: Boolean(r.official),
                publishedAt: r.publishedAt,
                source: r.source,
              }))
              .filter((r: PriceRecord) => Number.isFinite(r.price))
          : [];

        setProductDatabase(products);
        setPriceRecords(prices);

        const planningPrice =
          safeNumber(json.planningEtsPrice) ??
          safeNumber(json.etsPrice) ??
          (selectedYear === 2026 ? OFFICIAL_2026_PRICES.Q2 : null) ??
          0;

        setPlanningEtsPrice(planningPrice);
        setApiWarning("");

        if (!prices.length && safeNumber(json.etsPrice) !== null) {
          setApiWarning(
            selectedYear === 2026
              ? "Your API returned one ETS price, not a versioned 2026 quarterly CBAM certificate-price history."
              : `No official ${selectedYear} weekly CBAM certificate prices are stored yet. The calculator will use a clearly labelled planning price until official weekly prices are published.`
          );
        }
      } catch (error) {
        console.error(error);
        setApiWarning(
          error instanceof Error
            ? error.message
            : "Could not load CBAM backend."
        );
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [selectedYear, priceRefreshToken]);

  useEffect(() => {
    const controller = new AbortController();

    const loadCountries = async () => {
      setOfficialOptionsLoading(true);
      setOfficialDataError("");

      try {
        const res = await fetch("/api/cbam/reference/options", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(
            `/api/cbam/reference/options returned HTTP ${res.status}`
          );
        }

        const json = await res.json();

        if (!json?.success || !Array.isArray(json.countries)) {
          throw new Error(
            json?.error || "Official CBAM country list was not returned."
          );
        }

        setOfficialCountries(json.countries);
      } catch (error) {
        if ((error as Error)?.name === "AbortError") return;

        console.error(error);
        setOfficialDataError(
          error instanceof Error
            ? error.message
            : "Could not load official CBAM countries."
        );
      } finally {
        setOfficialOptionsLoading(false);
      }
    };

    loadCountries();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    // The annual 50-tonne threshold is year-specific. Do not carry a
    // prior-year-to-date mass into another reporting year.
    setPriorYtdEligibleMass(0);
  }, [selectedYear]);

  useEffect(() => {
    // 2026 imports always use the 2026 regulatory period. From 2027 onward
    // production year can be identified separately when supported by evidence.
    setProductionYear((current) => {
      if (selectedYear === 2026) return 2026;
      if (current < 2026 || current > selectedYear) return selectedYear;
      return current;
    });
    setOfficialReference(null);
    setSelectedProduct(null);
  }, [selectedYear]);

  useEffect(() => {
    if (!selectedCountry) {
      setOfficialGoods([]);
      setSelectedOfficialGood(null);
      setOfficialReference(null);
      setSelectedProduct(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setOfficialOptionsLoading(true);
      setOfficialDataError("");

      try {
        const params = new URLSearchParams({
          country: selectedCountry,
        });

        if (goodsSearch.trim()) {
          params.set("search", goodsSearch.trim());
        }

        const res = await fetch(
          `/api/cbam/reference/options?${params.toString()}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (!res.ok) {
          throw new Error(
            `Official-goods API returned HTTP ${res.status}`
          );
        }

        const json = await res.json();

        if (!json?.success || !Array.isArray(json.goods)) {
          throw new Error(
            json?.error || "Official CBAM goods were not returned."
          );
        }

        setOfficialGoods(json.goods);
      } catch (error) {
        if ((error as Error)?.name === "AbortError") return;

        console.error(error);
        setOfficialDataError(
          error instanceof Error
            ? error.message
            : "Could not load official CBAM goods."
        );
        setOfficialGoods([]);
      } finally {
        setOfficialOptionsLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [selectedCountry, goodsSearch]);

  useEffect(() => {
    if (!selectedOfficialGood || !selectedCountry) {
      setOfficialReference(null);
      setSelectedProduct(null);
      return;
    }

    const controller = new AbortController();

    const loadReference = async () => {
      setOfficialReferenceLoading(true);
      setOfficialDataError("");

      try {
        const params = new URLSearchParams({
          cn: selectedOfficialGood.cnDigits,
          country: selectedCountry,
          reportingYear: String(selectedYear),
          productionYear: String(productionYear),
          mode: emissionsMode,
        });

        if (emissionsMode === "actual" && actualProductionRoute) {
          params.set("route", actualProductionRoute);
        }

        const res = await fetch(
          `/api/cbam/reference?${params.toString()}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (!res.ok) {
          throw new Error(
            `Official-reference API returned HTTP ${res.status}`
          );
        }

        const json = await res.json();

        if (!json?.success) {
          throw new Error(
            json?.error || "Official CBAM reference lookup failed."
          );
        }

        const ref: OfficialReferenceData = json.data;
        setOfficialReference(ref);

        if (!ref?.found || !ref.defaultValue) {
          setSelectedProduct(null);
          setOfficialDataError(
            ref?.reason ||
              "The official reference database could not resolve this good."
          );
          return;
        }

        const defaultValue = ref.defaultValue;
        const benchmark = ref.benchmark;

        const mappedProduct: Product = {
          id: `official:${selectedCountry}:${selectedOfficialGood.cnDigits}`,
          name:
            defaultValue.description ||
            selectedOfficialGood.description ||
            selectedOfficialGood.cnCode,
          cn:
            defaultValue.matchedCnCode ||
            selectedOfficialGood.cnCode,
          sector:
            defaultValue.sector ||
            selectedOfficialGood.sector ||
            "unknown",
          country: selectedCountry,
          productionRoute:
            benchmark?.productionRouteLabel ||
            defaultValue.productionRouteLabel ||
            undefined,

          // Resolver already applies the legal default-value markup for
          // the selected reporting year.
          resolvedOfficialDefaultEf:
            safeNumber(defaultValue.markedUpTotalEmissions) ??
            undefined,
          resolvedOfficialSefa:
            emissionsMode === "default"
              ? safeNumber(ref.simpleDefaultSefa) ?? undefined
              : undefined,
          resolvedYear: selectedYear,

          benchmarkDefault:
            emissionsMode === "default"
              ? safeNumber(benchmark?.value) ?? undefined
              : undefined,

          benchmarkActual:
            emissionsMode === "actual"
              ? safeNumber(benchmark?.value) ?? undefined
              : undefined,

          source: defaultValue.sourceRegulation,
          sourceVersion: defaultValue.sourceVersion,
        };

        setSelectedProduct(mappedProduct);
      } catch (error) {
        if ((error as Error)?.name === "AbortError") return;

        console.error(error);
        setSelectedProduct(null);
        setOfficialReference(null);
        setOfficialDataError(
          error instanceof Error
            ? error.message
            : "Could not resolve the official CBAM reference."
        );
      } finally {
        setOfficialReferenceLoading(false);
      }
    };

    loadReference();

    return () => controller.abort();
  }, [
    selectedOfficialGood,
    selectedCountry,
    selectedYear,
    productionYear,
    emissionsMode,
    actualProductionRoute,
  ]);

  useEffect(() => {
    if (!selectedProduct) {
      setActualEf(0);
      setActualVerified(false);
      return;
    }

    // Official reference products do not store supplier actual emissions.
    // Reset once when a different official good is selected, but do not wipe
    // the user's actual-EF entry merely because the benchmark/route refreshes.
    if (selectedProduct.id.startsWith("official:")) {
      setActualEf(0);
      setActualVerified(false);
      return;
    }

    if (
      selectedProduct.actualVerified &&
      safeNumber(selectedProduct.actualEf) !== null
    ) {
      setActualEf(Number(selectedProduct.actualEf));
      setActualVerified(true);
    } else {
      setActualEf(0);
      setActualVerified(false);
    }
  }, [selectedProduct?.id]);

  const sector = useMemo(
    () => inferSector(selectedProduct),
    [selectedProduct]
  );

  const officialSelectedSector = useMemo(() => {
    if (!selectedOfficialGood) return "unknown" as Sector;

    return inferSector({
      id: selectedOfficialGood.id,
      name: selectedOfficialGood.description || selectedOfficialGood.cnCode,
      cn: selectedOfficialGood.cnDigits,
      sector: selectedOfficialGood.sector || "unknown",
    });
  }, [selectedOfficialGood]);

  const actualRouteOptions = useMemo(
    () =>
      PRODUCTION_ROUTE_OPTIONS.filter((option) =>
        option.sectors.includes(officialSelectedSector)
      ),
    [officialSelectedSector]
  );

  const selectedYearInfo = useMemo(
    () => availableYears.find((item) => item.year === selectedYear) ?? null,
    [availableYears, selectedYear]
  );

  const weeklyPriceOptions = useMemo(
    () =>
      priceRecords
        .filter(
          (record) =>
            record.year === selectedYear &&
            record.periodType === "weekly" &&
            !!record.periodKey
        )
        .sort((a, b) => {
          const startA = a.periodStart ? Date.parse(a.periodStart) : 0;
          const startB = b.periodStart ? Date.parse(b.periodStart) : 0;
          if (startA !== startB) return startA - startB;
          return (a.week ?? 0) - (b.week ?? 0);
        }),
    [priceRecords, selectedYear]
  );

  useEffect(() => {
    if (selectedYear === 2026) return;

    setSelectedWeeklyPeriodKey((current) => {
      if (
        current !== "planning" &&
        weeklyPriceOptions.some((item) => item.periodKey === current)
      ) {
        return current;
      }

      const latestOfficial = [...weeklyPriceOptions]
        .reverse()
        .find((item) => item.official);

      return latestOfficial?.periodKey || "planning";
    });
  }, [selectedYear, weeklyPriceOptions]);

  const selectedPrice = useMemo(() => {
    if (selectedYear === 2026) {
      const apiOfficial = priceRecords.find(
        (p) =>
          p.year === 2026 &&
          p.quarter === importQuarter &&
          p.official === true
      );

      if (apiOfficial) {
        return {
          price: apiOfficial.price,
          official: true,
          periodKey: apiOfficial.periodKey || `2026-${importQuarter}`,
          periodLabel: `${importQuarter} 2026`,
          label: `${importQuarter} 2026 official CBAM certificate price`,
        };
      }

      const fallback = OFFICIAL_2026_PRICES[importQuarter];

      if (fallback !== null) {
        return {
          price: fallback,
          official: true,
          periodKey: `2026-${importQuarter}`,
          periodLabel: `${importQuarter} 2026`,
          label: `${importQuarter} 2026 official Commission price`,
        };
      }

      return {
        price: planningEtsPrice,
        official: false,
        periodKey: `2026-${importQuarter}`,
        periodLabel: `${importQuarter} 2026`,
        label: `${importQuarter} 2026 provisional planning price`,
      };
    }

    const selectedRecord = weeklyPriceOptions.find(
      (record) => record.periodKey === selectedWeeklyPeriodKey
    );

    if (selectedRecord) {
      const weekLabel = selectedRecord.week
        ? `Week ${selectedRecord.week}, ${selectedYear}`
        : selectedRecord.periodKey || `${selectedYear} weekly period`;

      return {
        price: selectedRecord.price,
        official: Boolean(selectedRecord.official),
        periodKey:
          selectedRecord.periodKey ||
          `${selectedYear}-W${String(selectedRecord.week ?? 0).padStart(2, "0")}`,
        periodLabel: weekLabel,
        label: `${weekLabel} ${
          selectedRecord.official ? "official" : "provisional"
        } CBAM certificate price`,
      };
    }

    return {
      price: planningEtsPrice,
      official: false,
      periodKey: `${selectedYear}-PLANNING`,
      periodLabel: `${selectedYear} planning period`,
      label: `${selectedYear} planning ETS price — official weekly CBAM price not yet available`,
    };
  }, [
    selectedYear,
    priceRecords,
    importQuarter,
    planningEtsPrice,
    weeklyPriceOptions,
    selectedWeeklyPeriodKey,
  ]);

  const calculation = useMemo(() => {
    if (!selectedProduct) return null;

    const warnings: string[] = [];
    const errors: string[] = [];

    if (!Number.isFinite(volume) || volume <= 0) {
      errors.push("Import mass must be greater than zero.");
    }

    if (sector === "unknown") {
      warnings.push(
        "Sector could not be determined. Add a sector field to the CBAM product database."
      );
    }

    let specificEmbeddedEmissions: number | null = null;
    let efProvenance = "";

    if (emissionsMode === "default") {
      const resolved = getDefaultEf(selectedProduct, sector, selectedYear);
      specificEmbeddedEmissions = resolved.value;
      efProvenance = resolved.provenance;

      if (specificEmbeddedEmissions === null) {
        errors.push(
          `No defensible ${selectedYear} default emission factor is available for this record.`
        );
      }

      if (!selectedProduct.country) {
        warnings.push(
          `CBAM default values for ${selectedYear} are country/CN-specific. Your current product record has no country of origin.`
        );
      }
    } else {
      specificEmbeddedEmissions = safeNumber(actualEf);
      efProvenance = actualVerified
        ? "User-confirmed verified actual emissions"
        : "User-entered actual emissions (not confirmed verified)";

      if (
        specificEmbeddedEmissions === null ||
        specificEmbeddedEmissions < 0
      ) {
        errors.push("Enter a valid actual embedded-emissions intensity.");
      }

      if (!actualVerified) {
        warnings.push(
          "Actual emissions used in the definitive CBAM declaration must meet the verification requirements. This result is planning-only until verified."
        );
      }
    }

    if (sector === "electricity") {
      warnings.push(
        "Electricity uses special CBAM quantity/emissions rules. This tonne-based product workflow is not suitable for imported electricity."
      );
    }

    const embeddedEmissions =
      specificEmbeddedEmissions !== null && volume > 0
        ? volume * specificEmbeddedEmissions
        : null;

    const benchmark = getBenchmark(selectedProduct, emissionsMode);
    const explicitSeFa = getSeFaForYear(selectedProduct, emissionsMode, selectedYear);
    const cbamFreeAllocationFactor = freeAllocationFactorForYear(selectedYear);
    const cscf = OFFICIAL_CSCF[selectedYear] ?? null;

    let freeAllocationAdjustment: number | null = null;
    let freeAllocationMethod = "";

    if (sector === "electricity") {
      freeAllocationAdjustment = 0;
      freeAllocationMethod = "Electricity FAA = 0";
    } else if (cbamFreeAllocationFactor === 0) {
      freeAllocationAdjustment = 0;
      freeAllocationMethod =
        `${selectedYear}: CBAM free-allocation factor is zero; no free-allocation adjustment remains`;
    } else if (explicitSeFa !== null) {
      freeAllocationAdjustment = volume * explicitSeFa;
      freeAllocationMethod = `Backend-resolved ${selectedYear} SEFA × mass`;
    } else if (
      benchmark !== null &&
      emissionsMode === "default" &&
      cbamFreeAllocationFactor !== null &&
      cscf !== null
    ) {
      freeAllocationAdjustment =
        volume * cbamFreeAllocationFactor * cscf * benchmark;
      freeAllocationMethod =
        `Mass × ${selectedYear} CBAM free-allocation factor × CSCF × official default benchmark`;
    } else if (
      emissionsMode === "default" &&
      cbamFreeAllocationFactor !== null &&
      cbamFreeAllocationFactor > 0 &&
      cscf === null
    ) {
      warnings.push(
        `A final ${selectedYear} CSCF/SEFA is not available in the current database. Gross exposure is shown, but the calculator will not invent a net certificate quantity.`
      );
    } else if (benchmark !== null && emissionsMode === "actual") {
      warnings.push(
        "An actual-data process benchmark was resolved, but this frontend does not convert that benchmark into SEFA automatically. Actual-data SEFA for complex goods can require process and precursor calculations. Gross exposure is shown until a verified SEFA is supplied by the backend."
      );
    } else {
      warnings.push(
        "No applicable CBAM benchmark/SEFA is available for this reporting year. Gross carbon exposure can be shown, but a defensible net certificate quantity cannot be calculated."
      );
    }

    const certificatesBeforeForeign =
      embeddedEmissions !== null && freeAllocationAdjustment !== null
        ? Math.max(0, embeddedEmissions - freeAllocationAdjustment)
        : null;

    const grossCarbonExposure =
      embeddedEmissions !== null
        ? embeddedEmissions * selectedPrice.price
        : null;

    /**
     * Foreign carbon-price adjustment is intentionally not automatically
     * applied until the backend has a versioned implementation of the
     * legally final conversion methodology.
     */
    const finalCertificates = certificatesBeforeForeign;
    const estimatedCost =
      finalCertificates !== null
        ? finalCertificates * selectedPrice.price
        : null;

    const thresholdEligible = isMassThresholdSector(sector);
    const annualEligibleMass =
      priorYtdEligibleMass + (thresholdEligible ? Math.max(0, volume) : 0);

    const deMinimisExempt =
      thresholdEligible && annualEligibleMass <= 50;

    const finalCostAfterThreshold =
      deMinimisExempt && estimatedCost !== null ? 0 : estimatedCost;

    if (thresholdEligible && priorYtdEligibleMass === 0) {
      warnings.push(
        "The 50 t test is annual and cumulative per importer. Enter eligible CBAM mass already imported earlier in the year."
      );
    }

    if (!selectedPrice.official) {
      warnings.push(
        `The selected ${selectedPrice.periodLabel} does not have a published official CBAM certificate price in the database. The displayed price is a planning proxy and will be replaced automatically when the official price is synced.`
      );
    }

    if (foreignCarbonPrice > 0) {
      warnings.push(
        "Foreign carbon price is shown for planning only and is not automatically deducted from this result. The legal adjustment is a reduction in certificate quantity and must follow the final implementing rules."
      );
    }

    const forecast = Object.keys(FREE_ALLOCATION_CBAM_FACTOR).map((key) => {
      const year = Number(key);
      const factor = FREE_ALLOCATION_CBAM_FACTOR[year];

      if (
        embeddedEmissions === null ||
        benchmark === null ||
        sector === "electricity" ||
        emissionsMode === "actual"
      ) {
        return {
          year: String(year),
          "Scenario Cost": null,
        };
      }

      const forecastCscf = OFFICIAL_CSCF[year] ?? 1;
      const faa = volume * factor * forecastCscf * benchmark;
      const certs = Math.max(0, embeddedEmissions - faa);

      return {
        year: String(year),
        "Scenario Cost": certs * planningEtsPrice,
      };
    });

    if (Object.keys(FREE_ALLOCATION_CBAM_FACTOR).some((y) => Number(y) > 2030)) {
      warnings.push(
        "Forecasts after 2030 assume CSCF = 1 and current-law free-allocation factors. They are scenarios, not guaranteed future liability."
      );
    }

    return {
      errors,
      warnings,
      specificEmbeddedEmissions,
      efProvenance,
      embeddedEmissions,
      benchmark,
      explicitSeFa,
      freeAllocationAdjustment,
      freeAllocationMethod,
      certificatesBeforeForeign,
      finalCertificates,
      grossCarbonExposure,
      estimatedCost,
      finalCostAfterThreshold,
      thresholdEligible,
      annualEligibleMass,
      deMinimisExempt,
      certificatePrice: selectedPrice.price,
      certificatePriceOfficial: selectedPrice.official,
      certificatePriceLabel: selectedPrice.label,
      forecast,
    };
  }, [
    selectedProduct,
    volume,
    sector,
    emissionsMode,
    actualEf,
    actualVerified,
    selectedPrice,
    selectedYear,
    priorYtdEligibleMass,
    foreignCarbonPrice,
    planningEtsPrice,
  ]);

  const portfolioThresholdByYear = useMemo(() => {
    const map = new Map<
      number,
      { priorYtd: number; lineMass: number; annualEligibleMass: number; exempt: boolean }
    >();

    for (const item of portfolio) {
      if (!item.eligibleForMassThreshold) continue;

      const current = map.get(item.reportingYear) ?? {
        priorYtd: 0,
        lineMass: 0,
        annualEligibleMass: 0,
        exempt: false,
      };

      current.priorYtd = Math.max(
        current.priorYtd,
        Math.max(0, item.priorYtdEligibleMass || 0)
      );
      current.lineMass += item.volume;
      current.annualEligibleMass = current.priorYtd + current.lineMass;
      current.exempt =
        current.annualEligibleMass > 0 &&
        current.annualEligibleMass <= 50;

      map.set(item.reportingYear, current);
    }

    return map;
  }, [portfolio]);

  const portfolioTotal = useMemo(() => {
    return portfolio.reduce((sum, item) => {
      if (item.estimatedCost === null) return sum;

      const status = portfolioThresholdByYear.get(item.reportingYear);
      if (
        item.eligibleForMassThreshold &&
        status?.exempt
      ) {
        return sum;
      }

      return sum + item.estimatedCost;
    }, 0);
  }, [portfolio, portfolioThresholdByYear]);

  const addToPortfolio = () => {
    if (!selectedProduct || !calculation) return;

    if (
      calculation.errors.length ||
      calculation.embeddedEmissions === null
    ) {
      alert("Resolve the calculation errors before saving this line.");
      return;
    }

    const item: PortfolioItem = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`,
      supplier: supplierName.trim() || "Unknown Supplier",
      product: selectedProduct,
      volume,
      emissions: calculation.embeddedEmissions,
      certificates: calculation.finalCertificates,
      estimatedCost: calculation.estimatedCost,
      emissionsMode,
      price: calculation.certificatePrice,
      priceLabel: calculation.certificatePriceLabel,
      reportingYear: selectedYear,
      productionYear,
      periodKey: selectedPrice.periodKey,
      periodLabel: selectedPrice.periodLabel,
      priorYtdEligibleMass,
      benchmarkUsed: calculation.benchmark,
      freeAllocationAdjustment: calculation.freeAllocationAdjustment,
      eligibleForMassThreshold: calculation.thresholdEligible,
    };

    setPortfolio((prev) => [...prev, item]);
    setSupplierName("");
    setActiveAppTab("portfolio");
  };

  const deleteFromPortfolio = (id: string) => {
    setPortfolio((prev) => prev.filter((item) => item.id !== id));
  };

  const generatePDF = () => {
    if (!selectedProduct || !calculation) return;

    setIsDownloading(true);

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 38, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("CBAM ESTIMATED EXPOSURE", 14, 18);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(
        "Planning report — not an EU Registry filing or legal certification",
        14,
        27
      );

      doc.setTextColor(15, 23, 42);

      autoTable(doc, {
        startY: 48,
        body: [
          ["Supplier", supplierName || "Not specified"],
          ["Product", selectedProduct.name],
          ["CN code", selectedProduct.cn],
          ["Sector", sectorLabel(sector)],
          ["Country of origin", selectedProduct.country || "Not supplied"],
          ["Import mass", `${num(volume)} t`],
          ["Reporting / import year", String(selectedYear)],
          ["Production year", String(productionYear)],
          ["Effective regulatory year", String(officialReference?.regulatoryYear ?? productionYear)],
          ["Certificate-price period", selectedPrice.periodLabel],
          [
            "Certificate price",
            `${eur(calculation.certificatePrice)} — ${
              calculation.certificatePriceOfficial
                ? "official"
                : "provisional"
            }`,
          ],
          ["Emissions basis", emissionsMode.toUpperCase()],
          [
            "Specific embedded emissions",
            calculation.specificEmbeddedEmissions !== null
              ? `${num(calculation.specificEmbeddedEmissions, 4)} tCO2e/t`
              : "Unavailable",
          ],
          [
            "CBAM benchmark",
            calculation.benchmark !== null
              ? `${num(calculation.benchmark, 4)} tCO2e/t`
              : "Unavailable",
          ],
        ],
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 2.6 },
        columnStyles: {
          0: { fontStyle: "bold", fillColor: [248, 250, 252], cellWidth: 65 },
        },
      });

      const y = (doc as any).lastAutoTable.finalY + 10;

      autoTable(doc, {
        startY: y,
        head: [["Calculation step", "Result"]],
        body: [
          [
            "Embedded emissions",
            calculation.embeddedEmissions !== null
              ? `${num(calculation.embeddedEmissions)} tCO2e`
              : "Unavailable",
          ],
          [
            "Free-allocation adjustment",
            calculation.freeAllocationAdjustment !== null
              ? `${num(calculation.freeAllocationAdjustment)} tCO2e`
              : "Unavailable",
          ],
          [
            "Certificates before foreign-carbon adjustment",
            calculation.certificatesBeforeForeign !== null
              ? num(calculation.certificatesBeforeForeign)
              : "Unavailable",
          ],
          [
            "50 t annual de-minimis status",
            calculation.deMinimisExempt
              ? `Provisionally exempt — ${num(
                  calculation.annualEligibleMass
                )} t annual eligible mass`
              : "Not exempt / threshold not applicable",
          ],
          [
            `Estimated ${selectedYear} exposure`,
            calculation.finalCostAfterThreshold !== null
              ? eur(calculation.finalCostAfterThreshold)
              : "Unavailable until benchmark/SEFA is supplied",
          ],
        ],
        theme: "striped",
        headStyles: { fillColor: [30, 58, 138] },
      });

      doc.save(
        `CBAM_Planning_Estimate_${normalizeCn(selectedProduct.cn)}_${selectedYear}_${selectedPrice.periodKey.replace(/[^A-Za-z0-9_-]/g, "_")}.pdf`
      );
    } catch (error) {
      console.error(error);
      alert("Failed to generate PDF.");
    } finally {
      setIsDownloading(false);
    }
  };

  /**
   * Internal calculation XML only.
   * Do not present this as an official EU Registry XSD export.
   */
  const exportInternalXml = () => {
    if (!selectedProduct || !calculation) return;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<GreenEngineeringCBAMEstimate xmlns="https://greenengineeringtools.com/cbam/estimate/v1">
  <RegistryReady>false</RegistryReady>
  <ReportingYear>${selectedYear}</ReportingYear>
  <ProductionYear>${productionYear}</ProductionYear>
  <EffectiveRegulatoryYear>${officialReference?.regulatoryYear ?? productionYear}</EffectiveRegulatoryYear>
  <ImportPeriod>${xmlEscape(selectedPrice.periodLabel)}</ImportPeriod>
  <ImportPeriodKey>${xmlEscape(selectedPrice.periodKey)}</ImportPeriodKey>
  <Supplier>${xmlEscape(supplierName || "Not specified")}</Supplier>
  <Product>
    <CNCode>${xmlEscape(selectedProduct.cn)}</CNCode>
    <Name>${xmlEscape(selectedProduct.name)}</Name>
    <Sector>${xmlEscape(sector)}</Sector>
    <CountryOfOrigin>${xmlEscape(selectedProduct.country || "")}</CountryOfOrigin>
    <NetMassTonnes>${volume}</NetMassTonnes>
  </Product>
  <Calculation>
    <EmissionsMode>${emissionsMode}</EmissionsMode>
    <SpecificEmbeddedEmissions>${calculation.specificEmbeddedEmissions ?? ""}</SpecificEmbeddedEmissions>
    <EmbeddedEmissions>${calculation.embeddedEmissions ?? ""}</EmbeddedEmissions>
    <Benchmark>${calculation.benchmark ?? ""}</Benchmark>
    <FreeAllocationAdjustment>${calculation.freeAllocationAdjustment ?? ""}</FreeAllocationAdjustment>
    <CertificatesBeforeForeignAdjustment>${calculation.certificatesBeforeForeign ?? ""}</CertificatesBeforeForeignAdjustment>
    <CertificatePriceEUR>${calculation.certificatePrice}</CertificatePriceEUR>
    <CertificatePriceOfficial>${calculation.certificatePriceOfficial}</CertificatePriceOfficial>
    <EstimatedCostEUR>${calculation.finalCostAfterThreshold ?? ""}</EstimatedCostEUR>
  </Calculation>
  <Notice>This file is an internal planning export and is not validated against an EU CBAM Registry XSD.</Notice>
</GreenEngineeringCBAMEstimate>`;

    const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CBAM_Internal_Estimate_${normalizeCn(
      selectedProduct.cn
    )}.xml`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleErpCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const errors: string[] = [];
        const items: PortfolioItem[] = [];

        (results.data as any[]).forEach((row, index) => {
          const rowNumber = index + 2;
          const cn = normalizeCn(row.CN_Code);
          const tonnes = safeNumber(row.Tonnes);

          if (!cn) {
            errors.push(`Row ${rowNumber}: missing CN_Code.`);
            return;
          }

          if (tonnes === null || tonnes <= 0) {
            errors.push(`Row ${rowNumber}: invalid Tonnes value.`);
            return;
          }

          const product = productDatabase.find(
            (p) => normalizeCn(p.cn) === cn
          );

          if (!product) {
            // IMPORTANT: Never silently fall back to productDatabase[0].
            errors.push(
              `Row ${rowNumber}: CN ${cn} was not found in the CBAM database.`
            );
            return;
          }

          const itemSector = inferSector(product);
          const defaultResolved = getDefaultEf(product, itemSector, selectedYear);
          const benchmark = getBenchmark(product, "default");
          const explicitSeFa = getSeFaForYear(product, "default", selectedYear);

          if (defaultResolved.value === null) {
            errors.push(
              `Row ${rowNumber}: CN ${cn} has no defensible ${selectedYear} default EF.`
            );
            return;
          }

          const emissions = tonnes * defaultResolved.value;

          let faa: number | null = null;

          if (itemSector === "electricity") {
            faa = 0;
          } else if (explicitSeFa !== null) {
            faa = tonnes * explicitSeFa;
          } else if (freeAllocationFactorForYear(selectedYear) === 0) {
            faa = 0;
          } else if (
            benchmark !== null &&
            freeAllocationFactorForYear(selectedYear) !== null &&
            (OFFICIAL_CSCF[selectedYear] ?? null) !== null
          ) {
            faa =
              tonnes *
              Number(freeAllocationFactorForYear(selectedYear)) *
              Number(OFFICIAL_CSCF[selectedYear]) *
              benchmark;
          }

          const certificates =
            faa !== null ? Math.max(0, emissions - faa) : null;

          const price = selectedPrice.price;
          const estimatedCost =
            certificates !== null ? certificates * price : null;

          items.push({
            id:
              typeof crypto !== "undefined" && "randomUUID" in crypto
                ? crypto.randomUUID()
                : `${Date.now()}-${index}`,
            supplier: String(row.Supplier || "ERP Bulk").trim(),
            product,
            volume: tonnes,
            emissions,
            certificates,
            estimatedCost,
            emissionsMode: "default",
            price,
            priceLabel: selectedPrice.label,
            reportingYear: selectedYear,
            productionYear,
            periodKey: selectedPrice.periodKey,
            periodLabel: selectedPrice.periodLabel,
            priorYtdEligibleMass,
            benchmarkUsed: benchmark,
            freeAllocationAdjustment: faa,
            eligibleForMassThreshold: isMassThresholdSector(itemSector),
          });
        });

        setErpErrors(errors);
        setPortfolio((prev) => [...prev, ...items]);
        setActiveAppTab("portfolio");

        if (erpFileInputRef.current) {
          erpFileInputRef.current.value = "";
        }
      },
      error: (error) => {
        console.error(error);
        setErpErrors([`CSV parsing failed: ${error.message}`]);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <header className="text-center max-w-4xl mx-auto mb-8">
          <div className="inline-flex rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-black uppercase tracking-widest text-indigo-700">
            Definitive-period planning tool
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-black text-slate-950 tracking-tight">
            EU CBAM Calculator — {selectedYear}
          </h1>
          <p className="mt-4 text-base md:text-lg text-slate-600 leading-7">
            Use this EU CBAM calculator to estimate embedded emissions and certificate exposure for the selected reporting year,
            the CBAM free-allocation adjustment, certificate quantities and financial
            exposure for covered imports. It also tracks the annual 50-tonne threshold,
            supports CSV bulk imports and separates official certificate prices
            from live EU ETS planning prices.
          </p>
        </header>

        {apiWarning && (
          <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <strong>Backend check:</strong> {apiWarning}
          </div>
        )}

        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <Link
            href={buildAdvancedHref("/cbam-calculator/actual-data", {
              country: selectedCountry || undefined,
              cn: selectedOfficialGood?.cnDigits || undefined,
              reportingYear: selectedYear,
              productionYear,
              route: actualProductionRoute || undefined,
            })}
            className="rounded-xl border border-slate-200 bg-white p-4 hover:border-indigo-300"
          >
            <div className="font-black text-slate-950">Actual / complex goods</div>
            <div className="mt-1 text-xs text-slate-600">Process emissions, routes, precursors and verifier status.</div>
          </Link>
          <Link
            href={buildAdvancedHref("/cbam-calculator/electricity", {
              country: selectedCountry || undefined,
              reportingYear: selectedYear,
            })}
            className="rounded-xl border border-slate-200 bg-white p-4 hover:border-indigo-300"
          >
            <div className="font-black text-slate-950">Electricity</div>
            <div className="mt-1 text-xs text-slate-600">Dedicated MWh methodology and actual-electricity criteria.</div>
          </Link>
          <Link href="/cbam-calculator/bulk" className="rounded-xl border border-slate-200 bg-white p-4 hover:border-indigo-300">
            <div className="font-black text-slate-950">Official bulk CSV</div>
            <div className="mt-1 text-xs text-slate-600">Country + CN/TARIC row-by-row official resolution.</div>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 bg-white border border-slate-200 p-2 rounded-xl shadow-sm mb-8">
          {[
            ["calculator", "1. Calculator"],
            ["portfolio", `2. Portfolio (${portfolio.length})`],
            ["erp", "3. Official Bulk Import"],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setActiveAppTab(id as any)}
              className={`flex-1 px-4 py-3 rounded-lg text-sm font-black transition ${
                activeAppTab === id
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeAppTab === "calculator" && (
          <div className="grid lg:grid-cols-12 gap-7">
            <section className="lg:col-span-5 space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-sm">
                <h2 className="text-xl font-black text-slate-950">
                  1. Import details
                </h2>

                <div className="mt-5 space-y-4">
                  <label className="block">
                    <span className="block text-xs font-black text-slate-600 mb-1">
                      Supplier
                    </span>
                    <input
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                      placeholder="Supplier / installation"
                      className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </label>

                  <label className="block">
                    <span className="block text-xs font-black text-slate-600 mb-1">
                      Country of origin
                    </span>
                    <select
                      value={selectedCountry}
                      onChange={(e) => {
                        setSelectedCountry(e.target.value);
                        setGoodsSearch("");
                        setSelectedOfficialGood(null);
                        setOfficialReference(null);
                        setSelectedProduct(null);
                        setActualProductionRoute("");
                      }}
                      className="w-full rounded-lg border border-slate-300 p-3 bg-white"
                    >
                      <option value="">
                        {officialOptionsLoading && !officialCountries.length
                          ? "Loading official countries…"
                          : "Select country of origin"}
                      </option>
                      {officialCountries.map((country) => (
                        <option key={country.normalized} value={country.name}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="block text-xs font-black text-slate-600 mb-1">
                      Search official CN/TARIC goods
                    </span>
                    <input
                      value={goodsSearch}
                      onChange={(e) => setGoodsSearch(e.target.value)}
                      disabled={!selectedCountry}
                      placeholder={
                        selectedCountry
                          ? "e.g. 7208, cement, aluminium, urea"
                          : "Select country first"
                      }
                      className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                    />
                    <span className="mt-1 block text-[11px] text-slate-500">
                      Searches the imported European Commission default-value dataset.
                    </span>
                  </label>

                  <label className="block">
                    <span className="block text-xs font-black text-slate-600 mb-1">
                      Official good / CN code
                    </span>
                    <select
                      value={selectedOfficialGood?.id || ""}
                      disabled={!selectedCountry || officialOptionsLoading}
                      onChange={(e) => {
                        const good =
                          officialGoods.find(
                            (item) => item.id === e.target.value
                          ) || null;

                        setSelectedOfficialGood(good);
                        setOfficialReference(null);
                        setSelectedProduct(null);

                        // Prefill from the official default-value route only
                        // as a convenience. Actual-mode users can change it.
                        setActualProductionRoute(
                          good?.productionRouteIndicator || ""
                        );
                      }}
                      className="w-full rounded-lg border border-slate-300 p-3 bg-white disabled:bg-slate-100"
                    >
                      <option value="">
                        {!selectedCountry
                          ? "Select country first"
                          : officialOptionsLoading
                          ? "Loading official goods…"
                          : officialGoods.length
                          ? `Select from ${officialGoods.length} result${
                              officialGoods.length === 1 ? "" : "s"
                            }`
                          : "No matching official goods"}
                      </option>
                      {officialGoods.map((good) => (
                        <option key={good.id} value={good.id}>
                          {good.cnCode} —{" "}
                          {(good.description || sectorLabel(
                            inferSector({
                              id: good.id,
                              name: good.description || good.cnCode,
                              cn: good.cnDigits,
                              sector: good.sector || "unknown",
                            })
                          )).slice(0, 115)}
                        </option>
                      ))}
                    </select>
                  </label>

                  {emissionsMode === "actual" &&
                    selectedOfficialGood &&
                    actualRouteOptions.length > 0 && (
                      <label className="block">
                        <span className="block text-xs font-black text-slate-600 mb-1">
                          Actual production route (when applicable)
                        </span>
                        <select
                          value={actualProductionRoute}
                          onChange={(e) =>
                            setActualProductionRoute(e.target.value)
                          }
                          className="w-full rounded-lg border border-slate-300 p-3 bg-white"
                        >
                          <option value="">
                            Route-independent / not yet confirmed
                          </option>
                          {actualRouteOptions.map((route) => (
                            <option key={route.code} value={route.code}>
                              {route.code} — {route.label}
                            </option>
                          ))}
                        </select>
                        <span className="mt-1 block text-[11px] text-amber-700">
                          Confirm the installation route for actual-emissions work.
                          A prefilled route comes from the official default-value
                          record and should not be treated as supplier verification.
                        </span>
                      </label>
                    )}

                  {officialDataError && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                      <strong>Official-data lookup:</strong>{" "}
                      {officialDataError}
                    </div>
                  )}

                  {officialReferenceLoading && (
                    <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-800">
                      Resolving official default value, production route and
                      benchmark…
                    </div>
                  )}

                  {selectedProduct &&
                    officialReference?.found &&
                    officialReference.defaultValue && (
                      <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-700 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-emerald-100 px-2 py-1 font-black text-emerald-800">
                            Official EU reference resolved
                          </span>
                          {officialReference.defaultValue.fallbackUsed && (
                            <span className="rounded-full bg-amber-100 px-2 py-1 font-black text-amber-800">
                              Other countries fallback used
                            </span>
                          )}
                        </div>

                        <div>
                          <strong>CN/TARIC:</strong>{" "}
                          {officialReference.defaultValue.matchedCnCode ||
                            selectedProduct.cn}
                        </div>
                        <div>
                          <strong>Sector:</strong> {sectorLabel(sector)}
                        </div>
                        <div>
                          <strong>Origin selected:</strong> {selectedCountry}
                        </div>
                        <div>
                          <strong>Default-value country used:</strong>{" "}
                          {officialReference.defaultValue.countryUsed}
                        </div>
                        <div>
                          <strong>Raw official total:</strong>{" "}
                          {safeNumber(
                            officialReference.defaultValue.totalEmissions
                          ) !== null
                            ? `${num(
                                Number(
                                  officialReference.defaultValue.totalEmissions
                                ),
                                4
                              )} tCO2e/t`
                            : "Unavailable"}
                        </div>
                        <div>
                          {officialReference?.regulatoryYear && (
                          <div className="mb-1">
                            <strong>Effective regulatory / production year:</strong>{" "}
                            {officialReference.regulatoryYear}
                          </div>
                        )}
                        <strong>{selectedYear} import-year marked-up default EF:</strong>{" "}
                          {safeNumber(
                            officialReference.defaultValue
                              .markedUpTotalEmissions
                          ) !== null
                            ? `${num(
                                Number(
                                  officialReference.defaultValue
                                    .markedUpTotalEmissions
                                ),
                                4
                              )} tCO2e/t`
                            : "Not used in actual mode"}
                        </div>
                        <div>
                          <strong>Production route:</strong>{" "}
                          {officialReference.benchmark
                            ?.productionRouteLabel ||
                            officialReference.defaultValue
                              .productionRouteLabel ||
                            "Route-independent / not specified"}
                        </div>
                        <div>
                          <strong>
                            {emissionsMode === "default"
                              ? "Default benchmark"
                              : "Actual-data benchmark"}
                            :
                          </strong>{" "}
                          {safeNumber(
                            officialReference.benchmark?.value
                          ) !== null
                            ? `${num(
                                Number(
                                  officialReference.benchmark?.value
                                ),
                                4
                              )} tCO2e/t`
                            : "Not resolved"}
                        </div>
                        {emissionsMode === "default" && (
                          <div>
                            <strong>{selectedYear} resolved SEFA:</strong>{" "}
                            {safeNumber(
                              officialReference.simpleDefaultSefa
                            ) !== null
                              ? `${num(
                                  Number(
                                    officialReference.simpleDefaultSefa
                                  ),
                                  5
                                )} tCO2e/t`
                              : "Not resolved"}
                          </div>
                        )}

                        <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500 space-y-1">
                          <div>
                            <strong>Source:</strong>{" "}
                            {officialReference.defaultValue.sourceRegulation ||
                              "Official EU CBAM reference dataset"}
                            {officialReference.defaultValue.sourceVersion
                              ? ` — ${officialReference.defaultValue.sourceVersion}`
                              : ""}
                          </div>
                          <div className="flex flex-wrap gap-3">
                            {officialReference.defaultValue.sourceUrl && (
                              <a
                                href={officialReference.defaultValue.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="font-bold text-indigo-700 hover:underline"
                              >
                                Default-value source
                              </a>
                            )}
                            {officialReference.benchmark?.sourceUrl && (
                              <a
                                href={officialReference.benchmark.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="font-bold text-indigo-700 hover:underline"
                              >
                                Benchmark source
                              </a>
                            )}
                          </div>
                        </div>

                        {!!officialReference.warnings?.length && (
                          <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-amber-800">
                            {officialReference.warnings.map((warning, index) => (
                              <div key={index}>• {warning}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                  <div className="grid sm:grid-cols-2 gap-3">
                    <label className="block">
                      <span className="block text-xs font-black text-slate-600 mb-1">
                        This import (tonnes)
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={volume}
                        onChange={(e) => setVolume(Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-300 p-3 font-mono font-bold"
                      />
                    </label>

                    <label className="block">
                      <span className="block text-xs font-black text-slate-600 mb-1">
                        Eligible CBAM mass imported earlier in {selectedYear}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={priorYtdEligibleMass}
                        onChange={(e) =>
                          setPriorYtdEligibleMass(
                            Math.max(0, Number(e.target.value) || 0)
                          )
                        }
                        className="w-full rounded-lg border border-slate-300 p-3 font-mono font-bold"
                      />
                    </label>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <label className="block">
                      <span className="block text-xs font-black text-slate-600 mb-1">
                        Reporting / import year
                      </span>
                      <select
                        value={selectedYear}
                        onChange={(e) => {
                          const nextYear = Number(e.target.value);
                          setSelectedYear(nextYear);
                          setProductionYear(nextYear === 2026 ? 2026 : nextYear);
                          setOfficialReference(null);
                          setSelectedProduct(null);
                        }}
                        className="w-full rounded-lg border border-slate-300 p-3 bg-white font-bold"
                      >
                        {availableYears.map((item) => (
                          <option key={item.year} value={item.year}>
                            {item.year} — {item.readiness === "official"
                              ? "official data available"
                              : item.readiness === "planning-ready"
                                ? "planning-ready / prices update automatically"
                                : "data pending"}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="block text-xs font-black text-slate-600 mb-1">
                        Production year
                      </span>
                      <select
                        value={productionYear}
                        disabled={selectedYear === 2026}
                        onChange={(e) => {
                          setProductionYear(Number(e.target.value));
                          setOfficialReference(null);
                          setSelectedProduct(null);
                        }}
                        className="w-full rounded-lg border border-slate-300 p-3 bg-white font-bold disabled:bg-slate-100 disabled:text-slate-500"
                      >
                        {(selectedYearInfo?.productionYearChoices ??
                          Array.from(
                            { length: selectedYear - 2026 + 1 },
                            (_, i) => 2026 + i
                          )).map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                      <span className="mt-1 block text-[11px] leading-4 text-slate-500">
                        {selectedYear === 2026
                          ? "2026 imports use 2026 regardless of production timing."
                          : "Use a different production year only when the production period is supported by sufficient evidence; otherwise keep it equal to the import year."}
                      </span>
                    </label>

                    {selectedYear === 2026 ? (
                      <label className="block">
                        <span className="block text-xs font-black text-slate-600 mb-1">
                          2026 import quarter
                        </span>
                        <select
                          value={importQuarter}
                          onChange={(e) =>
                            setImportQuarter(e.target.value as Quarter)
                          }
                          className="w-full rounded-lg border border-slate-300 p-3 bg-white"
                        >
                          {(["Q1", "Q2", "Q3", "Q4"] as Quarter[]).map(
                            (quarter) => {
                              const record = priceRecords.find(
                                (item) =>
                                  item.year === 2026 &&
                                  item.quarter === quarter &&
                                  item.official
                              );
                              const fallback = OFFICIAL_2026_PRICES[quarter];
                              const official =
                                !!record || fallback !== null;
                              const price = record?.price ?? fallback;

                              return (
                                <option key={quarter} value={quarter}>
                                  {quarter} 2026 — {official && price !== null
                                    ? `${eur(Number(price))} official`
                                    : "official price not yet published"}
                                </option>
                              );
                            }
                          )}
                        </select>
                      </label>
                    ) : (
                      <label className="block">
                        <span className="block text-xs font-black text-slate-600 mb-1">
                          Weekly certificate-price period
                        </span>
                        <select
                          value={selectedWeeklyPeriodKey}
                          onChange={(e) =>
                            setSelectedWeeklyPeriodKey(e.target.value)
                          }
                          className="w-full rounded-lg border border-slate-300 p-3 bg-white"
                        >
                          <option value="planning">
                            Planning / future period — use current ETS planning price
                          </option>
                          {weeklyPriceOptions.map((record) => (
                            <option
                              key={record.periodKey}
                              value={record.periodKey}
                            >
                              {record.week
                                ? `Week ${record.week}, ${selectedYear}`
                                : record.periodKey}{" "}
                              — {eur(record.price)}{" "}
                              {record.official ? "official" : "provisional"}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>

                  <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-xs leading-5 text-indigo-900">
                    <strong>Automatic future updates:</strong> 2026 uses
                    quarterly certificate prices. From 2027 onward the
                    calculator switches to weekly price periods. New official
                    price rows and new calendar years appear automatically from
                    the backend without editing this page.
                    {selectedYearInfo && (
                      <>
                        {" "}Current year status:{" "}
                        <strong>{selectedYearInfo.readiness}</strong>.
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-sm">
                <h2 className="text-xl font-black text-slate-950">
                  2. Embedded emissions
                </h2>

                <div className="mt-5 grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
                  <button
                    onClick={() => setEmissionsMode("default")}
                    className={`rounded-md py-3 text-xs font-black ${
                      emissionsMode === "default"
                        ? "bg-white shadow text-red-700"
                        : "text-slate-500"
                    }`}
                  >
                    EU DEFAULT
                  </button>
                  <button
                    onClick={() => setEmissionsMode("actual")}
                    className={`rounded-md py-3 text-xs font-black ${
                      emissionsMode === "actual"
                        ? "bg-white shadow text-emerald-700"
                        : "text-slate-500"
                    }`}
                  >
                    ACTUAL DATA
                  </button>
                </div>

                {emissionsMode === "default" ? (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-900">
                    Default-value markups are applied for the selected
                    reporting year. Cement, iron/steel, aluminium and hydrogen
                    use 10% in 2026, 20% in 2027 and 30% from 2028 onward;
                    fertilisers use 1%. Values remain country/CN specific.
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    <label className="block">
                      <span className="block text-xs font-black uppercase tracking-wider text-emerald-800 mb-1">
                        Actual specific embedded emissions (tCO₂e/t)
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.0001"
                        value={actualEf}
                        onChange={(e) => setActualEf(Number(e.target.value))}
                        className="w-full rounded-lg border border-emerald-300 bg-emerald-50 p-3 font-mono font-bold"
                      />
                    </label>

                    <label className="flex items-start gap-3 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={actualVerified}
                        onChange={(e) => setActualVerified(e.target.checked)}
                        className="mt-1"
                      />
                      <span>
                        I confirm this actual-emissions value is supported by
                        the required CBAM verification evidence.
                      </span>
                    </label>
                  </div>
                )}

                <div className="mt-5">
                  <label className="block text-xs font-black text-slate-600 mb-1">
                    Foreign carbon price paid (€/tCO₂e) — planning reference
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={foreignCarbonPrice}
                    onChange={(e) =>
                      setForeignCarbonPrice(
                        Math.max(0, Number(e.target.value) || 0)
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 p-3 font-mono font-bold"
                  />
                  <p className="mt-1 text-[11px] leading-5 text-slate-500">
                    Not automatically deducted from the certificate estimate.
                    The legal adjustment is a certificate-quantity reduction,
                    not a simple euro subtraction.
                  </p>
                </div>
              </div>
            </section>

            <section className="lg:col-span-7 space-y-6">
              {calculation && (
                <>
                  <div className="rounded-xl bg-slate-950 text-white shadow-xl overflow-hidden">
                    <div className="p-5 sm:p-7">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-black uppercase tracking-widest text-indigo-300">
                            {selectedYear} estimated exposure
                          </p>
                          <h2 className="mt-2 text-2xl sm:text-3xl font-black">
                            Certificate calculation
                          </h2>
                        </div>

                        <div className="rounded-lg border border-slate-700 bg-slate-900 p-3 text-right">
                          <div className="text-[10px] uppercase tracking-widest text-slate-400 font-black">
                            Certificate price
                          </div>
                          <div className="mt-1 text-xl font-mono font-black text-emerald-400">
                            {eur(calculation.certificatePrice)}
                          </div>
                          <div
                            className={`text-[10px] mt-1 ${
                              calculation.certificatePriceOfficial
                                ? "text-emerald-300"
                                : "text-amber-300"
                            }`}
                          >
                            {calculation.certificatePriceOfficial
                              ? "Official"
                              : "Provisional planning proxy"}
                          </div>
                        </div>
                      </div>

                      {calculation.deMinimisExempt && (
                        <div className="mt-6 rounded-xl border border-emerald-500 bg-emerald-900/30 p-4">
                          <div className="font-black text-emerald-300">
                            50 t annual de-minimis threshold currently satisfied
                          </div>
                          <p className="mt-1 text-sm leading-6 text-emerald-100">
                            Eligible annual net mass:{" "}
                            {num(calculation.annualEligibleMass)} t. If the
                            importer later exceeds 50 t in the calendar year,
                            the CBAM obligations apply to all relevant imports
                            in that year.
                          </p>
                        </div>
                      )}

                      <div className="mt-7 grid sm:grid-cols-2 gap-4">
                        {[
                          [
                            "Specific embedded emissions",
                            calculation.specificEmbeddedEmissions !== null
                              ? `${num(
                                  calculation.specificEmbeddedEmissions,
                                  4
                                )} tCO₂e/t`
                              : "Unavailable",
                          ],
                          [
                            "Embedded emissions",
                            calculation.embeddedEmissions !== null
                              ? `${num(
                                  calculation.embeddedEmissions
                                )} tCO₂e`
                              : "Unavailable",
                          ],
                          [
                            "Free-allocation adjustment",
                            calculation.freeAllocationAdjustment !== null
                              ? `− ${num(
                                  calculation.freeAllocationAdjustment
                                )} tCO₂e`
                              : "Benchmark / SEFA required",
                          ],
                          [
                            "Certificates before foreign adjustment",
                            calculation.certificatesBeforeForeign !== null
                              ? num(calculation.certificatesBeforeForeign)
                              : "Unavailable",
                          ],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            className="rounded-xl border border-slate-800 bg-slate-900 p-4"
                          >
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                              {label}
                            </div>
                            <div className="mt-2 text-xl font-mono font-black text-slate-100">
                              {value}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-6 rounded-xl bg-white text-slate-950 p-5">
                        <div className="text-xs font-black uppercase tracking-widest text-slate-500">
                          Estimated CBAM cost
                        </div>

                        <div className="mt-2 text-4xl sm:text-5xl font-black font-mono text-indigo-700">
                          {calculation.finalCostAfterThreshold !== null
                            ? eur(calculation.finalCostAfterThreshold)
                            : "N/A"}
                        </div>

                        {calculation.estimatedCost === null && (
                          <p className="mt-2 text-sm text-amber-700">
                            Your database must provide a CBAM benchmark or
                            backend-computed SEFA before the net certificate
                            requirement can be calculated correctly.
                          </p>
                        )}
                      </div>

                      {calculation.errors.length > 0 && (
                        <div className="mt-5 rounded-xl border border-red-500/50 bg-red-950/40 p-4">
                          <div className="font-black text-red-300">
                            Calculation errors
                          </div>
                          <ul className="mt-2 list-disc pl-5 text-sm leading-6 text-red-100">
                            {calculation.errors.map((error) => (
                              <li key={error}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {calculation.warnings.length > 0 && (
                        <details className="mt-5 rounded-xl border border-amber-500/40 bg-amber-950/20">
                          <summary className="cursor-pointer p-4 font-black text-amber-300">
                            Data & regulatory warnings (
                            {calculation.warnings.length})
                          </summary>
                          <ul className="px-4 pb-4 list-disc pl-9 text-sm leading-6 text-amber-100">
                            {calculation.warnings.map((warning) => (
                              <li key={warning}>{warning}</li>
                            ))}
                          </ul>
                        </details>
                      )}

                      <div className="mt-6 grid sm:grid-cols-3 gap-3">
                        <button
                          onClick={generatePDF}
                          disabled={isDownloading}
                          className="rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-3 px-4 text-sm font-black"
                        >
                          {isDownloading ? "Generating…" : "PDF Estimate"}
                        </button>

                        <button
                          onClick={exportInternalXml}
                          className="rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 py-3 px-4 text-sm font-black"
                        >
                          Internal XML
                        </button>

                        <button
                          onClick={addToPortfolio}
                          className="rounded-xl bg-emerald-500 hover:bg-emerald-400 py-3 px-4 text-sm font-black"
                        >
                          Add to Portfolio
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
                    <h2 className="text-xl font-black text-slate-950">
                      Current-law cost scenario
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Forecast uses the current adopted free-allocation schedule
                      and a constant planning carbon price of{" "}
                      {eur(planningEtsPrice)}. It is not a prediction of future
                      certificate prices.
                    </p>

                    <div className="mt-5 h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={calculation.forecast}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="#e2e8f0"
                          />
                          <XAxis
                            dataKey="year"
                            tick={{ fontSize: 11, fill: "#64748b" }}
                          />
                          <YAxis
                            tickFormatter={(v) => `€${Math.round(v / 1000)}k`}
                            tick={{ fontSize: 11, fill: "#64748b" }}
                          />
                          <RechartsTooltip
                            formatter={(value: any) =>
                              value === null
                                ? "N/A"
                                : eur(Number(value))
                            }
                          />
                          <Line
                            type="monotone"
                            dataKey="Scenario Cost"
                            stroke="#10b981"
                            strokeWidth={3}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              )}
            </section>
          </div>
        )}

        {activeAppTab === "portfolio" && (
          <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-950">
                  Multi-year CBAM portfolio
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Each line retains its own reporting year, price period,
                  certificate price, benchmark and calculation basis.
                </p>
              </div>

              <div className="sm:text-right">
                <div className="text-[10px] uppercase tracking-widest font-black text-slate-400">
                  Estimated portfolio exposure
                </div>
                <div className="mt-1 text-3xl font-mono font-black text-indigo-700">
                  {eur(portfolioTotal)}
                </div>
              </div>
            </div>

            {Array.from(portfolioThresholdByYear.entries())
              .filter(([, status]) => status.exempt)
              .map(([year, status]) => (
                <div
                  key={year}
                  className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
                >
                  <strong>{year} annual threshold:</strong>{" "}
                  {num(status.annualEligibleMass)} t of threshold-eligible
                  goods are represented for that year. The exemption applies
                  while cumulative annual eligible mass does not exceed 50 t.
                </div>
              ))}

            {!portfolio.length ? (
              <div className="mt-7 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-12 text-center text-slate-500">
                No portfolio lines yet.
              </div>
            ) : (
              <div className="mt-7 overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="p-3 text-left">Product</th>
                      <th className="p-3 text-left">Year / period</th>
                      <th className="p-3 text-right">Mass</th>
                      <th className="p-3 text-right">Emissions</th>
                      <th className="p-3 text-right">FAA</th>
                      <th className="p-3 text-right">Certificates</th>
                      <th className="p-3 text-right">Cost</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {portfolio.map((item) => {
                      const yearThreshold =
                        portfolioThresholdByYear.get(item.reportingYear);

                      const itemCost =
                        item.eligibleForMassThreshold &&
                        yearThreshold?.exempt
                          ? 0
                          : item.estimatedCost;

                      return (
                        <tr key={item.id}>
                          <td className="p-3">
                            <div className="font-black text-slate-900">
                              {item.product.name}
                            </div>
                            <div className="text-xs text-slate-400">
                              {item.product.cn} · {item.supplier}
                            </div>
                          </td>
                          <td className="p-3">{item.periodLabel}</td>
                          <td className="p-3 text-right font-mono">
                            {num(item.volume)} t
                          </td>
                          <td className="p-3 text-right font-mono">
                            {num(item.emissions)}
                          </td>
                          <td className="p-3 text-right font-mono">
                            {item.freeAllocationAdjustment !== null
                              ? num(item.freeAllocationAdjustment)
                              : "N/A"}
                          </td>
                          <td className="p-3 text-right font-mono">
                            {item.certificates !== null
                              ? num(item.certificates)
                              : "N/A"}
                          </td>
                          <td className="p-3 text-right font-mono font-black text-indigo-700">
                            {itemCost !== null ? eur(itemCost) : "N/A"}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => deleteFromPortfolio(item.id)}
                              className="text-red-600 font-bold"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {activeAppTab === "erp" && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 sm:p-10 shadow-sm">
            <div className="max-w-3xl mx-auto">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
                <div className="text-xs font-black uppercase tracking-widest text-emerald-700">
                  Official reference workflow
                </div>
                <h2 className="mt-2 text-3xl font-black text-slate-950">
                  Bulk CBAM CSV calculator
                </h2>
                <p className="mt-3 text-slate-700 leading-7">
                  The production bulk tool now resolves every row through the same official country + CN/TARIC + benchmark engine as the manual calculator. The legacy <code>cbam_products</code> lookup is no longer used by this workflow.
                </p>
                <div className="mt-4 rounded-xl bg-white/80 p-4 text-sm text-slate-700">
                  CSV columns: <code>Supplier, Country, CN_Code, Tonnes, Reporting_Year, Production_Year, Certificate_Price_EUR</code>.
                </div>
                <a
                  href="/cbam-calculator/bulk"
                  className="mt-6 inline-flex rounded-xl bg-emerald-700 px-6 py-3 font-black text-white hover:bg-emerald-600"
                >
                  Open Official Bulk Tool →
                </a>
              </div>
            </div>
          </section>
        )}

        <section className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-700">
              EU CBAM 2026 calculation guide
            </p>
            <h2 className="mt-3 text-2xl sm:text-3xl font-black text-slate-950">
              How to calculate CBAM certificate exposure in 2026
            </h2>
            <p className="mt-4 text-base sm:text-lg leading-8 text-slate-700">
              The definitive EU Carbon Border Adjustment Mechanism began in 2026.
              A useful CBAM cost estimate needs more than an import weight and a live
              carbon-market price. The calculation has to identify the covered CN code,
              determine embedded emissions, apply the relevant CBAM benchmark or
              specific embedded free allocation, use the certificate price for the
              import period, and check whether the importer remains within the annual
              mass-based exemption.
            </p>

            <div className="mt-8 grid md:grid-cols-2 gap-5">
              <article className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-black text-lg text-slate-950">
                  1. Embedded emissions
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-700">
                  Import mass is multiplied by a suitable actual or official default
                  specific embedded-emissions value. Definitive-period default values
                  are not one universal factor: they depend on the applicable sector,
                  CN classification, country and regulatory methodology.
                </p>
              </article>

              <article className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-black text-lg text-slate-950">
                  2. Free-allocation adjustment
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-700">
                  The certificate requirement is adjusted to reflect the remaining EU
                  ETS free allocation. That is why a compliance-oriented 2026 CBAM
                  calculator should use the applicable benchmark or SEFA rather than
                  simply multiplying all embedded emissions by a 2.5% phase-in number.
                </p>
              </article>

              <article className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-black text-lg text-slate-950">
                  3. Official CBAM certificate price
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-700">
                  In 2026 the European Commission publishes one official certificate
                  price for each quarter. The official Q1 2026 price is €75.36/tCO₂e
                  and the Q2 price is €75.28/tCO₂e. From 2027 onward, CBAM certificate
                  prices are published weekly.
                </p>
              </article>

              <article className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-black text-lg text-slate-950">
                  4. Annual 50-tonne CBAM threshold
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-700">
                  The de minimis threshold is cumulative per importer over the calendar
                  year for iron and steel, aluminium, fertilisers and cement. It is not
                  a separate 50-tonne allowance for every shipment. Electricity and
                  hydrogen are outside this mass-based exemption.
                </p>
              </article>
            </div>

            <div className="mt-10">
              <h2 className="text-2xl font-black text-slate-950">
                CBAM calculator for steel, aluminium, cement and fertilisers
              </h2>
              <p className="mt-3 leading-8 text-slate-700">
                The calculator is designed for companies importing CBAM-covered goods
                such as iron and steel products, aluminium, cement and fertilisers.
                Hydrogen and electricity are also CBAM sectors, but their calculation
                and quantity rules require additional care. Product selection should
                therefore be based on the correct CN code and production data rather
                than on a generic sector average.
              </p>

              <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-slate-900 text-white">
                    <tr>
                      <th className="p-3 text-left">CBAM sector</th>
                      <th className="p-3 text-left">50 t mass threshold?</th>
                      <th className="p-3 text-left">Important calculation inputs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {[
                      [
                        "Iron & steel",
                        "Yes",
                        "CN code, country, production route, emissions data and CBAM benchmark",
                      ],
                      [
                        "Aluminium",
                        "Yes",
                        "CN code, country, primary/secondary route where relevant, emissions and benchmark",
                      ],
                      [
                        "Cement",
                        "Yes",
                        "CN code, country, clinker/cement characteristics, emissions and benchmark",
                      ],
                      [
                        "Fertilisers",
                        "Yes",
                        "CN code, country, production data and applicable default/actual emissions",
                      ],
                      [
                        "Hydrogen",
                        "No",
                        "Production route, actual/default emissions and applicable benchmark methodology",
                      ],
                      [
                        "Electricity",
                        "No",
                        "Electricity-specific quantity and emissions methodology",
                      ],
                    ].map(([sectorName, threshold, inputs]) => (
                      <tr key={sectorName}>
                        <td className="p-3 font-black text-slate-900">{sectorName}</td>
                        <td className="p-3 text-slate-700">{threshold}</td>
                        <td className="p-3 text-slate-700">{inputs}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-10 grid lg:grid-cols-2 gap-7">
              <article>
                <h2 className="text-2xl font-black text-slate-950">
                  Default emissions vs actual verified emissions
                </h2>
                <p className="mt-3 leading-8 text-slate-700">
                  Default values are useful when installation-specific actual emissions
                  are unavailable, but the definitive CBAM system applies regulatory
                  rules to those defaults. Actual emissions can provide a more
                  installation-specific result, but they must satisfy the applicable
                  monitoring and verification requirements before being relied on for a
                  formal declaration.
                </p>
              </article>

              <article>
                <h2 className="text-2xl font-black text-slate-950">
                  Weekly ETS price vs the official CBAM price
                </h2>
                <p className="mt-3 leading-8 text-slate-700">
                  A live EU ETS price is useful for budgeting and scenario analysis,
                  so Green Engineering Tools can keep a frequently updated ETS market
                  value in the database. For a 2026 import-period estimate, however,
                  the application uses the official quarterly CBAM certificate price
                  when it has been published. This prevents a live market quote from
                  being presented as the legal quarterly certificate price.
                </p>
              </article>
            </div>

            <div className="mt-10">
              <h2 className="text-2xl font-black text-slate-950">
                Frequently asked questions about the EU CBAM calculator
              </h2>

              <div className="mt-5 space-y-3">
                {[
                  {
                    q: "How is the CBAM cost calculated in 2026?",
                    a: "A planning calculation starts with embedded emissions, applies the applicable free-allocation adjustment, determines the resulting certificate quantity and then applies the official certificate price for the relevant 2026 quarter. Additional legal adjustments, including qualifying carbon prices paid in a third country, must follow the applicable definitive rules.",
                  },
                  {
                    q: "Is the CBAM certificate price updated weekly in 2026?",
                    a: "No. The European Commission publishes four quarterly CBAM certificate prices for 2026. Weekly official certificate prices begin from 2027.",
                  },
                  {
                    q: "What is the 50-tonne CBAM exemption?",
                    a: "It is an annual cumulative mass threshold per importer for iron and steel, aluminium, fertilisers and cement. If the importer exceeds 50 tonnes during the calendar year, the relevant CBAM obligations apply to the covered imports for that year.",
                  },
                  {
                    q: "Can I calculate CBAM for steel imports?",
                    a: "Yes, provided the correct CN code, country, emissions basis and applicable benchmark or SEFA data are available. Production route can also matter for benchmark selection.",
                  },
                  {
                    q: "Can I upload a CSV from my ERP system?",
                    a: "Yes. The bulk-import workflow accepts Supplier, CN_Code and Tonnes columns. Unknown CN codes are rejected for review instead of being silently mapped to another product.",
                  },
                  {
                    q: "Is this an official EU CBAM Registry calculator?",
                    a: "No. Green Engineering Tools is an independent planning and engineering tool. Formal declarations, authorised declarant requirements, verification and certificate surrender remain subject to the official EU CBAM Registry and applicable legislation.",
                  },
                ].map((faq) => (
                  <details
                    key={faq.q}
                    className="rounded-xl border border-slate-200 bg-slate-50"
                  >
                    <summary className="cursor-pointer list-none p-4 sm:p-5 font-black text-slate-900 flex justify-between gap-4">
                      <span>{faq.q}</span>
                      <span className="text-indigo-600">+</span>
                    </summary>
                    <p className="px-4 sm:px-5 pb-4 sm:pb-5 text-sm leading-7 text-slate-700">
                      {faq.a}
                    </p>
                  </details>
                ))}
              </div>
            </div>

            <div className="mt-10 rounded-xl border border-indigo-200 bg-indigo-50 p-5">
              <h2 className="text-xl font-black text-indigo-950">
                Continue with related engineering tools
              </h2>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/"
                  className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-800"
                >
                  Embodied Carbon & LCA Calculator
                </Link>
                <Link
                  href="/guides"
                  className="rounded-lg border border-indigo-200 bg-white px-4 py-2.5 text-sm font-black text-indigo-800 hover:bg-indigo-100"
                >
                  LCA & Embodied Carbon Guides
                </Link>
                <Link
                  href="/contact"
                  className="rounded-lg border border-indigo-200 bg-white px-4 py-2.5 text-sm font-black text-indigo-800 hover:bg-indigo-100"
                >
                  Contact Green Engineering Tools
                </Link>
              </div>
            </div>

            <div className="mt-8 rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm leading-6 text-amber-900">
              <strong>Responsible-use notice:</strong> This calculator is an
              engineering and financial planning tool. It does not replace the EU
              CBAM Registry, an accredited verifier, customs advice, legal advice or
              the official legislation applicable to a specific import.
            </div>

            <div className="mt-8 text-sm leading-7 text-slate-600">
              <h2 className="text-lg font-black text-slate-900">
                Official information sources
              </h2>
              <p className="mt-2">
                Regulatory values and calculation logic should be checked against the
                current European Commission and EUR-Lex publications before formal
                reporting.
              </p>
              <ul className="mt-3 space-y-2">
                <li>
                  <a
                    href="https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism/cbam-definitive-regime_en"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-blue-700 hover:underline"
                  >
                    European Commission — CBAM definitive regime
                  </a>
                </li>
                <li>
                  <a
                    href="https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism/price-cbam-certificates_en"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-blue-700 hover:underline"
                  >
                    European Commission — CBAM certificate prices
                  </a>
                </li>
                <li>
                  <a
                    href="https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism/cbam-legislation-and-guidance_en"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-blue-700 hover:underline"
                  >
                    European Commission — CBAM legislation and guidance
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
