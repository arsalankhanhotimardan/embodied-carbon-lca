"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  calculateAssembly,
  calculateHeatLoss,
  calculateInsulationQuantity,
  calculateRetrofit,
  defaultSurfaceResistance,
  formatNumber,
  rsiToRUs,
  rUsToRsi,
  type ElementOrientation,
  type FabricElementInput,
  type ThermalLayer,
} from "@/lib/building-envelope/envelope-engine";
import { ENVELOPE_MATERIALS, findEnvelopeMaterial } from "@/data/building-envelope/materials.v1";
import { US_ENERGY_STAR_RETROFIT_ZONES } from "@/data/building-envelope/regional-guidance.v1";
import { BUILDING_ENVELOPE_DATA_MANIFEST } from "@/data/building-envelope/data-manifest";

type Mode = "assembly" | "insulation" | "heat-loss" | "retrofit";
type Units = "metric" | "imperial";
type Scenario = "general" | "attic" | "blown" | "r-value" | "u-value" | "heat-loss" | "carbon";

type Props = {
  initialMode?: Mode;
  initialScenario?: Scenario;
};

const M2_TO_FT2 = 10.7639104167;
const M_TO_IN = 39.3700787402;
const M3_TO_FT3 = 35.3146667215;
const KG_TO_LB = 2.2046226218;
const STORAGE_KEY = "get-building-envelope-v1";

