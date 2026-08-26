"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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
import { updateAdminUser, useAdminResource } from "../../lib/api";

type AdminUserRecord = {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: "CUSTOMER" | "DRIVER" | "ADMIN" | "MARKETING";
  status: "ACTIVE" | "DISABLED" | "PENDING_APPROVAL";
  membershipTier: "BASIC" | "PLUS" | "CONCIERGE" | "CORPORATE";
  membershipStatus: "ACTIVE" | "AWAITING_PAYMENT" | "CANCELLED" | "EXPIRED";
  membershipBillingCycle: "NONE" | "MONTHLY" | "ANNUAL" | "CUSTOM";
  membershipHourlyRate?: number | null;
  customerProfile?: {
    id: string;
    savedAddresses: string[];
    vehicles: Array<{ id: string }>;
    bookings: Array<{ id: string }>;
  } | null;
  driver?: {
    id: string;
    licenseNumber: string;
    yearsOfExperience: number;
    emergencyContact: string;
    serviceAreas: string[];
    availabilitySchedule?: string | null;
    availabilityStatus: boolean;
    approvedAt?: string | null;
    application?: {
      id: string;
      status: string;
    } | null;
    bookings: Array<{ id: string }>;
  } | null;
  updatedAt?: string;
};

type EditableForm = {
  fullName: string;
  email: string;
  phone: string;
  status: AdminUserRecord["status"];
  membershipTier: AdminUserRecord["membershipTier"];
  membershipStatus: AdminUserRecord["membershipStatus"];
  membershipBillingCycle: AdminUserRecord["membershipBillingCycle"];
  membershipHourlyRate: string;
  savedAddresses: string;
  licenseNumber: string;
  yearsOfExperience: string;
  emergencyContact: string;
  serviceAreas: string;
  availabilitySchedule: string;
  availabilityStatus: "true" | "false";
};

const emptyForm: EditableForm = {
  fullName: "",
  email: "",
  phone: "",
  status: "ACTIVE",
  membershipTier: "BASIC",
  membershipStatus: "ACTIVE",
  membershipBillingCycle: "NONE",
  membershipHourlyRate: "",
  savedAddresses: "",
  licenseNumber: "",
  yearsOfExperience: "0",
  emergencyContact: "",
  serviceAreas: "",
  availabilitySchedule: "",
  availabilityStatus: "false"
};

function buildForm(user: AdminUserRecord | null): EditableForm {
  if (!user) {
    return emptyForm;
  }

  return {
    fullName: user.fullName ?? "",
    email: user.email ?? "",
    phone: user.phone ?? "",
    status: user.status,
    membershipTier: user.membershipTier,
    membershipStatus: user.membershipStatus,
    membershipBillingCycle: user.membershipBillingCycle,
    membershipHourlyRate:
      typeof user.membershipHourlyRate === "number" && Number.isFinite(user.membershipHourlyRate)
        ? String(user.membershipHourlyRate)
        : "",
    savedAddresses: user.customerProfile?.savedAddresses?.join("\n") ?? "",
    licenseNumber: user.driver?.licenseNumber ?? "",
    yearsOfExperience: String(user.driver?.yearsOfExperience ?? 0),
    emergencyContact: user.driver?.emergencyContact ?? "",
    serviceAreas: user.driver?.serviceAreas?.join(", ") ?? "",
    availabilitySchedule: user.driver?.availabilitySchedule ?? "",
    availabilityStatus: user.driver?.availabilityStatus ? "true" : "false"
  };
}

