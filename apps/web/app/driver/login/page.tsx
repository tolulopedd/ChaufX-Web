"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toCurrency } from "@chaufx/config";
import { EmptyState, StatCard, StatusPill, adminTableCellClass, adminTableHeadClass } from "../../../components/admin-primitives";
import { clearStoredDriverToken, fetchDriverProfile, getStoredDriverToken } from "../../../lib/api";

const statusToneMap: Record<string, "violet" | "amber" | "emerald" | "rose" | "navy" | "neutral"> = {
  ACCEPTED: "violet",
  ENROUTE: "navy",
  ACTIVE: "emerald",
  COMPLETED: "emerald",
  CANCELLED: "rose",
  PENDING: "amber",
  AWAITING_PAYMENT: "amber"
};

function formatDate(value?: string | null) {
  if (!value) {
    return "Not scheduled";
  }

  return new Date(value).toLocaleString();
}

function formatDateRange(weekStart?: string | null, weekEnd?: string | null) {
  if (!weekStart || !weekEnd) {
    return "Date range not available";
  }

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

function firstName(value?: string | null) {
  if (!value) {
    return "Driver";
  }

  return value.trim().split(/\s+/)[0] || value;
}

function compactLocation(value?: string | null) {
  if (!value) {
    return "Not provided";
  }

  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(", ");
}

function routeLabel(booking: any) {
  return `${compactLocation(booking.pickupLocation)} -> ${compactLocation(booking.destinationLocation)}`;
}

function driverStatusLabel(value?: string | null) {
  return String(value ?? "UNKNOWN")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function driverVehicleLabel(value?: string | null) {
  if (!value) {
    return "Vehicle details not provided";
  }

  return value.replace(/\s*-\s*/g, " · ");
}

function DriverStatCard({
  title,
  value,
  detail,
  tone = "light"
}: {
  title: string;
  value: string | number;
  detail: string;
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";

  return (
    <div
      className={`rounded-[26px] border px-5 py-5 shadow-[0_20px_45px_-40px_rgba(15,23,42,0.22)] ${
        dark
          ? "border-[#1E1B4B] bg-[radial-gradient(circle_at_top,#1F2A6B_0%,#121936_56%,#0F172A_100%)] text-white"
          : "border-[#E5E7EB] bg-white text-slate-950"
      }`}
    >
      <div className={`text-[0.68rem] font-semibold uppercase tracking-[0.22em] ${dark ? "text-white/70" : "text-[#4F46E5]"}`}>
        {title}
      </div>
      <div className={`mt-3 text-[2rem] font-semibold leading-none tracking-[-0.06em] ${dark ? "text-white" : "text-slate-950"}`}>
        {value}
      </div>
      <p className={`mt-3 text-sm leading-6 ${dark ? "text-white/78" : "text-slate-600"}`}>{detail}</p>
    </div>
  );
}

function DriverSection({
  id,
  eyebrow,
  title,
  description,
  children,
  aside
}: {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="rounded-[28px] border border-[#E5E7EB] bg-white p-5 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.26)] md:p-6"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#4338CA]">{eyebrow}</div>
          <h2 className="mt-2 text-[1.7rem] font-semibold tracking-[-0.04em] text-slate-950">{title}</h2>
          {description ? <p className="mt-1.5 text-sm leading-6 text-slate-600">{description}</p> : null}
        </div>
        {aside}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function EmptyCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-[#D9E1F2] bg-[linear-gradient(180deg,#F8FAFC_0%,#FFFFFF_100%)] p-6">
      <div className="inline-flex rounded-full bg-[#EEF0FF] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#4338CA]">
        ChaufX
      </div>
      <h3 className="mt-4 text-lg font-semibold tracking-[-0.03em] text-slate-950">{title}</h3>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

export default function DriverLoginPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("overview");

  const loadProfile = useCallback(async () => {
    const token = getStoredDriverToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      setLoading(true);
      const result = await fetchDriverProfile(token);
      setProfile(result);
      setError("");
    } catch (reason) {
      clearStoredDriverToken();
      setError(reason instanceof Error ? reason.message : "Unable to load your driver account.");
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    const onHashChange = () => {
      setActiveSection(window.location.hash.replace("#", "") || "overview");
    };

    onHashChange();
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const currentRides = useMemo(
    () =>
      (profile?.bookings ?? []).filter((booking: any) =>
        ["ACCEPTED", "ENROUTE", "ACTIVE"].includes(String(booking.status))
      ),
    [profile]
  );

  const completedRides = useMemo(
    () =>
      (profile?.bookings ?? []).filter((booking: any) =>
        ["COMPLETED", "CANCELLED"].includes(String(booking.status))
      ),
    [profile]
  );

  const weeklySettlementRows = useMemo(() => profile?.weeklySettlementRows ?? [], [profile]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#f7f7fb_0%,#ffffff_42%,#f3f4f6_100%)] px-5 py-10">
        <div className="mx-auto max-w-7xl">
          <section className="rounded-[36px] border border-[#E5E7EB] bg-white p-8 shadow-[0_30px_90px_-55px_rgba(15,23,42,0.24)] md:p-10">
            <div className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#4338CA]">Driver workspace</div>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-[#0F172A]">Loading account</h1>
          </section>
        </div>
      </main>
    );
  }

  if (!profile) {
    return null;
  }

  const lastLocationUpdate = profile.locationUpdatedAt ? new Date(profile.locationUpdatedAt).toLocaleString() : "Awaiting first update";
  const currentWeekPayout = toCurrency(Number(profile.settlementSummary?.currentWeekDriverShareAmount ?? 0), "CAD");
  const lifetimePayout = toCurrency(Number(profile.settlementSummary?.lifetimeDriverShareAmount ?? 0), "CAD");
  const lifetimeGross = toCurrency(Number(profile.settlementSummary?.lifetimeGrossAmount ?? 0), "CAD");
  const ratingText = profile.ratingSummary?.averageScore
    ? `${Number(profile.ratingSummary.averageScore).toFixed(1)} / 5`
    : "No ratings";

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f7fb_0%,#ffffff_42%,#f3f4f6_100%)] text-[#0F172A]">
      <div className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[240px_1fr] lg:items-start">
        <aside className="h-fit rounded-[30px] border border-[#E5E7EB] bg-white/95 p-4 shadow-[0_24px_52px_-36px_rgba(15,23,42,0.3)] backdrop-blur lg:sticky lg:top-5 lg:self-start">
          <div className="rounded-[24px] bg-[linear-gradient(145deg,#0F172A,#1f2555_48%,#4338CA_100%)] p-5 text-white">
            <div className="text-lg font-semibold tracking-[-0.03em]">Driver workspace</div>
            <div className="mt-4 max-w-[12rem] rounded-full border border-white/12 bg-white/8 px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-white/70">
              Active account
            </div>
            <p className="mt-3 text-sm leading-6 text-white/80">
              Review accepted rides, monitor earnings, and keep track of completed trips from one workspace.
            </p>
          </div>

          <nav className="mt-5 space-y-1.5">
            {[
              { href: "#overview", label: "Overview" },
              { href: "#current-rides", label: "Current rides" },
              { href: "#settlements", label: "Settlements" },
              { href: "#history", label: "Ride history" }
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between rounded-2xl px-4 py-2.5 text-sm font-medium transition ${
                  activeSection === item.href.replace("#", "")
                    ? "bg-[#EEF0FF] text-[#1E3A8A]"
                    : "text-slate-600 hover:bg-[#F3F4F6] hover:text-[#0F172A]"
                }`}
              >
                <span>{item.label}</span>
              </a>
            ))}
          </nav>

          <button
            type="button"
            className="mt-5 flex w-full items-center justify-center rounded-2xl border border-[#E5E7EB] px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-[#D1D5DB] hover:bg-[#F3F4F6]"
            onClick={() => {
              clearStoredDriverToken();
              router.push("/login");
            }}
          >
            Sign out
          </button>
        </aside>

        <main className="space-y-6">
          <section
            id="overview"
            className="rounded-[32px] border border-[#E5E7EB] bg-white/90 p-5 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.22)] backdrop-blur md:p-6"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-[2.2rem] font-semibold tracking-[-0.055em]">
                  Welcome back, {firstName(profile.user?.fullName)}.
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Manage accepted rides, review payout progress, and keep a clear record of completed trips from your driver account.
                </p>
              </div>
              <div className="rounded-2xl border border-[#DCDDFF] bg-[#EEF0FF] px-4 py-3 text-sm text-[#4338CA]">
                Signed in as <span className="font-semibold">{profile.user?.email ?? "driver"}</span>
              </div>
            </div>
          </section>

          {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <DriverStatCard title="Current rides" value={currentRides.length} detail="Accepted, enroute, and active rides assigned to you." />
            <DriverStatCard title="Weekly payout" value={currentWeekPayout} detail="Projected driver share for completed paid trips this week." />
            <DriverStatCard title="Lifetime payout" value={lifetimePayout} detail="Projected driver share across completed paid trips." />
            <DriverStatCard title="Driver rating" value={ratingText} detail={`${profile.ratingSummary?.totalRatings ?? 0} completed customer rating${profile.ratingSummary?.totalRatings === 1 ? "" : "s"}.`} tone="dark" />
          </div>

          <DriverSection
            id="current-rides"
            eyebrow="Current rides"
            title="Accepted and active rides"
            description="These rides are currently assigned to you and still in progress or awaiting the next trip action."
            aside={
              <button
                type="button"
                onClick={() => void loadProfile()}
                className="rounded-full border border-[#D7DEEF] px-5 py-3 text-sm font-semibold text-[#2563EB]"
              >
                Refresh
              </button>
            }
          >
            {currentRides.length ? (
              <div className="grid gap-3">
                {currentRides.map((booking: any) => (
                  <article key={booking.id} className="rounded-[24px] border border-[#E5E7EB] bg-[#F8FAFC] p-4 shadow-[0_16px_40px_-36px_rgba(15,23,42,0.28)]">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill label={driverStatusLabel(booking.status)} tone={statusToneMap[String(booking.status)] ?? "neutral"} />
                      <span className="rounded-full bg-[#EEF0FF] px-3 py-1 text-[0.74rem] font-medium text-[#4338CA]">
                        {booking.requestType === "NOW" ? "Drive Me Now" : "Schedule later"}
                      </span>
                    </div>
                    <div className="mt-3 text-base font-semibold leading-6 text-slate-950">{routeLabel(booking)}</div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <div className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">Customer</div>
                        <div className="mt-1 text-sm leading-6 text-slate-600">{booking.customer?.user?.fullName ?? "Customer not available"}</div>
                      </div>
                      <div>
                        <div className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">Start</div>
                        <div className="mt-1 text-sm leading-6 text-slate-600">{formatDate(booking.scheduledStartAt)}</div>
                      </div>
                      <div>
                        <div className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">Fare</div>
                        <div className="mt-1 text-sm font-semibold text-slate-950">{toCurrency(Number(booking.fareEstimate ?? 0), "CAD")}</div>
                      </div>
                      <div>
                        <div className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">Vehicle</div>
                        <div className="mt-1 text-sm leading-6 text-slate-600">{driverVehicleLabel(booking.vehicleDetails)}</div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyCard
                title="No active assignments"
                description="Accepted, enroute, and active rides will appear here once they are assigned to your account."
              />
            )}
          </DriverSection>

          <DriverSection
            id="settlements"
            eyebrow="Settlements"
            title="Driver payout summary"
            description={`Projected driver share is ${profile.settlementConfig?.driverSharePercent ?? 70}% after the platform retains ${profile.settlementConfig?.platformSharePercent ?? 30}%.`}
          >
            <div className="grid gap-4 lg:grid-cols-3">
              <StatCard
                title="Completed paid rides"
                value={profile.settlementSummary?.completedPaidTripsCount ?? 0}
                detail="Trips currently included in your payout calculations."
              />
              <StatCard
                title="Gross booked revenue"
                value={lifetimeGross}
                detail="Completed paid bookings recorded against your account."
              />
              <StatCard
                title="Projected driver payout"
                value={lifetimePayout}
                detail="Estimated payout based on the current revenue-sharing formula."
                tone="dark"
              />
            </div>

            <div className="mt-5 rounded-[24px] border border-[#E5E7EB] bg-white p-4">
              {weeklySettlementRows.length ? (
                <div className="space-y-4">
                  {weeklySettlementRows.map((row: any) => (
                    <div key={row.id} className="rounded-[24px] border border-[#E5E7EB] bg-[#F8FAFC] p-4">
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="text-[1.05rem] font-semibold tracking-[-0.04em] text-slate-950">
                              {formatDateRange(row.weekStart, row.weekEnd)}
                            </div>
                            <StatusPill
                              label={`${row.tripCount} trip${row.tripCount === 1 ? "" : "s"}`}
                              tone="violet"
                            />
                          </div>
                          <div className="mt-3 text-sm text-slate-500">
                            Weekly payout period based on completed paid rides.
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[29rem]">
                          <div className="rounded-2xl border border-white bg-white px-4 py-2.5">
                            <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-slate-400">Gross</div>
                            <div className="mt-2 text-base font-semibold text-slate-950">
                              {toCurrency(Number(row.grossAmount ?? 0), "CAD")}
                            </div>
                          </div>
                          <div className="rounded-2xl border border-white bg-white px-4 py-2.5">
                            <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-slate-400">Last completion</div>
                            <div className="mt-2 text-sm font-medium text-slate-950">
                              {formatDate(row.latestCompletedAt)}
                            </div>
                          </div>
                          <div className="rounded-2xl border border-[#DCDDFF] bg-[#EEF0FF] px-4 py-2.5">
                            <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#4338CA]">Driver payout</div>
                            <div className="mt-2 text-base font-semibold text-slate-950">
                              {toCurrency(Number(row.driverShareAmount ?? 0), "CAD")}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {profile.settlementConfig?.driverSharePercent ?? 70}% payable
                            </div>
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
                            {(row.trips ?? []).map((trip: any) => (
                              <tr key={trip.bookingId} className="rounded-2xl bg-white text-slate-700">
                                <td className={`rounded-l-2xl ${adminTableCellClass}`}>
                                  <div className="font-medium text-slate-950">
                                    {compactLocation(trip.pickupLocation)} to {compactLocation(trip.destinationLocation)}
                                  </div>
                                </td>
                                <td className={adminTableCellClass}>{trip.customerName ?? "Customer"}</td>
                                <td className={`${adminTableCellClass} text-slate-500`}>
                                  {formatDate(trip.completedAt)}
                                </td>
                                <td className={`rounded-r-2xl ${adminTableCellClass} text-right font-semibold text-slate-950`}>
                                  {toCurrency(Number(trip.amount ?? 0), "CAD")}
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
                  title="No payout rows available"
                  description="Weekly payout rows will appear here after completed paid rides are recorded on your account."
                />
              )}
            </div>
          </DriverSection>

          <DriverSection
            id="history"
            eyebrow="Ride history"
            title="Completed ride history"
            description="A record of completed and cancelled rides associated with your account."
          >
            {completedRides.length ? (
              <div className="overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-[#E5E7EB]">
                    <thead className="bg-[#F8FAFC]">
                      <tr className="text-left">
                        <th className="px-5 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">Route</th>
                        <th className="px-4 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">Customer</th>
                        <th className="px-4 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">Start</th>
                        <th className="px-4 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">Fare</th>
                        <th className="px-4 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">Payment</th>
                        <th className="px-5 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EEF2F7]">
                      {completedRides.map((booking: any) => (
                        <tr key={booking.id}>
                          <td className="px-5 py-3.5">
                            <div className="max-w-md text-sm font-medium leading-6 text-slate-950">{routeLabel(booking)}</div>
                            <div className="mt-1 text-[0.82rem] text-slate-500">{booking.requestType === "NOW" ? "Drive Me Now" : "Schedule later"}</div>
                          </td>
                          <td className="px-4 py-3.5 text-sm text-slate-600">{booking.customer?.user?.fullName ?? "Customer not available"}</td>
                          <td className="px-4 py-3.5 text-sm text-slate-600">{formatDate(booking.scheduledStartAt)}</td>
                          <td className="px-4 py-3.5 text-sm font-semibold text-slate-950">{toCurrency(Number(booking.fareEstimate ?? 0), "CAD")}</td>
                          <td className="px-4 py-3.5 text-sm text-slate-600">{booking.payment?.status === "RECORDED" ? "Paid" : "Pending"}</td>
                          <td className="px-5 py-3.5">
                            <StatusPill label={driverStatusLabel(booking.status)} tone={statusToneMap[String(booking.status)] ?? "neutral"} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <EmptyCard
                title="No ride history available"
                description="Completed and cancelled rides will appear here once activity has been recorded on your account."
              />
            )}
          </DriverSection>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-[0_16px_38px_-34px_rgba(15,23,42,0.22)]">
              <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-slate-400">Routing</div>
              <div className="mt-3 text-base font-semibold text-[#0F172A]">Based on your live location</div>
              <div className="mt-2 text-sm leading-6 text-slate-500">Last location update: {lastLocationUpdate}</div>
            </div>
            <div className="rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-[0_16px_38px_-34px_rgba(15,23,42,0.22)]">
              <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-slate-400">Availability</div>
              <div className="mt-3 text-base font-semibold text-[#0F172A]">{profile.availabilityStatus ? "Online" : "Offline"}</div>
              <div className="mt-2 text-sm leading-6 text-slate-500">Your account is {profile.availabilityStatus ? "visible for nearby requests" : "currently unavailable for new requests"}.</div>
            </div>
            <div className="rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-[0_16px_38px_-34px_rgba(15,23,42,0.22)]">
              <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-slate-400">Account tools</div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/driver/status" className="rounded-full border border-[#E5E7EB] px-4 py-2.5 text-sm font-semibold text-slate-700">
                  Application status
                </Link>
                <Link href="/driver/apply" className="rounded-full bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white">
                  Application details
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </main>
  );
}
