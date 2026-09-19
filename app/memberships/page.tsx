"use client";

import { useEffect, useState } from "react";
import { AdminShell, Panel } from "../../components/admin-shell";
import { adminInputClass, adminPrimaryButtonClass, StatCard } from "../../components/admin-primitives";
import { adminFetch, useAdminResource } from "../../lib/api";

type MembershipPlan = {
  tier: "PLUS" | "CONCIERGE";
  label: string;
  hourlyRate: number;
  monthlyFee: number;
  annualFee: number;
};

type MembershipConfig = {
  plans: MembershipPlan[];
};

const fallbackConfig: MembershipConfig = {
  plans: [
    { tier: "PLUS", label: "Plus", hourlyRate: 29, monthlyFee: 100, annualFee: 999 },
    { tier: "CONCIERGE", label: "Concierge", hourlyRate: 25, monthlyFee: 200, annualFee: 2199 }
  ]
};

const currency = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });

export default function MembershipsPage() {
  const { data, loading, error } = useAdminResource<MembershipConfig>("/admin/memberships/config", fallbackConfig);
  const [plans, setPlans] = useState<MembershipPlan[]>(fallbackConfig.plans);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (data.plans?.length) {
      setPlans(data.plans);
    }
  }, [data.plans]);

  function updatePlan(tier: MembershipPlan["tier"], field: "hourlyRate" | "monthlyFee" | "annualFee", value: string) {
    const parsedValue = Number(value);
    setPlans((currentPlans) =>
      currentPlans.map((plan) => (plan.tier === tier ? { ...plan, [field]: Number.isFinite(parsedValue) ? parsedValue : 0 } : plan))
    );
  }

  async function saveMembershipPricing() {
    const plus = plans.find((plan) => plan.tier === "PLUS");
    const concierge = plans.find((plan) => plan.tier === "CONCIERGE");
    if (!plus || !concierge) {
      return;
    }

    setSaving(true);
    setNotice("");
    try {
      const saved = await adminFetch<MembershipConfig>("/admin/memberships/config", {
        method: "PUT",
        body: JSON.stringify({
          plus: { hourlyRate: plus.hourlyRate, monthlyFee: plus.monthlyFee, annualFee: plus.annualFee },
          concierge: { hourlyRate: concierge.hourlyRate, monthlyFee: concierge.monthlyFee, annualFee: concierge.annualFee }
        })
      });
      setPlans(saved.plans);
      setNotice("Membership pricing saved.");
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "Unable to save membership pricing.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell title="Memberships">
      <div className="grid gap-4 md:grid-cols-2">
        {plans.map((plan) => (
          <StatCard
            key={plan.tier}
            title={`${plan.label} member rate`}
            value={`${currency.format(plan.hourlyRate)}/hour`}
            detail={`${currency.format(plan.monthlyFee)} monthly or ${currency.format(plan.annualFee)} annual`}
          />
        ))}
      </div>

      {notice || error ? (
        <div className={`rounded-[18px] border px-4 py-3 text-sm font-medium ${notice.includes("saved") ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-amber-100 bg-amber-50 text-amber-700"}`}>
          {notice || error}
        </div>
      ) : null}

      <Panel
        title="Membership pricing"
        aside={
          <button type="button" className={adminPrimaryButtonClass} disabled={saving || loading} onClick={saveMembershipPricing}>
            {saving ? "Saving..." : "Save"}
          </button>
        }
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {plans.map((plan) => (
            <section key={plan.tier} className="rounded-[18px] border border-[#E5E7EB] bg-[#FBFCFE] p-4">
              <h3 className="text-lg font-semibold tracking-[-0.04em] text-slate-950">{plan.label}</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <label className="block text-sm font-medium text-slate-700">
                  Hourly rate
                  <input className={`${adminInputClass} mt-1.5`} type="number" min="0" step="0.01" value={plan.hourlyRate} onChange={(event) => updatePlan(plan.tier, "hourlyRate", event.target.value)} />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Monthly price
                  <input className={`${adminInputClass} mt-1.5`} type="number" min="0" step="0.01" value={plan.monthlyFee} onChange={(event) => updatePlan(plan.tier, "monthlyFee", event.target.value)} />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Annual price
                  <input className={`${adminInputClass} mt-1.5`} type="number" min="0" step="0.01" value={plan.annualFee} onChange={(event) => updatePlan(plan.tier, "annualFee", event.target.value)} />
                </label>
              </div>
            </section>
          ))}
        </div>
      </Panel>
    </AdminShell>
  );
}
