import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";

/** Card used in tool lists on hub pages. */
export default function ToolLinkCard({
  href,
  title,
  description,
  icon: Icon,
  tint,
  hoverBorder = "hover:border-emerald-300",
  accentText = "text-emerald-700",
}: {
  href: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  tint: string;
  hoverBorder?: string;
  accentText?: string;
}) {
  return (
    <Link href={href} className={`card-lift group flex h-full gap-4 rounded-2xl border border-slate-200 bg-white p-5 ${hoverBorder}`}>
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tint}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="text-base font-black leading-snug text-slate-950">{title}</span>
          <ArrowUpRight className={`mt-0.5 h-4 w-4 shrink-0 text-slate-300 transition group-hover:${accentText}`} aria-hidden="true" />
        </span>
        {description ? <span className="mt-1.5 block text-sm leading-6 text-slate-600">{description}</span> : null}
      </span>
    </Link>
  );
}
