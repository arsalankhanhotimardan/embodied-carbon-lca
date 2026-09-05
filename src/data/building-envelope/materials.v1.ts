export type EnvelopeMaterialPreset = {
  id: string;
  name: string;
  category: "insulation" | "board" | "masonry" | "wood" | "finish";
  conductivityWmK: number;
  conductivityRangeWmK?: [number, number];
  densityKgM3?: number;
  note: string;
};

/**
 * Representative planning defaults only.
 * Product-declared lambda / R-value always overrides these presets.
 * No generic embodied-carbon factors are bundled because carbon data is
 * product-, geography-, unit- and EPD-specific.
 */
export const ENVELOPE_MATERIAL_DATASET_VERSION = "2026.09.1";
export const ENVELOPE_MATERIAL_DATASET_REVIEWED = "2026-09-05";

export const ENVELOPE_MATERIALS: EnvelopeMaterialPreset[] = [
  { id: "fiberglass-batt", name: "Fiberglass / glass wool batt", category: "insulation", conductivityWmK: 0.040, conductivityRangeWmK: [0.032, 0.044], densityKgM3: 16, note: "Representative planning value. Replace with the selected product's declared thermal conductivity." },
  { id: "loose-fiberglass", name: "Loose-fill fiberglass", category: "insulation", conductivityWmK: 0.044, conductivityRangeWmK: [0.040, 0.050], densityKgM3: 12, note: "Loose-fill performance and installed density are product/application specific; use the bag coverage chart for purchasing." },
  { id: "cellulose", name: "Cellulose insulation", category: "insulation", conductivityWmK: 0.040, conductivityRangeWmK: [0.037, 0.043], densityKgM3: 45, note: "Installed density and settlement depend on product/application. Use manufacturer coverage data for final depth and bag count." },
  { id: "mineral-wool", name: "Mineral / stone wool", category: "insulation", conductivityWmK: 0.037, conductivityRangeWmK: [0.034, 0.041], densityKgM3: 45, note: "Representative planning value; board/batt products vary by density and declaration." },
  { id: "eps", name: "EPS insulation", category: "insulation", conductivityWmK: 0.036, conductivityRangeWmK: [0.031, 0.040], densityKgM3: 20, note: "Use the specific EPS grade and declared lambda for final design." },
  { id: "xps", name: "XPS insulation", category: "insulation", conductivityWmK: 0.030, conductivityRangeWmK: [0.027, 0.036], densityKgM3: 35, note: "Long-term design thermal conductivity can differ from initial values; use declared product data." },
  { id: "pir", name: "PIR rigid insulation", category: "insulation", conductivityWmK: 0.023, conductivityRangeWmK: [0.021, 0.027], densityKgM3: 32, note: "Facings, ageing and product declaration matter; replace this planning value with manufacturer data." },
  { id: "closed-cell-pur", name: "Closed-cell polyurethane foam", category: "insulation", conductivityWmK: 0.026, conductivityRangeWmK: [0.022, 0.030], densityKgM3: 35, note: "Use declared aged thermal resistance/conductivity where required by the applicable method." },
  { id: "open-cell-foam", name: "Open-cell spray foam", category: "insulation", conductivityWmK: 0.039, conductivityRangeWmK: [0.035, 0.043], densityKgM3: 10, note: "Representative planning value; verify the tested product and installed thickness." },
  { id: "wood-fibre", name: "Wood-fibre insulation", category: "insulation", conductivityWmK: 0.041, conductivityRangeWmK: [0.037, 0.050], densityKgM3: 50, note: "Wood-fibre products vary widely by board/batt/loose-fill density." },
  { id: "gypsum-board", name: "Gypsum plasterboard", category: "finish", conductivityWmK: 0.25, conductivityRangeWmK: [0.16, 0.25], densityKgM3: 800, note: "Planning value only; use declared resistance where available." },
  { id: "softwood", name: "Softwood", category: "wood", conductivityWmK: 0.13, conductivityRangeWmK: [0.10, 0.16], densityKgM3: 500, note: "Representative planning value; thermal conductivity varies with species, density and moisture content." },
  { id: "brick", name: "Clay brick masonry", category: "masonry", conductivityWmK: 0.77, conductivityRangeWmK: [0.4, 1.3], densityKgM3: 1800, note: "Representative planning value; masonry conductivity varies substantially with density, voids and moisture; use project-specific data." },
  { id: "concrete", name: "Normal-weight concrete", category: "masonry", conductivityWmK: 1.70, conductivityRangeWmK: [1.4, 2.2], densityKgM3: 2300, note: "Representative planning value; density and moisture materially affect conductivity." },
];

export const findEnvelopeMaterial = (id: string) => ENVELOPE_MATERIALS.find((material) => material.id === id);
