import QuickElectricalPage, { quickElectricalMetadata } from "@/components/electrical/quick/QuickElectricalPage";

const SLUG = "kw-to-hp-calculator";

export const metadata = quickElectricalMetadata(SLUG);

export default function Page() {
  return <QuickElectricalPage slug={SLUG} />;
}
