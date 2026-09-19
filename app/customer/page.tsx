"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toCurrency } from "../../lib/config";
import { EmptyState, StatusPill } from "../../components/admin-primitives";
import {
  BookingsIcon,
  DashboardIcon,
  ReportsIcon,
  SettlementsIcon,
  SignOutIcon,
  TripsIcon,
  UsersIcon
} from "../../components/admin-icons";
import { clearStoredCustomerToken, customerFetch, getStoredCustomerToken, useCustomerResource } from "../../lib/api";

const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

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

function getMinimumScheduledStartAt() {
  const minimum = new Date(Date.now() + 60 * 60 * 1000);
  minimum.setSeconds(0, 0);
  minimum.setMinutes(minimum.getMinutes() + 1);
  return formatDateTimeLocal(minimum);
}

function formatScheduledTripSummary(value: string, hours: number) {
  const startsAt = new Date(value);
  if (Number.isNaN(startsAt.getTime())) {
    return "";
  }

  const endsAt = new Date(startsAt.getTime() + hours * 60 * 60 * 1000);
  const time = (date: Date) =>
    new Intl.DateTimeFormat("en-CA", { hour: "numeric", minute: "2-digit" })
      .format(date)
      .replace(/\./g, "")
      .replace(/\s/g, "");
  const date = `${String(startsAt.getDate()).padStart(2, "0")}-${startsAt.toLocaleString("en-CA", {
    month: "short"
  })}-${startsAt.getFullYear()}`;

  return `You are about to schedule a ${hours}-hour trip with ChaufX Driver from ${time(startsAt)} to ${time(endsAt)} on ${date}.`;
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

type MembershipTier = "BASIC" | "PLUS" | "CONCIERGE" | "CORPORATE";
type MembershipBillingCycle = "MONTHLY" | "ANNUAL";
type AddressField = "pickup" | "destination" | "home";
type AddressSuggestion = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
};

type VehicleDraft = {
  id: string;
  make: string;
  model: string;
  plateNumber: string;
  registrationProvince: string;
};

type CustomerAccountDraft = {
  fullName: string;
  phone: string;
  dateOfBirth: string;
  primaryAddress: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactEmail: string;
};

type GovernmentPhotoId = {
  fileName: string;
  fileUrl: string;
  mimeType: string;
};

type BookingPaymentChoice = {
  bookingId: string;
  amount: number;
  currency: string;
  interacInstructions?: {
    recipientEmail: string;
    reference: string;
    expiresAt: string;
  };
};

const emptyVehicleDraft: VehicleDraft = {
  id: "",
  make: "",
  model: "",
  plateNumber: "",
  registrationProvince: ""
};

const emptyCustomerAccountDraft: CustomerAccountDraft = {
  fullName: "",
  phone: "",
  dateOfBirth: "",
  primaryAddress: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  emergencyContactEmail: ""
};

async function searchCanadianAddresses(query: string) {
  if (!mapboxToken || query.trim().length < 3) {
    return [] as AddressSuggestion[];
  }

  const params = new URLSearchParams({
    access_token: mapboxToken,
    autocomplete: "true",
    limit: "5",
    language: "en",
    country: "ca",
    types: "address,poi,place,postcode"
  });
  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query.trim())}.json?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error("Unable to load address suggestions right now.");
  }

  const payload = await response.json();
  const features = Array.isArray(payload?.features) ? payload.features : [];

  return features
    .map((feature: any) => ({
      id: String(feature?.id ?? ""),
      label: String(feature?.place_name ?? feature?.text ?? "").trim(),
      latitude: Number(feature?.center?.[1]),
      longitude: Number(feature?.center?.[0])
    }))
    .filter(
      (suggestion: AddressSuggestion) =>
        suggestion.id && suggestion.label && Number.isFinite(suggestion.latitude) && Number.isFinite(suggestion.longitude)
    );
}

function calculateMembershipExpiry(start: Date, billingCycle: MembershipBillingCycle) {
  const expiry = new Date(start);
  const originalDay = start.getDate();

  expiry.setDate(1);
  if (billingCycle === "ANNUAL") {
    expiry.setFullYear(expiry.getFullYear() + 1);
  } else {
    expiry.setMonth(expiry.getMonth() + 1);
  }
  expiry.setDate(Math.min(originalDay, new Date(expiry.getFullYear(), expiry.getMonth() + 1, 0).getDate()));

  return expiry;
}

type InteracInstructions = {
  paymentId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  recipientEmail: string;
  expiresAt: string;
};

type MembershipAccount = {
  membership: {
    tier: MembershipTier;
    status: string;
    billingCycle: MembershipBillingCycle | null;
    hourlyRate: number;
    activatedAt: string | null;
    expiresAt: string | null;
  };
  payments: Array<{
    id: string;
    invoiceNumber: string;
    tier: MembershipTier;
    billingCycle: MembershipBillingCycle;
    method: "STRIPE" | "INTERAC";
    amount: number;
    currency: string;
    status: string;
    interacTransferConfirmedAt: string | null;
    createdAt: string;
  }>;
};

const membershipFallback: MembershipAccount = {
  membership: {
    tier: "BASIC",
    status: "ACTIVE",
    billingCycle: null,
    hourlyRate: 35,
    activatedAt: null,
    expiresAt: null
  },
  payments: []
};

const customerMembershipPlans: Array<{
  tier: Exclude<MembershipTier, "CORPORATE">;
  title: string;
  hourlyRate: number | null;
  monthlyFee: number;
  annualFee: number;
  details: string[];
}> = [
  {
    tier: "BASIC",
    title: "Basic",
    hourlyRate: null,
    monthlyFee: 0,
    annualFee: 0,
    details: ["Standard booking access"]
  },
  {
    tier: "PLUS",
    title: "Plus",
    hourlyRate: 29,
    monthlyFee: 100,
    annualFee: 999,
    details: ["Reduced hourly rate", "Priority booking", "Preferred driver selection"]
  },
  {
    tier: "CONCIERGE",
    title: "Concierge",
    hourlyRate: 25,
    monthlyFee: 200,
    annualFee: 2199,
    details: ["Best hourly rate", "Concierge booking support", "Priority high-demand dates"]
  }
];

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
  value: number | string;
  detail?: string;
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
      {detail ? <p className={`mt-3 text-sm leading-6 ${dark ? "text-white/78" : "text-slate-600"}`}>{detail}</p> : null}
    </div>
  );
}

function LoadingSpinner() {
  return <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />;
}

