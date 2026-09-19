"use client";

import { useState } from "react";
import { AdminShell, Panel } from "../../components/admin-shell";
import { EmptyState, StatCard, StatusPill, adminTableCellClass, adminTableHeadClass } from "../../components/admin-primitives";
import { adminFetch, updateSettlementStatus, useAdminResource } from "../../lib/api";

type SettlementTrip = {
  bookingId: string;
  completedAt: string | null;
  amount: number;
  customerName: string;
  pickupLocation: string;
  destinationLocation: string;
};

type SettlementRow = {
  id: string;
  weekStart: string;
  weekEnd: string;
  driverId: string;
  driverName: string;
  driverEmail: string;
  tripCount: number;
  grossAmount: number;
  platformSharePercent: number;
  platformShareAmount: number;
  driverShareAmount: number;
  status: "PENDING" | "PAID";
  paidAt: string | null;
  payoutReference: string | null;
  notes: string | null;
  latestCompletedAt: string | null;
  trips: SettlementTrip[];
};

type SettlementPayload = {
  settlementConfig: {
    platformSharePercent: number;
    driverSharePercent: number;
  };
  summary: {
    grossAmount: number;
    platformShareAmount: number;
    driverShareAmount: number;
    tripCount: number;
    weeklyRows: number;
    pendingRows: number;
    paidRows: number;
    pendingDriverShareAmount: number;
    paidDriverShareAmount: number;
  };
  settlements: SettlementRow[];
};

type MembershipPaymentRow = {
  id: string;
  tier: "BASIC" | "PLUS" | "CONCIERGE" | "CORPORATE";
  billingCycle: "MONTHLY" | "ANNUAL";
  method: "STRIPE" | "INTERAC";
  status: "PENDING" | "RECORDED" | "FAILED" | "CANCELLED";
  amount: number;
  currency: string;
  invoiceNumber: string;
  interacTransferConfirmedAt: string | null;
  recordedAt: string | null;
  createdAt: string;
  user: {
    fullName: string;
    email: string;
    membershipExpiresAt: string | null;
  };
};

type MembershipPaymentPayload = {
  payments: MembershipPaymentRow[];
};

type BookingInteracPaymentRow = {
  id: string;
  amount: number;
  currency: string;
  status: "PENDING" | "RECORDED" | "FAILED" | "REFUNDED";
  providerReference: string | null;
  interacTransferConfirmedAt: string | null;
  recordedAt: string | null;
  createdAt: string;
  booking: {
    id: string;
    status: string;
    pickupLocation: string;
    destinationLocation: string;
    scheduledStartAt: string;
    customer: {
      user: {
        fullName: string;
        email: string;
      };
    };
  };
};

type BookingInteracPaymentPayload = {
  payments: BookingInteracPaymentRow[];
};

const settlementsFallback: SettlementPayload = {
  settlementConfig: {
    platformSharePercent: 30,
    driverSharePercent: 70
  },
  summary: {
    grossAmount: 0,
    platformShareAmount: 0,
    driverShareAmount: 0,
    tripCount: 0,
    weeklyRows: 0,
    pendingRows: 0,
    paidRows: 0,
    pendingDriverShareAmount: 0,
    paidDriverShareAmount: 0
  },
  settlements: []
};

const membershipPaymentsFallback: MembershipPaymentPayload = { payments: [] };
const bookingInteracPaymentsFallback: BookingInteracPaymentPayload = { payments: [] };

const currencyFormatter = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 2
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value ?? 0);
}

function formatDateRange(weekStart: string, weekEnd: string) {
  const start = new Date(`${weekStart}T00:00:00`);
  const end = new Date(`${weekEnd}T00:00:00`);

  return `${start.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric"
  })} - ${end.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric"
  })}`;
}

function trimDriverName(fullName: string) {
  return fullName.replace(/\s+Approved Driver$/i, "").trim();
}

