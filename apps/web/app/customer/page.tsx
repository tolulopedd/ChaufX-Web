"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { defaultServiceZones, toCurrency } from "../../lib/config";
import { EmptyState, StatusPill } from "../../components/admin-primitives";
import { clearStoredCustomerToken, customerFetch, getStoredCustomerToken, useCustomerResource } from "../../lib/api";

const statusToneMap: Record<string, "violet" | "amber" | "emerald" | "rose" | "navy" | "neutral"> = {
  AWAITING_PAYMENT: "amber",
  PENDING: "amber",
  ACCEPTED: "violet",
  ENROUTE: "navy",
  ACTIVE: "emerald",
  COMPLETED: "emerald",
  CANCELLED: "rose"
};

function formatDate(value?: string | null) {
  if (!value) {
    return "Not scheduled";
  }

  return new Date(value).toLocaleString();
}

function formatDateTimeLocal(value: Date) {
  const pad = (input: number) => String(input).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(
    value.getMinutes()
  )}`;
}

function requestTypeLabel(value?: string) {
  return value === "NOW" ? "Drive Me Now" : "Schedule later";
}

function statusLabel(value?: string) {
  return String(value ?? "UNKNOWN")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function buildVehicleLabel(vehicle: any) {
  return [vehicle.make, vehicle.model, vehicle.plateNumber].filter(Boolean).join(" · ");
}

function routeLabel(booking: any) {
  return `${booking.pickupLocation} to ${booking.destinationLocation}`;
}

function compactLocation(value?: string) {
  if (!value) {
    return "Not provided";
  }

  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.slice(0, 2).join(", ");
}

function placeLabel(value?: string) {
  if (!value) {
    return "Not provided";
  }

  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)[0] ?? value;
}

function compactRouteLabel(booking: any) {
  return `${placeLabel(booking.pickupLocation)} -> ${placeLabel(booking.destinationLocation)}`;
}

function compactDriverName(value?: string | null) {
  if (!value) {
    return "Assignment pending";
  }

  return value.trim().split(/\s+/)[0] || value;
}

function compactVehicleLabel(value?: string) {
  if (!value) {
    return "";
  }

  return value.replace(/\s*-\s*/g, " · ");
}

function SectionPanel({
  id,
  eyebrow,
  title,
  description,
  children,
  aside
}: {
  id?: string;
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

function MiniStatCard({
  title,
  value,
  detail,
  tone = "light"
}: {
  title: string;
  value: number;
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
      <div className={`mt-3 text-4xl font-semibold leading-none tracking-[-0.06em] ${dark ? "text-white" : "text-slate-950"}`}>
        {value}
      </div>
      <p className={`mt-3 text-sm leading-6 ${dark ? "text-white/78" : "text-slate-600"}`}>{detail}</p>
    </div>
  );
}

function TripEmptyCard({
  title,
  description,
  accent
}: {
  title: string;
  description: string;
  accent: string;
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-[#D9E1F2] bg-[linear-gradient(180deg,#F8FAFC_0%,#FFFFFF_100%)] p-6">
      <div className={`inline-flex rounded-full px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] ${accent}`}>
        ChaufX
      </div>
      <h3 className="mt-4 text-lg font-semibold tracking-[-0.03em] text-slate-950">{title}</h3>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function TripStack({
  rows,
  onCancel,
  onPayNow,
  payingBookingId,
  busyBookingId
}: {
  rows: any[];
  onCancel: (bookingId: string) => Promise<void>;
  onPayNow: (bookingId: string) => Promise<void>;
  payingBookingId: string;
  busyBookingId: string;
}) {
  return (
    <div className="space-y-3 xl:hidden">
      {rows.map((booking) => (
        <article key={booking.id} className="rounded-[24px] border border-[#E5E7EB] bg-white p-4 shadow-[0_16px_40px_-36px_rgba(15,23,42,0.28)]">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill label={statusLabel(booking.status)} tone={statusToneMap[String(booking.status)] ?? "neutral"} />
            <span className="rounded-full bg-[#EEF0FF] px-3 py-1 text-[0.74rem] font-medium text-[#4338CA]">
              {requestTypeLabel(booking.requestType)}
            </span>
          </div>
          <div className="mt-3 text-sm font-semibold leading-6 text-slate-950" title={routeLabel(booking)}>
            {compactRouteLabel(booking)}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">Start</div>
              <div className="mt-1 text-sm leading-6 text-slate-600">{formatDate(booking.scheduledStartAt)}</div>
            </div>
            <div>
              <div className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">Fare</div>
              <div className="mt-1 text-sm font-semibold text-slate-950">{toCurrency(Number(booking.fareEstimate), "CAD")}</div>
            </div>
            <div>
              <div className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">Driver</div>
              <div className="mt-1 text-sm leading-6 text-slate-600">{compactDriverName(booking.assignedDriver?.user?.fullName)}</div>
            </div>
            {booking.vehicleDetails ? (
              <div>
                <div className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">Vehicle</div>
                <div className="mt-1 text-sm leading-6 text-slate-600" title={booking.vehicleDetails}>
                  {compactVehicleLabel(booking.vehicleDetails)}
                </div>
              </div>
            ) : null}
          </div>
          {["AWAITING_PAYMENT", "PENDING", "ACCEPTED"].includes(String(booking.status)) || booking.status === "AWAITING_PAYMENT" ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {booking.status === "AWAITING_PAYMENT" ? (
                <button
                  type="button"
                  onClick={() => onPayNow(booking.id)}
                  disabled={payingBookingId === booking.id}
                  className="rounded-full bg-[#2563EB] px-3.5 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {payingBookingId === booking.id ? "Opening Stripe..." : "Complete payment"}
                </button>
              ) : null}
              {["AWAITING_PAYMENT", "PENDING", "ACCEPTED"].includes(String(booking.status)) ? (
                <button
                  type="button"
                  onClick={() => onCancel(booking.id)}
                  disabled={busyBookingId === booking.id}
                  className="rounded-full border border-rose-200 px-3.5 py-2 text-sm font-semibold text-rose-700 transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busyBookingId === booking.id ? "Cancelling..." : "Cancel"}
                </button>
              ) : null}
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function TripTable({
  rows,
  emptyTitle,
  emptyDescription,
  emptyAccent,
  onCancel,
  onPayNow,
  payingBookingId,
  busyBookingId
}: {
  rows: any[];
  emptyTitle: string;
  emptyDescription: string;
  emptyAccent: string;
  onCancel: (bookingId: string) => Promise<void>;
  onPayNow: (bookingId: string) => Promise<void>;
  payingBookingId: string;
  busyBookingId: string;
}) {
  if (!rows.length) {
    return <TripEmptyCard title={emptyTitle} description={emptyDescription} accent={emptyAccent} />;
  }

  return (
    <>
      <TripStack
        rows={rows}
        onCancel={onCancel}
        onPayNow={onPayNow}
        payingBookingId={payingBookingId}
        busyBookingId={busyBookingId}
      />
      <div className="hidden overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white xl:block">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[#E5E7EB]">
          <thead className="bg-[#F8FAFC]">
            <tr className="text-left">
              <th className="w-[40%] px-5 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">Trip</th>
              <th className="w-[17%] px-4 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">Start</th>
              <th className="w-[11%] px-4 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">Fare</th>
              <th className="w-[14%] px-4 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">Driver</th>
              <th className="w-[10%] px-4 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">Status</th>
              <th className="w-[8%] px-5 py-3 text-right text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEF2F7]">
            {rows.map((booking) => (
              <tr key={booking.id} className="align-top">
                <td className="px-5 py-3.5">
                  <div className="max-w-md truncate text-sm font-semibold leading-6 text-slate-950" title={routeLabel(booking)}>
                    {compactRouteLabel(booking)}
                  </div>
                  <div className="mt-1 text-[0.82rem] text-slate-500">{requestTypeLabel(booking)}</div>
                  {booking.vehicleDetails ? (
                    <div className="mt-1 truncate text-[0.82rem] text-slate-500" title={booking.vehicleDetails}>
                      Vehicle: {compactVehicleLabel(booking.vehicleDetails)}
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-3.5 text-sm leading-6 text-slate-600">{formatDate(booking.scheduledStartAt)}</td>
                <td className="px-4 py-3.5 text-sm font-semibold text-slate-950">{toCurrency(Number(booking.fareEstimate), "CAD")}</td>
                <td className="px-4 py-3.5 text-sm leading-6 text-slate-600">
                  {compactDriverName(booking.assignedDriver?.user?.fullName)}
                </td>
                <td className="px-4 py-3.5">
                  <StatusPill label={statusLabel(booking.status)} tone={statusToneMap[String(booking.status)] ?? "neutral"} />
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex justify-end gap-2">
                    {booking.status === "AWAITING_PAYMENT" ? (
                      <button
                        type="button"
                        onClick={() => onPayNow(booking.id)}
                        disabled={payingBookingId === booking.id}
                        className="rounded-full bg-[#2563EB] px-3.5 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                      >
                  {payingBookingId === booking.id ? "Opening Stripe..." : "Complete payment"}
                        </button>
                      ) : null}
                    {["AWAITING_PAYMENT", "PENDING", "ACCEPTED"].includes(String(booking.status)) ? (
                      <button
                        type="button"
                        onClick={() => onCancel(booking.id)}
                        disabled={busyBookingId === booking.id}
                        className="rounded-full border border-rose-200 px-3.5 py-2 text-sm font-semibold text-rose-700 transition disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {busyBookingId === booking.id ? "Cancelling..." : "Cancel"}
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    </>
  );
}

export default function CustomerPortalPage() {
  const router = useRouter();
  const token = getStoredCustomerToken();
  const [activeSection, setActiveSection] = useState("overview");
  const { data: profile, error: profileError, loading: profileLoading, reload: reloadProfile } = useCustomerResource<any | null>(
    "/users/me",
    null
  );
  const { data: bookings, error: bookingsError, loading: bookingsLoading, reload: reloadBookings } = useCustomerResource<any[]>(
    "/bookings",
    []
  );
  const [status, setStatus] = useState("");
  const [busyBookingId, setBusyBookingId] = useState("");
  const [payingBookingId, setPayingBookingId] = useState("");
  const [estimateBusy, setEstimateBusy] = useState(false);
  const [estimate, setEstimate] = useState<any | null>(null);
  const [form, setForm] = useState<{
    zoneCode: string;
    pickupLocation: string;
    destinationLocation: string;
    scheduledStartAt: string;
    hours: number;
    vehicleId: string;
    vehicleDetails: string;
    specialNotes: string;
  }>(() => {
    const startsAt = new Date();
    startsAt.setDate(startsAt.getDate() + 1);
    startsAt.setHours(10, 0, 0, 0);

    return {
      zoneCode: defaultServiceZones[0]?.code ?? "WPG-CENTRAL",
      pickupLocation: "",
      destinationLocation: "",
      scheduledStartAt: formatDateTimeLocal(startsAt),
      hours: 2,
      vehicleId: "",
      vehicleDetails: "",
      specialNotes: ""
    };
  });

  useEffect(() => {
    if (!token) {
      router.replace("/login");
    }
  }, [router, token]);

  useEffect(() => {
    function syncActiveSection() {
      const hash = window.location.hash.replace("#", "").trim();
      setActiveSection(hash || "overview");
    }

    syncActiveSection();
    window.addEventListener("hashchange", syncActiveSection);

    return () => {
      window.removeEventListener("hashchange", syncActiveSection);
    };
  }, []);

  useEffect(() => {
    if (profile?.customerProfile?.vehicles?.length && !form.vehicleId) {
      setForm((current) => ({
        ...current,
        vehicleId: profile.customerProfile.vehicles[0].id
      }));
    }
  }, [form.vehicleId, profile]);

  const selectedZone = useMemo(
    () => defaultServiceZones.find((zone) => zone.code === form.zoneCode) ?? defaultServiceZones[0],
    [form.zoneCode]
  );

  const selectedVehicle = useMemo(
    () => profile?.customerProfile?.vehicles?.find((vehicle: any) => vehicle.id === form.vehicleId) ?? null,
    [form.vehicleId, profile]
  );

  const awaitingPaymentBookings = useMemo(
    () => bookings.filter((booking) => booking.status === "AWAITING_PAYMENT"),
    [bookings]
  );
  const upcomingBookings = useMemo(
    () => bookings.filter((booking) => ["PENDING", "ACCEPTED", "ENROUTE", "ACTIVE"].includes(String(booking.status))),
    [bookings]
  );
  const completedBookings = useMemo(() => bookings.filter((booking) => booking.status === "COMPLETED"), [bookings]);

  async function loadEstimate() {
    setEstimateBusy(true);
    setStatus("");

    try {
      const result = await customerFetch("/bookings/estimate", {
        method: "POST",
        body: JSON.stringify({
          scheduledStartAt: new Date(form.scheduledStartAt).toISOString(),
          expectedDurationMinutes: form.hours * 60,
          zoneCode: form.zoneCode,
          pickupLocation: form.pickupLocation,
          destinationLocation: form.destinationLocation
        })
      });

      setEstimate(result);
      setStatus("Estimate refreshed for this booking.");
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : "Unable to calculate estimate right now.");
    } finally {
      setEstimateBusy(false);
    }
  }

  async function createScheduledTrip() {
    setStatus("");

    try {
      const centerLat = selectedZone?.centerLat ?? 49.8951;
      const centerLng = selectedZone?.centerLng ?? -97.1384;

      await customerFetch("/bookings", {
        method: "POST",
        body: JSON.stringify({
          requestType: "LATER",
          pickupLocation: form.pickupLocation,
          pickupLat: centerLat,
          pickupLng: centerLng,
          destinationLocation: form.destinationLocation,
          destinationLat: centerLat + 0.015,
          destinationLng: centerLng + 0.015,
          scheduledStartAt: new Date(form.scheduledStartAt).toISOString(),
          expectedDurationMinutes: form.hours * 60,
          specialNotes: form.specialNotes || undefined,
          vehicleId: form.vehicleId || undefined,
          vehicleDetails: form.vehicleDetails || buildVehicleLabel(selectedVehicle) || undefined,
          zoneCode: form.zoneCode
        })
      });

      setEstimate(null);
      setStatus("Booking created. Payment is required before driver assignment begins.");
      await Promise.all([reloadBookings(), reloadProfile()]);
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : "Unable to create the scheduled trip right now.");
    }
  }

  async function cancelBooking(bookingId: string) {
    setBusyBookingId(bookingId);
    setStatus("");

    try {
      await customerFetch(`/bookings/${bookingId}/cancel`, {
        method: "POST"
      });
      setStatus("Booking cancelled successfully.");
      await reloadBookings();
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : "Unable to cancel this trip right now.");
    } finally {
      setBusyBookingId("");
    }
  }

  async function payNow(bookingId: string) {
    setPayingBookingId(bookingId);
    setStatus("");

    try {
      const origin = window.location.origin;
      const result = await customerFetch<{
        alreadyPaid?: boolean;
        checkoutUrl?: string | null;
      }>(`/payments/${bookingId}/checkout-session`, {
        method: "POST",
        body: JSON.stringify({
          successReturnUrl: `${origin}/payment-complete`,
          cancelReturnUrl: `${origin}/payment-cancelled`
        })
      });

      if (result.alreadyPaid) {
        setStatus("Payment has already been recorded for this booking.");
        await reloadBookings();
        return;
      }

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }

      throw new Error("Stripe checkout could not be opened right now.");
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : "Unable to start Stripe checkout right now.");
    } finally {
      setPayingBookingId("");
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f7fb_0%,#ffffff_42%,#f3f4f6_100%)] text-[#0F172A]">
      <div className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:items-start lg:grid-cols-[240px_1fr]">
        <aside className="h-fit rounded-[30px] border border-[#E5E7EB] bg-white/95 p-4 shadow-[0_24px_52px_-36px_rgba(15,23,42,0.3)] backdrop-blur lg:sticky lg:top-5 lg:self-start">
          <div className="rounded-[24px] bg-[linear-gradient(145deg,#0F172A,#1f2555_48%,#4338CA_100%)] p-5 text-white">
            <div className="text-lg font-semibold tracking-[-0.03em]">Customer account</div>
            <div className="mt-4 max-w-[12rem] rounded-full border border-white/12 bg-white/8 px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-white/70">
              ChaufX web access
            </div>
            <p className="mt-3 text-sm leading-6 text-white/80">
              Review bookings, complete payment, and schedule your next trip in one place.
            </p>
          </div>

          <nav className="mt-5 space-y-1.5">
            {[
              { href: "#overview", label: "Overview" },
              { href: "#schedule", label: "Schedule trip" },
              { href: "#awaiting-payment", label: "Awaiting payment" },
              { href: "#upcoming", label: "Upcoming trips" },
              { href: "#completed", label: "Completed trips" }
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
              clearStoredCustomerToken();
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
                  Welcome back{profile?.fullName ? `, ${profile.fullName.split(" ")[0]}` : ""}.
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Review upcoming travel, complete payment, and arrange future bookings from your online account.
                </p>
              </div>
              <div className="rounded-2xl border border-[#DCDDFF] bg-[#EEF0FF] px-4 py-3 text-sm text-[#4338CA]">
                Signed in as <span className="font-semibold">{profile?.email ?? "customer"}</span>
              </div>
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MiniStatCard title="Total trips" value={bookings.length} detail="Every booking tied to your customer account." />
            <MiniStatCard title="Awaiting payment" value={awaitingPaymentBookings.length} detail="Bookings that require payment before driver assignment." />
            <MiniStatCard title="Upcoming" value={upcomingBookings.length} detail="Bookings that are scheduled, assigned, or in progress." />
            <MiniStatCard title="Completed" value={completedBookings.length} detail="Completed bookings available in your history." tone="dark" />
          </div>

          {status ? <p className="rounded-2xl bg-[#EEF6FF] px-4 py-3 text-sm text-[#1D4ED8]">{status}</p> : null}
          {profileError ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{profileError}</p> : null}
          {bookingsError ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{bookingsError}</p> : null}

          <SectionPanel
            id="schedule"
            eyebrow="Schedule trip"
            title="Book a future trip"
            description="Enter your trip details, confirm the pickup region, and create the booking before payment."
            aside={
              <button
                type="button"
                onClick={loadEstimate}
                disabled={estimateBusy || !form.pickupLocation || !form.destinationLocation}
                className="rounded-full border border-[#D7DEEF] px-5 py-2.5 text-sm font-semibold text-[#2563EB] transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                {estimateBusy ? "Updating estimate..." : "Get estimate"}
              </button>
            }
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Pickup address</span>
                <input
                  value={form.pickupLocation}
                  onChange={(event) => setForm((current) => ({ ...current, pickupLocation: event.target.value }))}
                  className="w-full rounded-2xl border border-[#E5E7EB] px-4 py-2.5 outline-none transition focus:border-[#2563EB]"
                  placeholder="11 Grey Heron Drive, Winnipeg, Manitoba"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Destination address</span>
                <input
                  value={form.destinationLocation}
                  onChange={(event) => setForm((current) => ({ ...current, destinationLocation: event.target.value }))}
                  className="w-full rounded-2xl border border-[#E5E7EB] px-4 py-2.5 outline-none transition focus:border-[#2563EB]"
                  placeholder="The Forks, Winnipeg, Manitoba"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Date and time</span>
                <input
                  type="datetime-local"
                  value={form.scheduledStartAt}
                  onChange={(event) => setForm((current) => ({ ...current, scheduledStartAt: event.target.value }))}
                  className="w-full rounded-2xl border border-[#E5E7EB] px-4 py-2.5 outline-none transition focus:border-[#2563EB]"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Hours</span>
                <input
                  type="number"
                  min={2}
                  value={form.hours}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, hours: Math.max(2, Number(event.target.value) || 2) }))
                  }
                  className="w-full rounded-2xl border border-[#E5E7EB] px-4 py-2.5 outline-none transition focus:border-[#2563EB]"
                />
              </label>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1fr]">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Pickup service area</span>
                <select
                  value={form.zoneCode}
                  onChange={(event) => setForm((current) => ({ ...current, zoneCode: event.target.value }))}
                  className="w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 py-2.5 outline-none transition focus:border-[#2563EB]"
                >
                  {defaultServiceZones.map((zone) => (
                    <option key={zone.code} value={zone.code}>
                      {zone.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 max-w-[34rem] text-xs leading-5 text-slate-500">
                  Choose the area closest to the pickup so pricing and dispatch start from the right region.
                </p>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Saved vehicle</span>
                <select
                  value={form.vehicleId}
                  onChange={(event) => setForm((current) => ({ ...current, vehicleId: event.target.value }))}
                  className="w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 py-2.5 outline-none transition focus:border-[#2563EB]"
                >
                  <option value="">Select saved vehicle</option>
                  {(profile?.customerProfile?.vehicles ?? []).map((vehicle: any) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {buildVehicleLabel(vehicle)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Vehicle details override</span>
                <input
                  value={form.vehicleDetails}
                  onChange={(event) => setForm((current) => ({ ...current, vehicleDetails: event.target.value }))}
                  className="w-full rounded-2xl border border-[#E5E7EB] px-4 py-2.5 outline-none transition focus:border-[#2563EB]"
                  placeholder="Toyota Camry - midnight blue"
                />
              </label>
            </div>

            <label className="mt-3 block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Notes</span>
              <textarea
                value={form.specialNotes}
                onChange={(event) => setForm((current) => ({ ...current, specialNotes: event.target.value }))}
                className="min-h-[84px] w-full rounded-2xl border border-[#E5E7EB] px-4 py-3 outline-none transition focus:border-[#2563EB]"
                placeholder="Add pickup instructions, parking notes, or any special request."
              />
            </label>

            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3.5 text-sm leading-6 text-slate-600">
                {estimate ? (
                  <>
                    <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#4338CA]">Estimate</div>
                    <div className="mt-1.5 text-[1.9rem] font-semibold tracking-[-0.05em] text-slate-950">
                      {toCurrency(Number(estimate.fareEstimate), estimate.currency ?? "CAD")}
                    </div>
                    <p className="mt-2">
                      {estimate.pricingProvince}
                      {estimate.pricingCity ? ` · ${estimate.pricingCity}` : ""} · {estimate.billableHours} billed hour
                      {estimate.billableHours === 1 ? "" : "s"} at ${estimate.flatFeePerHour}/hour.
                    </p>
                  </>
                ) : (
                  "Select Get estimate first if you would like to preview the fare before creating the booking."
                )}
              </div>

              <button
                type="button"
                onClick={createScheduledTrip}
                disabled={estimateBusy || !form.pickupLocation || !form.destinationLocation}
                className="rounded-full bg-[#2563EB] px-6 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                Create booking
              </button>
            </div>
          </SectionPanel>

          <SectionPanel
            id="awaiting-payment"
            eyebrow="Awaiting payment"
            title="Bookings awaiting payment"
            description="These bookings remain on hold until payment is completed."
          >
            <TripTable
              rows={awaitingPaymentBookings}
              emptyTitle="No bookings awaiting payment"
              emptyDescription="Bookings awaiting payment will appear here with a payment action."
              emptyAccent="bg-amber-50 text-amber-700"
              onCancel={cancelBooking}
              onPayNow={payNow}
              payingBookingId={payingBookingId}
              busyBookingId={busyBookingId}
            />
          </SectionPanel>

          <SectionPanel
            id="upcoming"
            eyebrow="Upcoming"
            title="Scheduled and active trips"
            description="Your confirmed, assigned, and in-progress bookings."
            aside={
              <button
                type="button"
                onClick={() => reloadBookings()}
                className="rounded-full border border-[#D7DEEF] px-5 py-3 text-sm font-semibold text-[#2563EB]"
              >
                Refresh
              </button>
            }
          >
            {bookingsLoading ? (
              <p className="text-sm text-slate-500">Loading upcoming bookings...</p>
            ) : (
              <TripTable
                rows={upcomingBookings}
                emptyTitle="No upcoming bookings"
                emptyDescription="Scheduled, assigned, and active bookings will appear in this section."
                emptyAccent="bg-blue-50 text-blue-700"
                onCancel={cancelBooking}
                onPayNow={payNow}
                payingBookingId={payingBookingId}
                busyBookingId={busyBookingId}
              />
            )}
          </SectionPanel>

          <SectionPanel
            id="completed"
            eyebrow="Completed"
            title="Trip history"
            description="A record of your completed bookings."
          >
            {bookingsLoading ? (
              <p className="text-sm text-slate-500">Loading completed bookings...</p>
            ) : (
              <TripTable
                rows={completedBookings}
                emptyTitle="No completed bookings yet"
                emptyDescription="Completed bookings will appear here once each trip has finished."
                emptyAccent="bg-emerald-50 text-emerald-700"
                onCancel={cancelBooking}
                onPayNow={payNow}
                payingBookingId={payingBookingId}
                busyBookingId={busyBookingId}
              />
            )}
          </SectionPanel>
        </main>
      </div>
    </main>
  );
}
