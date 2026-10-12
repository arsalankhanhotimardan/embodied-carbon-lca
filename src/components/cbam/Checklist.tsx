"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "cbam-checklist-v1";

export type ChecklistItem = { id: string; title: string; detail: string };

export default function Checklist({ items }: { items: ChecklistItem[] }) {
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setDone(JSON.parse(saved));
    } catch {
      // Storage can be unavailable (private mode); the checklist still works in memory.
    }
  }, []);

  const toggle = (id: string) => {
    setDone((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const count = items.filter((i) => done[i.id]).length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-600" aria-live="polite">{count} of {items.length} complete</p>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-50 print:hidden"
        >
          Print checklist
        </button>
      </div>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={Boolean(done[item.id])}
                onChange={() => toggle(item.id)}
                className="mt-1 h-5 w-5 shrink-0 accent-emerald-600"
              />
              <span>
                <span className={`block font-black ${done[item.id] ? "text-slate-400 line-through" : "text-slate-900"}`}>{item.title}</span>
                <span className="mt-1 block text-sm leading-6 text-slate-600">{item.detail}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-slate-500 print:hidden">Progress is saved in this browser only.</p>
    </div>
  );
}