export default function SettlementsPage() {
  const { data, loading, error, reload } = useAdminResource<SettlementPayload>("/admin/settlements", settlementsFallback);
  const {
    data: membershipPayments,
    loading: membershipPaymentsLoading,
    error: membershipPaymentsError,
    reload: reloadMembershipPayments
  } = useAdminResource<MembershipPaymentPayload>("/admin/memberships/payments", membershipPaymentsFallback);
  const {
    data: bookingInteracPayments,
    loading: bookingInteracPaymentsLoading,
    error: bookingInteracPaymentsError,
    reload: reloadBookingInteracPayments
  } = useAdminResource<BookingInteracPaymentPayload>("/admin/payments/interac", bookingInteracPaymentsFallback);
  const [savingId, setSavingId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"memberships" | "trip-transfers" | "driver-payouts">("memberships");

  async function onMarkSettlement(settlement: SettlementRow, status: "PENDING" | "PAID") {
    const payoutReference =
      status === "PAID"
        ? window.prompt("Enter payout reference (optional).", settlement.payoutReference ?? "") ?? undefined
        : settlement.payoutReference ?? undefined;
    const notes = window.prompt("Add a payout note (optional).", settlement.notes ?? "") ?? undefined;

    try {
      setSavingId(settlement.id);
      await updateSettlementStatus(settlement.driverId, settlement.weekStart, {
        status,
        payoutReference,
        notes
      });
      await reload();
    } catch (reason) {
      window.alert(reason instanceof Error ? reason.message : "Unable to update payout status.");
    } finally {
      setSavingId("");
    }
  }

  async function confirmInteracPayment(payment: MembershipPaymentRow) {
    if (!window.confirm(`Confirm ${formatCurrency(payment.amount)} Interac payment for ${payment.user.fullName}?`)) {
      return;
    }

    try {
      setSavingId(payment.id);
      await adminFetch(`/admin/memberships/${payment.id}/record`, { method: "POST" });
      await reloadMembershipPayments();
    } catch (reason) {
      window.alert(reason instanceof Error ? reason.message : "Unable to confirm the membership payment.");
    } finally {
      setSavingId("");
    }
  }

  async function confirmBookingInteracPayment(payment: BookingInteracPaymentRow) {
    if (!window.confirm(`Confirm ${formatCurrency(payment.amount)} e-transfer for ${payment.booking.customer.user.fullName}?`)) {
      return;
    }

    try {
      setSavingId(payment.id);
      await adminFetch(`/payments/${payment.booking.id}/record`, {
        method: "POST",
        body: JSON.stringify({
          amount: payment.amount,
          providerReference: payment.providerReference ?? undefined,
          notes: "E-transfer confirmed by admin."
        })
      });
      await reloadBookingInteracPayments();
    } catch (reason) {
      window.alert(reason instanceof Error ? reason.message : "Unable to confirm the trip payment.");
    } finally {
      setSavingId("");
    }
  }

  return (
    <AdminShell title="Settlements">
      <div className="flex flex-wrap gap-2">
        {[
          ["memberships", "Membership payments"],
          ["driver-payouts", "Driver payouts"]
        ].map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab as typeof activeTab)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab ? "bg-[#2563EB] text-white" : "border border-[#D7DEEF] bg-white text-slate-700 hover:bg-[#F8FAFC]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "memberships" ? <Panel title="Membership payments">
        {membershipPaymentsLoading ? <p className="text-sm text-slate-500">Loading membership payments...</p> : null}
        {membershipPaymentsError ? <p className="text-sm text-amber-600">{membershipPaymentsError}</p> : null}

        {membershipPayments.payments.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className={adminTableHeadClass}>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Plan</th>
                  <th className="px-3 py-2">Payment</th>
                  <th className="px-3 py-2">Customer confirmation</th>
                  <th className="px-3 py-2">Membership expiry</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2F7]">
                {membershipPayments.payments.map((payment) => {
                  return (
                    <tr key={payment.id} className="align-top text-slate-700">
                      <td className={`${adminTableCellClass} min-w-[15rem]`}>
                        <div className="font-semibold text-slate-950">{payment.user.fullName}</div>
                        <div className="mt-1 text-xs text-slate-500">{payment.user.email}</div>
                        <div className="mt-1 text-xs text-slate-500">{payment.invoiceNumber}</div>
                      </td>
                      <td className={adminTableCellClass}>
                        <div className="font-medium text-slate-950">{payment.tier}</div>
                        <div className="mt-1 text-xs text-slate-500">{payment.billingCycle}</div>
                      </td>
                      <td className={adminTableCellClass}>
                        <div className="font-semibold text-slate-950">{formatCurrency(payment.amount)}</div>
                        <div className="mt-1 text-xs text-slate-500">{payment.method === "INTERAC" ? "E-transfer" : "Stripe"}</div>
                        <div className="mt-1"><StatusPill label={payment.status} tone={payment.status === "RECORDED" ? "emerald" : payment.status === "PENDING" ? "amber" : "neutral"} /></div>
                      </td>
                      <td className={adminTableCellClass}>
                        {payment.interacTransferConfirmedAt ? (
                          <span className="text-xs text-emerald-700">Received {new Date(payment.interacTransferConfirmedAt).toLocaleString()}</span>
                        ) : payment.method === "INTERAC" ? (
                          <span className="text-xs text-slate-500">Awaiting customer</span>
                        ) : (
                          <span className="text-xs text-slate-400">Not applicable</span>
                        )}
                      </td>
                      <td className={adminTableCellClass}>
                        {payment.user.membershipExpiresAt ? new Date(payment.user.membershipExpiresAt).toLocaleString() : "-"}
                      </td>
                      <td className={`${adminTableCellClass} text-right`}>
                        {payment.status === "RECORDED" ? (
                          <span className="text-xs font-medium text-emerald-700">Activated {payment.recordedAt ? new Date(payment.recordedAt).toLocaleDateString() : ""}</span>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No membership payments yet" />
        )}
      </Panel> : null}

      {activeTab === "trip-transfers" ? <Panel title="Trip e-transfer payments">
        {bookingInteracPaymentsLoading ? <p className="text-sm text-slate-500">Loading trip payments...</p> : null}
        {bookingInteracPaymentsError ? <p className="text-sm text-amber-600">{bookingInteracPaymentsError}</p> : null}

        {bookingInteracPayments.payments.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className={adminTableHeadClass}>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Trip</th>
                  <th className="px-3 py-2">Payment</th>
                  <th className="px-3 py-2">Customer confirmation</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2F7]">
                {bookingInteracPayments.payments.map((payment) => {
                  const canConfirm = payment.status === "PENDING" && Boolean(payment.interacTransferConfirmedAt);

                  return (
                    <tr key={payment.id} className="align-top text-slate-700">
                      <td className={`${adminTableCellClass} min-w-[14rem]`}>
                        <div className="font-semibold text-slate-950">{payment.booking.customer.user.fullName}</div>
                        <div className="mt-1 text-xs text-slate-500">{payment.booking.customer.user.email}</div>
                      </td>
                      <td className={`${adminTableCellClass} min-w-[20rem]`}>
                        <div className="font-medium text-slate-950">{payment.booking.pickupLocation} to {payment.booking.destinationLocation}</div>
                        <div className="mt-1 text-xs text-slate-500">{new Date(payment.booking.scheduledStartAt).toLocaleString()}</div>
                      </td>
                      <td className={adminTableCellClass}>
                        <div className="font-semibold text-slate-950">{formatCurrency(payment.amount)}</div>
                        <div className="mt-1 text-xs text-slate-500">{payment.providerReference}</div>
                        <div className="mt-1"><StatusPill label={payment.status} tone={payment.status === "RECORDED" ? "emerald" : "amber"} /></div>
                      </td>
                      <td className={adminTableCellClass}>
                        {payment.interacTransferConfirmedAt ? (
                          <span className="text-xs text-emerald-700">Received {new Date(payment.interacTransferConfirmedAt).toLocaleString()}</span>
                        ) : (
                          <span className="text-xs text-slate-500">Awaiting customer</span>
                        )}
                      </td>
                      <td className={`${adminTableCellClass} text-right`}>
                        {payment.status === "PENDING" ? (
                          <button
                            type="button"
                            onClick={() => void confirmBookingInteracPayment(payment)}
                            disabled={!canConfirm || savingId === payment.id}
                            className="rounded-full bg-[#2563EB] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {savingId === payment.id ? "Confirming..." : "Confirm e-transfer"}
                          </button>
                        ) : (
                          <span className="text-xs font-medium text-emerald-700">Recorded {payment.recordedAt ? new Date(payment.recordedAt).toLocaleDateString() : ""}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No trip e-transfer payments yet" />
        )}
      </Panel> : null}

      {activeTab === "driver-payouts" ? <>
        <div className="grid gap-4 xl:grid-cols-4">
          <StatCard title="Weekly settlement rows" value={data.summary.weeklyRows} detail="Weekly driver payout groups." />
          <StatCard title="Awaiting payout" value={formatCurrency(data.summary.pendingDriverShareAmount)} detail={`${data.summary.pendingRows} weekly payout row${data.summary.pendingRows === 1 ? "" : "s"} pending release.`} />
          <StatCard title="Paid out" value={formatCurrency(data.summary.paidDriverShareAmount)} detail={`${data.summary.paidRows} weekly payout row${data.summary.paidRows === 1 ? "" : "s"} completed.`} />
          <StatCard
            title="Driver payout / platform"
            value={`${data.settlementConfig.driverSharePercent}% / ${data.settlementConfig.platformSharePercent}%`}
            detail={`${formatCurrency(data.summary.driverShareAmount)} driver share across ${data.summary.tripCount} completed paid trips.`}
            tone="dark"
          />
        </div>

      <Panel title="Weekly settlement queue">
        {loading ? <p className="text-sm text-slate-500">Loading settlement totals...</p> : null}
        {error ? <p className="text-sm text-amber-600">{error}</p> : null}

        {data.settlements.length ? (
          <div className="space-y-4">
            {data.settlements.map((settlement) => (
              <div key={settlement.id} className="rounded-[18px] border border-[#E5E7EB] bg-[#F8FAFC] p-3.5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-[1.05rem] font-semibold tracking-[-0.04em] text-slate-950">
                        {trimDriverName(settlement.driverName)}
                      </div>
                      <StatusPill label={`${settlement.tripCount} trip${settlement.tripCount === 1 ? "" : "s"}`} tone="violet" />
                      <StatusPill label={settlement.status === "PAID" ? "Paid out" : "Awaiting payout"} tone={settlement.status === "PAID" ? "emerald" : "amber"} />
                    </div>
                    <div className="mt-1 text-sm text-slate-500">{settlement.driverEmail}</div>
                    <div className="mt-3 text-sm font-medium text-slate-700">{formatDateRange(settlement.weekStart, settlement.weekEnd)}</div>
                    <div className="mt-2 space-y-1 text-xs text-slate-500">
                      {settlement.paidAt ? <div>Paid on {new Date(settlement.paidAt).toLocaleString()}</div> : null}
                      {settlement.payoutReference ? <div>Reference: {settlement.payoutReference}</div> : null}
                      {settlement.notes ? <div>Notes: {settlement.notes}</div> : null}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[35rem]">
                    <div className="rounded-2xl border border-white bg-white px-4 py-2.5">
                      <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-slate-400">Gross</div>
                      <div className="mt-2 text-base font-semibold text-slate-950">{formatCurrency(settlement.grossAmount)}</div>
                    </div>
                    <div className="rounded-2xl border border-white bg-white px-4 py-2.5">
                      <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-slate-400">Platform share</div>
                      <div className="mt-2 text-base font-semibold text-slate-950">
                        {formatCurrency(settlement.platformShareAmount)}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">{settlement.platformSharePercent}% retained</div>
                    </div>
                    <div className="rounded-2xl border border-[#DCDDFF] bg-[#EEF0FF] px-4 py-2.5">
                      <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#4338CA]">Driver payout</div>
                      <div className="mt-2 text-base font-semibold text-slate-950">{formatCurrency(settlement.driverShareAmount)}</div>
                      <div className="mt-1 text-xs text-slate-500">{data.settlementConfig.driverSharePercent}% payable</div>
                    </div>
                    <div className="flex items-center justify-end gap-2 sm:col-span-3 xl:col-span-3">
                      {settlement.status === "PAID" ? (
                        <button
                          type="button"
                          onClick={() => void onMarkSettlement(settlement, "PENDING")}
                          disabled={savingId === settlement.id}
                          className="rounded-full border border-[#D7DEEF] px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {savingId === settlement.id ? "Updating..." : "Reopen week"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void onMarkSettlement(settlement, "PAID")}
                          disabled={savingId === settlement.id}
                          className="rounded-full bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {savingId === settlement.id ? "Saving..." : "Mark paid"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-y-1.5 text-sm">
                    <thead>
                      <tr className={adminTableHeadClass}>
                        <th className="px-3 py-2">Completed trip</th>
                        <th className="px-3 py-2">Customer</th>
                        <th className="px-3 py-2">Completed</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {settlement.trips.map((trip) => (
                        <tr key={trip.bookingId} className="rounded-2xl bg-white text-slate-700">
                          <td className={`rounded-l-2xl ${adminTableCellClass}`}>
                            <div className="font-medium text-slate-950">
                              {trip.pickupLocation} to {trip.destinationLocation}
                            </div>
                          </td>
                          <td className={adminTableCellClass}>{trip.customerName}</td>
                          <td className={`${adminTableCellClass} text-slate-500`}>
                            {trip.completedAt ? new Date(trip.completedAt).toLocaleString() : "Not recorded"}
                          </td>
                          <td className={`rounded-r-2xl ${adminTableCellClass} text-right font-semibold text-slate-950`}>
                            {formatCurrency(trip.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No weekly settlements yet" />
        )}
      </Panel>
      </> : null}
    </AdminShell>
  );
}
