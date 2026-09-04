"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  calculateElectrical,
  defaultElectricalInput,
  findConductor,
  getConductorCatalog,
  metersToLength,
  normalizeElectricalInput,
  type CalculationMode,
  type CircuitType,
  type ConductorMaterial,
  type ConductorSystem,
  type ElectricalInput,
  type LengthUnit,
  type LoadInputMode,
} from "@/lib/electrical-engine";

export type ElectricalPresetName =
  | "general"
  | "solar-dc"
  | "battery"
  | "ev"
  | "motor"
  | "generator";

interface ElectricalDesignerProps {
  initialPreset?: ElectricalPresetName;
  initialMode?: CalculationMode;
}

const STORAGE_KEY = "green_engineering_electrical_designer_v1";

const PRESETS: Record<
  ElectricalPresetName,
  { label: string; description: string; values: Partial<ElectricalInput> }
> = {
  general: {
    label: "General circuit",
    description: "230 V single-phase planning example",
    values: {},
  },
  "solar-dc": {
    label: "Solar DC",
    description: "PV / DC feeder planning",
    values: {
      circuitType: "dc",
      inputMode: "kw",
      loadValue: 5,
      voltage: 400,
      powerFactor: 1,
      length: 25,
      targetVoltageDropPct: 2,
      conductorSystem: "metric",
      selectedConductorId: "mm2-6",
      operatingHoursPerDay: 6,
    },
  },
  battery: {
    label: "Battery / inverter",
    description: "48 V high-current DC cable planning",
    values: {
      circuitType: "dc",
      inputMode: "kw",
      loadValue: 5,
      voltage: 48,
      powerFactor: 1,
      length: 2,
      targetVoltageDropPct: 1,
      conductorSystem: "metric",
      selectedConductorId: "mm2-35",
      operatingHoursPerDay: 4,
    },
  },
  ev: {
    label: "EV charger",
    description: "240 V single-phase charger planning",
    values: {
      circuitType: "single-phase",
      inputMode: "amps",
      loadValue: 32,
      voltage: 240,
      powerFactor: 0.99,
      length: 15,
      targetVoltageDropPct: 3,
      conductorSystem: "awg",
      selectedConductorId: "awg-8",
      operatingHoursPerDay: 3,
    },
  },
  motor: {
    label: "3-phase motor",
    description: "400 V balanced three-phase planning",
    values: {
      circuitType: "three-phase",
      inputMode: "kw",
      loadValue: 7.5,
      voltage: 400,
      powerFactor: 0.85,
      length: 30,
      targetVoltageDropPct: 3,
      conductorSystem: "metric",
      selectedConductorId: "mm2-6",
      reactanceOhmPerKm: 0.08,
      operatingHoursPerDay: 8,
    },
  },
  generator: {
    label: "Generator feeder",
    description: "400 V three-phase generator feeder",
    values: {
      circuitType: "three-phase",
      inputMode: "kva",
      loadValue: 20,
      voltage: 400,
      powerFactor: 0.8,
      length: 30,
      targetVoltageDropPct: 3,
      conductorSystem: "metric",
      selectedConductorId: "mm2-10",
      reactanceOhmPerKm: 0.08,
      operatingHoursPerDay: 4,
    },
  },
};

const modeLabel: Record<CalculationMode, string> = {
  "wire-size": "Required wire size",
  "voltage-drop": "Voltage drop",
  "max-length": "Maximum cable length",
  "max-current": "Maximum current",
  "power-loss": "Cable power loss",
};

const circuitLabel: Record<CircuitType, string> = {
  dc: "DC",
  "single-phase": "Single-phase AC",
  "three-phase": "Three-phase AC",
};

const fmt = (value: number | null | undefined, digits = 2) =>
  typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString(undefined, { maximumFractionDigits: digits })
    : "N/A";

const inputUnitLabel: Record<LoadInputMode, string> = {
  amps: "A",
  watts: "W",
  kw: "kW",
  kva: "kVA",
};

const mergePreset = (
  preset: ElectricalPresetName,
  initialMode?: CalculationMode
): ElectricalInput => ({
  ...defaultElectricalInput(),
  ...PRESETS[preset].values,
  ...(initialMode ? { calculationMode: initialMode } : {}),
});