const n = (value: string | number | null | undefined, fallback = 0) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const nullableNumber = (value: string) => {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toB64Url = (value: unknown) => {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = "";
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const fromB64Url = (value: string) => {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
};

const Field = ({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) => (
  <label className="block min-w-0">
    <span className="mb-1.5 block text-sm font-extrabold text-slate-800">{label}</span>
    {children}
    {help ? <span className="mt-1.5 block text-xs leading-5 text-slate-500">{help}</span> : null}
  </label>
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={`min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 ${props.className ?? ""}`}
  />
);

const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    {...props}
    className={`min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 ${props.className ?? ""}`}
  />
);

const ResultCard = ({ label, value, note }: { label: string; value: string; note?: string }) => (
  <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</div>
    <div className="mt-2 break-words text-2xl font-black tracking-tight text-slate-950">{value}</div>
    {note ? <p className="mt-1.5 text-xs leading-5 text-slate-500">{note}</p> : null}
  </div>
);

const WarningList = ({ items }: { items: string[] }) => {
  if (!items.length) return null;
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
      <p className="font-black">Planning notes</p>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 leading-6">
        {items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
      </ul>
    </div>
  );
};

const ErrorBox = ({ message }: { message?: string | null }) =>
  message ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold leading-6 text-rose-800">{message}</div> : null;

export default function BuildingEnvelopeDesigner({ initialMode = "assembly", initialScenario = "general" }: Props) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [units, setUnits] = useState<Units>(initialScenario === "attic" || initialScenario === "blown" ? "imperial" : "metric");
  const resultsRef = useRef<HTMLDivElement>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Assembly state (canonical SI internally)
  const [orientation, setOrientation] = useState<ElementOrientation>(initialScenario === "attic" ? "roof" : "wall");
  const [layers, setLayers] = useState<ThermalLayer[]>([
    { id: "layer-1", name: "Gypsum plasterboard", thicknessM: 0.0125, conductivityWmK: 0.25 },
    { id: "layer-2", name: "Mineral / stone wool", thicknessM: 0.10, conductivityWmK: 0.037 },
    { id: "layer-3", name: "Clay brick masonry", thicknessM: 0.102, conductivityWmK: 0.77 },
  ]);
  const [newMaterial, setNewMaterial] = useState("mineral-wool");
  const [manualSurfaces, setManualSurfaces] = useState(false);
  const [rsiInside, setRsiInside] = useState(0.13);
  const [rsiOutside, setRsiOutside] = useState(0.04);
  const [bridgeEnabled, setBridgeEnabled] = useState(false);
  const [bridgeFractionPct, setBridgeFractionPct] = useState(15);
  const [bridgeLayerId, setBridgeLayerId] = useState("layer-2");
  const [bridgeLambda, setBridgeLambda] = useState(0.13);

  // Insulation state
  const defaultInsulationMaterial = initialScenario === "blown" ? "cellulose" : "mineral-wool";
  const defaultIns = findEnvelopeMaterial(defaultInsulationMaterial)!;
  const [insAreaM2, setInsAreaM2] = useState(initialScenario === "attic" || initialScenario === "blown" ? 92.903 : 100); // 1000 ft² or 100 m²
  const [existingRsi, setExistingRsi] = useState(initialScenario === "attic" || initialScenario === "blown" ? rUsToRsi(19) : 1.5);
  const [targetRsi, setTargetRsi] = useState(initialScenario === "attic" || initialScenario === "blown" ? rUsToRsi(49) : 5.0);
  const [insMaterialId, setInsMaterialId] = useState(defaultInsulationMaterial);
  const [insLambda, setInsLambda] = useState(defaultIns.conductivityWmK);
  const [insDensity, setInsDensity] = useState(defaultIns.densityKgM3 ?? 0);
  const [allowancePct, setAllowancePct] = useState(initialScenario === "blown" ? 10 : 5);
  const [packageMassKg, setPackageMassKg] = useState<number | null>(null);
  const [packageCoverageM2, setPackageCoverageM2] = useState<number | null>(null);
  const [packagePrice, setPackagePrice] = useState<number | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [usZone, setUsZone] = useState("custom");
  const [usAtticCondition, setUsAtticCondition] = useState<"bare" | "existing34">("existing34");

  // Heat loss state
  const [indoorC, setIndoorC] = useState(21);
  const [outdoorC, setOutdoorC] = useState(-3);
  const [fabricElements, setFabricElements] = useState<FabricElementInput[]>([
    { id: "wall", name: "External walls", areaM2: 100, uValueWm2K: 0.30 },
    { id: "windows", name: "Windows / glazing", areaM2: 20, uValueWm2K: 1.40 },
    { id: "roof", name: "Roof / ceiling", areaM2: 80, uValueWm2K: 0.20 },
    { id: "floor", name: "Floor", areaM2: 80, uValueWm2K: 0.25 },
  ]);
  const [volumeM3, setVolumeM3] = useState(300);
  const [infiltrationAch, setInfiltrationAch] = useState(0.5);
  const [ventilationAch, setVentilationAch] = useState(0);
  const [hrvPct, setHrvPct] = useState(0);
  const [designMarginPct, setDesignMarginPct] = useState(0);
  const [hdd, setHdd] = useState<number | null>(null);
  const [cdd, setCdd] = useState<number | null>(null);
  const [heatingFactor, setHeatingFactor] = useState(1);
  const [coolingFactor, setCoolingFactor] = useState(3);
  const [heatingPrice, setHeatingPrice] = useState<number | null>(null);
  const [coolingPrice, setCoolingPrice] = useState<number | null>(null);
  const [heatingCarbon, setHeatingCarbon] = useState<number | null>(null);
  const [coolingCarbon, setCoolingCarbon] = useState<number | null>(null);

  // Retrofit state
  const [retroAreaM2, setRetroAreaM2] = useState(100);
  const [beforeU, setBeforeU] = useState(1.20);
  const [afterU, setAfterU] = useState(0.25);
  const [retroHdd, setRetroHdd] = useState<number | null>(null);
  const [retroCdd, setRetroCdd] = useState<number | null>(null);
  const [retroHeatFactor, setRetroHeatFactor] = useState(1);
  const [retroCoolFactor, setRetroCoolFactor] = useState(3);
  const [retroHeatPrice, setRetroHeatPrice] = useState<number | null>(null);
  const [retroCoolPrice, setRetroCoolPrice] = useState<number | null>(null);
  const [retroHeatCarbon, setRetroHeatCarbon] = useState<number | null>(null);
  const [retroCoolCarbon, setRetroCoolCarbon] = useState<number | null>(null);
  const [upgradeCost, setUpgradeCost] = useState<number | null>(null);
  const [embodiedCarbon, setEmbodiedCarbon] = useState<number | null>(null);
  const [materialMass, setMaterialMass] = useState<number | null>(null);
  const [epdGwpPerKg, setEpdGwpPerKg] = useState<number | null>(null);
  const [analysisYears, setAnalysisYears] = useState(20);

  const assembly = useMemo(() => {
    try {
      const surface = manualSurfaces ? { insideM2KPerW: rsiInside, outsideM2KPerW: rsiOutside } : defaultSurfaceResistance(orientation);
      return { result: calculateAssembly({
        orientation,
        layers,
        surfaceResistance: surface,
        parallelBridge: bridgeEnabled ? {
          enabled: true,
          bridgeFraction: bridgeFractionPct / 100,
          bridgeLayerId,
          bridgeConductivityWmK: bridgeLambda,
        } : null,
      }), error: null as string | null };
    } catch (error) {
      return { result: null, error: error instanceof Error ? error.message : "Could not calculate the assembly." };
    }
  }, [orientation, layers, manualSurfaces, rsiInside, rsiOutside, bridgeEnabled, bridgeFractionPct, bridgeLayerId, bridgeLambda]);

  const insulation = useMemo(() => {
    try {
      return { result: calculateInsulationQuantity({
        areaM2: insAreaM2,
        existingResistanceM2KPerW: existingRsi,
        targetResistanceM2KPerW: targetRsi,
        conductivityWmK: insLambda,
        densityKgM3: insDensity > 0 ? insDensity : null,
        installationAllowancePercent: allowancePct,
        packageMassKg,
        packageCoverageM2,
        packagePrice,
      }), error: null as string | null };
    } catch (error) {
      return { result: null, error: error instanceof Error ? error.message : "Could not calculate insulation quantity." };
    }
  }, [insAreaM2, existingRsi, targetRsi, insLambda, insDensity, allowancePct, packageMassKg, packageCoverageM2, packagePrice]);

  const heatLoss = useMemo(() => {
    try {
      return { result: calculateHeatLoss({
        indoorTemperatureC: indoorC,
        outdoorTemperatureC: outdoorC,
        elements: fabricElements,
        volumeM3,
        infiltrationAirChangesPerHour: infiltrationAch,
        ventilationAirChangesPerHour: ventilationAch,
        heatRecoveryEfficiency: hrvPct / 100,
        designMarginPercent: designMarginPct,
        heatingDegreeDaysC: hdd,
        coolingDegreeDaysC: cdd,
        heatingPerformanceFactor: heatingFactor,
        coolingPerformanceFactor: coolingFactor,
        heatingEnergyPricePerKWh: heatingPrice,
        coolingEnergyPricePerKWh: coolingPrice,
        heatingCarbonKgPerKWh: heatingCarbon,
        coolingCarbonKgPerKWh: coolingCarbon,
      }), error: null as string | null };
    } catch (error) {
      return { result: null, error: error instanceof Error ? error.message : "Could not calculate heat loss." };
    }
  }, [indoorC, outdoorC, fabricElements, volumeM3, infiltrationAch, ventilationAch, hrvPct, designMarginPct, hdd, cdd, heatingFactor, coolingFactor, heatingPrice, coolingPrice, heatingCarbon, coolingCarbon]);

  const retrofit = useMemo(() => {
    try {
      return { result: calculateRetrofit({
        areaM2: retroAreaM2,
        beforeUValueWm2K: beforeU,
        afterUValueWm2K: afterU,
        heatingDegreeDaysC: retroHdd,
        coolingDegreeDaysC: retroCdd,
        heatingPerformanceFactor: retroHeatFactor,
        coolingPerformanceFactor: retroCoolFactor,
        heatingEnergyPricePerKWh: retroHeatPrice,
        coolingEnergyPricePerKWh: retroCoolPrice,
        heatingCarbonKgPerKWh: retroHeatCarbon,
        coolingCarbonKgPerKWh: retroCoolCarbon,
        upgradeCost,
        embodiedCarbonKg: embodiedCarbon,
        materialMassKg: materialMass,
        epdGwpKgCo2ePerKg: epdGwpPerKg,
        analysisYears,
      }), error: null as string | null };
    } catch (error) {
      return { result: null, error: error instanceof Error ? error.message : "Could not calculate retrofit payback." };
    }
  }, [retroAreaM2, beforeU, afterU, retroHdd, retroCdd, retroHeatFactor, retroCoolFactor, retroHeatPrice, retroCoolPrice, retroHeatCarbon, retroCoolCarbon, upgradeCost, embodiedCarbon, materialMass, epdGwpPerKg, analysisYears]);

  const persistedState = useMemo(() => ({
    v: 1,
    mode,
    units,
    orientation,
    layers,
    manualSurfaces,
    rsiInside,
    rsiOutside,
    bridgeEnabled,
    bridgeFractionPct,
    bridgeLayerId,
    bridgeLambda,
    insAreaM2,
    existingRsi,
    targetRsi,
    insMaterialId,
    insLambda,
    insDensity,
    allowancePct,
    packageMassKg,
    packageCoverageM2,
    packagePrice,
    currency,
    usZone,
    usAtticCondition,
    indoorC,
    outdoorC,
    fabricElements,
    volumeM3,
    infiltrationAch,
    ventilationAch,
    hrvPct,
    designMarginPct,
    hdd,
    cdd,
    heatingFactor,
    coolingFactor,
    heatingPrice,
    coolingPrice,
    heatingCarbon,
    coolingCarbon,
    retroAreaM2,
    beforeU,
    afterU,
    retroHdd,
    retroCdd,
    retroHeatFactor,
    retroCoolFactor,
    retroHeatPrice,
    retroCoolPrice,
    retroHeatCarbon,
    retroCoolCarbon,
    upgradeCost,
    embodiedCarbon,
    materialMass,
    epdGwpPerKg,
    analysisYears,
  }), [
    mode, units, orientation, layers, manualSurfaces, rsiInside, rsiOutside,
    bridgeEnabled, bridgeFractionPct, bridgeLayerId, bridgeLambda,
    insAreaM2, existingRsi, targetRsi, insMaterialId, insLambda, insDensity,
    allowancePct, packageMassKg, packageCoverageM2, packagePrice, currency, usZone,
    usAtticCondition, indoorC, outdoorC, fabricElements, volumeM3, infiltrationAch, ventilationAch, hrvPct, designMarginPct,
    hdd, cdd, heatingFactor, coolingFactor, heatingPrice, coolingPrice,
    heatingCarbon, coolingCarbon, retroAreaM2, beforeU, afterU, retroHdd,
    retroCdd, retroHeatFactor, retroCoolFactor, retroHeatPrice, retroCoolPrice,
    retroHeatCarbon, retroCoolCarbon, upgradeCost, embodiedCarbon, materialMass,
    epdGwpPerKg, analysisYears,
  ]);

  // Restore a shared hash state first; otherwise restore local autosave.
  // External/shared state is treated as untrusted input and only accepted when
  // values match the expected primitive/array shapes. The calculation engine
  // still performs the final numerical validation.
  useEffect(() => {
    try {
      let raw: any = null;
      const hash = window.location.hash;
      if (hash.startsWith("#state=")) raw = fromB64Url(hash.slice(7));
      if (!raw) {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) raw = JSON.parse(saved);
      }
      if (raw?.v === 1) {
        const setFinite = (value: unknown, setter: (value: number) => void) => {
          if (typeof value === "number" && Number.isFinite(value)) setter(value);
        };
        const setNullableFinite = (value: unknown, setter: (value: number | null) => void) => {
          if (value === null) setter(null);
          else if (typeof value === "number" && Number.isFinite(value)) setter(value);
        };

        if (["assembly", "insulation", "heat-loss", "retrofit"].includes(raw.mode)) setMode(raw.mode);
        if (raw.units === "metric" || raw.units === "imperial") setUnits(raw.units);
        if (["wall", "roof", "floor", "custom"].includes(raw.orientation)) setOrientation(raw.orientation);

        if (Array.isArray(raw.layers) && raw.layers.length) {
          const safeLayers = raw.layers.slice(0, 20).filter((layer: any) => layer && typeof layer === "object").map((layer: any, index: number) => ({
            id: typeof layer.id === "string" ? layer.id.slice(0, 80) : `shared-layer-${index + 1}`,
            name: typeof layer.name === "string" ? layer.name.slice(0, 120) : `Layer ${index + 1}`,
            thicknessM: typeof layer.thicknessM === "number" && Number.isFinite(layer.thicknessM) ? layer.thicknessM : null,
            conductivityWmK: typeof layer.conductivityWmK === "number" && Number.isFinite(layer.conductivityWmK) ? layer.conductivityWmK : null,
            directResistanceM2KPerW: typeof layer.directResistanceM2KPerW === "number" && Number.isFinite(layer.directResistanceM2KPerW) ? layer.directResistanceM2KPerW : null,
          }));
          if (safeLayers.length) setLayers(safeLayers);
        }

        if (typeof raw.manualSurfaces === "boolean") setManualSurfaces(raw.manualSurfaces);
        setFinite(raw.rsiInside, setRsiInside);
        setFinite(raw.rsiOutside, setRsiOutside);
        if (typeof raw.bridgeEnabled === "boolean") setBridgeEnabled(raw.bridgeEnabled);
        setFinite(raw.bridgeFractionPct, setBridgeFractionPct);
        if (typeof raw.bridgeLayerId === "string") setBridgeLayerId(raw.bridgeLayerId.slice(0, 80));
        setFinite(raw.bridgeLambda, setBridgeLambda);

        setFinite(raw.insAreaM2, setInsAreaM2);
        setFinite(raw.existingRsi, setExistingRsi);
        setFinite(raw.targetRsi, setTargetRsi);
        if (typeof raw.insMaterialId === "string" && findEnvelopeMaterial(raw.insMaterialId)) setInsMaterialId(raw.insMaterialId);
        setFinite(raw.insLambda, setInsLambda);
        setFinite(raw.insDensity, setInsDensity);
        setFinite(raw.allowancePct, setAllowancePct);
        setNullableFinite(raw.packageMassKg, setPackageMassKg);
        setNullableFinite(raw.packageCoverageM2, setPackageCoverageM2);
        setNullableFinite(raw.packagePrice, setPackagePrice);
        if (typeof raw.currency === "string" && /^[A-Za-z]{3,6}$/.test(raw.currency)) setCurrency(raw.currency.toUpperCase());
        if (typeof raw.usZone === "string") setUsZone(raw.usZone.slice(0, 40));
        if (raw.usAtticCondition === "bare" || raw.usAtticCondition === "existing34") setUsAtticCondition(raw.usAtticCondition);

        setFinite(raw.indoorC, setIndoorC);
        setFinite(raw.outdoorC, setOutdoorC);
        if (Array.isArray(raw.fabricElements) && raw.fabricElements.length) {
          const safeElements = raw.fabricElements.slice(0, 30).filter((item: any) => item && typeof item === "object").map((item: any, index: number) => ({
            id: typeof item.id === "string" ? item.id.slice(0, 80) : `shared-element-${index + 1}`,
            name: typeof item.name === "string" ? item.name.slice(0, 120) : `Element ${index + 1}`,
            areaM2: typeof item.areaM2 === "number" && Number.isFinite(item.areaM2) ? item.areaM2 : 0,
            uValueWm2K: typeof item.uValueWm2K === "number" && Number.isFinite(item.uValueWm2K) ? item.uValueWm2K : 0,
          }));
          if (safeElements.length) setFabricElements(safeElements);
        }
        setFinite(raw.volumeM3, setVolumeM3);
        setFinite(raw.infiltrationAch, setInfiltrationAch);
        setFinite(raw.ventilationAch, setVentilationAch);
        // Backward-compatible restore for any early V1 saved state.
        if (raw.infiltrationAch == null && typeof raw.ach === "number" && Number.isFinite(raw.ach)) setInfiltrationAch(raw.ach);
        setFinite(raw.hrvPct, setHrvPct);
        setFinite(raw.designMarginPct, setDesignMarginPct);
        setNullableFinite(raw.hdd, setHdd);
        setNullableFinite(raw.cdd, setCdd);
        setFinite(raw.heatingFactor, setHeatingFactor);
        setFinite(raw.coolingFactor, setCoolingFactor);
        setNullableFinite(raw.heatingPrice, setHeatingPrice);
        setNullableFinite(raw.coolingPrice, setCoolingPrice);
        setNullableFinite(raw.heatingCarbon, setHeatingCarbon);
        setNullableFinite(raw.coolingCarbon, setCoolingCarbon);

        setFinite(raw.retroAreaM2, setRetroAreaM2);
        setFinite(raw.beforeU, setBeforeU);
        setFinite(raw.afterU, setAfterU);
        setNullableFinite(raw.retroHdd, setRetroHdd);
        setNullableFinite(raw.retroCdd, setRetroCdd);
        setFinite(raw.retroHeatFactor, setRetroHeatFactor);
        setFinite(raw.retroCoolFactor, setRetroCoolFactor);
        setNullableFinite(raw.retroHeatPrice, setRetroHeatPrice);
        setNullableFinite(raw.retroCoolPrice, setRetroCoolPrice);
        setNullableFinite(raw.retroHeatCarbon, setRetroHeatCarbon);
        setNullableFinite(raw.retroCoolCarbon, setRetroCoolCarbon);
        setNullableFinite(raw.upgradeCost, setUpgradeCost);
        setNullableFinite(raw.embodiedCarbon, setEmbodiedCarbon);
        setNullableFinite(raw.materialMass, setMaterialMass);
        setNullableFinite(raw.epdGwpPerKg, setEpdGwpPerKg);
        setFinite(raw.analysisYears, setAnalysisYears);
      }
    } catch {
      // Ignore invalid/outdated saved state and continue with safe defaults.
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState));
    } catch {
      // Storage can be blocked or full; the calculator must continue to work.
    }
  }, [isHydrated, persistedState]);

  const showResults = () => {
    requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}#state=${toB64Url(persistedState)}`;
    try {
      await navigator.clipboard.writeText(url);
      window.alert("Shareable calculator link copied.");
    } catch {
      window.prompt("Copy this shareable link:", url);
    }
  };

  const resetSaved = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    window.location.reload();
  };

  const changeOrientation = (next: ElementOrientation) => {
    setOrientation(next);
    if (!manualSurfaces) {
      const surface = defaultSurfaceResistance(next);
      setRsiInside(surface.insideM2KPerW);
      setRsiOutside(surface.outsideM2KPerW);
    }
  };

  const addPresetLayer = () => {
    const preset = findEnvelopeMaterial(newMaterial);
    if (!preset) return;
    const id = `layer-${Date.now()}`;
    setLayers((current) => [...current, { id, name: preset.name, thicknessM: preset.category === "finish" ? 0.0125 : 0.10, conductivityWmK: preset.conductivityWmK }]);
    setBridgeLayerId(id);
  };

  const updateLayer = (id: string, patch: Partial<ThermalLayer>) => setLayers((current) => current.map((layer) => layer.id === id ? { ...layer, ...patch } : layer));
  const removeLayer = (id: string) => setLayers((current) => current.length <= 1 ? current : current.filter((layer) => layer.id !== id));
  const moveLayer = (index: number, direction: -1 | 1) => setLayers((current) => {
    const target = index + direction;
    if (target < 0 || target >= current.length) return current;
    const copy = [...current];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    return copy;
  });

  const applyInsMaterial = (id: string) => {
    setInsMaterialId(id);
    const material = findEnvelopeMaterial(id);
    if (material) {
      setInsLambda(material.conductivityWmK);
      setInsDensity(material.densityKgM3 ?? 0);
    }
  };

  const applyUsZone = (id: string, condition = usAtticCondition) => {
    setUsZone(id);
    const zone = US_ENERGY_STAR_RETROFIT_ZONES.find((item) => item.id === id);
    if (zone) {
      const targetRUs = condition === "bare" ? zone.atticBareRUs : zone.atticExisting34InRUs;
      setTargetRsi(rUsToRsi(targetRUs));
    }
  };

  const applyUsAtticCondition = (condition: "bare" | "existing34") => {
    setUsAtticCondition(condition);
    if (usZone !== "custom") applyUsZone(usZone, condition);
  };

  const useAssemblyInHeatLoss = () => {
    if (!assembly.result) return;
    const u = assembly.result.uValueWm2K;
    setFabricElements((current) => {
      const existing = current.findIndex((item) => item.id === "current-assembly");
      const row = { id: "current-assembly", name: "Current calculated assembly", areaM2: 50, uValueWm2K: u };
      if (existing < 0) return [...current, row];
      const copy = [...current];
      copy[existing] = { ...copy[existing], uValueWm2K: u };
      return copy;
    });
    setMode("heat-loss");
  };

  const useAssemblyAsRetrofitAfter = () => {
    if (!assembly.result) return;
    setAfterU(assembly.result.uValueWm2K);
    setMode("retrofit");
  };

  const useInsulationMassForCarbon = () => {
    if (insulation.result?.estimatedMassKg == null) return;
    setMaterialMass(insulation.result.estimatedMassKg);
    setMode("retrofit");
  };

  const areaDisplay = (m2: number) => units === "metric" ? m2 : m2 * M2_TO_FT2;
  const areaFromDisplay = (value: number) => units === "metric" ? value : value / M2_TO_FT2;
  const volumeDisplay = (m3: number) => units === "metric" ? m3 : m3 * M3_TO_FT3;
  const volumeFromDisplay = (value: number) => units === "metric" ? value : value / M3_TO_FT3;
  const thicknessDisplay = (m: number) => units === "metric" ? m * 1000 : m * M_TO_IN;
  const thicknessFromDisplay = (value: number) => units === "metric" ? value / 1000 : value / M_TO_IN;
  const rDisplay = (rsi: number) => units === "metric" ? rsi : rsiToRUs(rsi);
  const rFromDisplay = (value: number) => units === "metric" ? value : rUsToRsi(value);
  const tempDisplay = (c: number) => units === "metric" ? c : c * 9 / 5 + 32;
  const tempFromDisplay = (value: number) => units === "metric" ? value : (value - 32) * 5 / 9;

  const tabs: { id: Mode; label: string; short: string }[] = [
    { id: "assembly", label: "Assembly / U-value", short: "U-value" },
    { id: "insulation", label: "Insulation quantity", short: "Insulation" },
    { id: "heat-loss", label: "Heat loss", short: "Heat loss" },
    { id: "retrofit", label: "Cost & carbon payback", short: "Payback" },
  ];

  return (
    <section id="building-envelope-calculator" className="min-w-0 scroll-mt-24">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
        <div className="border-b border-slate-200 bg-slate-950 px-4 py-5 text-white sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Building Envelope Engine v{BUILDING_ENVELOPE_DATA_MANIFEST.engineVersion}</div>
              <h2 className="mt-1 text-xl font-black sm:text-2xl">Thermal performance, insulation, heat loss & carbon payback</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">SI and Imperial support. No login. Product values remain editable so local declarations and codes can override planning presets.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setUnits("metric")} aria-pressed={units === "metric"} className={`min-h-10 rounded-xl px-4 text-sm font-black ${units === "metric" ? "bg-emerald-500 text-white" : "bg-white/10 text-slate-200 hover:bg-white/15"}`}>Metric</button>
              <button type="button" onClick={() => setUnits("imperial")} aria-pressed={units === "imperial"} className={`min-h-10 rounded-xl px-4 text-sm font-black ${units === "imperial" ? "bg-emerald-500 text-white" : "bg-white/10 text-slate-200 hover:bg-white/15"}`}>Imperial</button>
              <button type="button" onClick={share} className="min-h-10 rounded-xl bg-white/10 px-4 text-sm font-black text-white hover:bg-white/15">Share</button>
              <button type="button" onClick={() => window.print()} className="min-h-10 rounded-xl bg-white/10 px-4 text-sm font-black text-white hover:bg-white/15">Print / PDF</button>
            </div>
          </div>
        </div>

        <div className="border-b border-slate-200 bg-slate-50 p-2 sm:p-3">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4" role="tablist" aria-label="Building envelope calculation modes">
            {tabs.map((tab) => (
              <button key={tab.id} type="button" role="tab" aria-selected={mode === tab.id} onClick={() => setMode(tab.id)} className={`min-h-12 rounded-xl px-3 py-2 text-sm font-black transition ${mode === tab.id ? "bg-slate-950 text-white shadow" : "bg-white text-slate-600 hover:bg-slate-100"}`}>
                <span className="hidden sm:inline">{tab.label}</span><span className="sm:hidden">{tab.short}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,.9fr)]">
          <div className="min-w-0 border-b border-slate-200 p-4 sm:p-6 lg:p-8 xl:border-b-0 xl:border-r">
            {mode === "assembly" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-black text-slate-950">Multi-layer assembly</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">Build a wall, roof or floor from individual layers. Each layer can use a planning preset or declared product conductivity.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Element orientation" help="Controls the default inside surface resistance. You can override surface values in Advanced settings.">
                    <Select value={orientation} onChange={(e) => changeOrientation(e.target.value as ElementOrientation)}>
                      <option value="wall">Wall / horizontal heat flow</option>
                      <option value="roof">Roof / upward heat flow</option>
                      <option value="floor">Floor / downward heat flow</option>
                      <option value="custom">Custom</option>
                    </Select>
                  </Field>
                  <Field label="Add material layer">
                    <div className="flex min-w-0 gap-2">
                      <Select value={newMaterial} onChange={(e) => setNewMaterial(e.target.value)} className="min-w-0 flex-1">
                        {ENVELOPE_MATERIALS.map((material) => <option key={material.id} value={material.id}>{material.name}</option>)}
                      </Select>
                      <button type="button" onClick={addPresetLayer} className="min-h-11 shrink-0 rounded-xl bg-emerald-600 px-4 text-sm font-black text-white hover:bg-emerald-500">Add</button>
                    </div>
                  </Field>
                </div>

                <div className="space-y-3">
                  {layers.map((layer, index) => (
                    <div key={layer.id} className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-black uppercase tracking-wider text-slate-400">Layer {index + 1}</div>
                          <Input aria-label={`Layer ${index + 1} name`} value={layer.name} onChange={(e) => updateLayer(layer.id, { name: e.target.value })} className="mt-1 bg-white" />
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button type="button" aria-label="Move layer up" onClick={() => moveLayer(index, -1)} disabled={index === 0} className="h-10 w-10 rounded-lg border border-slate-200 bg-white font-black text-slate-600 disabled:opacity-30">↑</button>
                          <button type="button" aria-label="Move layer down" onClick={() => moveLayer(index, 1)} disabled={index === layers.length - 1} className="h-10 w-10 rounded-lg border border-slate-200 bg-white font-black text-slate-600 disabled:opacity-30">↓</button>
                          <button type="button" aria-label="Remove layer" onClick={() => removeLayer(layer.id)} disabled={layers.length <= 1} className="h-10 w-10 rounded-lg border border-rose-200 bg-white font-black text-rose-600 disabled:opacity-30">×</button>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <Field label={`Thickness (${units === "metric" ? "mm" : "in"})`}>
                          <Input type="number" min="0" step="any" value={formatNumber(thicknessDisplay(n(layer.thicknessM)), 4).replace(/,/g, "")} onChange={(e) => updateLayer(layer.id, { thicknessM: thicknessFromDisplay(n(e.target.value)) })} />
                        </Field>
                        <Field label="Thermal conductivity λ (W/m·K)" help="Replace planning presets with the declared product/design value when available.">
                          <Input type="number" min="0.001" step="0.001" value={n(layer.conductivityWmK)} onChange={(e) => updateLayer(layer.id, { conductivityWmK: n(e.target.value) })} />
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>

                <details className="rounded-2xl border border-slate-200 bg-white p-4">
                  <summary className="cursor-pointer font-black text-slate-900">Advanced: surface resistance & repeating framing</summary>
                  <div className="mt-5 space-y-5">
                    <label className="flex items-start gap-3 text-sm font-semibold text-slate-700">
                      <input type="checkbox" checked={manualSurfaces} onChange={(e) => setManualSurfaces(e.target.checked)} className="mt-1 h-4 w-4" />
                      Manually override inside/outside surface resistances
                    </label>
                    {manualSurfaces && <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Inside Rsi (m²·K/W)"><Input type="number" step="0.01" min="0" value={rsiInside} onChange={(e) => setRsiInside(n(e.target.value))} /></Field>
                      <Field label="Outside Rse (m²·K/W)"><Input type="number" step="0.01" min="0" value={rsiOutside} onChange={(e) => setRsiOutside(n(e.target.value))} /></Field>
                    </div>}
                    <label className="flex items-start gap-3 text-sm font-semibold text-slate-700">
                      <input type="checkbox" checked={bridgeEnabled} onChange={(e) => setBridgeEnabled(e.target.checked)} className="mt-1 h-4 w-4" />
                      Estimate a repeating framing path through one layer
                    </label>
                    {bridgeEnabled && <div className="grid gap-3 sm:grid-cols-3">
                      <Field label="Affected layer"><Select value={bridgeLayerId} onChange={(e) => setBridgeLayerId(e.target.value)}>{layers.map((layer) => <option key={layer.id} value={layer.id}>{layer.name}</option>)}</Select></Field>
                      <Field label="Framing fraction (%)"><Input type="number" min="0.1" max="99.9" step="0.1" value={bridgeFractionPct} onChange={(e) => setBridgeFractionPct(n(e.target.value))} /></Field>
                      <Field label="Framing λ (W/m·K)"><Input type="number" min="0.001" step="0.001" value={bridgeLambda} onChange={(e) => setBridgeLambda(n(e.target.value))} /></Field>
                    </div>}
                  </div>
                </details>

                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={useAssemblyInHeatLoss} disabled={!assembly.result} className="min-h-11 rounded-xl bg-slate-950 px-4 text-sm font-black text-white disabled:opacity-40">Use U-value in heat-loss tool</button>
                  <button type="button" onClick={useAssemblyAsRetrofitAfter} disabled={!assembly.result} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-800 disabled:opacity-40">Use as retrofit “after”</button>
                </div>
              </div>
            )}

            {mode === "insulation" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-black text-slate-950">Insulation quantity & thickness</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">Estimate added resistance, thickness, volume and optional package quantity. Product coverage charts should control the final purchase quantity.</p>
                </div>

                {(initialScenario === "attic" || initialScenario === "blown") && (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                    <p className="text-sm font-black text-blue-950">Optional U.S. ENERGY STAR retrofit guidance</p>
                    <p className="mt-1 text-xs leading-5 text-blue-800">This preset is only for the referenced U.S. retrofit guidance; local code/project requirements may differ. Worldwide users should keep “Custom target”.</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <Select value={usZone} onChange={(e) => applyUsZone(e.target.value)} className="bg-white" aria-label="U.S. ENERGY STAR climate-zone guidance">
                        <option value="custom">Custom target / worldwide</option>
                        {US_ENERGY_STAR_RETROFIT_ZONES.map((zone) => <option key={zone.id} value={zone.id}>{zone.label}</option>)}
                      </Select>
                      <Select value={usAtticCondition} onChange={(e) => applyUsAtticCondition(e.target.value as "bare" | "existing34")} className="bg-white" aria-label="Existing attic insulation condition">
                        <option value="bare">Attic currently uninsulated / bare</option>
                        <option value="existing34">Existing attic has about 3–4 in of insulation</option>
                      </Select>
                    </div>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={`Net insulation area (${units === "metric" ? "m²" : "ft²"})`}><Input type="number" min="0" step="any" value={formatNumber(areaDisplay(insAreaM2), 3).replace(/,/g, "")} onChange={(e) => setInsAreaM2(areaFromDisplay(n(e.target.value)))} /></Field>
                  <Field label="Insulation material" help="The preset is editable and not a substitute for the selected product's declaration.">
                    <Select value={insMaterialId} onChange={(e) => applyInsMaterial(e.target.value)}>{ENVELOPE_MATERIALS.filter((material) => material.category === "insulation").map((material) => <option key={material.id} value={material.id}>{material.name}</option>)}</Select>
                  </Field>
                  <Field label={units === "metric" ? "Existing RSI (m²·K/W)" : "Existing R-value (US)"}><Input type="number" min="0" step="any" value={formatNumber(rDisplay(existingRsi), 3).replace(/,/g, "")} onChange={(e) => setExistingRsi(rFromDisplay(n(e.target.value)))} /></Field>
                  <Field label={units === "metric" ? "Target RSI (m²·K/W)" : "Target R-value (US)"}><Input type="number" min="0.01" step="any" value={formatNumber(rDisplay(targetRsi), 3).replace(/,/g, "")} onChange={(e) => { setUsZone("custom"); setTargetRsi(rFromDisplay(n(e.target.value))); }} /></Field>
                  <Field label="Thermal conductivity λ (W/m·K)"><Input type="number" min="0.001" step="0.001" value={insLambda} onChange={(e) => setInsLambda(n(e.target.value))} /></Field>
                  <Field label={`Installed density (${units === "metric" ? "kg/m³" : "lb/ft³"})`} help="Optional. Density is needed for a mass estimate.">
                    <Input type="number" min="0" step="any" value={units === "metric" ? insDensity : insDensity * KG_TO_LB / M3_TO_FT3} onChange={(e) => setInsDensity(units === "metric" ? n(e.target.value) : n(e.target.value) * M3_TO_FT3 / KG_TO_LB)} />
                  </Field>
                  <Field label="Installation / ordering allowance (%)" help="Use a product/project-specific allowance. Loose-fill settling should follow the manufacturer chart."><Input type="number" min="0" max="100" step="0.5" value={allowancePct} onChange={(e) => setAllowancePct(n(e.target.value))} /></Field>
                  <div className="hidden sm:block" />
                </div>

                <details className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <summary className="cursor-pointer font-black text-slate-900">Optional product packaging & cost</summary>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field label={`Package mass (${units === "metric" ? "kg" : "lb"})`} help="Use for products sold by mass. Leave blank if not applicable."><Input type="number" min="0" step="any" value={packageMassKg == null ? "" : units === "metric" ? packageMassKg : packageMassKg * KG_TO_LB} onChange={(e) => { const v = nullableNumber(e.target.value); setPackageMassKg(v == null ? null : units === "metric" ? v : v / KG_TO_LB); }} /></Field>
                    <Field label={`Package coverage (${units === "metric" ? "m²" : "ft²"})`} help="Prefer the manufacturer coverage for the required installed R/depth."><Input type="number" min="0" step="any" value={packageCoverageM2 == null ? "" : areaDisplay(packageCoverageM2)} onChange={(e) => { const v = nullableNumber(e.target.value); setPackageCoverageM2(v == null ? null : areaFromDisplay(v)); }} /></Field>
                    <Field label={`Price per package (${currency})`}><Input type="number" min="0" step="any" value={packagePrice ?? ""} onChange={(e) => setPackagePrice(nullableNumber(e.target.value))} /></Field>
                    <Field label="Currency label"><Input value={currency} maxLength={8} onChange={(e) => setCurrency(e.target.value.toUpperCase().replace(/[^A-Z0-9$€£¥₹₨.-]/g, ""))} /></Field>
                  </div>
                </details>

                <button type="button" onClick={useInsulationMassForCarbon} disabled={insulation.result?.estimatedMassKg == null} className="min-h-11 rounded-xl bg-slate-950 px-4 text-sm font-black text-white disabled:opacity-40">Use estimated mass in carbon payback</button>
              </div>
            )}

            {mode === "heat-loss" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-black text-slate-950">Design heat loss & annual envelope energy</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">Steady-state fabric loss plus ventilation/infiltration. Annual HDD/CDD estimates are optional and intentionally separate from the design-day result.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={`Indoor design temperature (°${units === "metric" ? "C" : "F"})`}><Input type="number" step="any" value={formatNumber(tempDisplay(indoorC), 2).replace(/,/g, "")} onChange={(e) => setIndoorC(tempFromDisplay(n(e.target.value)))} /></Field>
                  <Field label={`Outdoor design temperature (°${units === "metric" ? "C" : "F"})`}><Input type="number" step="any" value={formatNumber(tempDisplay(outdoorC), 2).replace(/,/g, "")} onChange={(e) => setOutdoorC(tempFromDisplay(n(e.target.value)))} /></Field>
                  <Field label={`Conditioned volume (${units === "metric" ? "m³" : "ft³"})`}><Input type="number" min="0" step="any" value={formatNumber(volumeDisplay(volumeM3), 2).replace(/,/g, "")} onChange={(e) => setVolumeM3(volumeFromDisplay(n(e.target.value)))} /></Field>
                  <Field label="Infiltration / uncontrolled air leakage (ACH)" help="Use measured or project-specific infiltration data where possible. Heat recovery is not applied to this value."><Input type="number" min="0" step="0.05" value={infiltrationAch} onChange={(e) => setInfiltrationAch(n(e.target.value))} /></Field>
                  <Field label="Mechanical / intentional ventilation (ACH)" help="Enter the air-change rate that passes through the ventilation system. Heat recovery, if entered, is applied only to this airflow."><Input type="number" min="0" step="0.05" value={ventilationAch} onChange={(e) => setVentilationAch(n(e.target.value))} /></Field>
                  <Field label="Ventilation heat-recovery efficiency (%)" help="Applied only to mechanical/intentional ventilation, never to uncontrolled infiltration."><Input type="number" min="0" max="100" step="1" value={hrvPct} onChange={(e) => setHrvPct(n(e.target.value))} /></Field>
                  <Field label="User design margin (%)" help="Optional planning allowance, not a code requirement."><Input type="number" min="0" max="100" step="1" value={designMarginPct} onChange={(e) => setDesignMarginPct(n(e.target.value))} /></Field>
                </div>

                <div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h4 className="font-black text-slate-900">Fabric elements</h4>
                    <button type="button" onClick={() => setFabricElements((current) => [...current, { id: `el-${Date.now()}`, name: "New element", areaM2: 10, uValueWm2K: 0.3 }])} className="min-h-10 rounded-xl border border-slate-300 bg-white px-4 text-sm font-black">+ Add element</button>
                  </div>
                  <div className="mt-3 space-y-3">
                    {fabricElements.map((element) => (
                      <div key={element.id} className="grid min-w-0 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_44px] sm:items-end">
                        <Field label="Element"><Input value={element.name} onChange={(e) => setFabricElements((current) => current.map((row) => row.id === element.id ? { ...row, name: e.target.value } : row))} /></Field>
                        <Field label={`Area (${units === "metric" ? "m²" : "ft²"})`}><Input type="number" min="0" step="any" value={formatNumber(areaDisplay(element.areaM2), 3).replace(/,/g, "")} onChange={(e) => setFabricElements((current) => current.map((row) => row.id === element.id ? { ...row, areaM2: areaFromDisplay(n(e.target.value)) } : row))} /></Field>
                        <Field label="U-value (W/m²·K)"><Input type="number" min="0" step="0.01" value={element.uValueWm2K} onChange={(e) => setFabricElements((current) => current.map((row) => row.id === element.id ? { ...row, uValueWm2K: n(e.target.value) } : row))} /></Field>
                        <button type="button" aria-label={`Remove ${element.name}`} onClick={() => setFabricElements((current) => current.length <= 1 ? current : current.filter((row) => row.id !== element.id))} className="h-11 w-full rounded-xl border border-rose-200 bg-white font-black text-rose-600 sm:w-11">×</button>
                      </div>
                    ))}
                  </div>
                </div>

                <details className="rounded-2xl border border-slate-200 bg-white p-4">
                  <summary className="cursor-pointer font-black text-slate-900">Optional annual energy, cost & operational carbon</summary>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label="Heating degree days (°C·day)" help="Use a local, period-consistent HDD source. Leave blank for design heat loss only."><Input type="number" min="0" step="any" value={hdd ?? ""} onChange={(e) => setHdd(nullableNumber(e.target.value))} /></Field>
                    <Field label="Heating performance factor" help="1.0 = resistance heat; 0.9 = 90% efficiency; 3.0 = COP 3 heat pump."><Input type="number" min="0.01" step="0.05" value={heatingFactor} onChange={(e) => setHeatingFactor(n(e.target.value))} /></Field>
                    <Field label={`Heating energy price (${currency}/kWh input)`}><Input type="number" min="0" step="any" value={heatingPrice ?? ""} onChange={(e) => setHeatingPrice(nullableNumber(e.target.value))} /></Field>
                    <Field label="Cooling degree days (°C·day)"><Input type="number" min="0" step="any" value={cdd ?? ""} onChange={(e) => setCdd(nullableNumber(e.target.value))} /></Field>
                    <Field label="Cooling performance factor (COP)"><Input type="number" min="0.01" step="0.05" value={coolingFactor} onChange={(e) => setCoolingFactor(n(e.target.value))} /></Field>
                    <Field label={`Cooling energy price (${currency}/kWh input)`}><Input type="number" min="0" step="any" value={coolingPrice ?? ""} onChange={(e) => setCoolingPrice(nullableNumber(e.target.value))} /></Field>
                    <Field label="Heating carbon factor (kgCO₂e/kWh)"><Input type="number" min="0" step="any" value={heatingCarbon ?? ""} onChange={(e) => setHeatingCarbon(nullableNumber(e.target.value))} /></Field>
                    <Field label="Cooling carbon factor (kgCO₂e/kWh)"><Input type="number" min="0" step="any" value={coolingCarbon ?? ""} onChange={(e) => setCoolingCarbon(nullableNumber(e.target.value))} /></Field>
                  </div>
                </details>
              </div>
            )}

            {mode === "retrofit" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-black text-slate-950">Retrofit cost & carbon payback</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">Compare before/after U-values, degree-day energy, cost and product-specific embodied carbon. No generic carbon factor is silently assumed.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={`Retrofit area (${units === "metric" ? "m²" : "ft²"})`}><Input type="number" min="0" step="any" value={formatNumber(areaDisplay(retroAreaM2), 3).replace(/,/g, "")} onChange={(e) => setRetroAreaM2(areaFromDisplay(n(e.target.value)))} /></Field>
                  <div className="hidden sm:block" />
                  <Field label="Before U-value (W/m²·K)"><Input type="number" min="0.001" step="0.01" value={beforeU} onChange={(e) => setBeforeU(n(e.target.value))} /></Field>
                  <Field label="After U-value (W/m²·K)"><Input type="number" min="0.001" step="0.01" value={afterU} onChange={(e) => setAfterU(n(e.target.value))} /></Field>
                  <Field label="Heating degree days (°C·day)"><Input type="number" min="0" step="any" value={retroHdd ?? ""} onChange={(e) => setRetroHdd(nullableNumber(e.target.value))} /></Field>
                  <Field label="Cooling degree days (°C·day)"><Input type="number" min="0" step="any" value={retroCdd ?? ""} onChange={(e) => setRetroCdd(nullableNumber(e.target.value))} /></Field>
                  <Field label="Heating performance factor"><Input type="number" min="0.01" step="0.05" value={retroHeatFactor} onChange={(e) => setRetroHeatFactor(n(e.target.value))} /></Field>
                  <Field label="Cooling performance factor"><Input type="number" min="0.01" step="0.05" value={retroCoolFactor} onChange={(e) => setRetroCoolFactor(n(e.target.value))} /></Field>
                  <Field label={`Heating price (${currency}/kWh input)`}><Input type="number" min="0" step="any" value={retroHeatPrice ?? ""} onChange={(e) => setRetroHeatPrice(nullableNumber(e.target.value))} /></Field>
                  <Field label={`Cooling price (${currency}/kWh input)`}><Input type="number" min="0" step="any" value={retroCoolPrice ?? ""} onChange={(e) => setRetroCoolPrice(nullableNumber(e.target.value))} /></Field>
                  <Field label="Heating carbon factor (kgCO₂e/kWh)"><Input type="number" min="0" step="any" value={retroHeatCarbon ?? ""} onChange={(e) => setRetroHeatCarbon(nullableNumber(e.target.value))} /></Field>
                  <Field label="Cooling carbon factor (kgCO₂e/kWh)"><Input type="number" min="0" step="any" value={retroCoolCarbon ?? ""} onChange={(e) => setRetroCoolCarbon(nullableNumber(e.target.value))} /></Field>
                  <Field label={`Upgrade cost (${currency})`}><Input type="number" min="0" step="any" value={upgradeCost ?? ""} onChange={(e) => setUpgradeCost(nullableNumber(e.target.value))} /></Field>
                  <Field label="Analysis period (years)"><Input type="number" min="1" max="100" step="1" value={analysisYears} onChange={(e) => setAnalysisYears(n(e.target.value))} /></Field>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <h4 className="font-black text-emerald-950">Embodied carbon — product data first</h4>
                  <p className="mt-1 text-xs leading-5 text-emerald-900">Enter total project embodied carbon directly, or calculate it from material mass × an EPD GWP factor. Use the declared unit and life-cycle modules consistently; this field is intended for a compatible kgCO₂e/kg A1-A3-style input.</p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field label="Total embodied carbon (kgCO₂e)" help="If entered, this overrides the mass × EPD calculation."><Input type="number" min="0" step="any" value={embodiedCarbon ?? ""} onChange={(e) => setEmbodiedCarbon(nullableNumber(e.target.value))} /></Field>
                    <Field label={`Material mass (${units === "metric" ? "kg" : "lb"})`}><Input type="number" min="0" step="any" value={materialMass == null ? "" : units === "metric" ? materialMass : materialMass * KG_TO_LB} onChange={(e) => { const v = nullableNumber(e.target.value); setMaterialMass(v == null ? null : units === "metric" ? v : v / KG_TO_LB); }} /></Field>
                    <Field label="EPD GWP factor (kgCO₂e/kg)"><Input type="number" min="0" step="any" value={epdGwpPerKg ?? ""} onChange={(e) => setEpdGwpPerKg(nullableNumber(e.target.value))} /></Field>
                    <div className="flex items-end"><a href="/epd-carbon-calculator" className="inline-flex min-h-11 items-center rounded-xl border border-emerald-300 bg-white px-4 text-sm font-black text-emerald-800 hover:bg-emerald-100">Open EPD Carbon Calculator →</a></div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-7 flex flex-wrap gap-2 border-t border-slate-200 pt-5">
              <button type="button" onClick={showResults} className="min-h-11 rounded-xl bg-emerald-600 px-5 text-sm font-black text-white hover:bg-emerald-500 xl:hidden">View calculation results ↓</button>
              <button type="button" onClick={resetSaved} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-600 hover:bg-slate-50">Reset saved inputs</button>
            </div>
          </div>

          <aside ref={resultsRef} className="min-w-0 scroll-mt-24 bg-slate-50 p-4 sm:p-6 lg:p-8" aria-live="polite">
            <div className="sticky top-24 space-y-4">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Live result</div>
                <h3 className="mt-1 text-xl font-black text-slate-950">{tabs.find((tab) => tab.id === mode)?.label}</h3>
              </div>

              {mode === "assembly" && <>
                <ErrorBox message={assembly.error} />
                {assembly.result && <>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                    <ResultCard label="U-value" value={`${formatNumber(assembly.result.uValueWm2K, 3)} W/m²·K`} note="Lower U-value means less steady-state heat transfer." />
                    <ResultCard label="Total RSI" value={`${formatNumber(assembly.result.totalResistanceM2KPerW, 3)} m²·K/W`} />
                    <ResultCard label="R-value (US)" value={`R-${formatNumber(assembly.result.totalRUs, 1)}`} />
                    <ResultCard label="Surface resistance" value={`${formatNumber(assembly.result.surfaceResistance.insideM2KPerW + assembly.result.surfaceResistance.outsideM2KPerW, 2)} RSI`} />
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-200 px-4 py-3 text-sm font-black text-slate-900">Layer resistance breakdown</div>
                    <div className="divide-y divide-slate-100">
                      {assembly.result.layerResults.map((layer) => <div key={layer.id} className="flex min-w-0 items-center justify-between gap-3 px-4 py-3 text-sm"><span className="min-w-0 break-words font-semibold text-slate-700">{layer.name}</span><span className="shrink-0 font-black text-slate-950">{formatNumber(layer.resistanceM2KPerW, 3)} RSI</span></div>)}
                    </div>
                  </div>
                  {assembly.result.parallelPath && <ResultCard label="Framing-adjusted U-value" value={`${formatNumber(assembly.result.parallelPath.effectiveUValueWm2K, 3)} W/m²·K`} note={`${formatNumber(assembly.result.parallelPath.bridgeFraction * 100, 1)}% repeating framing path`} />}
                  <WarningList items={[
                    ...assembly.result.warnings,
                    "ISO 6946 excludes some components such as windows/doors, ground-contact constructions and air-permeable components; use the appropriate specialist method where applicable.",
                  ]} />
                </>}
              </>}

              {mode === "insulation" && <>
                <ErrorBox message={insulation.error} />
                {insulation.result && <>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                    <ResultCard label="Added resistance" value={units === "metric" ? `${formatNumber(insulation.result.additionalResistanceM2KPerW, 2)} RSI` : `R-${formatNumber(rsiToRUs(insulation.result.additionalResistanceM2KPerW), 1)}`} />
                    <ResultCard label="Required thickness" value={units === "metric" ? `${formatNumber(insulation.result.requiredThicknessM * 1000, 0)} mm` : `${formatNumber(insulation.result.requiredThicknessM * M_TO_IN, 1)} in`} />
                    <ResultCard label="Base material volume" value={units === "metric" ? `${formatNumber(insulation.result.baseVolumeM3, 2)} m³` : `${formatNumber(insulation.result.baseVolumeM3 * M3_TO_FT3, 1)} ft³`} />
                    <ResultCard label="Order volume incl. allowance" value={units === "metric" ? `${formatNumber(insulation.result.orderVolumeM3, 2)} m³` : `${formatNumber(insulation.result.orderVolumeM3 * M3_TO_FT3, 1)} ft³`} note="Allowance increases purchase quantity, not the required installed thickness." />
                    <ResultCard label="Estimated mass" value={insulation.result.estimatedMassKg == null ? "Product data needed" : units === "metric" ? `${formatNumber(insulation.result.estimatedMassKg, 0)} kg` : `${formatNumber(insulation.result.estimatedMassKg * KG_TO_LB, 0)} lb`} />
                    <ResultCard label="Packages" value={String(insulation.result.packagesByCoverage ?? insulation.result.packagesByMass ?? "Product data needed")} note={insulation.result.packagesByCoverage != null ? "Using entered coverage per package." : insulation.result.packagesByMass != null ? "Using estimated mass ÷ package mass." : "Enter package coverage or package mass."} />
                    <ResultCard label="Package cost" value={insulation.result.estimatedPackageCost == null ? "—" : `${currency} ${formatNumber(insulation.result.estimatedPackageCost, 2)}`} />
                  </div>
                  <WarningList items={insulation.result.warnings} />
                </>}
              </>}

              {mode === "heat-loss" && <>
                <ErrorBox message={heatLoss.error} />
                {heatLoss.result && <>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                    <ResultCard label="Design heat loss" value={`${formatNumber(heatLoss.result.designHeatLossW / 1000, 2)} kW`} note={`${formatNumber(heatLoss.result.designHeatLossBtuPerHr, 0)} BTU/h`} />
                    <ResultCard label="Fabric loss" value={`${formatNumber(heatLoss.result.fabricHeatLossW, 0)} W`} />
                    <ResultCard label="Air-exchange heat loss" value={`${formatNumber(heatLoss.result.ventilationHeatLossW, 0)} W`} note={`Infiltration ${formatNumber(heatLoss.result.infiltrationHeatLossW, 0)} W · mechanical ventilation ${formatNumber(heatLoss.result.mechanicalVentilationHeatLossW, 0)} W`} />
                    <ResultCard label="Heat-loss coefficient" value={`${formatNumber(heatLoss.result.totalCoefficientWPerK, 1)} W/K`} />
                    <ResultCard label="Annual heating delivered" value={heatLoss.result.annualHeatingDeliveredKWh == null ? "Enter HDD" : `${formatNumber(heatLoss.result.annualHeatingDeliveredKWh, 0)} kWh`} />
                    <ResultCard label="Annual cooling delivered" value={heatLoss.result.annualCoolingDeliveredKWh == null ? "Enter CDD" : `${formatNumber(heatLoss.result.annualCoolingDeliveredKWh, 0)} kWh`} />
                    <ResultCard label="Estimated annual energy cost" value={heatLoss.result.annualEnergyCost == null ? "Enter local prices" : `${currency} ${formatNumber(heatLoss.result.annualEnergyCost, 2)}`} />
                    <ResultCard label="Operational carbon" value={heatLoss.result.annualOperationalCarbonKg == null ? "Enter carbon factors" : `${formatNumber(heatLoss.result.annualOperationalCarbonKg, 0)} kgCO₂e/yr`} />
                  </div>
                  <WarningList items={heatLoss.result.warnings} />
                </>}
              </>}

              {mode === "retrofit" && <>
                <ErrorBox message={retrofit.error} />
                {retrofit.result && <>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                    <ResultCard label="Conductance reduction" value={`${formatNumber(retrofit.result.conductanceReductionWPerK, 1)} W/K`} />
                    <ResultCard label="Purchased energy saved" value={retrofit.result.annualPurchasedEnergySavedKWh == null ? "Enter degree days + performance" : `${formatNumber(retrofit.result.annualPurchasedEnergySavedKWh, 0)} kWh/yr`} />
                    <ResultCard label="Annual cost saving" value={retrofit.result.annualCostSaving == null ? "Enter local prices" : `${currency} ${formatNumber(retrofit.result.annualCostSaving, 2)}/yr`} />
                    <ResultCard label="Financial payback" value={retrofit.result.financialPaybackYears == null ? "More data needed" : `${formatNumber(retrofit.result.financialPaybackYears, 2)} years`} />
                    <ResultCard label="Annual CO₂e saving" value={retrofit.result.annualCarbonSavingKg == null ? "Enter carbon factors" : `${formatNumber(retrofit.result.annualCarbonSavingKg, 0)} kgCO₂e/yr`} />
                    <ResultCard label="Embodied carbon" value={retrofit.result.embodiedCarbonKg == null ? "EPD/LCA data needed" : `${formatNumber(retrofit.result.embodiedCarbonKg, 0)} kgCO₂e`} />
                    <ResultCard label="Carbon payback" value={retrofit.result.carbonPaybackYears == null ? "More data needed" : `${formatNumber(retrofit.result.carbonPaybackYears, 2)} years`} />
                    <ResultCard label={`${analysisYears}-year net carbon benefit`} value={retrofit.result.netCarbonBenefitKg == null ? "More data needed" : `${formatNumber(retrofit.result.netCarbonBenefitKg / 1000, 2)} tCO₂e`} />
                  </div>
                  <WarningList items={retrofit.result.warnings} />
                </>}
              </>}

              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-500">
                <div className="font-black text-slate-800">Calculation provenance</div>
                <div className="mt-2 grid grid-cols-1 gap-1">
                  <span>Engine: v{BUILDING_ENVELOPE_DATA_MANIFEST.engineVersion}</span>
                  <span>Material dataset: {BUILDING_ENVELOPE_DATA_MANIFEST.materialDataset.version}</span>
                  <span>Guidance dataset: {BUILDING_ENVELOPE_DATA_MANIFEST.regionalGuidanceDataset.version}</span>
                  <span>Data activation: validated, version-controlled</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
