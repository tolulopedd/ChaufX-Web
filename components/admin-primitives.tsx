"use client";

import { ReactNode } from "react";

export const adminInputClass =
  "w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[#4F46E5]";

export const adminPrimaryButtonClass =
  "rounded-2xl bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_16px_32px_-18px_rgba(37,99,235,0.55)] transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60";

export const adminSecondaryButtonClass =
  "rounded-2xl border border-[#DCDDFF] bg-[#EEF0FF] px-4 py-2.5 text-sm font-semibold text-[#4338CA] transition hover:bg-[#E4E7FF] disabled:cursor-not-allowed disabled:opacity-60";

export const adminGhostButtonClass =
  "rounded-2xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#D1D5DB] hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60";

export const adminTableHeadClass =
  "text-left text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400";

export const adminTableCellClass = "px-3 py-2.5 align-top text-sm text-slate-700";

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
      className={`rounded-[26px] border p-5 shadow-[0_20px_48px_-40px_rgba(15,23,42,0.24)] ${
        dark
          ? "border-[#1f2954] bg-[linear-gradient(155deg,#0F172A,#1a2147_56%,#4338CA)] text-white"
          : "border-[#E5E7EB] bg-white text-[#0F172A]"
      }`}
    >
      <div className={`text-[0.68rem] font-semibold uppercase tracking-[0.22em] ${dark ? "text-white/58" : "text-[#4338CA]"}`}>{title}</div>
      <div className={`mt-2.5 text-[2rem] font-semibold tracking-[-0.06em] ${dark ? "text-white" : "text-slate-950"}`}>{value}</div>
      {detail ? <p className={`mt-2.5 text-sm leading-6 ${dark ? "text-white/78" : "text-slate-600"}`}>{detail}</p> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-[#D7DEEE] bg-[#F8FAFC] px-5 py-5">
      <div className="text-base font-semibold tracking-[-0.03em] text-slate-950">{title}</div>
      <p className="mt-1.5 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}