function MembershipPurchaseFlow({
  currentTier,
  currentBillingCycle,
  actionKey,
  onStripe,
  onDowngradeToBasic
}: {
  currentTier: MembershipTier;
  currentBillingCycle: MembershipBillingCycle | null;
  actionKey: string;
  onStripe: (tier: "PLUS" | "CONCIERGE", billingCycle: MembershipBillingCycle) => Promise<void>;
  onDowngradeToBasic: () => Promise<void>;
}) {
  const [tier, setTier] = useState<Exclude<MembershipTier, "CORPORATE">>(currentTier === "PLUS" ? "CONCIERGE" : "PLUS");
  const [billingCycle, setBillingCycle] = useState<MembershipBillingCycle>("MONTHLY");
  const [changingBilling, setChangingBilling] = useState(false);
  const plan = customerMembershipPlans.find((item) => item.tier === tier) ?? customerMembershipPlans[1];
  const isBusy = actionKey.startsWith(tier);
  const selectedPrice = billingCycle === "MONTHLY" ? plan.monthlyFee : plan.annualFee;
  const selectedActionKey = `${tier}:stripe:${billingCycle}`;
  const projectedMembershipExpiry = useMemo(() => calculateMembershipExpiry(new Date(), billingCycle), [billingCycle]);

  async function continueCheckout() {
    if (tier === "BASIC") {
      await onDowngradeToBasic();
      return;
    }

    await onStripe(tier, billingCycle);
  }

  return (
    <section className="mt-5 border-t border-[#E5E7EB] pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#4F46E5]">Change membership</div>
        {(currentTier === "PLUS" || currentTier === "CONCIERGE") && !changingBilling ? (
          <button
            type="button"
            onClick={() => {
              setTier(currentTier);
              setBillingCycle(currentBillingCycle === "ANNUAL" ? "MONTHLY" : "ANNUAL");
              setChangingBilling(true);
            }}
            className="rounded-full border border-[#2563EB] px-4 py-2 text-sm font-semibold text-[#2563EB] transition hover:bg-[#EEF6FF]"
          >
            Change billing
          </button>
        ) : null}
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {customerMembershipPlans.map((option) => {
          const selected = option.tier === tier;
          const current = option.tier === currentTier;

          return (
            <button
              key={option.tier}
              type="button"
              disabled={current}
              onClick={() => {
                setTier(option.tier);
                setChangingBilling(false);
              }}
              className={`rounded-[22px] border p-5 text-left transition ${
                current
                  ? "cursor-not-allowed border-[#E5E7EB] bg-slate-100 opacity-70"
                  : selected
                    ? "border-[#2563EB] bg-[#EEF6FF] shadow-sm"
                    : "border-[#E5E7EB] bg-white hover:border-[#B9C6E7]"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xl font-semibold tracking-[-0.04em] text-slate-950">{option.title}</div>
                  <div className="mt-1 text-sm text-slate-500">{option.details.join(" · ")}</div>
                </div>
                {current ? (
                  <div className="rounded-full bg-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-500">Current plan</div>
                ) : option.hourlyRate ? (
                  <div className="rounded-full bg-[#101A3F] px-3 py-1.5 text-sm font-semibold text-white">${option.hourlyRate}/hr</div>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-[24px] border border-[#DCE4F4] bg-[#F8FAFC] p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-400">{changingBilling ? "Change billing for" : "Selected plan"}</div>
            <div className="mt-1 text-xl font-semibold tracking-[-0.04em] text-slate-950">{plan.title}</div>
          </div>
          {tier !== "BASIC" ? <div className="text-right">
            <div className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-400">Total</div>
            <div className="mt-1 text-xl font-semibold tracking-[-0.04em] text-slate-950">{toCurrency(selectedPrice, "CAD")}</div>
          </div> : null}
        </div>

        {tier === "BASIC" ? (
          <button
            type="button"
            onClick={() => void continueCheckout()}
            disabled={actionKey === "basic"}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {actionKey === "basic" ? <><LoadingSpinner /> Updating...</> : "Switch to Basic"}
          </button>
        ) : <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div>
            <div className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-400">Billing</div>
            <div className="mt-2 grid grid-cols-2 gap-1 rounded-2xl border border-[#DCE4F4] bg-white p-1">
              {([
                ["MONTHLY", "Monthly"],
                ["ANNUAL", "Annual"]
              ] as const).map(([cycle, label]) => (
                <button
                  key={cycle}
                  type="button"
                  onClick={() => {
                    setBillingCycle(cycle);
                  }}
                  className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    billingCycle === cycle ? "bg-[#2563EB] text-white shadow-sm" : "text-slate-600 hover:bg-[#F1F5F9]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-2 text-sm text-slate-600">
              <span className="font-medium text-slate-950">Expiry date:</span>{" "}
              {projectedMembershipExpiry.toLocaleDateString("en-CA", {
                year: "numeric",
                month: "long",
                day: "numeric"
              })}
            </div>
          </div>

          <div className="flex flex-col justify-end">
            <button
              type="button"
              onClick={continueCheckout}
              disabled={isBusy}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2563EB] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {actionKey === selectedActionKey ? <><LoadingSpinner /> Opening Stripe...</> : "Continue with Stripe"}
            </button>
          </div>
        </div>}
      </div>
    </section>
  );
}

function TripEmptyCard({
  title,
  description
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-[#D9E1F2] bg-[linear-gradient(180deg,#F8FAFC_0%,#FFFFFF_100%)] p-6">
      <h3 className="text-lg font-semibold tracking-[-0.03em] text-slate-950">{title}</h3>
      {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p> : null}
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
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {booking.status === "AWAITING_PAYMENT" ? (
                <button
                  type="button"
                  onClick={() => onPayNow(booking.id)}
                  disabled={payingBookingId === booking.id}
                  className="inline-flex min-w-[116px] items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_-12px_rgba(37,99,235,0.9)] transition hover:bg-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#93C5FD] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {payingBookingId === booking.id ? <><LoadingSpinner /> Opening...</> : "Pay now"}
                </button>
              ) : null}
              {["AWAITING_PAYMENT", "PENDING", "ACCEPTED"].includes(String(booking.status)) ? (
                <button
                  type="button"
                  onClick={() => onCancel(booking.id)}
                  disabled={busyBookingId === booking.id}
                  className="inline-flex min-w-[92px] items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-100 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busyBookingId === booking.id ? <><LoadingSpinner /> Cancelling...</> : "Cancel"}
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
  onCancel,
  onPayNow,
  payingBookingId,
  busyBookingId
}: {
  rows: any[];
  emptyTitle: string;
  emptyDescription?: string;
  onCancel: (bookingId: string) => Promise<void>;
  onPayNow: (bookingId: string) => Promise<void>;
  payingBookingId: string;
  busyBookingId: string;
}) {
  const [search, setSearch] = useState("");
  const [requestType, setRequestType] = useState<"ALL" | "NOW" | "LATER">("ALL");
  const filteredRows = rows.filter((booking) => {
    const haystack = [
      booking.pickupLocation,
      booking.destinationLocation,
      booking.vehicleDetails,
      booking.assignedDriver?.user?.fullName
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesSearch = haystack.includes(search.trim().toLowerCase());
    const matchesType = requestType === "ALL" || booking.requestType === requestType;
    return matchesSearch && matchesType;
  });

  if (!rows.length) {
    return <TripEmptyCard title={emptyTitle} description={emptyDescription} />;
  }

  const hasActions = filteredRows.some((booking) =>
    booking.status === "AWAITING_PAYMENT" || ["PENDING", "ACCEPTED"].includes(String(booking.status))
  );

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search trips"
          className="min-w-0 flex-1 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[#2563EB]"
        />
        <select
          value={requestType}
          onChange={(event) => setRequestType(event.target.value as "ALL" | "NOW" | "LATER")}
          className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-[#2563EB]"
        >
          <option value="ALL">All trip types</option>
          <option value="NOW">Drive Me Now</option>
          <option value="LATER">Schedule later</option>
        </select>
      </div>
      {filteredRows.length ? <>
      <TripStack
        rows={filteredRows}
        onCancel={onCancel}
        onPayNow={onPayNow}
        payingBookingId={payingBookingId}
        busyBookingId={busyBookingId}
      />
      <div className="hidden overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white xl:block">
      <div className="overflow-x-auto">
        <table className="min-w-[1120px] table-fixed divide-y divide-[#E5E7EB]">
          <thead className="bg-[#F8FAFC]">
            <tr className="text-left">
              <th className={`${hasActions ? "w-[32%]" : "w-[47%]"} px-5 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400`}>Trip</th>
              <th className={`${hasActions ? "w-[18%]" : "w-[21%]"} px-4 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400`}>Start</th>
              <th className="w-[9%] px-4 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">Fare</th>
              <th className="w-[10%] px-4 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">Driver</th>
              <th className={`${hasActions ? "w-[14%]" : "w-[12%]"} px-4 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400`}>Status</th>
              {hasActions ? <th className="w-[17%] px-5 py-3 text-right text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">Actions</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEF2F7]">
            {filteredRows.map((booking) => (
              <tr key={booking.id} className="align-top">
                <td className="px-5 py-3.5">
                  <div className="truncate text-sm font-semibold leading-6 text-slate-950" title={routeLabel(booking)}>
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
                {hasActions ? <td className="px-5 py-3.5">
                  <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                    {booking.status === "AWAITING_PAYMENT" ? (
                      <button
                        type="button"
                        onClick={() => onPayNow(booking.id)}
                        disabled={payingBookingId === booking.id}
                        className="inline-flex min-w-[84px] items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-3 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_-12px_rgba(37,99,235,0.9)] transition hover:bg-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#93C5FD] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {payingBookingId === booking.id ? <><LoadingSpinner /> Opening...</> : "Pay now"}
                        </button>
                      ) : null}
                    {["AWAITING_PAYMENT", "PENDING", "ACCEPTED"].includes(String(booking.status)) ? (
                      <button
                        type="button"
                        onClick={() => onCancel(booking.id)}
                        disabled={busyBookingId === booking.id}
                        className="inline-flex min-w-[76px] items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-100 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {busyBookingId === booking.id ? <><LoadingSpinner /> Cancelling...</> : "Cancel"}
                      </button>
                    ) : null}
                  </div>
                </td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
      </> : <TripEmptyCard title="No trips match these filters" />}
    </>
  );
}

export default function CustomerPortalPage() {
  const router = useRouter();
  const token = getStoredCustomerToken();
  const [activeSection, setActiveSection] = useState("dashboard");
  const { data: profile, error: profileError, loading: profileLoading, reload: reloadProfile } = useCustomerResource<any | null>(
    "/users/me",
    null
  );
  const { data: bookings, error: bookingsError, loading: bookingsLoading, reload: reloadBookings } = useCustomerResource<any[]>(
    "/bookings",
    []
  );
  const {
    data: membershipAccount,
    error: membershipError,
    loading: membershipLoading,
    reload: reloadMembership
  } = useCustomerResource<MembershipAccount>("/memberships/me", membershipFallback);
  const [status, setStatus] = useState("");
  const [busyBookingId, setBusyBookingId] = useState("");
  const [payingBookingId, setPayingBookingId] = useState("");
  const [bookingPaymentChoice, setBookingPaymentChoice] = useState<BookingPaymentChoice | null>(null);
  const [bookingPaymentAction, setBookingPaymentAction] = useState("");
  const [bookingInteracConfirmed, setBookingInteracConfirmed] = useState(false);
  const [bookingInteracCurrentTime, setBookingInteracCurrentTime] = useState(() => Date.now());
  const [membershipAction, setMembershipAction] = useState("");
  const [dismissedMembershipPaymentIds, setDismissedMembershipPaymentIds] = useState<Set<string>>(() => new Set());
  const [awaitingPaymentTab, setAwaitingPaymentTab] = useState<"trips" | "membership">("trips");
  const [interacEmail, setInteracEmail] = useState("");
  const [activeAddressField, setActiveAddressField] = useState<AddressField | null>(null);
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [addressSearching, setAddressSearching] = useState(false);
  const [estimateBusy, setEstimateBusy] = useState(false);
  const [bookingCreating, setBookingCreating] = useState(false);
  const [estimate, setEstimate] = useState<any | null>(null);
  const [form, setForm] = useState<{
    zoneCode: string;
    pickupLocation: string;
    pickupLat: string;
    pickupLng: string;
    destinationLocation: string;
    destinationLat: string;
    destinationLng: string;
    scheduledStartAt: string;
    hours: number;
    vehicleId: string;
    specialNotes: string;
  }>(() => {
    return {
      zoneCode: "CANADA",
      pickupLocation: "",
      pickupLat: "",
      pickupLng: "",
      destinationLocation: "",
      destinationLat: "",
      destinationLng: "",
      scheduledStartAt: getMinimumScheduledStartAt(),
      hours: 2,
      vehicleId: "",
      specialNotes: ""
    };
  });

  const bookingInteracSecondsRemaining = bookingPaymentChoice?.interacInstructions
    ? Math.max(0, Math.ceil((new Date(bookingPaymentChoice.interacInstructions.expiresAt).getTime() - bookingInteracCurrentTime) / 1000))
    : 0;
  const bookingInteracCountdown = `${String(Math.floor(bookingInteracSecondsRemaining / 60)).padStart(2, "0")}:${String(
    bookingInteracSecondsRemaining % 60
  ).padStart(2, "0")}`;

  useEffect(() => {
    if (!bookingPaymentChoice?.interacInstructions || bookingInteracConfirmed) {
      return;
    }

    setBookingInteracCurrentTime(Date.now());
    const interval = window.setInterval(() => setBookingInteracCurrentTime(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [bookingInteracConfirmed, bookingPaymentChoice?.interacInstructions]);
  const [vehicleDraft, setVehicleDraft] = useState<VehicleDraft>(emptyVehicleDraft);
  const [vehicleFormOpen, setVehicleFormOpen] = useState(false);
  const [vehicleSaving, setVehicleSaving] = useState(false);
  const [vehicleDeletingId, setVehicleDeletingId] = useState("");
  const [customerAccountDraft, setCustomerAccountDraft] = useState<CustomerAccountDraft>(emptyCustomerAccountDraft);
  const [customerAccountSaving, setCustomerAccountSaving] = useState(false);
  const [governmentPhotoId, setGovernmentPhotoId] = useState<GovernmentPhotoId | null>(null);

  useEffect(() => {
    if (!token) {
      router.replace("/login");
    }
  }, [router, token]);

  useEffect(() => {
    function syncActiveSection() {
      const hash = window.location.hash.replace("#", "").trim();
      setActiveSection(hash || "dashboard");
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

  useEffect(() => {
    if (profile?.email && !interacEmail) {
      setInteracEmail(profile.email);
    }
  }, [interacEmail, profile?.email]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    const customerProfile = profile.customerProfile;
    setCustomerAccountDraft({
      fullName: profile.fullName ?? "",
      phone: profile.phone ?? "",
      dateOfBirth: customerProfile?.dateOfBirth ? String(customerProfile.dateOfBirth).slice(0, 10) : "",
      primaryAddress: customerProfile?.primaryAddress ?? "",
      emergencyContactName: customerProfile?.emergencyContactName ?? "",
      emergencyContactPhone: customerProfile?.emergencyContactPhone ?? "",
      emergencyContactEmail: customerProfile?.emergencyContactEmail ?? ""
    });
  }, [profile]);

  useEffect(() => {
    if (!activeAddressField || !mapboxToken) {
      setAddressSuggestions([]);
      setAddressSearching(false);
      return;
    }

    const query =
      activeAddressField === "pickup"
        ? form.pickupLocation
        : activeAddressField === "destination"
          ? form.destinationLocation
          : customerAccountDraft.primaryAddress;
    if (query.trim().length < 3) {
      setAddressSuggestions([]);
      setAddressSearching(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setAddressSearching(true);
      try {
        const suggestions = await searchCanadianAddresses(query);
        if (!cancelled) {
          setAddressSuggestions(suggestions);
        }
      } catch {
        if (!cancelled) {
          setAddressSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setAddressSearching(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeAddressField, customerAccountDraft.primaryAddress, form.destinationLocation, form.pickupLocation]);

  useEffect(() => {
    const coordinates = [form.pickupLat, form.pickupLng, form.destinationLat, form.destinationLng].map(Number);
    const canCalculate =
      Boolean(form.pickupLocation && form.destinationLocation && form.scheduledStartAt) && coordinates.every(Number.isFinite);

    if (!canCalculate) {
      setEstimate(null);
      return;
    }

    setEstimate(null);
    const timer = window.setTimeout(() => {
      void loadEstimate({ silent: true });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [form.destinationLat, form.destinationLng, form.destinationLocation, form.hours, form.pickupLat, form.pickupLng, form.pickupLocation, form.scheduledStartAt]);

  const selectedVehicle = useMemo(
    () => profile?.customerProfile?.vehicles?.find((vehicle: any) => vehicle.id === form.vehicleId) ?? null,
    [form.vehicleId, profile]
  );

  const awaitingPaymentBookings = useMemo(
    () => bookings.filter((booking) => booking.status === "AWAITING_PAYMENT"),
    [bookings]
  );
  const awaitingMembershipPayments = useMemo(
    () => membershipAccount.payments.filter((payment) => payment.status === "PENDING" && !dismissedMembershipPaymentIds.has(payment.id)),
    [dismissedMembershipPaymentIds, membershipAccount.payments]
  );
  const upcomingBookings = useMemo(
    () => bookings.filter((booking) => ["PENDING", "ACCEPTED", "ENROUTE", "ACTIVE"].includes(String(booking.status))),
    [bookings]
  );
  const completedBookings = useMemo(() => bookings.filter((booking) => booking.status === "COMPLETED"), [bookings]);
  const totalPaid = useMemo(
    () =>
      bookings.reduce(
        (total, booking) =>
          String(booking.payment?.status).toUpperCase() === "RECORDED" ? total + Number(booking.payment?.amount ?? 0) : total,
        0
      ),
    [bookings]
  );

  async function loadEstimate({ silent = false }: { silent?: boolean } = {}) {
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
          destinationLocation: form.destinationLocation,
          pickupLat: Number(form.pickupLat) || undefined,
          pickupLng: Number(form.pickupLng) || undefined
        })
      });

      setEstimate(result);
    } catch (reason) {
      setEstimate(null);
      if (!silent) {
        setStatus(reason instanceof Error ? reason.message : "Unable to calculate estimate right now.");
      }
    } finally {
      setEstimateBusy(false);
    }
  }

  async function createScheduledTrip() {
    setBookingCreating(true);
    setStatus("");

    try {
      const pickupLat = Number(form.pickupLat);
      const pickupLng = Number(form.pickupLng);
      const destinationLat = Number(form.destinationLat);
      const destinationLng = Number(form.destinationLng);

      if (![pickupLat, pickupLng, destinationLat, destinationLng].every(Number.isFinite)) {
        throw new Error("Select the pickup and destination from the address suggestions.");
      }

      const minimumScheduledStartAt = getMinimumScheduledStartAt();
      const selectedStartAt = new Date(form.scheduledStartAt);
      const scheduledStartAt =
        Number.isNaN(selectedStartAt.getTime()) || selectedStartAt < new Date(minimumScheduledStartAt)
          ? new Date(minimumScheduledStartAt)
          : selectedStartAt;

      if (scheduledStartAt.getTime() !== selectedStartAt.getTime()) {
        setForm((current) => ({ ...current, scheduledStartAt: minimumScheduledStartAt }));
      }

      const result = await customerFetch<{
        booking?: { id?: string; fareEstimate?: number; currency?: string };
        reusedPendingBooking?: boolean;
      }>("/bookings", {
        method: "POST",
        body: JSON.stringify({
          requestType: "LATER",
          pickupLocation: form.pickupLocation,
          pickupLat,
          pickupLng,
          destinationLocation: form.destinationLocation,
          destinationLat,
          destinationLng,
          scheduledStartAt: scheduledStartAt.toISOString(),
          expectedDurationMinutes: form.hours * 60,
          specialNotes: form.specialNotes || undefined,
          vehicleId: form.vehicleId || undefined,
          vehicleDetails: buildVehicleLabel(selectedVehicle) || undefined,
          zoneCode: form.zoneCode
        })
      });

      const bookingId = result.booking?.id;
      if (!bookingId) {
        throw new Error("Booking was created, but payment could not be started. Please try again.");
      }

      if (result.reusedPendingBooking) {
        setEstimate(null);
        setBookingPaymentChoice(null);
        window.location.hash = "awaiting-payment";
        setStatus("An identical booking is already awaiting payment.");
        await reloadBookings();
        return;
      }

      const amount = Number(result.booking?.fareEstimate ?? estimate?.fareEstimate ?? 0);
      setEstimate(null);
      setBookingInteracConfirmed(false);
      setBookingPaymentChoice({ bookingId, amount, currency: result.booking?.currency ?? "CAD" });
      await Promise.all([reloadBookings(), reloadProfile()]);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Unable to create the scheduled trip right now.";
      if (message.includes("before booking.")) {
        window.location.hash = "account";
        setStatus(message);
        return;
      }
      setStatus(message);
    } finally {
      setBookingCreating(false);
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
          cancelReturnUrl: `${origin}/customer#awaiting-payment`
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

  async function requestBookingInterac() {
    if (!bookingPaymentChoice) {
      return;
    }

    setBookingPaymentAction("interac");
    setStatus("");
    try {
      const result = await customerFetch<{
        alreadyPaid?: boolean;
        instructions?: { recipientEmail: string; reference: string; amount: number; currency: string; expiresAt: string };
      }>(`/payments/${bookingPaymentChoice.bookingId}/interac-instructions`, { method: "POST" });

      if (result.alreadyPaid) {
        setBookingPaymentChoice(null);
        setStatus("Payment has already been recorded for this booking.");
        await reloadBookings();
        return;
      }

      if (!result.instructions) {
        throw new Error("Unable to create e-transfer instructions right now.");
      }

      setBookingPaymentChoice((current) =>
        current
          ? {
              ...current,
              amount: result.instructions!.amount,
              currency: result.instructions!.currency,
              interacInstructions: {
                recipientEmail: result.instructions!.recipientEmail,
                reference: result.instructions!.reference,
                expiresAt: result.instructions!.expiresAt
              }
            }
          : current
      );
      setBookingInteracConfirmed(false);
      await reloadBookings();
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : "Unable to create e-transfer instructions right now.");
    } finally {
      setBookingPaymentAction("");
    }
  }

  async function confirmBookingInteracTransfer() {
    if (!bookingPaymentChoice) {
      return;
    }

    setBookingPaymentAction("confirm-interac");
    setStatus("");
    try {
      const result = await customerFetch<{ message?: string }>(
        `/payments/${bookingPaymentChoice.bookingId}/interac-confirmation`,
        { method: "POST" }
      );
      setBookingInteracConfirmed(true);
      setStatus(result.message ?? "Booking submitted. Awaiting ChaufX payment confirmation before driver routing.");
      await reloadBookings();
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : "Unable to confirm the e-transfer right now.");
    } finally {
      setBookingPaymentAction("");
    }
  }

  async function startMembershipStripe(tier: "PLUS" | "CONCIERGE", billingCycle: MembershipBillingCycle) {
    setMembershipAction(`${tier}:stripe:${billingCycle}`);
    setStatus("");

    try {
      const origin = window.location.origin;
      const result = await customerFetch<{ checkoutUrl?: string | null }>("/memberships/stripe-checkout-session", {
        method: "POST",
        body: JSON.stringify({
          tier,
          billingCycle,
          successReturnUrl: `${origin}/customer#membership`,
          cancelReturnUrl: `${origin}/customer#membership`
        })
      });

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }

      throw new Error("Stripe checkout could not be opened right now.");
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : "Unable to start membership checkout right now.");
    } finally {
      setMembershipAction("");
    }
  }

  async function cancelMembershipPayment(paymentId: string) {
    setMembershipAction(`cancel:${paymentId}`);
    setStatus("");

    try {
      await customerFetch(`/memberships/${paymentId}/cancel`, { method: "POST" });
      setDismissedMembershipPaymentIds((current) => new Set([...current, paymentId]));
      setStatus("Membership payment cancelled.");
      await reloadMembership();
    } catch (reason) {
      setDismissedMembershipPaymentIds((current) => {
        const next = new Set(current);
        next.delete(paymentId);
        return next;
      });
      setStatus(reason instanceof Error ? reason.message : "Unable to cancel the membership payment right now.");
    } finally {
      setMembershipAction("");
    }
  }

  async function requestMembershipInterac(
    tier: "PLUS" | "CONCIERGE",
    billingCycle: MembershipBillingCycle
  ): Promise<InteracInstructions> {
    setMembershipAction(`${tier}:interac:${billingCycle}`);
    setStatus("");

    try {
      const result = await customerFetch<{
        instructions: {
          paymentId: string;
          invoiceNumber: string;
          amount: number;
          currency: string;
          recipientEmail: string;
          expiresAt: string;
        };
      }>("/memberships/interac-request", {
        method: "POST",
        body: JSON.stringify({
          tier,
          billingCycle,
          interacEmail
        })
      });

      await reloadMembership();
      return result.instructions;
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : "Unable to create the Interac request right now.");
      throw reason;
    } finally {
      setMembershipAction("");
    }
  }

  async function confirmMembershipInterac(paymentId: string) {
    setStatus("");

    try {
      await customerFetch(`/memberships/${paymentId}/interac-confirm`, {
        method: "POST"
      });
      setStatus("Transfer confirmation received.");
      await reloadMembership();
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Unable to confirm the e-transfer.";
      setStatus(message);
      throw reason;
    }
  }

  function applyAddressSuggestion(field: AddressField, suggestion: AddressSuggestion) {
    setForm((current) => ({
      ...current,
      ...(field === "pickup"
        ? {
            pickupLocation: suggestion.label,
            pickupLat: String(suggestion.latitude),
            pickupLng: String(suggestion.longitude)
          }
        : field === "destination"
          ? {
            destinationLocation: suggestion.label,
            destinationLat: String(suggestion.latitude),
            destinationLng: String(suggestion.longitude)
          }
          : {})
    }));
    if (field === "home") {
      setCustomerAccountDraft((current) => ({ ...current, primaryAddress: suggestion.label }));
    }
    setAddressSuggestions([]);
    setActiveAddressField(null);
  }

  async function saveVehicle() {
    const payload = {
      make: vehicleDraft.make.trim(),
      model: vehicleDraft.model.trim(),
      plateNumber: vehicleDraft.plateNumber.trim(),
      registrationProvince: vehicleDraft.registrationProvince.trim(),
      isPrimary: true
    };

    if (!Object.values(payload).every(Boolean)) {
      setStatus("Complete the vehicle details.");
      return;
    }

    setVehicleSaving(true);
    setStatus("");
    try {
      const vehicle = await customerFetch<{ id: string }>(
        vehicleDraft.id ? `/users/me/vehicles/${vehicleDraft.id}` : "/users/me/vehicles",
        {
          method: vehicleDraft.id ? "PATCH" : "POST",
          body: JSON.stringify(payload)
        }
      );
      setForm((current) => ({ ...current, vehicleId: vehicle.id }));
      setVehicleDraft(emptyVehicleDraft);
      setVehicleFormOpen(false);
      await reloadProfile();
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : "Unable to save the vehicle.");
    } finally {
      setVehicleSaving(false);
    }
  }

  async function deleteVehicle(vehicleId: string) {
    if (!window.confirm("Remove this vehicle?")) {
      return;
    }

    setVehicleDeletingId(vehicleId);
    setStatus("");
    try {
      await customerFetch(`/users/me/vehicles/${vehicleId}`, { method: "DELETE" });
      setForm((current) => (current.vehicleId === vehicleId ? { ...current, vehicleId: "" } : current));
      setVehicleDraft((current) => (current.id === vehicleId ? emptyVehicleDraft : current));
      setVehicleFormOpen((current) => (vehicleDraft.id === vehicleId ? false : current));
      await reloadProfile();
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : "Unable to remove the vehicle.");
    } finally {
      setVehicleDeletingId("");
    }
  }

  async function saveCustomerAccount() {
    setCustomerAccountSaving(true);
    setStatus("");
    try {
      await customerFetch("/users/me", {
        method: "PATCH",
        body: JSON.stringify({ fullName: customerAccountDraft.fullName.trim() })
      });
      await customerFetch("/users/me/customer-profile", {
        method: "PATCH",
        body: JSON.stringify({
          phone: customerAccountDraft.phone.trim() || undefined,
          dateOfBirth: customerAccountDraft.dateOfBirth || undefined,
          primaryAddress: customerAccountDraft.primaryAddress.trim() || undefined,
          emergencyContactName: customerAccountDraft.emergencyContactName.trim() || undefined,
          emergencyContactPhone: customerAccountDraft.emergencyContactPhone.trim() || undefined,
          emergencyContactEmail: customerAccountDraft.emergencyContactEmail.trim() || undefined,
          ...(governmentPhotoId ? { governmentPhotoId } : {})
        })
      });
      setStatus("Account saved.");
      setGovernmentPhotoId(null);
      await reloadProfile();
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : "Unable to save the account.");
    } finally {
      setCustomerAccountSaving(false);
    }
  }

  async function selectGovernmentPhotoId(file: File | null) {
    if (!file) {
      return;
    }
    if (file.size > 7 * 1024 * 1024) {
      setStatus("Government photo ID files must be 7 MB or smaller.");
      return;
    }

    try {
      const fileUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Unable to read the government photo ID."));
        reader.readAsDataURL(file);
      });
      setGovernmentPhotoId({ fileName: file.name, fileUrl, mimeType: file.type || "application/octet-stream" });
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : "Unable to select the government photo ID.");
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f7fb_0%,#ffffff_42%,#f3f4f6_100%)] text-[#0F172A]">
      <div className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:items-start lg:grid-cols-[240px_1fr]">
        <aside className="h-fit rounded-[30px] border border-[#E5E7EB] bg-white/95 p-4 shadow-[0_24px_52px_-36px_rgba(15,23,42,0.3)] backdrop-blur lg:sticky lg:top-5 lg:self-start">
          <div className="rounded-[24px] bg-[linear-gradient(145deg,#0F172A,#1f2555_48%,#4338CA_100%)] p-5 text-white">
            <div className="max-w-[15rem] rounded-full border border-white/12 bg-white/8 px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-white/70">
              ChaufX Customer Web Platform
            </div>
          </div>

          <nav className="mt-5 space-y-1.5">
            {[
              { href: "#dashboard", label: "Dashboard", icon: DashboardIcon },
              { href: "#membership", label: "Membership", icon: SettlementsIcon },
              { href: "#schedule", label: "Schedule trip", icon: BookingsIcon },
              { href: "#awaiting-payment", label: "Awaiting payment", icon: SettlementsIcon },
              { href: "#upcoming", label: "Upcoming trips", icon: TripsIcon },
              { href: "#completed", label: "Completed trips", icon: ReportsIcon },
              { href: "#account", label: "Account", icon: UsersIcon }
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
                <span className="flex items-center gap-3">
                  <item.icon className="h-4.5 w-4.5" />
                  {item.label}
                </span>
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
            <SignOutIcon className="mr-2 h-4.5 w-4.5" />
            Sign out
          </button>
        </aside>

        <main className="space-y-6">
          {activeSection === "dashboard" ? (
            <>
              <section
                id="dashboard"
                className="rounded-[32px] border border-[#E5E7EB] bg-white/90 p-5 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.22)] backdrop-blur md:p-6"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h1 className="text-[1.9rem] font-semibold tracking-[-0.05em]">
                      <span className="mr-2 text-lg font-normal tracking-normal text-slate-600">Welcome back</span>
                      {profile?.fullName ? profile.fullName.split(" ")[0] : ""}
                    </h1>
                  </div>
                </div>
              </section>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <MiniStatCard title="Total trips" value={bookings.length} />
                <MiniStatCard title="Awaiting payment" value={awaitingPaymentBookings.length} />
                <MiniStatCard title="Upcoming" value={upcomingBookings.length} />
                <MiniStatCard title="Completed" value={completedBookings.length} tone="dark" />
                <MiniStatCard title="Membership" value={statusLabel(membershipAccount.membership.tier)} />
                <MiniStatCard title="Total paid" value={toCurrency(totalPaid, "CAD")} tone="dark" />
              </div>
            </>
          ) : null}

          {status ? <p className="rounded-2xl bg-[#EEF6FF] px-4 py-3 text-sm text-[#1D4ED8]">{status}</p> : null}
          {profileError ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{profileError}</p> : null}
          {bookingsError ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{bookingsError}</p> : null}
          {membershipError ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{membershipError}</p> : null}

          {bookingPaymentChoice ? (
            <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-5">
              <section className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-label="Choose payment method">
                <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#4338CA]">Payment</div>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-slate-950">Complete payment</h2>
                <div className="mt-3 text-3xl font-semibold tracking-[-0.06em] text-slate-950">
                  {toCurrency(bookingPaymentChoice.amount, bookingPaymentChoice.currency)}
                </div>

                {bookingPaymentChoice.interacInstructions ? (
                  <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-slate-700">
                    <div>Send payment to <span className="font-semibold">{bookingPaymentChoice.interacInstructions.recipientEmail}</span></div>
                    <div>Reference: <span className="font-semibold">{bookingPaymentChoice.interacInstructions.reference}</span></div>
                    {bookingInteracConfirmed ? (
                      <>
                        <div className="mt-3 font-semibold text-emerald-800">Booking submitted successfully.</div>
                        <p className="mt-1">Awaiting ChaufX payment confirmation before this request is routed to available drivers.</p>
                      </>
                    ) : (
                      <>
                        <div className="mt-3 font-semibold text-slate-950">Time remaining: {bookingInteracCountdown}</div>
                        {bookingInteracSecondsRemaining === 0 ? (
                          <button
                            type="button"
                            onClick={() => void requestBookingInterac()}
                            disabled={Boolean(bookingPaymentAction)}
                            className="mt-3 inline-flex items-center justify-center gap-2 rounded-full border border-amber-400 bg-white px-3.5 py-2 text-sm font-semibold text-amber-800 disabled:opacity-50"
                          >
                            {bookingPaymentAction === "interac" ? <><LoadingSpinner /> Preparing...</> : "Create new e-transfer details"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void confirmBookingInteracTransfer()}
                            disabled={Boolean(bookingPaymentAction)}
                            className="mt-3 inline-flex items-center justify-center gap-2 rounded-full bg-[#166534] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[#14532D] disabled:opacity-50"
                          >
                            {bookingPaymentAction === "confirm-interac" ? <><LoadingSpinner /> Confirming...</> : "Confirm payment sent"}
                          </button>
                        )}
                      </>
                    )}
                    {bookingInteracConfirmed ? (
                      <button
                        type="button"
                        onClick={() => {
                          setBookingPaymentChoice(null);
                          window.location.hash = "awaiting-payment";
                        }}
                        className="mt-4 inline-flex items-center justify-center rounded-full bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white"
                      >
                        View awaiting payment
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-5">
                    <button
                      type="button"
                      onClick={() => {
                        setBookingPaymentAction("stripe");
                        void payNow(bookingPaymentChoice.bookingId).finally(() => setBookingPaymentAction(""));
                      }}
                      disabled={Boolean(bookingPaymentAction)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {bookingPaymentAction === "stripe" ? <><LoadingSpinner /> Opening Stripe...</> : "Pay with Stripe"}
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setBookingPaymentChoice(null)}
                  className="mt-5 text-sm font-semibold text-slate-600"
                >
                  Close
                </button>
              </section>
            </div>
          ) : null}

          {activeSection === "account" ? (
            <SectionPanel
              id="account"
              eyebrow="Account"
              title="Profile and vehicles"
            >
              <div className="rounded-[24px] border border-[#E5E7EB] bg-[#F8FAFC] p-4">
                <h3 className="text-lg font-semibold text-slate-950">Personal details</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="block md:col-span-2">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Full legal name</span>
                    <input
                      value={customerAccountDraft.fullName}
                      onChange={(event) => setCustomerAccountDraft((current) => ({ ...current, fullName: event.target.value }))}
                      className="w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 py-2.5 outline-none transition focus:border-[#2563EB]"
                    />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Email</span>
                    <input
                      value={profile?.email ?? ""}
                      readOnly
                      className="w-full rounded-2xl border border-[#E5E7EB] bg-slate-100 px-4 py-2.5 text-slate-600"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Mobile phone</span>
                    <input
                      type="tel"
                      value={customerAccountDraft.phone}
                      onChange={(event) => setCustomerAccountDraft((current) => ({ ...current, phone: event.target.value }))}
                      placeholder="+12045550101"
                      className="w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 py-2.5 outline-none transition focus:border-[#2563EB]"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Date of birth</span>
                    <input
                      type="date"
                      value={customerAccountDraft.dateOfBirth}
                      onChange={(event) => setCustomerAccountDraft((current) => ({ ...current, dateOfBirth: event.target.value }))}
                      className="w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 py-2.5 outline-none transition focus:border-[#2563EB]"
                    />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Home address</span>
                    <div className="relative">
                      <input
                        value={customerAccountDraft.primaryAddress}
                        onFocus={() => setActiveAddressField("home")}
                        onChange={(event) => {
                          setActiveAddressField("home");
                          setCustomerAccountDraft((current) => ({ ...current, primaryAddress: event.target.value }));
                        }}
                        onBlur={() => window.setTimeout(() => setActiveAddressField(null), 150)}
                        className="w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 py-2.5 outline-none transition focus:border-[#2563EB]"
                        autoComplete="street-address"
                      />
                      {activeAddressField === "home" && (addressSearching || addressSuggestions.length > 0) ? (
                        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_24px_70px_-45px_rgba(15,23,42,0.35)]">
                          {addressSearching ? <div className="px-4 py-3 text-sm text-slate-500">Searching addresses...</div> : null}
                          {!addressSearching
                            ? addressSuggestions.map((suggestion) => (
                                <button
                                  key={suggestion.id}
                                  type="button"
                                  className="block w-full border-b border-[#EEF2FF] px-4 py-3 text-left text-sm text-slate-700 transition last:border-b-0 hover:bg-[#F8FAFC]"
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => applyAddressSuggestion("home", suggestion)}
                                >
                                  {suggestion.label}
                                </button>
                              ))
                            : null}
                        </div>
                      ) : null}
                    </div>
                  </label>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-950">Emergency contact</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Name</span>
                    <input
                      value={customerAccountDraft.emergencyContactName}
                      onChange={(event) =>
                        setCustomerAccountDraft((current) => ({ ...current, emergencyContactName: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 py-2.5 outline-none transition focus:border-[#2563EB]"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Phone</span>
                    <input
                      type="tel"
                      value={customerAccountDraft.emergencyContactPhone}
                      onChange={(event) =>
                        setCustomerAccountDraft((current) => ({ ...current, emergencyContactPhone: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 py-2.5 outline-none transition focus:border-[#2563EB]"
                    />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Email</span>
                    <input
                      type="email"
                      value={customerAccountDraft.emergencyContactEmail}
                      onChange={(event) =>
                        setCustomerAccountDraft((current) => ({ ...current, emergencyContactEmail: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 py-2.5 outline-none transition focus:border-[#2563EB]"
                    />
                  </label>
                </div>
                <div className="mt-5">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Government issued photo ID</span>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="cursor-pointer rounded-full border border-[#D7DEEF] bg-white px-4 py-2 text-sm font-semibold text-[#2563EB]">
                      {governmentPhotoId || profile?.customerProfile?.identityDocument ? "Replace photo ID" : "Select photo ID"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
                        className="sr-only"
                        onChange={(event) => void selectGovernmentPhotoId(event.target.files?.[0] ?? null)}
                      />
                    </label>
                    <span className="text-sm text-slate-600">
                      {governmentPhotoId?.fileName ?? profile?.customerProfile?.identityDocument?.fileName ?? "No photo ID selected"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={saveCustomerAccount}
                  disabled={customerAccountSaving}
                  className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                    {customerAccountSaving ? <><LoadingSpinner /> Saving...</> : "Save"}
                </button>
              </div>

              <div className="mt-6 flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-slate-950">Your vehicles</h3>
                <button
                  type="button"
                  onClick={() => {
                    setVehicleDraft(emptyVehicleDraft);
                    setVehicleFormOpen(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-[#D7DEEF] bg-white px-4 py-2 text-sm font-semibold text-[#2563EB]"
                >
                  <span aria-hidden="true" className="text-lg leading-none">+</span>
                  Add vehicle
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {(profile?.customerProfile?.vehicles ?? []).map((vehicle: any) => (
                  <article key={vehicle.id} className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-950">{buildVehicleLabel(vehicle)}</h3>
                        <p className="mt-1 text-sm text-slate-600">{vehicle.registrationProvince || "Province not set"}</p>
                      </div>
                      {vehicle.isPrimary ? <StatusPill label="Primary" tone="emerald" /> : null}
                    </div>
                    <div className="mt-4 flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setVehicleDraft({
                            id: vehicle.id,
                            make: vehicle.make ?? "",
                            model: vehicle.model ?? "",
                            plateNumber: vehicle.plateNumber ?? "",
                            registrationProvince: vehicle.registrationProvince ?? ""
                          });
                          setVehicleFormOpen(true);
                        }}
                        className="text-sm font-semibold text-[#2563EB]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteVehicle(vehicle.id)}
                        disabled={vehicleDeletingId === vehicle.id}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-rose-600 disabled:opacity-50"
                      >
                        {vehicleDeletingId === vehicle.id ? <><LoadingSpinner /> Removing...</> : "Remove"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              {(profile?.customerProfile?.vehicles ?? []).length === 0 ? (
                <EmptyState title="No vehicles saved" description="Add a vehicle to use it when scheduling a trip." />
              ) : null}

              {vehicleFormOpen ? <div className="mt-4 rounded-[24px] border border-[#E5E7EB] bg-white p-4">
                <h3 className="text-lg font-semibold text-slate-950">{vehicleDraft.id ? "Edit vehicle" : "Add vehicle"}</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {([
                    ["make", "Vehicle make"],
                    ["model", "Vehicle model"],
                    ["plateNumber", "Licence plate"],
                    ["registrationProvince", "Registration province"]
                  ] as Array<[keyof Omit<VehicleDraft, "id">, string]>).map(([field, label]) => (
                    <label key={field} className="block">
                      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
                      <input
                        value={vehicleDraft[field]}
                        onChange={(event) => setVehicleDraft((current) => ({ ...current, [field]: event.target.value }))}
                        className="w-full rounded-2xl border border-[#E5E7EB] px-4 py-2.5 outline-none transition focus:border-[#2563EB]"
                      />
                    </label>
                  ))}
                </div>
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={saveVehicle}
                    disabled={vehicleSaving}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {vehicleSaving ? <><LoadingSpinner /> Saving...</> : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setVehicleDraft(emptyVehicleDraft);
                      setVehicleFormOpen(false);
                    }}
                    className="rounded-full border border-[#D7DEEF] px-5 py-2.5 text-sm font-semibold text-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              </div> : null}
            </SectionPanel>
          ) : null}

          {activeSection === "membership" ? <SectionPanel
            id="membership"
            eyebrow="Membership"
            title="Pricing and membership"
          >
            <div className="space-y-4">
              <div className="rounded-[26px] border border-[#E5E7EB] bg-[linear-gradient(180deg,#F8FAFC_0%,#FFFFFF_100%)] p-5">
                <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#4338CA]">Current plan</div>
                {membershipLoading ? (
                  <p className="mt-4 text-sm text-slate-500">Loading membership...</p>
                ) : (
                  <>
                    <h3 className="mt-2 text-3xl font-semibold tracking-[-0.06em] text-slate-950">
                      {statusLabel(membershipAccount.membership.tier)}
                    </h3>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3">
                        <div className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-400">Hourly rate</div>
                        <div className="mt-1 text-xl font-semibold tracking-[-0.04em] text-slate-950">
                          {toCurrency(membershipAccount.membership.hourlyRate, "CAD")}/hour
                        </div>
                      </div>
                      <div className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3">
                        <div className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-400">Status</div>
                        <div className="mt-1 text-xl font-semibold tracking-[-0.04em] text-slate-950">
                          {statusLabel(membershipAccount.membership.status)}
                        </div>
                      </div>
                    </div>
                    {membershipAccount.membership.expiresAt ? (
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        Active through {formatDate(membershipAccount.membership.expiresAt)}.
                      </p>
                    ) : null}
                  </>
                )}

                {membershipAccount.payments[0] ? (
                  <div className="mt-4 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm leading-6 text-slate-600">
                    <div className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-400">Latest invoice</div>
                    <div className="mt-1 font-semibold text-slate-950">{membershipAccount.payments[0].invoiceNumber}</div>
                    <div>
                      {membershipAccount.payments[0].method === "INTERAC" &&
                      membershipAccount.payments[0].status === "PENDING" &&
                      membershipAccount.payments[0].interacTransferConfirmedAt
                        ? "Awaiting ChaufX confirmation"
                        : statusLabel(membershipAccount.payments[0].status)} ·{" "}
                      {toCurrency(membershipAccount.payments[0].amount, membershipAccount.payments[0].currency)}
                    </div>
                  </div>
                ) : null}
              </div>

              <MembershipPurchaseFlow
                currentTier={membershipAccount.membership.tier}
                currentBillingCycle={membershipAccount.membership.billingCycle}
                actionKey={membershipAction}
                onStripe={startMembershipStripe}
                onDowngradeToBasic={async () => {
                  setMembershipAction("basic");
                  setStatus("");
                  try {
                    await customerFetch("/memberships/downgrade", {
                      method: "POST",
                      body: JSON.stringify({ tier: "BASIC" })
                    });
                    await reloadMembership();
                  } catch (reason) {
                    setStatus(reason instanceof Error ? reason.message : "Unable to update membership.");
                    throw reason;
                  } finally {
                    setMembershipAction("");
                  }
                }}
              />
            </div>
          </SectionPanel> : null}

          {activeSection === "schedule" ? <SectionPanel
            id="schedule"
            eyebrow="Schedule trip"
            title="Book a future trip"
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Pickup address</span>
                <div className="relative">
                  <input
                    value={form.pickupLocation}
                    onFocus={() => setActiveAddressField("pickup")}
                    onChange={(event) => {
                      setActiveAddressField("pickup");
                      setForm((current) => ({ ...current, pickupLocation: event.target.value, pickupLat: "", pickupLng: "" }));
                    }}
                    onBlur={() => window.setTimeout(() => setActiveAddressField(null), 150)}
                    className="w-full rounded-2xl border border-[#E5E7EB] px-4 py-2.5 outline-none transition focus:border-[#2563EB]"
                    placeholder="Type your pickup address"
                    autoComplete="street-address"
                  />
                  {activeAddressField === "pickup" && (addressSearching || addressSuggestions.length > 0) ? (
                    <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_24px_70px_-45px_rgba(15,23,42,0.35)]">
                      {addressSearching ? <div className="px-4 py-3 text-sm text-slate-500">Searching addresses...</div> : null}
                      {!addressSearching
                        ? addressSuggestions.map((suggestion) => (
                            <button
                              key={suggestion.id}
                              type="button"
                              className="block w-full border-b border-[#EEF2FF] px-4 py-3 text-left text-sm text-slate-700 transition last:border-b-0 hover:bg-[#F8FAFC]"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => applyAddressSuggestion("pickup", suggestion)}
                            >
                              {suggestion.label}
                            </button>
                          ))
                        : null}
                    </div>
                  ) : null}
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Destination address</span>
                <div className="relative">
                  <input
                    value={form.destinationLocation}
                    onFocus={() => setActiveAddressField("destination")}
                    onChange={(event) => {
                      setActiveAddressField("destination");
                      setForm((current) => ({
                        ...current,
                        destinationLocation: event.target.value,
                        destinationLat: "",
                        destinationLng: ""
                      }));
                    }}
                    onBlur={() => window.setTimeout(() => setActiveAddressField(null), 150)}
                    className="w-full rounded-2xl border border-[#E5E7EB] px-4 py-2.5 outline-none transition focus:border-[#2563EB]"
                    placeholder="Type your destination address"
                    autoComplete="street-address"
                  />
                  {activeAddressField === "destination" && (addressSearching || addressSuggestions.length > 0) ? (
                    <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_24px_70px_-45px_rgba(15,23,42,0.35)]">
                      {addressSearching ? <div className="px-4 py-3 text-sm text-slate-500">Searching addresses...</div> : null}
                      {!addressSearching
                        ? addressSuggestions.map((suggestion) => (
                            <button
                              key={suggestion.id}
                              type="button"
                              className="block w-full border-b border-[#EEF2FF] px-4 py-3 text-left text-sm text-slate-700 transition last:border-b-0 hover:bg-[#F8FAFC]"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => applyAddressSuggestion("destination", suggestion)}
                            >
                              {suggestion.label}
                            </button>
                          ))
                        : null}
                    </div>
                  ) : null}
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Date and time</span>
                <input
                  type="datetime-local"
                  value={form.scheduledStartAt}
                  min={getMinimumScheduledStartAt()}
                  onFocus={() => {
                    const minimumScheduledStartAt = getMinimumScheduledStartAt();
                    if (new Date(form.scheduledStartAt) < new Date(minimumScheduledStartAt)) {
                      setForm((current) => ({ ...current, scheduledStartAt: minimumScheduledStartAt }));
                    }
                  }}
                  onChange={(event) => {
                    const minimumScheduledStartAt = getMinimumScheduledStartAt();
                    const selectedStartAt = new Date(event.target.value);
                    setForm((current) => ({
                      ...current,
                      scheduledStartAt:
                        Number.isNaN(selectedStartAt.getTime()) || selectedStartAt < new Date(minimumScheduledStartAt)
                          ? minimumScheduledStartAt
                          : event.target.value
                    }));
                  }}
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

            <div className="mt-3 max-w-xl">
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
                <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#4338CA]">Booking details</div>
                <div className="mt-1 text-sm text-slate-600">{formatScheduledTripSummary(form.scheduledStartAt, form.hours)}</div>
                {estimateBusy ? <div className="mt-2 font-medium text-slate-700">Calculating fare...</div> : null}
                {estimate ? (
                  <>
                    <div className="mt-2 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#4338CA]">Estimated fare</div>
                    <div className="mt-1 text-[1.9rem] font-semibold tracking-[-0.05em] text-slate-950">
                      {toCurrency(Number(estimate.fareEstimate), estimate.currency ?? "CAD")}
                    </div>
                    {estimate.membershipApplied ? (
                      <div className="mt-2 text-sm font-semibold text-emerald-700">
                        {Number(estimate.membershipSavings) > 0
                          ? `Membership savings: ${toCurrency(Number(estimate.membershipSavings), estimate.currency ?? "CAD")}`
                          : `${statusLabel(estimate.pricingMembershipTier)} member rate: ${toCurrency(Number(estimate.flatFee), estimate.currency ?? "CAD")}/hour`}
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>

              <button
                type="button"
                onClick={createScheduledTrip}
                disabled={
                  estimateBusy ||
                  bookingCreating ||
                  !form.pickupLocation ||
                  !form.destinationLocation ||
                  !form.pickupLat ||
                  !form.pickupLng ||
                  !form.destinationLat ||
                  !form.destinationLng ||
                  !estimate
                }
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2563EB] px-6 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                {bookingCreating ? <><LoadingSpinner /> Creating booking...</> : "Book now"}
              </button>
            </div>
          </SectionPanel> : null}

          {activeSection === "awaiting-payment" ? <SectionPanel
            id="awaiting-payment"
            eyebrow="Awaiting payment"
            title="Awaiting payment"
          >
            <div className="mb-5 inline-flex rounded-2xl border border-[#DCE4F4] bg-white p-1">
              {([
                ["trips", "Trip payments", awaitingPaymentBookings.length],
                ["membership", "Membership payments", awaitingMembershipPayments.length]
              ] as const).map(([tab, label, count]) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setAwaitingPaymentTab(tab)}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    awaitingPaymentTab === tab ? "bg-[#2563EB] text-white shadow-sm" : "text-slate-600 hover:bg-[#F1F5F9]"
                  }`}
                >
                  {label} ({count})
                </button>
              ))}
            </div>

            {awaitingPaymentTab === "trips" ? (
              <TripTable
                rows={awaitingPaymentBookings}
                emptyTitle="No trip payments awaiting payment"
                onCancel={cancelBooking}
                onPayNow={payNow}
                payingBookingId={payingBookingId}
                busyBookingId={busyBookingId}
              />
            ) : awaitingMembershipPayments.length ? (
              <div className="grid gap-3">
                {awaitingMembershipPayments.map((payment) => (
                  <article key={payment.id} className="flex flex-col gap-4 rounded-[22px] border border-[#E5E7EB] bg-[#F8FAFC] p-5 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-lg font-semibold tracking-[-0.04em] text-slate-950">
                        {statusLabel(payment.tier)} {statusLabel(payment.billingCycle)} membership
                      </div>
                      <div className="mt-1 text-sm text-slate-600">{payment.invoiceNumber}</div>
                      <div className="mt-2 font-semibold text-slate-950">{toCurrency(payment.amount, payment.currency)}</div>
                      <div className="mt-2"><StatusPill label={statusLabel(payment.status)} tone="amber" /></div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          window.location.hash = "membership";
                        }}
                        className="inline-flex min-w-[152px] items-center justify-center rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_-12px_rgba(37,99,235,0.9)] transition hover:bg-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#93C5FD] focus:ring-offset-2"
                      >
                        Continue with Stripe
                      </button>
                      <button
                        type="button"
                        onClick={() => cancelMembershipPayment(payment.id)}
                        disabled={membershipAction === `cancel:${payment.id}`}
                        className="inline-flex min-w-[118px] items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-100 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {membershipAction === `cancel:${payment.id}` ? <><LoadingSpinner /> Cancelling...</> : "Cancel payment"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState title="No membership payments awaiting payment" />
            )}
          </SectionPanel> : null}

          {activeSection === "upcoming" ? <SectionPanel
            id="upcoming"
            eyebrow="Upcoming"
            title="Scheduled and active trips"
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
                onCancel={cancelBooking}
                onPayNow={payNow}
                payingBookingId={payingBookingId}
                busyBookingId={busyBookingId}
              />
            )}
          </SectionPanel> : null}

          {activeSection === "completed" ? <SectionPanel
            id="completed"
            eyebrow="Completed"
            title="Trip history"
          >
            {bookingsLoading ? (
              <p className="text-sm text-slate-500">Loading completed bookings...</p>
            ) : (
              <TripTable
                rows={completedBookings}
                emptyTitle="No completed bookings yet"
                onCancel={cancelBooking}
                onPayNow={payNow}
                payingBookingId={payingBookingId}
                busyBookingId={busyBookingId}
              />
            )}
          </SectionPanel> : null}
        </main>
      </div>
    </main>
  );
}
