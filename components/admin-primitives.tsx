"use client";

import { ReactNode } from "react";

export const adminInputClass =
  "w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-[#4F46E5] focus:ring-2 focus:ring-[#EEF0FF]";

export const adminPrimaryButtonClass =
  "rounded-xl bg-[#2563EB] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60";

export const adminSecondaryButtonClass =
  "rounded-xl border border-[#DCDDFF] bg-[#EEF0FF] px-3.5 py-2 text-sm font-semibold text-[#4338CA] transition hover:bg-[#E4E7FF] disabled:cursor-not-allowed disabled:opacity-60";

export const adminGhostButtonClass =
  "rounded-xl border border-[#E5E7EB] bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#D1D5DB] hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60";

export const adminTableHeadClass =
  "text-left text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500";

export const adminTableCellClass = "px-2.5 py-1.5 align-top text-sm text-slate-700";

const toneStyles = {
  neutral: "bg-slate-100 text-slate-700 border-slate-200",
  violet: "bg-[#EEF0FF] text-[#4338CA] border-[#DCDDFF]",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
  amber: "bg-amber-50 text-amber-700 border-amber-100",
  rose: "bg-rose-50 text-rose-700 border-rose-100",
  navy: "bg-[#0F172A] text-white border-[#0F172A]"
} as const;

type Tone = keyof typeof toneStyles;

function formatStatusLabel(label: string) {
  if (/^[A-Z_]+$/.test(label)) {
    return label
      .toLowerCase()
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  return label;
}

export function StatusPill({
  label,
  tone = "neutral"
}: {
  label: string;
  tone?: Tone;
}) {
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] ${toneStyles[tone]}`}>
      {formatStatusLabel(label)}
    </span>
  );
}

export function StatCard({
  title,
  value,
  detail,
  tone = "light"
}: {
  title: string;
  value: ReactNode;
  detail?: string;
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";

  return (
    <div
      className={`rounded-[18px] border p-4 ${
        dark
          ? "border-[#1f2954] bg-[linear-gradient(155deg,#0F172A,#1a2147_56%,#4338CA)] text-white"
          : "border-[#E5E7EB] bg-white text-[#0F172A]"
      }`}
    >
      <div className={`text-[0.68rem] font-semibold uppercase tracking-[0.2em] ${dark ? "text-white/58" : "text-slate-500"}`}>{title}</div>
      <div className={`mt-2 text-[1.7rem] font-semibold tracking-[-0.06em] ${dark ? "text-white" : "text-slate-950"}`}>{value}</div>
      {detail ? <p className={`mt-1.5 text-sm leading-5 ${dark ? "text-white/78" : "text-slate-600"}`}>{detail}</p> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-[18px] border border-dashed border-[#D7DEEE] bg-[#FBFCFE] px-4 py-4">
      <div className="text-base font-semibold tracking-[-0.03em] text-slate-950">{title}</div>
      {description ? <p className="mt-1.5 text-sm leading-6 text-slate-600">{description}</p> : null}
    </div>
  );
}
