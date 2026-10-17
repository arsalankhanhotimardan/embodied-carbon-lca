import QuickElectricalPage, { quickElectricalMetadata } from "@/components/electrical/quick/QuickElectricalPage";

const SLUG = "kva-to-kw-calculator";

export const metadata = quickElectricalMetadata(SLUG);

export default function Page() {
  return <QuickElectricalPage slug={SLUG} />;
}
