/**
 * Screening benchmarks for the house/building carbon estimator.
 *
 * Every row states its LCA scope and where the number comes from. These are
 * published study results or ranges, NOT a calculation for a specific design.
 * Values are kgCO2e per m² of gross internal floor area.
 */

export type Scope = "A1–A3" | "A1–A5";

export type BenchmarkOption = {
  id: string;
  label: string;
  group: "House" | "Other building";
  scope: Scope;
  low: number;
  typical: number;
  high: number;
  confidence: "Moderate" | "Low";
  basis: string;
  /** Whether the LETI residential targets are a meaningful comparison. */
  residential: boolean;
};

export const BENCHMARK_OPTIONS: BenchmarkOption[] = [
  {
    id: "house-timber",
    label: "House: timber frame",
    group: "House",
    scope: "A1–A3",
    low: 185,
    typical: 231,
    high: 300,
    confidence: "Moderate",
    basis: "UK Passivhaus study of a 160 m² house: 231 kgCO₂e/m² (A1–A3), timber frame including the concrete slab. Low and high apply an illustrative −20% / +30% spread for design variation.",
    residential: true,
  },
  {
    id: "house-sips",
    label: "House: SIPs / panelised",
    group: "House",
    scope: "A1–A3",
    low: 245,
    typical: 308,
    high: 400,
    confidence: "Moderate",
    basis: "Same UK Passivhaus study: 308 kgCO₂e/m² (A1–A3) for a structural insulated panel (SIPs) house. Illustrative −20% / +30% spread.",
    residential: true,
  },
  {
    id: "house-masonry",
    label: "House: brick and block masonry",
    group: "House",
    scope: "A1–A3",
    low: 280,
    typical: 348,
    high: 450,
    confidence: "Moderate",
    basis: "Same UK Passivhaus study: 348 kgCO₂e/m² (A1–A3) for a masonry house. Illustrative −20% / +30% spread.",
    residential: true,
  },
  {
    id: "apartment",
    label: "Apartment building (multi-storey residential)",
    group: "Other building",
    scope: "A1–A5",
    low: 300,
    typical: 400,
    high: 550,
    confidence: "Low",
    basis: "European residential average of about 400 kgCO₂e/m² upfront (A1–A5) from the Ramboll / BUILD AAU embodied carbon benchmark project, which covers houses and flats together. Range is indicative.",
    residential: true,
  },
  {
    id: "commercial",
    label: "Office, school or other commercial building",
    group: "Other building",
    scope: "A1–A5",
    low: 450,
    typical: 550,
    high: 650,
    confidence: "Moderate",
    basis: "UK Net Zero Carbon Building Standard analysis of about 500 UK new builds: most projects fall between 450 and 650 kgCO₂e/m² (A1–A5). Typical is the midpoint.",
    residential: false,
  },
  {
    id: "warehouse",
    label: "Warehouse or logistics building",
    group: "Other building",
    scope: "A1–A5",
    low: 360,
    typical: 450,
    high: 540,
    confidence: "Low",
    basis: "The same UK analysis found logistics and warehouse medians about 18% below the all-types value. Typical applies that reduction to the 550 midpoint; the spread is illustrative.",
    residential: false,
  },
];

export const optionById = (id: string) => BENCHMARK_OPTIONS.find((o) => o.id === id);

/** LETI residential upfront embodied carbon targets (A1–A5), as summarised by IStructE. */
export const LETI_RESIDENTIAL = { y2020: 500, y2030: 300 };

export const FT2_PER_M2 = 10.7639;

export function estimate(optionId: string, areaM2: number) {
  const o = optionById(optionId);
  if (!o || !Number.isFinite(areaM2) || areaM2 <= 0) return null;
  const tonnes = (kgPerM2: number) => (kgPerM2 * areaM2) / 1000;
  return { option: o, areaM2, lowT: tonnes(o.low), typicalT: tonnes(o.typical), highT: tonnes(o.high) };
}

export const SOURCES = [
  { label: "Anna Carton, Embodied Carbon & Natural Materials (UK Passivhaus Conference 2019)", href: "https://ukphc.org.uk/wp-content/uploads/2019/11/UKPHC19-Anna-Carton-PHH-Embodied-Carbon-and-Natural-Materials.pdf" },
  { label: "Towards embodied carbon benchmarks for buildings in Europe — Ramboll, BUILD AAU, KU Leuven", href: "https://doi.org/10.5281/zenodo.5895051" },
  { label: "IStructE, Setting carbon targets (summary of LETI and RIBA targets)", href: "https://www.istructe.org/IStructE/media/Public/TSE-Archive/2020/Setting-carbon-targets-an-introduction-to-the-proposed-SCORS-rating-scheme.pdf" },
  { label: "UK Net Zero Carbon Building Standard, analysis of ~500 UK new-build projects (as summarised in published commentary)", href: null },
];
