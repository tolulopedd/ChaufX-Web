"use client";

import { useEffect, useState } from "react";
import { AdminShell, Panel } from "../../components/admin-shell";
import { adminInputClass, adminPrimaryButtonClass, StatCard } from "../../components/admin-primitives";
import { adminFetch, useAdminResource } from "../../lib/api";

type Config = {
  enabled: boolean; discountType: "FIXED_AMOUNT" | "PERCENTAGE"; discountValue: number; maxDiscountAmount: number | null;
  minimumBookingAmount: number; startsAt: string | null; endsAt: string | null; usageLimit: number | null; usageCount: number;
  eligibleMembershipTiers: string[]; combineWithMembershipRates: boolean;
};
const fallback: { config: Config } = { config: { enabled: false, discountType: "FIXED_AMOUNT", discountValue: 0, maxDiscountAmount: null, minimumBookingAmount: 0, startsAt: null, endsAt: null, usageLimit: null, usageCount: 0, eligibleMembershipTiers: [], combineWithMembershipRates: true } };
const tiers = ["BASIC", "PLUS", "CONCIERGE", "CORPORATE"];
const localDate = (value: string | null) => value ? value.slice(0, 16) : "";

export default function FirstRidePromotionPage() {
  const { data, loading, error } = useAdminResource<{ config: Config }>("/admin/promotions/first-ride", fallback);
  const [config, setConfig] = useState<Config>(fallback.config); const [saving, setSaving] = useState(false); const [notice, setNotice] = useState("");
  useEffect(() => setConfig(data.config), [data.config]);
  const update = <K extends keyof Config>(key: K, value: Config[K]) => setConfig((current) => ({ ...current, [key]: value }));
  const toggleTier = (tier: string) => update("eligibleMembershipTiers", config.eligibleMembershipTiers.includes(tier) ? config.eligibleMembershipTiers.filter((item) => item !== tier) : [...config.eligibleMembershipTiers, tier]);
  async function save() {
    setSaving(true); setNotice("");
    try {
      const result = await adminFetch<{ config: Config }>("/admin/promotions/first-ride", { method: "PUT", body: JSON.stringify({ ...config, startsAt: config.startsAt || null, endsAt: config.endsAt || null, maxDiscountAmount: config.maxDiscountAmount || null, usageLimit: config.usageLimit || null }) });
      setConfig(result.config); setNotice("First ride promotion saved.");
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : "Unable to save the promotion."); } finally { setSaving(false); }
  }
  return <AdminShell title="First Ride Promotion" description="Applied after the customer’s membership rate and redeemed only when the trip is completed.">
    <div className="grid gap-4 md:grid-cols-3"><StatCard title="Status" value={config.enabled ? "Active" : "Off"} detail="Backend-calculated" /><StatCard title="Reserved or redeemed" value={String(config.usageCount)} detail={config.usageLimit ? `Limit: ${config.usageLimit}` : "No usage limit"} /><StatCard title="Membership combination" value={config.combineWithMembershipRates ? "Allowed" : "Not allowed"} detail="Existing member rates stay unchanged" /></div>
    {(notice || error) ? <div className="rounded-[18px] border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">{notice || error}</div> : null}
    <Panel title="Promotion settings" aside={<button type="button" className={adminPrimaryButtonClass} disabled={saving || loading} onClick={save}>{saving ? "Saving..." : "Save"}</button>}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="flex items-center gap-3 text-sm font-medium text-slate-700"><input type="checkbox" checked={config.enabled} onChange={(event) => update("enabled", event.target.checked)} /> Enable first ride promotion</label>
        <label className="block text-sm font-medium text-slate-700">Discount type<select className={`${adminInputClass} mt-1.5`} value={config.discountType} onChange={(event) => update("discountType", event.target.value as Config["discountType"])}><option value="FIXED_AMOUNT">Fixed amount ($)</option><option value="PERCENTAGE">Percentage (%)</option></select></label>
        <label className="block text-sm font-medium text-slate-700">Discount value<input className={`${adminInputClass} mt-1.5`} type="number" min="0" step="0.01" value={config.discountValue} onChange={(event) => update("discountValue", Number(event.target.value))} /></label>
        <label className="block text-sm font-medium text-slate-700">Maximum discount cap (optional)<input className={`${adminInputClass} mt-1.5`} type="number" min="0" step="0.01" value={config.maxDiscountAmount ?? ""} onChange={(event) => update("maxDiscountAmount", event.target.value ? Number(event.target.value) : null)} /></label>
        <label className="block text-sm font-medium text-slate-700">Minimum booking amount<input className={`${adminInputClass} mt-1.5`} type="number" min="0" step="0.01" value={config.minimumBookingAmount} onChange={(event) => update("minimumBookingAmount", Number(event.target.value))} /></label>
        <label className="block text-sm font-medium text-slate-700">Usage limit (optional)<input className={`${adminInputClass} mt-1.5`} type="number" min="1" value={config.usageLimit ?? ""} onChange={(event) => update("usageLimit", event.target.value ? Number(event.target.value) : null)} /></label>
        <label className="block text-sm font-medium text-slate-700">Starts<input className={`${adminInputClass} mt-1.5`} type="datetime-local" value={localDate(config.startsAt)} onChange={(event) => update("startsAt", event.target.value ? new Date(event.target.value).toISOString() : null)} /></label>
        <label className="block text-sm font-medium text-slate-700">Ends<input className={`${adminInputClass} mt-1.5`} type="datetime-local" value={localDate(config.endsAt)} onChange={(event) => update("endsAt", event.target.value ? new Date(event.target.value).toISOString() : null)} /></label>
        <label className="flex items-center gap-3 text-sm font-medium text-slate-700"><input type="checkbox" checked={config.combineWithMembershipRates} onChange={(event) => update("combineWithMembershipRates", event.target.checked)} /> Combine with membership rates</label>
      </div>
      <div className="mt-5"><p className="text-sm font-medium text-slate-700">Eligible memberships</p><p className="mt-1 text-xs text-slate-500">Leave all unchecked to include every first-time customer.</p><div className="mt-3 flex flex-wrap gap-3">{tiers.map((tier) => <label key={tier} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"><input type="checkbox" checked={config.eligibleMembershipTiers.includes(tier)} onChange={() => toggleTier(tier)} />{tier}</label>)}</div></div>
    </Panel>
  </AdminShell>;
}
