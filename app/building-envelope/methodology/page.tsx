import type React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { BUILDING_ENVELOPE_DATA_MANIFEST } from "@/data/building-envelope/data-manifest";

export const metadata: Metadata = {
  title: "Building Envelope Methodology | R-Value, U-Value & Heat Loss",
  description: "Methodology, equations, data versions, limitations and update policy for Green Engineering Tools building-envelope, insulation, heat-loss and carbon-payback calculators.",
  alternates: { canonical: "/building-envelope/methodology" },
};

const Formula = ({ children }: { children: React.ReactNode }) => <div className="my-3 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm font-bold text-slate-900">{children}</div>;

export default function Page() {
  return (
    <div className="bg-slate-50">
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <nav className="text-sm font-bold text-slate-500"><Link href="/" className="hover:text-emerald-700">Home</Link> / <Link href="/building-envelope" className="hover:text-emerald-700">Building Envelope</Link> / Methodology</nav>
        <header className="mt-6 rounded-3xl bg-slate-950 p-6 text-white sm:p-9">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">Transparent Engineering Method</p>
          <h1 className="mt-3 text-3xl font-black sm:text-5xl">Building Envelope Methodology & Data Policy</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300">The calculation engine, datasets and guidance are versioned separately so stable physics does not silently change when a source page or product dataset changes.</p>
          <div className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4"><div className="text-slate-400">Engine</div><div className="mt-1 font-black">v{BUILDING_ENVELOPE_DATA_MANIFEST.engineVersion}</div></div>
            <div className="rounded-2xl bg-white/10 p-4"><div className="text-slate-400">Material dataset</div><div className="mt-1 font-black">{BUILDING_ENVELOPE_DATA_MANIFEST.materialDataset.version}</div></div>
            <div className="rounded-2xl bg-white/10 p-4"><div className="text-slate-400">Guidance dataset</div><div className="mt-1 font-black">{BUILDING_ENVELOPE_DATA_MANIFEST.regionalGuidanceDataset.version}</div></div>
          </div>
        </header>

        <article className="mt-8 space-y-9 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 lg:p-10">
          <section>
            <h2 className="text-2xl font-black text-slate-950">1. Thermal resistance and U-value</h2>
            <p className="mt-3 leading-7 text-slate-700">For a homogeneous layer, thermal resistance is thickness divided by thermal conductivity. For a simple series assembly, layer resistances and selected surface resistances are added. U-value is the inverse of total SI resistance.</p>
            <Formula>R_layer = thickness (m) ÷ λ (W/m·K)</Formula>
            <Formula>R_total = R_si + ΣR_layer + R_se</Formula>
            <Formula>U = 1 ÷ R_total</Formula>
            <p className="mt-3 text-sm leading-6 text-slate-600">The calculator follows the basic thermal-resistance/transmittance framework described by <a className="font-bold text-emerald-700 underline" href="https://www.iso.org/standard/65708.html">ISO 6946:2017</a>. ISO states that this standard excludes doors, windows and other glazed units, curtain walling, ground-contact components and components through which air is designed to permeate.</p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-slate-950">2. R-US, RSI and U conversion</h2>
            <Formula>R-US = RSI × 5.678263337</Formula>
            <Formula>RSI = R-US ÷ 5.678263337</Formula>
            <Formula>U (W/m²·K) = 1 ÷ RSI</Formula>
            <p className="mt-3 leading-7 text-slate-700">Internally, the engine uses SI values. Imperial inputs are converted to SI before calculation and converted back for display. This avoids running separate formula sets that could drift apart.</p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-slate-950">3. Repeating framing approximation</h2>
            <p className="mt-3 leading-7 text-slate-700">When enabled, one layer can be split into an insulated path and a framing path. The effective U-value is the area-weighted conductance of the two paths.</p>
            <Formula>U_effective = (1 − f) / R_insulated_path + f / R_bridge_path</Formula>
            <p className="mt-3 text-sm leading-6 text-amber-800">This is a simple repeating-path approximation, not a full thermal-bridge calculation. Junction Ψ-values, point bridges, fixings and complex inhomogeneous elements can require a specialist method.</p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-slate-950">4. Insulation thickness and quantity</h2>
            <Formula>R_additional = max(0, R_target − R_existing)</Formula>
            <Formula>thickness = R_additional × λ</Formula>
            <Formula>volume = area × thickness</Formula>
            <Formula>mass = volume × installed density</Formula>
            <p className="mt-3 leading-7 text-slate-700">Product package counts are only produced when product-specific coverage or package-mass data is entered. Loose-fill coverage and settlement can be manufacturer-specific, so the engine does not invent a universal bags-per-area rule.</p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-slate-950">5. Design heat loss</h2>
            <Formula>H_fabric = Σ(U × area)   [W/K]</Formula>
            <Formula>Q_fabric = H_fabric × ΔT</Formula>
            <Formula>H_air ≈ 0.333 × V × [ACH_infiltration + ACH_ventilation × (1 − heat-recovery efficiency)]</Formula>
            <Formula>Q_total = (H_fabric + H_vent) × ΔT</Formula>
            <p className="mt-3 leading-7 text-slate-700"><a className="font-bold text-emerald-700 underline" href="https://www.iso.org/standard/65713.html">ISO 13789:2017</a> provides methods and conventions for steady-state transmission and ventilation heat-transfer coefficients. In V1, uncontrolled infiltration and intentional/mechanical ventilation are entered separately so heat recovery is applied only to the ventilation airflow. The V1 calculator is a transparent planning implementation, not a claim of complete project certification under that standard.</p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-slate-950">6. Degree-day annual energy</h2>
            <Formula>Annual delivered energy ≈ H_total × degree-days × 24 ÷ 1000</Formula>
            <Formula>Purchased energy ≈ delivered energy ÷ performance factor</Formula>
            <p className="mt-3 leading-7 text-slate-700">This is a simplified degree-day estimate. It does not model hourly solar gains, internal gains, humidity, controls or dynamic thermal mass. <a className="font-bold text-emerald-700 underline" href="https://www.iso.org/standard/65696.html">ISO 52016-1:2017</a> covers more detailed procedures for heating/cooling energy needs and internal temperatures; this V1 does not claim to be a full ISO 52016 simulation.</p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-slate-950">7. Cost and carbon payback</h2>
            <Formula>Annual cost saving = purchased energy saved × local energy price</Formula>
            <Formula>Annual CO₂e saving = purchased energy saved × operational carbon factor</Formula>
            <Formula>Financial payback = upgrade cost ÷ annual cost saving</Formula>
            <Formula>Carbon payback = embodied carbon ÷ annual operational CO₂e saving</Formula>
            <p className="mt-3 leading-7 text-slate-700">No generic embodied-carbon factor is silently bundled. Use total project carbon from an LCA/EPD calculation, or a compatible product EPD factor with the correct declared unit and life-cycle scope.</p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-slate-950">8. Regional guidance</h2>
            <p className="mt-3 leading-7 text-slate-700">The initial regional dataset includes optional U.S. retrofit guidance from <a className="font-bold text-emerald-700 underline" href="https://www.energystar.gov/saveathome/seal_insulate/identify-problems-you-want-fix/diy-checks-inspections/insulation-r-values">ENERGY STAR's Recommended Home Insulation R-Values</a>. It is explicitly labelled as U.S. guidance and is not reused as a worldwide code table.</p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-slate-950">9. Data updates: monitored, validated, versioned</h2>
            <p className="mt-3 leading-7 text-slate-700">Stable equations are not changed automatically. Source pages are monitored by a source-health script; material/guidance changes must pass dataset validation and regression tests before a new version is activated. If monitoring fails, the website continues using the last validated local dataset.</p>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
              <div className="font-black text-slate-950">Safe update sequence</div>
              <div className="mt-2 font-mono">Source change → review → new version → dataset validation → engine regression tests → build → activation</div>
              <div className="mt-2">No external source can overwrite production calculation values directly.</div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-black text-slate-950">10. Known limits</h2>
            <ul className="mt-4 list-disc space-y-2 pl-6 leading-7 text-slate-700">
              <li>Not a universal building-code compliance certificate.</li>
              <li>No condensation/interstitial moisture or hygrothermal simulation.</li>
              <li>No ground-contact method, glazing model or curtain-wall calculation in V1.</li>
              <li>No full linear/point thermal-bridge or 2D/3D heat-flow solver.</li>
              <li>No automatic local energy-price or grid-carbon factor: users enter current local values to avoid stale global assumptions.</li>
              <li>No automatic EPD factor substitution without unit/scope validation.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <h2 className="text-xl font-black text-emerald-950">Version and review policy</h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="font-bold text-emerald-800">Engine version</dt><dd className="font-black text-emerald-950">{BUILDING_ENVELOPE_DATA_MANIFEST.engineVersion}</dd></div>
              <div><dt className="font-bold text-emerald-800">Material dataset</dt><dd className="font-black text-emerald-950">{BUILDING_ENVELOPE_DATA_MANIFEST.materialDataset.version} · reviewed {BUILDING_ENVELOPE_DATA_MANIFEST.materialDataset.reviewed}</dd></div>
              <div><dt className="font-bold text-emerald-800">Guidance dataset</dt><dd className="font-black text-emerald-950">{BUILDING_ENVELOPE_DATA_MANIFEST.regionalGuidanceDataset.version} · reviewed {BUILDING_ENVELOPE_DATA_MANIFEST.regionalGuidanceDataset.reviewed}</dd></div>
              <div><dt className="font-bold text-emerald-800">Source monitoring</dt><dd className="font-black text-emerald-950">Automatic health check; calculation changes require validated release</dd></div>
            </dl>
          </section>
        </article>
      </div>
    </div>
  );
}
