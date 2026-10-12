"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronDown, ExternalLink } from "lucide-react";
import { CATEGORIES } from "./categories";

const TOOL_PREFIXES = ["/cbam", "/electrical", "/building-envelope", "/house-carbon", "/embodied-carbon", "/a1-a3", "/epd-carbon", "/bim-", "/whole-building", "/module-d", "/leed"];
const plain = [
  { href: "/guides", label: "Guides" },
  { href: "/methodology", label: "Methodology" },
  { href: "/about", label: "About" },
];

export default function DesktopNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toolsActive = pathname === "/" || TOOL_PREFIXES.some((p) => pathname.startsWith(p));
  const link = (active: boolean) =>
    `rounded-lg px-3 py-2 text-sm font-bold transition-colors ${active ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`;

  return (
    <div className="hidden items-center gap-1 xl:flex">
      <div ref={wrapRef} className="relative">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="calculators-menu"
          onClick={() => setOpen((v) => !v)}
          className={`inline-flex items-center gap-1.5 ${link(toolsActive)}`}
        >
          Calculators
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
        {open ? (
          <div id="calculators-menu" className="absolute right-0 top-full z-[70] mt-3 w-[680px] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-900/15">
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.filter((c) => c.id !== "guides").map((c) => {
                const Icon = c.icon;
                const body = (
                  <>
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${c.tint}`}>
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 text-sm font-black text-slate-950">
                        {c.name}
                        {c.external ? <ExternalLink className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" /> : null}
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-slate-500">{c.blurb}</span>
                    </span>
                  </>
                );
                const cls = "flex gap-3 rounded-xl p-3 transition-colors hover:bg-slate-50";
                return c.external ? (
                  <a key={c.id} href={c.href} className={cls}>{body}</a>
                ) : (
                  <Link key={c.id} href={c.href} className={cls}>{body}</Link>
                );
              })}
            </div>
            <div className="mt-2 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <span className="text-xs font-bold text-slate-500">40+ free calculators, no signup</span>
              <Link href="/#all-tools" className="inline-flex items-center gap-1 text-xs font-black text-emerald-700 hover:text-emerald-600">
                Browse all <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        ) : null}
      </div>

      {plain.map((item) => (
        <Link key={item.href} href={item.href} className={link(pathname === item.href || pathname.startsWith(`${item.href}/`))}>
          {item.label}
        </Link>
      ))}

      <Link href="/#calculator-workspace" className="ml-3 inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white shadow-md shadow-slate-900/20 transition hover:bg-emerald-600">
        Open LCA tool <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
