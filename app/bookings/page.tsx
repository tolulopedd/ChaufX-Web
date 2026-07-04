"use client";

import { useEffect, useMemo, useState } from "react";
import { appConfig, toCurrency } from "../../lib/config";
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
import { adminFetch, useAdminResource } from "../../lib/api";

const statusToneMap: Record<string, "violet" | "amber" | "emerald" | "rose" | "navy" | "neutral"> = {
  PENDING: "amber",
  ACCEPTED: "violet",
  ENROUTE: "navy",
  ACTIVE: "emerald",
  COMPLETED: "emerald",
  CANCELLED: "rose"
};

function requestTypeLabel(value?: string) {
  return value === "LATER" ? "Schedule later" : "ChaufX now";
}

function getLifecycleActions(status: string) {
  switch (status) {
    case "PENDING":
      return [{ label: "Cancel booking", status: "CANCELLED" }];
    case "ACCEPTED":
      return [
        { label: "Mark enroute", status: "ENROUTE" },
        { label: "Cancel booking", status: "CANCELLED" }
      ];
    case "ENROUTE":
      return [
        { label: "Start trip", status: "ACTIVE" },
        { label: "Cancel booking", status: "CANCELLED" }
      ];
    case "ACTIVE":
      return [{ label: "Complete trip", status: "COMPLETED" }];
    case "COMPLETED":
    case "CANCELLED":
      return [{ label: "Reopen as pending", status: "PENDING" }];
    default:
      return [];
  }
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Not recorded";
  }

  return new Date(value).toLocaleString();
}

function formatDateInputValue(value?: string | null) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 10);
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-4">
      <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</div>
      <div className="mt-2 text-sm font-medium leading-6 text-slate-950">{value}</div>
    </div>
  );
}

function DetailSection({
  title,
  fields
}: {
  title: string;
  fields: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-4">
      <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-slate-400">{title}</div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {fields.map((field) => (
          <DetailField key={field.label} label={field.label} value={field.value} />
        ))}
      </div>
    </div>
  );
}

