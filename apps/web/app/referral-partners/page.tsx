"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminShell, Panel } from "../../components/admin-shell";
import {
  EmptyState,
  StatCard,
  StatusPill,
  adminGhostButtonClass,
  adminInputClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass
} from "../../components/admin-primitives";
import {
  adminFetch,
  createReferralPartner,
  updateReferralPartner,
  useAdminResource
} from "../../lib/api";

type Partner = {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone?: string | null;
  code: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  links: { customer: string; driver: string };
  performance: {
    customersRegistered: number;
    driversRegistered: number;
    driversApproved: number;
    customerFirstTrips: number;
    driverFirstTrips: number;
  };
};

type Referral = {
  id: string;
  userId: string;
  userType: "CUSTOMER" | "DRIVER";
  registeredAt: string;
  status: string;
  firstCompletedTripAt?: string | null;
  user: { fullName: string; email: string; phone?: string | null };
};

type PartnerResponse = {
  summary: {
    totalPartners: number;
    activePartners: number;
    customersRegistered: number;
    driversRegistered: number;
    approvedDrivers: number;
  };
  partners: Partner[];
};

type PartnerForm = {
  name: string;
  contactName: string;
  email: string;
  phone: string;
  code: string;
  status: "ACTIVE" | "INACTIVE";
};

const emptyResponse: PartnerResponse = {
  summary: { totalPartners: 0, activePartners: 0, customersRegistered: 0, driversRegistered: 0, approvedDrivers: 0 },
  partners: []
};

const emptyForm: PartnerForm = { name: "", contactName: "", email: "", phone: "", code: "", status: "ACTIVE" };

function partnerForm(partner?: Partner | null): PartnerForm {
  if (!partner) return emptyForm;
  return {
    name: partner.name,
    contactName: partner.contactName,
    email: partner.email,
    phone: partner.phone ?? "",
    code: partner.code,
    status: partner.status
  };
}

