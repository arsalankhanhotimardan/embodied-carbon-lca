"use client";

import React, { useMemo, useState } from "react";
import { calculateLoadElectricalValues, type CircuitType } from "@/lib/electrical-engine";

export default function PowerConverter({ mode }: { mode: "watts-to-amps" | "kva-to-amps" }) {
  const [circuitType, setCircuitType] = useState<CircuitType>("single-phase");
  const [voltage, setVoltage] = useState(230);
  const [value, setValue] = useState(mode === "watts-to-amps" ? 5000 : 10);
  const [powerFactor, setPowerFactor] = useState(0.9);

  const result = useMemo(
    () =>
      calculateLoadElectricalValues({
        circuitType,
        inputMode: mode === "watts-to-amps" ? "watts" : "kva",
        loadValue: value,
        voltage,
        powerFactor,
      }),
    [circuitType, mode, powerFactor, value, voltage]
  );

  const fmt = (n: number, digits = 3) =>
    Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: digits }) : "N/A";

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 overflow-hidden">
      <div className="bg-slate-950 px-5 py-5 text-white sm:px-7">
        <p className="text-xs font-black uppercase tracking-widest text-emerald-300">Quick electrical conversion</p>
        <h2 className="mt-1 text-2xl font-black">
          {mode === "watts-to-amps" ? "Watts to amps calculator" : "kVA to amps calculator"}
        </h2>
      </div>
      <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-2">
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-black text-slate-600">Circuit type</span>
            <select value={circuitType} onChange={(e) => setCircuitType(e.target.value as CircuitType)} className="input">
              <option value="dc">DC</option>
              <option value="single-phase">Single-phase AC</option>
              <option value="three-phase">Three-phase AC</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-black text-slate-600">
              {mode === "watts-to-amps" ? "Active power (W)" : "Apparent power (kVA)"}
            </span>
            <input type="number" min="0" step="any" value={value} onChange={(e) => setValue(Number(e.target.value) || 0)} className="input" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-black text-slate-600">
              {circuitType === "three-phase" ? "Line-to-line voltage (V)" : "Voltage (V)"}
            </span>
            <input type="number" min="1" step="any" value={voltage} onChange={(e) => setVoltage(Number(e.target.value) || 1)} className="input" />
          </label>
          {circuitType !== "dc" && (
            <label className="block">
              <span className="mb-1.5 block text-xs font-black text-slate-600">Power factor</span>
              <input type="number" min="0.01" max="1" step="0.01" value={powerFactor} onChange={(e) => setPowerFactor(Number(e.target.value) || 0.01)} className="input" />
            </label>
          )}
        </div>
        <div className="rounded-2xl bg-slate-950 p-5 text-white sm:p-6">
          <p className="text-xs font-black uppercase tracking-widest text-emerald-300">Result</p>
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs font-bold text-slate-400">Current</p>
            <p className="mt-1 font-mono text-4xl font-black">{fmt(result.currentA)} A</p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs text-slate-400">Active power</p>
              <p className="mt-1 font-mono font-black">{fmt(result.activePowerKw)} kW</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs text-slate-400">Apparent power</p>
              <p className="mt-1 font-mono font-black">{fmt(result.apparentPowerKva)} kVA</p>
            </div>
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-300">
            {circuitType === "three-phase"
              ? "Balanced three-phase calculation using line-to-line voltage."
              : circuitType === "single-phase"
              ? "Single-phase calculation across the entered supply voltage."
              : "DC calculation; power factor is not used."}
          </p>
        </div>
      </div>
      <style jsx global>{`.input{width:100%;min-height:44px;border:1px solid rgb(203 213 225);border-radius:.75rem;background:white;padding:.65rem .8rem;color:rgb(15 23 42);outline:none}.input:focus{border-color:rgb(16 185 129);box-shadow:0 0 0 3px rgb(209 250 229)}`}</style>
    </div>
  );
}
