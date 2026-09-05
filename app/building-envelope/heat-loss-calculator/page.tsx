import type { Metadata } from "next";
import BuildingEnvelopeToolPage from "@/components/building-envelope/BuildingEnvelopeToolPage";

export const metadata: Metadata = {
  title: "Heat Loss Calculator | Building kW, BTU/h & W/K",
  description: "Free building heat loss calculator for walls, windows, roofs and floors plus ventilation/infiltration. Results in kW, BTU/h, W/K and optional annual degree-day energy.",
  alternates: { canonical: "/building-envelope/heat-loss-calculator" },
};

export default function Page() {
  return <BuildingEnvelopeToolPage
    title="Building Heat Loss Calculator"
    eyebrow="Fabric + Ventilation"
    intro="Estimate steady-state design heat loss from building-element U-values and areas plus ventilation/infiltration. Add local heating/cooling degree days only when you also want a simplified annual envelope-energy estimate."
    canonicalPath="/building-envelope/heat-loss-calculator"
    initialMode="heat-loss"
    scenario="heat-loss"
    sections={[
      { title: "Fabric heat loss", body: <p>Each external building element contributes U × area to the transmission heat-loss coefficient. Multiplying the total coefficient by the indoor-to-outdoor design temperature difference gives the steady-state fabric heat loss.</p> },
      { title: "Ventilation and infiltration", body: <p>The engine estimates sensible ventilation/infiltration heat transfer from air changes per hour, conditioned volume and the selected heat-recovery efficiency. Air leakage can dominate poorly sealed buildings, so measured or design ACH data is preferable to an arbitrary default.</p> },
      { title: "Annual degree-day estimates are intentionally separate", body: <p>Heating and cooling degree days can approximate annual envelope loads from the heat-loss coefficient, but they do not reproduce dynamic hourly simulation. Solar gains, internal gains, humidity, thermal mass and controls are outside this simplified annual method.</p> },
    ]}
    faqs={[
      { question: "What is W/K in a heat-loss calculation?", answer: "W/K is the building or room heat-loss coefficient: the number of watts of heat transfer for each kelvin (or Celsius-degree) of indoor-outdoor temperature difference." },
      { question: "How is ventilation heat loss calculated?", answer: "The planning method uses the volumetric heat capacity of air multiplied by air changes per hour, volume and temperature difference, adjusted for entered heat-recovery efficiency." },
      { question: "Can I use this to size a heat pump?", answer: "It can support early planning, but final heat-pump sizing may require a local standard, room-by-room design temperatures, emitter performance, ventilation details and other project-specific checks." },
      { question: "Why are annual energy results optional?", answer: "A design-day peak heat loss and an annual energy estimate are different questions. The annual estimate needs degree-day and system-performance inputs, so the tool does not invent them." },
    ]}
  />;
}