export default function BookingsPage() {
  const { data: bookings, error, loading, reload } = useAdminResource<any[]>("/admin/bookings", []);
  const { data: drivers } = useAdminResource<any[]>("/admin/drivers", []);
  const [selectedId, setSelectedId] = useState("");
  const [selectedDriver, setSelectedDriver] = useState<Record<string, string>>({});
  const [busyBookingId, setBusyBookingId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [requestTypeFilter, setRequestTypeFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("");

  const assignedCount = bookings.filter((booking) => booking.assignedDriverId).length;
  const unassignedCount = bookings.length - assignedCount;
  const activeCount = bookings.filter((booking) => ["ACCEPTED", "ENROUTE", "ACTIVE"].includes(String(booking.status))).length;

  useEffect(() => {
    const defaults: Record<string, string> = {};
    for (const booking of bookings) {
      defaults[booking.id] = booking.assignedDriverId ?? drivers[0]?.id ?? "";
    }
    setSelectedDriver(defaults);
  }, [bookings, drivers]);

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase();

    return bookings.filter((booking) => {
      if (statusFilter !== "ALL" && booking.status !== statusFilter) {
        return false;
      }

      if (requestTypeFilter !== "ALL" && booking.requestType !== requestTypeFilter) {
        return false;
      }

      if (dateFilter && formatDateInputValue(booking.scheduledStartAt) !== dateFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [
        booking.customer?.user?.fullName,
        booking.assignedDriver?.user?.fullName,
        booking.pickupLocation,
        booking.destinationLocation,
        booking.vehicleDetails,
        booking.status
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [bookings, dateFilter, requestTypeFilter, search, statusFilter]);

  const selectedBooking = useMemo(
    () => filteredBookings.find((booking) => booking.id === selectedId) ?? bookings.find((booking) => booking.id === selectedId) ?? null,
    [bookings, filteredBookings, selectedId]
  );

  async function updateBookingStatus(bookingId: string, status: string) {
    setBusyBookingId(bookingId);

    try {
      await adminFetch(`/admin/bookings/${bookingId}/status`, {
        method: "POST",
        body: JSON.stringify({ status })
      });
      await reload();
    } finally {
      setBusyBookingId("");
    }
  }

  async function assignDriver(bookingId: string) {
    const driverId = selectedDriver[bookingId];
    if (!driverId) {
      return;
    }

    setBusyBookingId(bookingId);

    try {
      await adminFetch(`/bookings/${bookingId}/assign-driver`, {
        method: "POST",
        body: JSON.stringify({ driverId })
      });
      await reload();
    } finally {
      setBusyBookingId("");
    }
  }

  return (
    <AdminShell
      title="Bookings"
      description="Bookings, assignment status, and trip progress."
    >
      <div className="grid gap-4 lg:grid-cols-4">
        <StatCard title="Total bookings" value={bookings.length} detail="All booking records." />
        <StatCard title="Assigned" value={assignedCount} detail="Bookings already matched to a driver." />
        <StatCard title="Needs assignment" value={unassignedCount} detail="Trips still waiting on assignment." />
        <StatCard title="Active lifecycle" value={activeCount} detail="Accepted, enroute, or active trips." tone="dark" />
      </div>

      <Panel title="Bookings list" subtitle="Review booking records by customer, driver, date, or status.">
        {loading ? <p className="text-sm text-slate-500">Loading bookings...</p> : null}
        {error ? <p className="text-sm text-amber-600">{error}</p> : null}

        <div className="mb-4 grid gap-3 md:grid-cols-[1.2fr_0.8fr_0.7fr_0.8fr]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filter by customer, driver, pickup, destination"
            className={adminInputClass}
          />
          <select
            value={requestTypeFilter}
            onChange={(event) => setRequestTypeFilter(event.target.value)}
            className={adminInputClass}
          >
            <option value="ALL">All request types</option>
            <option value="NOW">ChaufX now</option>
            <option value="LATER">Schedule later</option>
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className={adminInputClass}
          >
            <option value="ALL">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="ENROUTE">Enroute</option>
            <option value="ACTIVE">Active</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <input
            type="date"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
            className={adminInputClass}
          />
        </div>

        {filteredBookings.length ? (
          <div className="space-y-2.5">
            {filteredBookings.map((booking) => (
              <button
                key={booking.id}
                type="button"
                onClick={() => setSelectedId(booking.id)}
                className="w-full rounded-[22px] border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3.5 text-left transition hover:border-[#D6DCEF] hover:bg-white"
              >
                <div className="flex flex-col gap-2.5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[0.95rem] font-semibold tracking-[-0.03em] text-slate-950">
                      {booking.pickupLocation} to {booking.destinationLocation}
                    </div>
                    <div className="mt-1 truncate text-sm text-slate-500">
                      {booking.customer.user.fullName} · {formatDate(booking.scheduledStartAt)}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-600">
                      <span>{requestTypeLabel(booking.requestType)}</span>
                      <span>{booking.assignedDriver?.user.fullName ?? "Unassigned"}</span>
                      <span>{toCurrency(Number(booking.fareEstimate), "CAD")}</span>
                      <span>{booking.dispatches?.length ?? 0} routed driver{booking.dispatches?.length === 1 ? "" : "s"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusPill label={booking.status} tone={statusToneMap[String(booking.status)] ?? "neutral"} />
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#4338CA]">Open</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState title="No bookings found" description="No booking records match the selected filters." />
        )}
      </Panel>

      {selectedBooking ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#0F172A]/70 px-5 py-8">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[32px] bg-white p-5 shadow-[0_40px_100px_-45px_rgba(15,23,42,0.5)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-semibold tracking-[-0.05em] text-slate-950">
                    {selectedBooking.pickupLocation} to {selectedBooking.destinationLocation}
                  </h2>
                  <StatusPill label={selectedBooking.status} tone={statusToneMap[String(selectedBooking.status)] ?? "neutral"} />
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  {selectedBooking.customer.user.fullName} · {formatDate(selectedBooking.scheduledStartAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {getLifecycleActions(String(selectedBooking.status)).map((action) => (
                  <button
                    key={action.status}
                    type="button"
                    className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                      action.status === "CANCELLED"
                        ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                        : action.status === "COMPLETED"
                          ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : adminSecondaryButtonClass
                    }`}
                    onClick={() => updateBookingStatus(selectedBooking.id, action.status)}
                    disabled={busyBookingId === selectedBooking.id}
                  >
                    {action.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSelectedId("")}
                  className={adminGhostButtonClass}
                >
                  Close
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <DetailSection
                title="Booking overview"
                fields={[
                  { label: "Customer", value: selectedBooking.customer.user.fullName },
                  { label: "Request type", value: requestTypeLabel(selectedBooking.requestType) },
                  { label: "Assigned driver", value: selectedBooking.assignedDriver?.user.fullName ?? "Unassigned" },
                  { label: "Estimated fare", value: toCurrency(Number(selectedBooking.fareEstimate), "CAD") },
                  { label: "Vehicle", value: selectedBooking.vehicleDetails ?? "Customer vehicle" },
                  { label: "Scheduled start", value: formatDate(selectedBooking.scheduledStartAt) },
                  { label: "Map unlock", value: formatDate(selectedBooking.activationWindowStartAt) }
                ]}
              />

              <DetailSection
                title="Routing details"
                fields={[
                  { label: "Routed drivers", value: `${selectedBooking.dispatches?.length ?? 0}` },
                  { label: "Booking status", value: String(selectedBooking.status) },
                  {
                    label: "Trip tool activation",
                    value: `Driver navigation unlocks ${appConfig.tripActivationMinutesBeforeStart} minutes before start and remains available until completion or cancellation.`
                  },
                  { label: "Payment status", value: selectedBooking.payment?.status ?? "Not recorded" }
                ]}
              />

              {selectedBooking.dispatches?.length ? (
                <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-4">
                  <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-slate-400">Routed drivers</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedBooking.dispatches.map((dispatch: any) => (
                      <div key={dispatch.id} className="rounded-full border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-medium text-slate-600">
                        {dispatch.driver.user.fullName}
                        {typeof dispatch.distanceKm === "number" ? ` · ${dispatch.distanceKm} km` : ""}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {selectedBooking.specialNotes ? (
                <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-4">
                  <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-slate-400">Trip notes</div>
                  <div className="mt-3 text-sm leading-6 text-slate-600">{selectedBooking.specialNotes}</div>
                </div>
              ) : null}

              {!selectedBooking.assignedDriverId ? (
                <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-4">
                  <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-slate-400">Admin override</div>
                  <div className="mt-2 text-sm leading-6 text-slate-600">Assign a driver manually when needed.</div>
                  <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
                    <select
                      value={selectedDriver[selectedBooking.id] ?? ""}
                      onChange={(event) =>
                        setSelectedDriver((current) => ({
                          ...current,
                          [selectedBooking.id]: event.target.value
                        }))
                      }
                      className={adminInputClass}
                    >
                      <option value="">Select driver</option>
                      {drivers.map((driver) => (
                        <option key={driver.id} value={driver.id}>
                          {driver.user.fullName}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className={adminPrimaryButtonClass}
                      onClick={() => assignDriver(selectedBooking.id)}
                      disabled={busyBookingId === selectedBooking.id}
                    >
                      {busyBookingId === selectedBooking.id ? "Working..." : "Assign override"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