function UsersPageContent() {
  const searchParams = useSearchParams();
  const requestedUserId = searchParams.get("userId") ?? "";
  const { data, error, loading, reload } = useAdminResource<AdminUserRecord[]>("/admin/users", []);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "CUSTOMER" | "DRIVER" | "ADMIN" | "MARKETING">("ALL");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [form, setForm] = useState<EditableForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return data.filter((user) => {
      if (roleFilter !== "ALL" && user.role !== roleFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [user.fullName, user.email, user.phone ?? "", user.driver?.serviceAreas?.join(" ") ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [data, query, roleFilter]);

  const selectedUser = useMemo(
    () => filteredUsers.find((user) => user.id === selectedUserId) ?? data.find((user) => user.id === selectedUserId) ?? filteredUsers[0] ?? null,
    [data, filteredUsers, selectedUserId]
  );

  useEffect(() => {
    if (!requestedUserId) {
      return;
    }

    const requestedUser = data.find((user) => user.id === requestedUserId);
    if (requestedUser) {
      setSelectedUserId(requestedUser.id);
      setRoleFilter("ALL");
      setQuery("");
    }
  }, [data, requestedUserId]);

  useEffect(() => {
    if (!selectedUserId && filteredUsers[0]?.id) {
      setSelectedUserId(filteredUsers[0].id);
      return;
    }

    if (selectedUserId && !filteredUsers.some((user) => user.id === selectedUserId) && filteredUsers[0]?.id) {
      setSelectedUserId(filteredUsers[0].id);
    }
  }, [filteredUsers, selectedUserId]);

  useEffect(() => {
    setForm(buildForm(selectedUser));
    setStatusMessage("");
  }, [selectedUser]);

  const customerCount = data.filter((user) => user.role === "CUSTOMER").length;
  const driverCount = data.filter((user) => user.role === "DRIVER").length;
  const disabledCount = data.filter((user) => user.status === "DISABLED").length;

  async function handleSave() {
    if (!selectedUser) {
      return;
    }

    setSaving(true);
    setStatusMessage("");

    try {
      await updateAdminUser(selectedUser.id, {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        status: form.status,
        membershipTier: selectedUser.customerProfile ? form.membershipTier : undefined,
        membershipStatus: selectedUser.customerProfile ? form.membershipStatus : undefined,
        membershipBillingCycle: selectedUser.customerProfile ? form.membershipBillingCycle : undefined,
        membershipHourlyRate:
          selectedUser.customerProfile && form.membershipHourlyRate.trim()
            ? Number(form.membershipHourlyRate)
            : selectedUser.customerProfile
              ? null
              : undefined,
        savedAddresses: selectedUser.customerProfile
          ? form.savedAddresses
              .split("\n")
              .map((value) => value.trim())
              .filter(Boolean)
          : undefined,
        driver: selectedUser.driver
          ? {
              licenseNumber: form.licenseNumber.trim(),
              yearsOfExperience: Number(form.yearsOfExperience) || 0,
              emergencyContact: form.emergencyContact.trim(),
              serviceAreas: form.serviceAreas
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean),
              availabilitySchedule: form.availabilitySchedule.trim() || null,
              availabilityStatus: form.availabilityStatus === "true"
            }
          : undefined
      });

      await reload();
      setStatusMessage("User details updated.");
    } catch (saveError) {
      setStatusMessage(saveError instanceof Error ? saveError.message : "Unable to update this user.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell title="Users" description="Manage customer and driver accounts, inspect profile details, and correct onboarding data from one place.">
      <div className="grid gap-4 lg:grid-cols-4">
        <StatCard title="All accounts" value={data.length} detail="Customer, driver, admin, and marketing users." />
        <StatCard title="Customers" value={customerCount} detail="Users with customer access." />
        <StatCard title="Drivers" value={driverCount} detail="Users with driver access." />
        <StatCard title="Disabled" value={disabledCount} detail="Accounts that cannot sign in." />
      </div>

      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <Panel
          title="User directory"
          subtitle="Search by name, email, phone, or driver service area."
          aside={
            <div className="flex flex-wrap items-center gap-2">
              <select className={adminInputClass} value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as typeof roleFilter)}>
                <option value="ALL">All roles</option>
                <option value="CUSTOMER">Customers</option>
                <option value="DRIVER">Drivers</option>
                <option value="ADMIN">Admins</option>
                <option value="MARKETING">Marketing</option>
              </select>
            </div>
          }
        >
          <div className="space-y-3">
            <input
              className={adminInputClass}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search users"
            />
            {loading ? <p className="text-sm text-slate-500">Loading users...</p> : null}
            {error ? <p className="text-sm text-amber-600">{error}</p> : null}
            {filteredUsers.length ? (
              <div className="space-y-2.5">
                {filteredUsers.map((user) => {
                  const active = selectedUser?.id === user.id;
                  const hasDriverProfile = Boolean(user.driver);
                  const hasCustomerProfile = Boolean(user.customerProfile);

                  return (
                    <button
                      key={user.id}
                      type="button"
                      className={`w-full rounded-[18px] border p-3 text-left transition ${
                        active ? "border-[#C7D2FE] bg-[#EEF2FF]" : "border-[#E5E7EB] bg-[#F8FAFC] hover:bg-white"
                      }`}
                      onClick={() => setSelectedUserId(user.id)}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-950">{user.fullName}</div>
                          <div className="mt-1 text-sm text-slate-500">{user.email}</div>
                        </div>
                        <StatusPill
                          label={user.status}
                          tone={user.status === "ACTIVE" ? "emerald" : user.status === "DISABLED" ? "rose" : "amber"}
                        />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <StatusPill label={user.role} tone={hasDriverProfile ? "violet" : hasCustomerProfile ? "navy" : "neutral"} />
                        {hasDriverProfile ? <StatusPill label={user.driver?.approvedAt ? "Approved driver" : "Driver pending"} tone="violet" /> : null}
                        {hasCustomerProfile ? <StatusPill label={user.membershipTier} tone="neutral" /> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <EmptyState title="No users found" description="Try a different search term or role filter." />
            )}
          </div>
        </Panel>

        <Panel
          title={selectedUser ? `${selectedUser.fullName}` : "User details"}
          subtitle={selectedUser ? "Update account details and profile-specific settings." : "Select a user to manage their account."}
          aside={
            selectedUser ? (
              <div className="flex items-center gap-2">
                <button type="button" className={adminGhostButtonClass} onClick={() => setForm(buildForm(selectedUser))} disabled={saving}>
                  Reset
                </button>
                <button type="button" className={adminPrimaryButtonClass} onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            ) : null
          }
        >
          {!selectedUser ? (
            <EmptyState title="No user selected" description="Pick an account from the directory to review and edit it." />
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill label={selectedUser.role} tone="violet" />
                <StatusPill
                  label={selectedUser.status}
                  tone={selectedUser.status === "ACTIVE" ? "emerald" : selectedUser.status === "DISABLED" ? "rose" : "amber"}
                />
                {selectedUser.driver?.application?.status ? (
                  <StatusPill label={selectedUser.driver.application.status} tone="neutral" />
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-slate-700">Full name</span>
                  <input className={adminInputClass} value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} />
                </label>
                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-slate-700">Email</span>
                  <input className={adminInputClass} value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
                </label>
                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-slate-700">Phone</span>
                  <input className={adminInputClass} value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
                </label>
                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-slate-700">Account status</span>
                  <select className={adminInputClass} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as EditableForm["status"] }))}>
                    <option value="ACTIVE">Active</option>
                    <option value="PENDING_APPROVAL">Pending approval</option>
                    <option value="DISABLED">Disabled</option>
                  </select>
                </label>
              </div>

              {selectedUser.customerProfile ? (
                <div className="rounded-[18px] border border-[#E5E7EB] bg-[#F8FAFC] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold tracking-[-0.03em] text-slate-950">Customer profile</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {selectedUser.customerProfile.vehicles.length} vehicle(s) · {selectedUser.customerProfile.bookings.length} recent booking(s)
                      </p>
                    </div>
                    <button type="button" className={adminSecondaryButtonClass}>
                      Customer account
                    </button>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="space-y-1.5">
                      <span className="text-sm font-medium text-slate-700">Membership tier</span>
                      <select className={adminInputClass} value={form.membershipTier} onChange={(event) => setForm((current) => ({ ...current, membershipTier: event.target.value as EditableForm["membershipTier"] }))}>
                        <option value="BASIC">Basic</option>
                        <option value="PLUS">Plus</option>
                        <option value="CONCIERGE">Concierge</option>
                        <option value="CORPORATE">Corporate</option>
                      </select>
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-sm font-medium text-slate-700">Membership status</span>
                      <select className={adminInputClass} value={form.membershipStatus} onChange={(event) => setForm((current) => ({ ...current, membershipStatus: event.target.value as EditableForm["membershipStatus"] }))}>
                        <option value="ACTIVE">Active</option>
                        <option value="AWAITING_PAYMENT">Awaiting payment</option>
                        <option value="CANCELLED">Cancelled</option>
                        <option value="EXPIRED">Expired</option>
                      </select>
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-sm font-medium text-slate-700">Billing cycle</span>
                      <select className={adminInputClass} value={form.membershipBillingCycle} onChange={(event) => setForm((current) => ({ ...current, membershipBillingCycle: event.target.value as EditableForm["membershipBillingCycle"] }))}>
                        <option value="NONE">None</option>
                        <option value="MONTHLY">Monthly</option>
                        <option value="ANNUAL">Annual</option>
                        <option value="CUSTOM">Custom</option>
                      </select>
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-sm font-medium text-slate-700">Hourly rate override</span>
                      <input
                        className={adminInputClass}
                        inputMode="decimal"
                        value={form.membershipHourlyRate}
                        onChange={(event) => setForm((current) => ({ ...current, membershipHourlyRate: event.target.value }))}
                        placeholder="Leave blank for none"
                      />
                    </label>
                    <label className="space-y-1.5 md:col-span-2">
                      <span className="text-sm font-medium text-slate-700">Saved addresses</span>
                      <textarea
                        className={`${adminInputClass} min-h-[128px]`}
                        value={form.savedAddresses}
                        onChange={(event) => setForm((current) => ({ ...current, savedAddresses: event.target.value }))}
                        placeholder="One address per line"
                      />
                    </label>
                  </div>
                </div>
              ) : null}

              {selectedUser.driver ? (
                <div className="rounded-[18px] border border-[#E5E7EB] bg-[#F8FAFC] p-4">
                  <div>
                    <h3 className="text-base font-semibold tracking-[-0.03em] text-slate-950">Driver profile</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {selectedUser.driver.bookings.length} active assignment(s) · {selectedUser.driver.approvedAt ? "Approved for login" : "Approval not completed"}
                    </p>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="space-y-1.5">
                      <span className="text-sm font-medium text-slate-700">License number</span>
                      <input className={adminInputClass} value={form.licenseNumber} onChange={(event) => setForm((current) => ({ ...current, licenseNumber: event.target.value }))} />
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-sm font-medium text-slate-700">Years of experience</span>
                      <input
                        className={adminInputClass}
                        inputMode="numeric"
                        value={form.yearsOfExperience}
                        onChange={(event) => setForm((current) => ({ ...current, yearsOfExperience: event.target.value }))}
                      />
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-sm font-medium text-slate-700">Emergency contact</span>
                      <input className={adminInputClass} value={form.emergencyContact} onChange={(event) => setForm((current) => ({ ...current, emergencyContact: event.target.value }))} />
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-sm font-medium text-slate-700">Availability status</span>
                      <select className={adminInputClass} value={form.availabilityStatus} onChange={(event) => setForm((current) => ({ ...current, availabilityStatus: event.target.value as "true" | "false" }))}>
                        <option value="true">Available</option>
                        <option value="false">Offline</option>
                      </select>
                    </label>
                    <label className="space-y-1.5 md:col-span-2">
                      <span className="text-sm font-medium text-slate-700">Service areas</span>
                      <input
                        className={adminInputClass}
                        value={form.serviceAreas}
                        onChange={(event) => setForm((current) => ({ ...current, serviceAreas: event.target.value }))}
                        placeholder="Comma-separated provinces or cities"
                      />
                    </label>
                    <label className="space-y-1.5 md:col-span-2">
                      <span className="text-sm font-medium text-slate-700">Availability schedule</span>
                      <textarea
                        className={`${adminInputClass} min-h-[96px]`}
                        value={form.availabilitySchedule}
                        onChange={(event) => setForm((current) => ({ ...current, availabilitySchedule: event.target.value }))}
                        placeholder="Example: Mon-Fri 8am-6pm, Sat 10am-4pm"
                      />
                    </label>
                  </div>
                </div>
              ) : null}

              {statusMessage ? <p className="text-sm text-[#4338CA]">{statusMessage}</p> : null}
            </div>
          )}
        </Panel>
      </div>
    </AdminShell>
  );
}

export default function UsersPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F7F8FB]" />}>
      <UsersPageContent />
    </Suspense>
  );
}