const parseMaybeNumber = (value: string | null): number | null => {
  if (value === null || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const readQueryInput = (fallback: ElectricalInput): ElectricalInput | null => {
  if (typeof window === "undefined") return null;
  const q = new URLSearchParams(window.location.search);
  if (!q.has("ecalc")) return null;

  const out: ElectricalInput = { ...fallback };
  const mode = q.get("mode") as CalculationMode | null;
  const circuit = q.get("circuit") as CircuitType | null;
  const inputMode = q.get("input") as LoadInputMode | null;
  const material = q.get("material") as ConductorMaterial | null;
  const system = q.get("system") as ConductorSystem | null;
  const lengthUnit = q.get("lu") as LengthUnit | null;

  if (mode) out.calculationMode = mode;
  if (circuit) out.circuitType = circuit;
  if (inputMode) out.inputMode = inputMode;
  if (material) out.material = material;
  if (system) out.conductorSystem = system;
  if (lengthUnit) out.lengthUnit = lengthUnit;

  const setters: Array<[keyof ElectricalInput, string]> = [
    ["loadValue", "load"],
    ["voltage", "v"],
    ["powerFactor", "pf"],
    ["length", "len"],
    ["conductorTemperatureC", "temp"],
    ["targetVoltageDropPct", "drop"],
    ["parallelRuns", "par"],
    ["designCurrentMultiplier", "dm"],
    ["reactanceOhmPerKm", "x"],
    ["operatingHoursPerDay", "hrs"],
    ["energyCostPerKWh", "cost"],
  ];

  setters.forEach(([key, param]) => {
    const parsed = parseMaybeNumber(q.get(param));
    if (parsed !== null) (out as any)[key] = parsed;
  });

  out.selectedConductorId = q.get("size") || out.selectedConductorId;
  out.currencyCode = q.get("cur") || out.currencyCode;
  out.resistanceOverrideOhmPerKm = parseMaybeNumber(q.get("r"));
  out.cableAmpacityA = parseMaybeNumber(q.get("ampacity"));

  return normalizeElectricalInput(out);
};

export default function ElectricalDesigner({
  initialPreset = "general",
  initialMode = "wire-size",
}: ElectricalDesignerProps) {
  const baseInput = useMemo(
    () => mergePreset(initialPreset, initialMode),
    [initialPreset, initialMode]
  );
  const [input, setInput] = useState<ElectricalInput>(baseInput);
  const [activePreset, setActivePreset] =
    useState<ElectricalPresetName>(initialPreset);
  const [hydrated, setHydrated] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const resultRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const query = readQueryInput(baseInput);
    if (query) {
      setInput(normalizeElectricalInput(query));
      setHydrated(true);
      return;
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          setInput(normalizeElectricalInput({ ...baseInput, ...parsed } as ElectricalInput));
        }
      }
    } catch (error) {
      console.warn("Electrical calculator draft could not be restored.", error);
    }
    setHydrated(true);
  }, [baseInput]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(input));
    } catch (error) {
      console.warn("Electrical calculator draft could not be saved.", error);
    }
  }, [hydrated, input]);

  const result = useMemo(() => calculateElectrical(input), [input]);
  const catalog = useMemo(
    () => getConductorCatalog(input.conductorSystem),
    [input.conductorSystem]
  );

  const update = <K extends keyof ElectricalInput>(
    key: K,
    value: ElectricalInput[K]
  ) => setInput((prev) => ({ ...prev, [key]: value }));

  const changeSystem = (system: ConductorSystem) => {
    const catalogForSystem = getConductorCatalog(system);
    const current = findConductor(input.selectedConductorId);
    const nearest = current
      ? catalogForSystem.reduce((best, row) =>
          Math.abs(row.mm2 - current.mm2) < Math.abs(best.mm2 - current.mm2)
            ? row
            : best
        , catalogForSystem[0])
      : catalogForSystem[0];
    setInput((prev) => ({
      ...prev,
      conductorSystem: system,
      selectedConductorId: nearest?.id || prev.selectedConductorId,
    }));
  };

  const applyPreset = (preset: ElectricalPresetName) => {
    setActivePreset(preset);
    setInput((prev) => ({
      ...mergePreset(preset, prev.calculationMode),
      currencyCode: prev.currencyCode,
      energyCostPerKWh: prev.energyCostPerKWh,
    }));
  };

  const reset = () => {
    setInput(mergePreset(initialPreset, initialMode));
    setActivePreset(initialPreset);
    setAdvancedOpen(false);
  };

  const scrollToResult = () => {
    resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const share = async () => {
    const q = new URLSearchParams();
    q.set("ecalc", "1");
    q.set("mode", input.calculationMode);
    q.set("circuit", input.circuitType);
    q.set("input", input.inputMode);
    q.set("load", String(input.loadValue));
    q.set("v", String(input.voltage));
    q.set("pf", String(input.powerFactor));
    q.set("len", String(input.length));
    q.set("lu", input.lengthUnit);
    q.set("material", input.material);
    q.set("temp", String(input.conductorTemperatureC));
    q.set("drop", String(input.targetVoltageDropPct));
    q.set("system", input.conductorSystem);
    q.set("size", input.selectedConductorId);
    q.set("par", String(input.parallelRuns));
    q.set("dm", String(input.designCurrentMultiplier));
    q.set("x", String(input.reactanceOhmPerKm));
    q.set("hrs", String(input.operatingHoursPerDay));
    q.set("cost", String(input.energyCostPerKWh));
    q.set("cur", input.currencyCode);
    if (input.resistanceOverrideOhmPerKm !== null)
      q.set("r", String(input.resistanceOverrideOhmPerKm));
    if (input.cableAmpacityA !== null)
      q.set("ampacity", String(input.cableAmpacityA));

    const url = `${window.location.origin}${window.location.pathname}?${q.toString()}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareMessage("Share link copied");
    } catch {
      window.history.replaceState(null, "", url);
      setShareMessage("Share settings added to the address bar");
    }
    window.setTimeout(() => setShareMessage(""), 2500);
  };

  const governing = result.governingConductor;
  const isWireSize = input.calculationMode === "wire-size";
  const maxLengthDisplay =
    governing.maxLengthMAtTarget === null
      ? null
      : metersToLength(governing.maxLengthMAtTarget, input.lengthUnit);

  return (
    <div className="w-full">
      <div className="rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-950 px-4 py-5 text-white sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
                Electrical design workspace
              </p>
              <h2 className="mt-1 text-xl font-black sm:text-2xl">
                Cable, wire size & voltage drop designer
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-300">
                DC, single-phase and balanced three-phase calculations with AWG,
                kcmil and mm² conductors, reverse solving, energy-loss estimates
                and transparent assumptions.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={share}
                className="min-h-11 rounded-xl border border-slate-600 bg-slate-900 px-4 py-2 hover:bg-slate-800"
              >
                {shareMessage || "Copy share link"}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="min-h-11 rounded-xl border border-slate-600 bg-slate-900 px-4 py-2 hover:bg-slate-800"
              >
                Print / save PDF
              </button>
              <button
                type="button"
                onClick={reset}
                className="min-h-11 rounded-xl border border-slate-600 bg-slate-900 px-4 py-2 hover:bg-slate-800"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          <section aria-labelledby="preset-heading">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h3 id="preset-heading" className="text-sm font-black text-slate-950">
                  Quick design presets
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Presets only fill planning inputs. Always replace them with your actual circuit data.
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
              {(Object.keys(PRESETS) as ElectricalPresetName[]).map((name) => (
                <button
                  type="button"
                  key={name}
                  onClick={() => applyPreset(name)}
                  aria-pressed={activePreset === name}
                  className={`min-h-16 rounded-xl border p-3 text-left transition ${
                    activePreset === name
                      ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100"
                      : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                  }`}
                >
                  <span className="block text-xs font-black text-slate-900">
                    {PRESETS[name].label}
                  </span>
                  <span className="mt-1 block text-[11px] leading-4 text-slate-500">
                    {PRESETS[name].description}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="mt-6" aria-labelledby="mode-heading">
            <h3 id="mode-heading" className="text-sm font-black text-slate-950">
              What do you want to solve?
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-5">
              {(Object.keys(modeLabel) as CalculationMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => update("calculationMode", mode)}
                  aria-pressed={input.calculationMode === mode}
                  className={`min-h-12 rounded-xl px-3 py-2 text-xs font-black transition sm:text-sm ${
                    input.calculationMode === mode
                      ? "bg-slate-950 text-white shadow-lg"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {modeLabel[mode]}
                </button>
              ))}
            </div>
          </section>

          <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,.95fr)]">
            <div className="min-w-0 space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                <h3 className="font-black text-slate-950">1. Electrical load</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Circuit type">
                    <select
                      value={input.circuitType}
                      onChange={(e) => {
                        const circuitType = e.target.value as CircuitType;
                        setInput((prev) => ({
                          ...prev,
                          circuitType,
                          powerFactor: circuitType === "dc" ? 1 : prev.powerFactor,
                        }));
                      }}
                      className="input"
                    >
                      {(Object.keys(circuitLabel) as CircuitType[]).map((value) => (
                        <option key={value} value={value}>
                          {circuitLabel[value]}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Load input">
                    <select
                      value={input.inputMode}
                      onChange={(e) => update("inputMode", e.target.value as LoadInputMode)}
                      className="input"
                    >
                      <option value="amps">Current (A)</option>
                      <option value="watts">Active power (W)</option>
                      <option value="kw">Active power (kW)</option>
                      <option value="kva">Apparent power (kVA)</option>
                    </select>
                  </Field>

                  <Field label={`Load (${inputUnitLabel[input.inputMode]})`}>
                    <NumberInput
                      value={input.loadValue}
                      min={0}
                      step="any"
                      onChange={(value) => update("loadValue", value)}
                    />
                  </Field>

                  <Field
                    label={
                      input.circuitType === "three-phase"
                        ? "System voltage, line-to-line (V)"
                        : "System voltage (V)"
                    }
                  >
                    <NumberInput
                      value={input.voltage}
                      min={1}
                      max={1500}
                      step="any"
                      onChange={(value) => update("voltage", value)}
                    />
                  </Field>

                  {input.circuitType !== "dc" && (
                    <Field label="Power factor (cos φ)">
                      <NumberInput
                        value={input.powerFactor}
                        min={0.01}
                        max={1}
                        step={0.01}
                        onChange={(value) => update("powerFactor", value)}
                      />
                    </Field>
                  )}

                  <Field label="Design-current multiplier">
                    <NumberInput
                      value={input.designCurrentMultiplier}
                      min={1}
                      max={5}
                      step={0.05}
                      onChange={(value) => update("designCurrentMultiplier", value)}
                    />
                    <Help>
                      Leave at 1.00 unless a qualified designer or applicable code requires a larger design current.
                    </Help>
                  </Field>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <h3 className="font-black text-slate-950">2. Cable run & conductor</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="One-way cable length">
                    <div className="grid grid-cols-[minmax(0,1fr)_92px] gap-2">
                      <NumberInput
                        value={input.length}
                        min={0}
                        step="any"
                        onChange={(value) => update("length", value)}
                      />
                      <select
                        value={input.lengthUnit}
                        onChange={(e) => update("lengthUnit", e.target.value as LengthUnit)}
                        className="input"
                      >
                        <option value="m">metres</option>
                        <option value="ft">feet</option>
                      </select>
                    </div>
                    <Help>Enter the physical one-way distance. The engine applies the correct circuit path factor.</Help>
                  </Field>

                  <Field label="Conductor material">
                    <select
                      value={input.material}
                      onChange={(e) => update("material", e.target.value as ConductorMaterial)}
                      className="input"
                    >
                      <option value="copper">Copper</option>
                      <option value="aluminum">Aluminum</option>
                    </select>
                  </Field>

                  <Field label="Conductor size system">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => changeSystem("metric")}
                        className={`min-h-11 rounded-xl border px-3 text-sm font-black ${
                          input.conductorSystem === "metric"
                            ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                            : "border-slate-200 bg-white text-slate-600"
                        }`}
                      >
                        mm²
                      </button>
                      <button
                        type="button"
                        onClick={() => changeSystem("awg")}
                        className={`min-h-11 rounded-xl border px-3 text-sm font-black ${
                          input.conductorSystem === "awg"
                            ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                            : "border-slate-200 bg-white text-slate-600"
                        }`}
                      >
                        AWG / kcmil
                      </button>
                    </div>
                  </Field>

                  {!isWireSize && (
                    <Field label="Selected conductor size">
                      <select
                        value={input.selectedConductorId}
                        onChange={(e) => update("selectedConductorId", e.target.value)}
                        className="input"
                      >
                        {catalog.map((row) => (
                          <option key={row.id} value={row.id}>
                            {row.label} ({fmt(row.mm2, 2)} mm²)
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}

                  <Field label="Target voltage drop (%)">
                    <NumberInput
                      value={input.targetVoltageDropPct}
                      min={0.01}
                      max={100}
                      step={0.1}
                      onChange={(value) => update("targetVoltageDropPct", value)}
                    />
                    <Help>
                      3% is a common planning target in some contexts, but allowable drop depends on your jurisdiction and application.
                    </Help>
                  </Field>

                  <Field label="Parallel conductors per phase / pole">
                    <NumberInput
                      value={input.parallelRuns}
                      min={1}
                      max={24}
                      step={1}
                      onChange={(value) => update("parallelRuns", Math.max(1, Math.round(value)))}
                    />
                  </Field>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <button
                  type="button"
                  onClick={() => setAdvancedOpen((value) => !value)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                  aria-expanded={advancedOpen}
                >
                  <span>
                    <span className="block font-black text-slate-950">3. Advanced engineering inputs</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      Temperature, manufacturer resistance, cable reactance, ampacity and loss-cost assumptions.
                    </span>
                  </span>
                  <span className="text-2xl font-black text-slate-400">{advancedOpen ? "−" : "+"}</span>
                </button>

                {advancedOpen && (
                  <div className="mt-5 grid gap-4 border-t border-slate-200 pt-5 sm:grid-cols-2">
                    <Field label="Conductor operating temperature (°C)">
                      <NumberInput
                        value={input.conductorTemperatureC}
                        min={-50}
                        max={200}
                        step={1}
                        onChange={(value) => update("conductorTemperatureC", value)}
                      />
                    </Field>

                    {input.circuitType !== "dc" && (
                      <Field label="Cable reactance X (Ω/km)">
                        <NumberInput
                          value={input.reactanceOhmPerKm}
                          min={0}
                          max={100}
                          step={0.001}
                          onChange={(value) => update("reactanceOhmPerKm", value)}
                        />
                        <Help>Use the cable manufacturer's value for engineering-grade AC results.</Help>
                      </Field>
                    )}

                    <NullableNumberField
                      label="Manufacturer resistance R (Ω/km), optional"
                      value={input.resistanceOverrideOhmPerKm}
                      onChange={(value) => update("resistanceOverrideOhmPerKm", value)}
                      help="When supplied, this overrides the generic material/temperature resistance model."
                    />

                    {!isWireSize && (
                      <NullableNumberField
                        label="Selected cable allowable ampacity (A), optional"
                        value={input.cableAmpacityA}
                        onChange={(value) => update("cableAmpacityA", value)}
                        help="Enter a value from the applicable cable datasheet/local code after installation corrections."
                      />
                    )}

                    <Field label="Operating hours per day">
                      <NumberInput
                        value={input.operatingHoursPerDay}
                        min={0}
                        max={24}
                        step={0.25}
                        onChange={(value) => update("operatingHoursPerDay", value)}
                      />
                    </Field>

                    <Field label="Electricity cost per kWh">
                      <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-2">
                        <input
                          value={input.currencyCode}
                          onChange={(e) => update("currencyCode", e.target.value.toUpperCase())}
                          maxLength={8}
                          aria-label="Currency code"
                          className="input font-mono uppercase"
                        />
                        <NumberInput
                          value={input.energyCostPerKWh}
                          min={0}
                          step="any"
                          onChange={(value) => update("energyCostPerKWh", value)}
                        />
                      </div>
                    </Field>
                  </div>
                )}
              </section>

              <button
                type="button"
                onClick={scrollToResult}
                className="w-full min-h-14 rounded-2xl bg-emerald-600 px-5 py-3 text-base font-black text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-500 lg:hidden"
              >
                View calculation results ↓
              </button>
            </div>

            <div ref={resultRef} className="min-w-0 scroll-mt-24 lg:sticky lg:top-24 lg:self-start">
              <section className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-white shadow-xl sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-emerald-300">
                      Live result
                    </p>
                    <h3 className="mt-1 text-xl font-black">{modeLabel[input.calculationMode]}</h3>
                  </div>
                  <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-bold text-slate-300">
                    {circuitLabel[input.circuitType]}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <ResultMetric label="Calculated current" value={`${fmt(result.load.currentA, 3)} A`} />
                  <ResultMetric label="Design current" value={`${fmt(result.designCurrentA, 3)} A`} />
                  <ResultMetric label="Active power" value={`${fmt(result.load.activePowerKw, 3)} kW`} />
                  <ResultMetric label="Apparent power" value={`${fmt(result.load.apparentPowerKva, 3)} kVA`} />
                </div>

                {isWireSize && result.recommended && (
                  <div className="mt-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5">
                    <p className="text-xs font-black uppercase tracking-wider text-emerald-300">
                      Voltage-drop sizing result
                    </p>
                    <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="text-3xl font-black text-white">
                        {result.recommended.conductor.label}
                      </span>
                      <span className="text-sm text-emerald-200">
                        {fmt(result.recommended.conductor.mm2, 2)} mm²
                      </span>
                    </div>
                    {result.recommended.equivalentConductor && (
                      <p className="mt-2 text-xs leading-5 text-slate-300">
                        Nearest cross-system size by area: {result.recommended.equivalentConductor.label} ({fmt(result.recommended.equivalentConductor.mm2, 2)} mm²). This is an area comparison, not a standards-equivalence certification.
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <ResultMetric
                    label="Voltage drop"
                    value={`${fmt(governing.voltageDropV, 3)} V`}
                    sub={`${fmt(governing.voltageDropPct, 3)}% at operating current`}
                  />
                  <ResultMetric
                    label="Receiving voltage"
                    value={`${fmt(governing.receivingVoltageV, 3)} V`}
                    sub={`Source ${fmt(input.voltage, 2)} V`}
                  />
                  <ResultMetric
                    label="Design voltage drop"
                    value={`${fmt(governing.designVoltageDropPct, 3)}%`}
                    sub={`Target ≤ ${fmt(input.targetVoltageDropPct, 2)}%`}
                    status={
                      governing.designVoltageDropPct <= input.targetVoltageDropPct
                        ? "pass"
                        : "fail"
                    }
                  />
                  <ResultMetric
                    label="Cable real-power loss"
                    value={`${fmt(governing.powerLossW, 2)} W`}
                    sub={
                      governing.powerLossPctOfActiveLoad === null
                        ? "Load percentage unavailable"
                        : `${fmt(governing.powerLossPctOfActiveLoad, 3)}% of active load`
                    }
                  />
                  <ResultMetric
                    label="Annual cable loss"
                    value={`${fmt(governing.annualLossKWh, 1)} kWh`}
                    sub={`${input.currencyCode} ${fmt(governing.annualLossCost, 2)} / year at entered tariff`}
                  />
                  <ResultMetric
                    label={`Maximum length at ${fmt(input.targetVoltageDropPct, 2)}%`}
                    value={
                      maxLengthDisplay === null
                        ? "N/A"
                        : `${fmt(maxLengthDisplay, 2)} ${input.lengthUnit}`
                    }
                  />
                  <ResultMetric
                    label={`Maximum current at ${fmt(input.targetVoltageDropPct, 2)}%`}
                    value={
                      governing.maxCurrentAAtTarget === null
                        ? "N/A"
                        : `${fmt(governing.maxCurrentAAtTarget, 2)} A`
                    }
                  />
                  <ResultMetric
                    label="Conductor resistance"
                    value={`${fmt(governing.resistanceOhmPerKm, 5)} Ω/km`}
                    sub={
                      input.resistanceOverrideOhmPerKm !== null
                        ? "Manufacturer override"
                        : `${input.material}, ${fmt(input.conductorTemperatureC, 0)} °C model`
                    }
                  />
                </div>

                {governing.ampacityUtilizationPct !== null && (
                  <div
                    className={`mt-4 rounded-xl border p-4 text-sm ${
                      governing.ampacityPass
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                        : "border-red-500/40 bg-red-500/10 text-red-100"
                    }`}
                  >
                    <strong>
                      User-supplied ampacity check: {governing.ampacityPass ? "PASS" : "FAIL"}
                    </strong>
                    <p className="mt-1 text-xs leading-5">
                      Design-current utilization is {fmt(governing.ampacityUtilizationPct, 1)}% of the entered allowable ampacity.
                    </p>
                  </div>
                )}

                <div className="mt-5 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
                  <h4 className="text-sm font-black text-amber-200">Safety / code boundary</h4>
                  <p className="mt-1 text-xs leading-5 text-amber-100/90">
                    This is an engineering planning calculator, not an electrical permit or code-compliance approval. Final cable selection must also satisfy local ampacity, installation, protection, fault-current, short-circuit, earthing, terminal and authority requirements.
                  </p>
                </div>

                {result.warnings.length > 0 && (
                  <details className="mt-4 rounded-xl border border-slate-700 bg-slate-900 p-4" open>
                    <summary className="cursor-pointer text-sm font-black text-white">Warnings & missing checks ({result.warnings.length})</summary>
                    <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-300">
                      {result.warnings.map((warning) => (
                        <li key={warning} className="flex gap-2">
                          <span className="text-amber-300">•</span>
                          <span>{warning}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}

                <details className="mt-3 rounded-xl border border-slate-700 bg-slate-900 p-4">
                  <summary className="cursor-pointer text-sm font-black text-white">Calculation assumptions</summary>
                  <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-300">
                    {result.assumptions.map((assumption) => (
                      <li key={assumption} className="flex gap-2">
                        <span className="text-emerald-300">•</span>
                        <span>{assumption}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              </section>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          min-height: 44px;
          border: 1px solid rgb(203 213 225);
          border-radius: 0.75rem;
          background: white;
          padding: 0.65rem 0.8rem;
          color: rgb(15 23 42);
          outline: none;
        }
        .input:focus {
          border-color: rgb(16 185 129);
          box-shadow: 0 0 0 3px rgb(209 250 229);
        }
        @media print {
          header, footer, nav, button { print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-black leading-5 text-slate-600">
        {label}
      </span>
      {children}
    </label>
  );
}

function Help({ children }: { children: React.ReactNode }) {
  return <span className="mt-1.5 block text-[11px] leading-4 text-slate-500">{children}</span>;
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  step,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number | "any";
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      value={Number.isFinite(value) ? value : 0}
      min={min}
      max={max}
      step={step}
      onChange={(e) => {
        const parsed = Number(e.target.value);
        onChange(Number.isFinite(parsed) ? parsed : 0);
      }}
      className="input"
    />
  );
}

function NullableNumberField({
  label,
  value,
  onChange,
  help,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  help: string;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        inputMode="decimal"
        value={value ?? ""}
        min={0}
        step="any"
        placeholder="Not supplied"
        onChange={(e) => {
          const text = e.target.value.trim();
          if (!text) return onChange(null);
          const parsed = Number(text);
          onChange(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
        }}
        className="input"
      />
      <Help>{help}</Help>
    </Field>
  );
}

function ResultMetric({
  label,
  value,
  sub,
  status,
}: {
  label: string;
  value: string;
  sub?: string;
  status?: "pass" | "fail";
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold leading-4 text-slate-400">{label}</p>
        {status && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
              status === "pass"
                ? "bg-emerald-500/15 text-emerald-300"
                : "bg-red-500/15 text-red-300"
            }`}
          >
            {status === "pass" ? "PASS" : "ABOVE TARGET"}
          </span>
        )}
      </div>
      <p className="mt-1 break-words font-mono text-lg font-black text-white sm:text-xl">
        {value}
      </p>
      {sub && <p className="mt-1 text-[11px] leading-4 text-slate-400">{sub}</p>}
    </div>
  );
}
