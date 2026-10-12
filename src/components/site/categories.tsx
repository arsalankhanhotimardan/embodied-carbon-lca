import { BookOpen, Building2, Leaf, Ship, Sun, Zap, type LucideIcon } from "lucide-react";

export type Category = {
  id: "lca" | "cbam" | "building" | "electrical" | "solar" | "guides";
  name: string;
  short: string;
  href: string;
  external?: boolean;
  icon: LucideIcon;
  blurb: string;
  links: { label: string; href: string }[];
  /** Static class strings so Tailwind can see them. */
  tint: string;
  ring: string;
  accentText: string;
  hoverBorder: string;
};

export const CATEGORIES: Category[] = [
  {
    id: "lca",
    name: "Embodied carbon LCA",
    short: "LCA",
    href: "/#calculator-workspace",
    icon: Leaf,
    blurb: "Whole-building life cycle assessment from CSV or BIM quantities with EPD and EC3 data.",
    links: [
      { label: "House carbon footprint", href: "/house-carbon-footprint-calculator" },
      { label: "A1–A3 explained", href: "/a1-a3-embodied-carbon" },
      { label: "EPD guide", href: "/epd-carbon-calculator" },
    ],
    tint: "bg-emerald-50 text-emerald-700",
    ring: "ring-emerald-100",
    accentText: "text-emerald-700",
    hoverBorder: "hover:border-emerald-300",
  },
  {
    id: "cbam",
    name: "EU CBAM",
    short: "CBAM",
    href: "/cbam",
    icon: Ship,
    blurb: "Carbon border levy tools: certificate price, 50-tonne checker, default emissions and deadlines.",
    links: [
      { label: "Certificate price", href: "/cbam/certificate-price" },
      { label: "Do I need CBAM?", href: "/cbam/do-i-need-cbam" },
      { label: "Cost calculator", href: "/cbam-calculator" },
    ],
    tint: "bg-teal-50 text-teal-700",
    ring: "ring-teal-100",
    accentText: "text-teal-700",
    hoverBorder: "hover:border-teal-300",
  },
  {
    id: "building",
    name: "Building envelope",
    short: "Building",
    href: "/building-envelope",
    icon: Building2,
    blurb: "R-value, U-value, insulation and heat-loss calculators with carbon payback.",
    links: [
      { label: "U-value", href: "/building-envelope/u-value-calculator" },
      { label: "R-value", href: "/building-envelope/r-value-calculator" },
      { label: "Heat loss", href: "/building-envelope/heat-loss-calculator" },
    ],
    tint: "bg-orange-50 text-orange-700",
    ring: "ring-orange-100",
    accentText: "text-orange-700",
    hoverBorder: "hover:border-orange-300",
  },
  {
    id: "electrical",
    name: "Electrical tools",
    short: "Electrical",
    href: "/electrical",
    icon: Zap,
    blurb: "Voltage drop, wire size and 15 quick converters for amps, kW, kVA, breakers and more.",
    links: [
      { label: "Voltage drop", href: "/electrical/voltage-drop-calculator" },
      { label: "kW to amps", href: "/electrical/kw-to-amps-calculator" },
      { label: "Breaker size", href: "/electrical/breaker-size-calculator" },
    ],
    tint: "bg-blue-50 text-blue-700",
    ring: "ring-blue-100",
    accentText: "text-blue-700",
    hoverBorder: "hover:border-blue-300",
  },
  {
    id: "solar",
    name: "Solar calculator",
    short: "Solar",
    href: "https://solarcalculator.greenengineeringtools.com",
    external: true,
    icon: Sun,
    blurb: "Turn your electricity bill into panels, inverter and battery size, by city.",
    links: [
      { label: "Units to solar", href: "https://solarcalculator.greenengineeringtools.com/units-to-solar-calculator" },
      { label: "Battery runtime", href: "https://solarcalculator.greenengineeringtools.com/battery-runtime-calculator" },
      { label: "Solar by city", href: "https://solarcalculator.greenengineeringtools.com/solar-calculator" },
    ],
    tint: "bg-amber-50 text-amber-700",
    ring: "ring-amber-100",
    accentText: "text-amber-700",
    hoverBorder: "hover:border-amber-300",
  },
  {
    id: "guides",
    name: "Guides & methodology",
    short: "Guides",
    href: "/guides",
    icon: BookOpen,
    blurb: "Plain-language explanations of the methods behind every calculator.",
    links: [
      { label: "Methodology", href: "/methodology" },
      { label: "Whole-building LCA", href: "/whole-building-lca" },
      { label: "EC3 EPD guide", href: "/ec3-epd-guide" },
    ],
    tint: "bg-slate-100 text-slate-700",
    ring: "ring-slate-200",
    accentText: "text-slate-700",
    hoverBorder: "hover:border-slate-300",
  },
];

export const categoryById = (id: Category["id"]) => CATEGORIES.find((c) => c.id === id)!;