export default function ReferralPartnersPage() {
  const { data, loading, error, reload } = useAdminResource<PartnerResponse>("/admin/referral-partners", emptyResponse);
  const [selectedId, setSelectedId] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<PartnerForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [referralsLoading, setReferralsLoading] = useState(false);
  const [filters, setFilters] = useState({ userType: "", status: "", from: "", to: "" });

  const selected = useMemo(() => data.partners.find((partner) => partner.id === selectedId) ?? null, [data.partners, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setReferrals([]);
      return;
    }
    const query = new URLSearchParams();
    if (filters.userType) query.set("userType", filters.userType);
    if (filters.status) query.set("status", filters.status);
    if (filters.from) query.set("from", new Date(`${filters.from}T00:00:00`).toISOString());
    if (filters.to) query.set("to", new Date(`${filters.to}T23:59:59.999`).toISOString());
    setReferralsLoading(true);
    adminFetch<{ referrals: Referral[] }>(`/admin/referral-partners/${selectedId}/referrals?${query}`)
      .then((result) => setReferrals(result.referrals))
      .catch((reason: Error) => setMessage(reason.message))
      .finally(() => setReferralsLoading(false));
  }, [selectedId, filters]);

  function openCreate() {
    setSelectedId("");
    setForm(emptyForm);
    setFormOpen(true);
    setMessage("");
  }

  function openEdit(partner: Partner) {
    setSelectedId(partner.id);
    setForm(partnerForm(partner));
    setFormOpen(true);
    setMessage("");
  }

  async function savePartner() {
    setSaving(true);
    setMessage("");
    try {
      const payload = {
        name: form.name.trim(),
        contactName: form.contactName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        code: form.code.trim() || undefined,
        status: form.status
      };
      if (selected) await updateReferralPartner(selected.id, payload);
      else await createReferralPartner(payload);
      await reload();
      setFormOpen(false);
      setMessage(selected ? "Partner updated." : "Partner created.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Unable to save partner.");
    } finally {
      setSaving(false);
    }
  }

  async function setPartnerStatus(partner: Partner) {
    setMessage("");
    try {
      await updateReferralPartner(partner.id, { status: partner.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" });
      await reload();
      setMessage(partner.status === "ACTIVE" ? "Partner deactivated." : "Partner activated.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Unable to update partner.");
    }
  }

  async function copyLink(link: string) {
    await navigator.clipboard.writeText(link);
    setMessage("Referral link copied.");
  }

  return (
    <AdminShell title="Referral Partners" description="Manage reusable referral links and attributed registrations.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Partners" value={data.summary.totalPartners} detail={`${data.summary.activePartners} active`} />
        <StatCard title="Customers" value={data.summary.customersRegistered} detail="Registered by referral" />
        <StatCard title="Drivers" value={data.summary.driversRegistered} detail="Registered by referral" />
        <StatCard title="Approved drivers" value={data.summary.approvedDrivers} detail="Existing approval workflow" />
        <StatCard title="Active partners" value={data.summary.activePartners} detail="Links accepting signups" tone="dark" />
      </div>

      {message ? <div className="rounded-xl border border-[#DCDDFF] bg-[#EEF0FF] px-4 py-3 text-sm text-[#4338CA]">{message}</div> : null}
      {error ? <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      {formOpen ? (
        <Panel title={selected ? "Edit partner" : "Create partner"} subtitle="A unique code is generated when Partner Code is left blank." aside={
          <div className="flex gap-2">
            <button className={adminGhostButtonClass} type="button" onClick={() => setFormOpen(false)}>Cancel</button>
            <button className={adminPrimaryButtonClass} type="button" disabled={saving} onClick={savePartner}>{saving ? "Saving..." : "Save"}</button>
          </div>
        }>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[
              ["Partner name", "name"], ["Contact name", "contactName"], ["Email", "email"], ["Phone", "phone"], ["Partner code", "code"]
            ].map(([label, key]) => (
              <label className="space-y-1.5" key={key}>
                <span className="text-sm font-medium text-slate-700">{label}</span>
                <input className={adminInputClass} value={form[key as keyof PartnerForm]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} placeholder={key === "code" ? "Generated automatically" : undefined} />
              </label>
            ))}
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Status</span>
              <select className={adminInputClass} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as PartnerForm["status"] }))}>
                <option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option>
              </select>
            </label>
          </div>
        </Panel>
      ) : null}

      <Panel title="Partners" aside={
        <button
          type="button"
          className={adminPrimaryButtonClass}
          disabled={formOpen}
          onClick={openCreate}
          title={formOpen ? "Finish or cancel the open form first" : undefined}
        >
          Create partner
        </button>
      }>
        {loading ? <p className="text-sm text-slate-500">Loading partners...</p> : data.partners.length === 0 ? (
          <EmptyState title="No referral partners" description="Create a partner to generate customer and driver referral links." />
        ) : (
          <div className="grid gap-3">
            {data.partners.map((partner) => (
              <div key={partner.id} className={`rounded-[16px] border p-4 ${selectedId === partner.id ? "border-[#A5B4FC] bg-[#F8F9FF]" : "border-[#E5E7EB]"}`}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <button type="button" className="text-left" onClick={() => { setSelectedId(partner.id); setFormOpen(false); }}>
                    <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-950">{partner.name}</h3><StatusPill label={partner.status} tone={partner.status === "ACTIVE" ? "emerald" : "neutral"} /><StatusPill label={partner.code} tone="violet" /></div>
                    <p className="mt-1 text-sm text-slate-500">{partner.contactName} · {partner.email}{partner.phone ? ` · ${partner.phone}` : ""}</p>
                  </button>
                  <div className="flex flex-wrap gap-2">
                    <button className={adminGhostButtonClass} type="button" onClick={() => openEdit(partner)}>Edit</button>
                    <button className={adminSecondaryButtonClass} type="button" onClick={() => setPartnerStatus(partner)}>{partner.status === "ACTIVE" ? "Deactivate" : "Activate"}</button>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3 lg:grid-cols-5">
                  <span>{partner.performance.customersRegistered} customers</span><span>{partner.performance.driversRegistered} drivers</span><span>{partner.performance.driversApproved} approved</span><span>{partner.performance.customerFirstTrips} customer first trips</span><span>{partner.performance.driverFirstTrips} driver first trips</span>
                </div>
                <div className="mt-3 grid gap-2 lg:grid-cols-2">
                  {(["customer", "driver"] as const).map((kind) => (
                    <div key={kind} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                      <span className="min-w-0 flex-1 truncate text-xs text-slate-600">{partner.links[kind]}</span>
                      <button type="button" className="text-xs font-semibold text-[#4338CA]" onClick={() => copyLink(partner.links[kind])}>Copy {kind}</button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {selected ? (
        <Panel title={`${selected.name} referrals`} subtitle="Customer account status and driver approval status use the existing workflows.">
          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <select className={adminInputClass} value={filters.userType} onChange={(event) => setFilters((current) => ({ ...current, userType: event.target.value, status: "" }))}><option value="">All user types</option><option value="CUSTOMER">Customers</option><option value="DRIVER">Drivers</option></select>
            <select className={adminInputClass} value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}><option value="">All statuses</option>{filters.userType === "DRIVER" ? <><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option></> : <><option value="ACTIVE">Active</option><option value="PENDING_APPROVAL">Pending approval</option><option value="DISABLED">Disabled</option></>}</select>
            <input type="date" className={adminInputClass} value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} aria-label="Registered from" />
            <input type="date" className={adminInputClass} value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} aria-label="Registered to" />
          </div>
          {referralsLoading ? <p className="text-sm text-slate-500">Loading referrals...</p> : referrals.length === 0 ? <EmptyState title="No matching referrals" /> : (
            <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase tracking-wider text-slate-500"><th className="px-2 py-2">User</th><th className="px-2 py-2">Type</th><th className="px-2 py-2">Registered</th><th className="px-2 py-2">Status</th><th className="px-2 py-2">First completed trip</th></tr></thead><tbody>{referrals.map((referral) => <tr className="border-b border-slate-100" key={referral.id}><td className="px-2 py-3"><div className="font-medium text-slate-900">{referral.user.fullName}</div><div className="text-xs text-slate-500">{referral.user.email}</div></td><td className="px-2 py-3">{referral.userType}</td><td className="px-2 py-3">{new Date(referral.registeredAt).toLocaleDateString()}</td><td className="px-2 py-3"><StatusPill label={referral.status} tone={referral.status === "APPROVED" || referral.status === "ACTIVE" ? "emerald" : referral.status === "REJECTED" || referral.status === "DISABLED" ? "rose" : "amber"} /></td><td className="px-2 py-3">{referral.firstCompletedTripAt ? new Date(referral.firstCompletedTripAt).toLocaleDateString() : "—"}</td></tr>)}</tbody></table></div>
          )}
        </Panel>
      ) : null}
    </AdminShell>
  );
}
