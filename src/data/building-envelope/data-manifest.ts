import { ENVELOPE_ENGINE_VERSION } from "@/lib/building-envelope/envelope-engine";
import { ENVELOPE_MATERIAL_DATASET_REVIEWED, ENVELOPE_MATERIAL_DATASET_VERSION } from "./materials.v1";
import { REGIONAL_GUIDANCE_DATASET_VERSION, REGIONAL_GUIDANCE_REVIEWED } from "./regional-guidance.v1";

export const BUILDING_ENVELOPE_DATA_MANIFEST = {
  engineVersion: ENVELOPE_ENGINE_VERSION,
  materialDataset: {
    version: ENVELOPE_MATERIAL_DATASET_VERSION,
    reviewed: ENVELOPE_MATERIAL_DATASET_REVIEWED,
    activation: "version-controlled",
  },
  regionalGuidanceDataset: {
    version: REGIONAL_GUIDANCE_DATASET_VERSION,
    reviewed: REGIONAL_GUIDANCE_REVIEWED,
    activation: "version-controlled",
  },
  methodology: {
    iso6946: "ISO 6946:2017",
    iso13789: "ISO 13789:2017",
    iso52016: "ISO 52016-1:2017 (scope reference; this V1 is not a full hourly ISO 52016 simulation)",
  },
  sourceMonitoring: "automatic-health-check / manual-approval-before-calculation-change",
} as const;
