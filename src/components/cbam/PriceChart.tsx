import type { PublicCbamPrice } from "@/lib/cbam-public-prices";

/** Server-rendered SVG bar chart: no client JavaScript, readable by crawlers via the table beside it. */
export default function PriceChart({ prices }: { prices: PublicCbamPrice[] }) {
  const data = prices.slice(-16);
  const width = 640;
  const height = 240;
  const pad = { top: 28, right: 12, bottom: 44, left: 44 };
  const max = Math.ceil(Math.max(...data.map((p) => p.price)) / 10) * 10 || 10;
  const min = 0;
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const slot = innerW / data.length;
  const barW = Math.min(56, slot * 0.6);
  const y = (v: number) => pad.top + innerH - ((v - min) / (max - min)) * innerH;
  const ticks = [0, max / 2, max];

  return (
    <figure>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Bar chart of official CBAM certificate prices in euros per tonne of CO2" className="w-full">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke="#e2e8f0" />
            <text x={pad.left - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#64748b">€{t}</text>
          </g>
        ))}
        {data.map((p, i) => {
          const x = pad.left + slot * i + (slot - barW) / 2;
          return (
            <g key={p.periodKey}>
              <rect x={x} y={y(p.price)} width={barW} height={y(0) - y(p.price)} rx={4} fill="#10b981" />
              <text x={x + barW / 2} y={y(p.price) - 6} textAnchor="middle" fontSize="11" fontWeight="700" fill="#0f172a">{p.price.toFixed(2)}</text>
              <text x={x + barW / 2} y={height - 22} textAnchor="middle" fontSize="11" fill="#475569">{p.periodKey.replace(/^\d{4}-/, "")}</text>
              <text x={x + barW / 2} y={height - 8} textAnchor="middle" fontSize="10" fill="#94a3b8">{p.year}</text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1 text-xs text-slate-500">Official CBAM certificate price, € per tonne CO₂e</figcaption>
    </figure>
  );
}
