"use client";

import { AdminShell, Panel } from "../../components/admin-shell";
import { EmptyState, StatCard, StatusPill, adminTableCellClass, adminTableHeadClass } from "../../components/admin-primitives";
import { useAdminResource } from "../../lib/api";

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
  };
  settlements: SettlementRow[];
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
    weeklyRows: 0
  },
  settlements: []
};

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
  const { data, loading, error } = useAdminResource<SettlementPayload>("/admin/settlements", settlementsFallback);

  return (
    <AdminShell
      title="Driver Settlements"
      description="Weekly driver payouts and platform share."
    >
      <div className="grid gap-4 xl:grid-cols-4">
        <StatCard title="Weekly settlement rows" value={data.summary.weeklyRows} detail="Weekly driver payout groups." />
        <StatCard title="Paid completed trips" value={data.summary.tripCount} detail="Completed paid trips included in settlement." />
        <StatCard title="Gross revenue" value={formatCurrency(data.summary.grossAmount)} detail="Gross revenue included in settlement." />
        <StatCard
          title="Driver payout / platform"
          value={`${data.settlementConfig.driverSharePercent}% / ${data.settlementConfig.platformSharePercent}%`}
          detail={`${formatCurrency(data.summary.driverShareAmount)} driver payout and ${formatCurrency(data.summary.platformShareAmount)} platform share.`}
          tone="dark"
        />
      </div>

      <Panel
        title="Weekly settlement queue"
        subtitle="Weekly payout totals grouped by driver."
      >
        {loading ? <p className="text-sm text-slate-500">Loading settlement totals...</p> : null}
        {error ? <p className="text-sm text-amber-600">{error}</p> : null}

        {data.settlements.length ? (
          <div className="space-y-4">
            {data.settlements.map((settlement) => (
              <div key={settlement.id} className="rounded-[24px] border border-[#E5E7EB] bg-[#F8FAFC] p-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-[1.05rem] font-semibold tracking-[-0.04em] text-slate-950">
                        {trimDriverName(settlement.driverName)}
                      </div>
                      <StatusPill label={`${settlement.tripCount} trip${settlement.tripCount === 1 ? "" : "s"}`} tone="violet" />
                    </div>
                    <div className="mt-1 text-sm text-slate-500">{settlement.driverEmail}</div>
                    <div className="mt-3 text-sm font-medium text-slate-700">{formatDateRange(settlement.weekStart, settlement.weekEnd)}</div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[29rem]">
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
          <EmptyState
            title="No weekly settlements yet"
            description="No settlement rows are available at this time."
          />
        )}
      </Panel>
    </AdminShell>
  );
}
