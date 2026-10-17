import QuickElectricalPage, { quickElectricalMetadata } from "@/components/electrical/quick/QuickElectricalPage";

const SLUG = "awg-to-mm2-calculator";

export const metadata = quickElectricalMetadata(SLUG);

export default function Page() {
  return <QuickElectricalPage slug={SLUG} />;
}
