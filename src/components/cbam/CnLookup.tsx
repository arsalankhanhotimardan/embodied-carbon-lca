"use client";

import { useEffect, useState } from "react";

type Country = { name: string; normalized: string };
type Good = {
  id: string;
  sector: string | null;
  cnCode: string;
  description: string | null;
  rawDefault: { direct: number | null; indirect: number | null; total: number | null };
  productionRouteLabel: string | null;
};

const SECTOR_LABELS: Record<string, string> = {
  cement: "Cement",
  iron_steel: "Iron & steel",
  aluminium: "Aluminium",
  fertiliser: "Fertilisers",
  hydrogen: "Hydrogen",
  electricity: "Electricity",
};

const num = (v: number | null) => (v === null ? "—" : v.toFixed(3));

export default function CnLookup() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [country, setCountry] = useState("");
  const [search, setSearch] = useState("");
  const [goods, setGoods] = useState<Good[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/cbam/reference/options")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (!data.success) throw new Error(data.error || "Could not load countries.");
        setCountries(data.countries);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!country) {
      setGoods([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ country });
        if (search.trim()) params.set("search", search.trim());
        const res = await fetch(`/api/cbam/reference/options?${params}`, { signal: controller.signal });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || "Lookup failed.");
        setGoods(data.goods);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError((e as Error).message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, search ? 400 : 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [country, search]);

  return (
    <section className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="lookup-heading">
      <h2 id="lookup-heading" className="text-lg font-black text-slate-950">Find default emissions by country and CN code</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-bold text-slate-700">
          Country of origin
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          >
            <option value="">Select a country…</option>
            {countries.map((c) => (
              <option key={c.normalized} value={c.name}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-bold text-slate-700">
          CN code, product or sector
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="e.g. 7208, aluminium, cement"
            disabled={!country}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:bg-slate-100"
          />
        </label>
      </div>

      <div className="mt-5" aria-live="polite">
        {error ? <p className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-900">{error}</p> : null}
        {loading ? <p className="text-sm text-slate-500">Searching…</p> : null}
        {!country && !error ? <p className="text-sm text-slate-500">Choose a country to see official default values.</p> : null}
        {country && !loading && !error && goods.length === 0 ? <p className="text-sm text-slate-500">No matching goods found.</p> : null}
        {goods.length > 0 ? (
          <>
            <p className="mb-2 text-xs font-bold text-slate-500">{goods.length}{goods.length === 500 ? "+" : ""} result{goods.length === 1 ? "" : "s"} · tCO₂e per tonne of product</p>
            <div className="max-h-[32rem] overflow-auto rounded-2xl border border-slate-200">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead className="sticky top-0 bg-slate-100 text-xs uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="px-3 py-2">CN code</th>
                    <th className="px-3 py-2">Sector</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2 text-right">Direct</th>
                    <th className="px-3 py-2 text-right">Indirect</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {goods.map((g) => (
                    <tr key={g.id} className="border-t border-slate-100 align-top">
                      <td className="px-3 py-2 font-black text-slate-900">{g.cnCode}</td>
                      <td className="px-3 py-2">{g.sector ? SECTOR_LABELS[g.sector] ?? g.sector : "—"}</td>
                      <td className="px-3 py-2 text-slate-600">
                        {g.description ?? "—"}
                        {g.productionRouteLabel ? <span className="block text-xs text-slate-400">{g.productionRouteLabel}</span> : null}
                      </td>
                      <td className="px-3 py-2 text-right">{num(g.rawDefault.direct)}</td>
                      <td className="px-3 py-2 text-right">{num(g.rawDefault.indirect)}</td>
                      <td className="px-3 py-2 text-right font-black">{num(g.rawDefault.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-500">Values are the Commission&apos;s default values before the year-specific mark-up that the full calculator applies.</p>
          </>
        ) : null}
      </div>
    </section>
  );
}
