export const REGIONAL_GUIDANCE_DATASET_VERSION = "2026.09.1";
export const REGIONAL_GUIDANCE_REVIEWED = "2026-09-05";

export const ENERGY_STAR_SOURCE = "https://www.energystar.gov/saveathome/seal_insulate/identify-problems-you-want-fix/diy-checks-inspections/insulation-r-values";

export type UsEnergyStarRetrofitZone = {
  id: string;
  label: string;
  atticBareRUs: number;
  atticExisting34InRUs: number;
  floorRUs: number;
};

/**
 * ENERGY STAR retrofit guidance for existing wood-framed homes, reviewed
 * 2026-09-05. This is optional U.S. guidance, not a worldwide code table.
 */
export const US_ENERGY_STAR_RETROFIT_ZONES: UsEnergyStarRetrofitZone[] = [
  { id: "1", label: "Zone 1", atticBareRUs: 30, atticExisting34InRUs: 25, floorRUs: 13 },
  { id: "2", label: "Zone 2", atticBareRUs: 49, atticExisting34InRUs: 38, floorRUs: 13 },
  { id: "3", label: "Zone 3", atticBareRUs: 49, atticExisting34InRUs: 38, floorRUs: 19 },
  { id: "4ab", label: "Zones 4A / 4B", atticBareRUs: 60, atticExisting34InRUs: 49, floorRUs: 19 },
  { id: "4c56", label: "Zones 4C / 5 / 6", atticBareRUs: 60, atticExisting34InRUs: 49, floorRUs: 30 },
  { id: "78", label: "Zones 7 / 8", atticBareRUs: 60, atticExisting34InRUs: 49, floorRUs: 38 },
];
