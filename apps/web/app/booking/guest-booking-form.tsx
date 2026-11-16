"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://chaufx-backend.onrender.com/api";
const MAPBOX = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
type Suggestion = { id: string; label: string; latitude: number; longitude: number };
type Estimate = { fareEstimate: number; currency: string; billableHours: number };
const minimumStart = (type: "NOW" | "LATER") => new Date(Date.now() + (type === "NOW" ? 5 : 60) * 60_000).toISOString().slice(0, 16);
const money = (value: number, currency = "CAD") => new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(value);
// Keep Book Now safely ahead of server validation while still representing the
// moment the customer proceeds to checkout, not when they opened the form.
const bookNowStartAt = () => new Date(Date.now() + 2 * 60_000).toISOString();
function track(event: string, data: Record<string, unknown> = {}) {
  if (typeof window !== "undefined") (window as Window & { dataLayer?: unknown[] }).dataLayer?.push({ event, ...data });
}

async function searchAddress(query: string) {
  if (!MAPBOX || query.trim().length < 3) return [] as Suggestion[];
  const params = new URLSearchParams({ access_token: MAPBOX, autocomplete: "true", limit: "5", country: "ca", types: "address,poi,place,postcode" });
  const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query.trim())}.json?${params}`);
  if (!response.ok) return [];
  const json = await response.json();
  return (json.features ?? []).map((feature: any) => ({ id: String(feature.id), label: String(feature.place_name ?? feature.text), latitude: Number(feature.center?.[1]), longitude: Number(feature.center?.[0]) })).filter((item: Suggestion) => item.id && item.label && Number.isFinite(item.latitude) && Number.isFinite(item.longitude));
}

export function GuestBookingForm() {
  const [requestType, setRequestType] = useState<"NOW" | "LATER">("NOW");
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", pickupLocation: "", pickupLat: 0, pickupLng: 0, destinationLocation: "", destinationLat: 0, destinationLng: 0, scheduledStartAt: minimumStart("NOW"), expectedDurationMinutes: 120, vehicleDetails: "", specialNotes: "", zoneCode: "Ontario" });
  const [activeAddress, setActiveAddress] = useState<"pickup" | "destination" | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const validRoute = Boolean(form.pickupLat && form.pickupLng && form.destinationLat && form.destinationLng);
  const utm = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    const query = new URLSearchParams(window.location.search);
    return { source: query.get("utm_source") ?? undefined, medium: query.get("utm_medium") ?? undefined, campaign: query.get("utm_campaign") ?? undefined, term: query.get("utm_term") ?? undefined, content: query.get("utm_content") ?? undefined, landingPath: `${window.location.pathname}${window.location.search}` };
  }, []);
  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => { track("guest_booking_started", { booking_type: requestType }); }, [requestType]);

  // Browser Back from Stripe Checkout returns to the previous page rather
  // than Stripe's configured cancel URL. Resume a still-unpaid trip so the
  // customer is never left at a fresh form after beginning payment.
  useEffect(() => {
    const access = window.sessionStorage.getItem("chaufx_guest_booking_access");
    if (!access) return;
    let disposed = false;
    void fetch(`${API}/guest-bookings/${encodeURIComponent(access)}`)
      .then(async (response) => ({ response, data: await response.json() }))
      .then(({ response, data }) => {
        if (disposed) return;
        const trip = data?.booking;
        if (response.ok && trip && ["AWAITING_PAYMENT", "PENDING"].includes(trip.status) && trip.paymentStatus === "PENDING") {
          window.location.replace(`/booking/confirmation?access=${encodeURIComponent(access)}&payment=pending`);
          return;
        }
        window.sessionStorage.removeItem("chaufx_guest_booking_access");
      })
      .catch(() => {
        // Do not block a new booking because a previous lookup is unavailable.
      });
    return () => { disposed = true; };
  }, []);

  useEffect(() => {
    if (!activeAddress) return;
    const value = activeAddress === "pickup" ? form.pickupLocation : form.destinationLocation;
    const timer = window.setTimeout(() => void searchAddress(value).then(setSuggestions), 250);
    return () => window.clearTimeout(timer);
  }, [activeAddress, form.pickupLocation, form.destinationLocation]);
  useEffect(() => {
    if (!validRoute) { setEstimate(null); return; }
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`${API}/guest-bookings/estimate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, scheduledStartAt: requestType === "NOW" ? bookNowStartAt() : form.scheduledStartAt, requestType }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message ?? "Unable to calculate fare.");
        setEstimate(data); setMessage("");
      } catch (error) { setEstimate(null); setMessage(error instanceof Error ? error.message : "Unable to calculate fare."); }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [form, requestType, validRoute]);
  function choose(field: "pickup" | "destination", item: Suggestion) {
    setForm((current) => field === "pickup" ? { ...current, pickupLocation: item.label, pickupLat: item.latitude, pickupLng: item.longitude } : { ...current, destinationLocation: item.label, destinationLat: item.latitude, destinationLng: item.longitude });
    setActiveAddress(null); setSuggestions([]);
  }
  function currentLocation() {
    if (!navigator.geolocation) return setMessage("Location is not available in this browser.");
    navigator.geolocation.getCurrentPosition((position) => { setForm((current) => ({ ...current, pickupLocation: "Current location", pickupLat: position.coords.latitude, pickupLng: position.coords.longitude })); setMessage("Current location added. Select an address if you need to refine it."); }, () => setMessage("We could not access your location. Enter and select your pickup address."), { enableHighAccuracy: true, timeout: 10_000 });
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!estimate) return setMessage("Select both addresses and wait for your fare estimate.");
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`${API}/guest-bookings`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, vehicleDetails: form.vehicleDetails || undefined, specialNotes: form.specialNotes || undefined, scheduledStartAt: requestType === "NOW" ? bookNowStartAt() : form.scheduledStartAt, requestType, utm }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error?.message ?? "Unable to create your booking.");
      track("guest_booking_submitted", { booking_type: requestType, value: estimate.fareEstimate, currency: estimate.currency, utm_source: utm?.source, utm_campaign: utm?.campaign });
      window.sessionStorage.setItem("chaufx_guest_booking_access", data.accessToken);
      const checkoutResponse = await fetch(`${API}/guest-bookings/${encodeURIComponent(data.accessToken)}/checkout-session`, { method: "POST" });
      const checkout = await checkoutResponse.json();
      if (!checkoutResponse.ok) throw new Error(checkout.error?.message ?? "Unable to open secure payment.");
      track("guest_booking_payment_started", { booking_id: data.booking?.id, value: estimate.fareEstimate, currency: estimate.currency });
      if (!checkout.checkoutUrl) throw new Error("Secure payment is not ready yet. Please try again.");
      window.location.assign(checkout.checkoutUrl);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to create your booking."); } finally { setBusy(false); }
  }
  return <section className="bg-white"><div className="mx-auto max-w-4xl px-5 py-10 md:px-8 md:py-14"><form onSubmit={submit} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.3)] sm:p-8">
    <div className="flex rounded-2xl bg-slate-100 p-1">{(["NOW", "LATER"] as const).map((value) => <button type="button" key={value} onClick={() => { setRequestType(value); update("scheduledStartAt", minimumStart(value)); }} className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold ${requestType === value ? "bg-[#2563EB] text-white shadow-sm" : "text-slate-600"}`}>{value === "NOW" ? "Book now" : "Schedule later"}</button>)}</div>
    <div className="mt-7 grid gap-5 md:grid-cols-2"><Address label="Pickup address" value={form.pickupLocation} active={activeAddress === "pickup"} suggestions={suggestions} onFocus={() => setActiveAddress("pickup")} onChange={(value) => setForm((current) => ({ ...current, pickupLocation: value, pickupLat: 0, pickupLng: 0 }))} onChoose={(item) => choose("pickup", item)} /><Address label="Destination address" value={form.destinationLocation} active={activeAddress === "destination"} suggestions={suggestions} onFocus={() => setActiveAddress("destination")} onChange={(value) => setForm((current) => ({ ...current, destinationLocation: value, destinationLat: 0, destinationLng: 0 }))} onChoose={(item) => choose("destination", item)} /></div>
    <button type="button" onClick={currentLocation} className="mt-3 text-sm font-semibold text-[#2563EB]">Use my current location</button>
    <div className="mt-5 grid gap-5 sm:grid-cols-2 md:grid-cols-3">{requestType === "LATER" ? <Field label="Start time"><input required type="datetime-local" min={minimumStart(requestType)} value={form.scheduledStartAt} onChange={(event) => update("scheduledStartAt", event.target.value)} /></Field> : <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"><div className="text-sm font-medium text-slate-700">Start time</div><div className="mt-1 text-sm text-slate-500">Starts shortly after payment</div></div>}<Field label="Duration"><select value={form.expectedDurationMinutes} onChange={(event) => update("expectedDurationMinutes", Number(event.target.value))}>{[2,3,4,5,6,8,10,12].map((hours) => <option key={hours} value={hours * 60}>{hours} hours</option>)}</select></Field><Field label="Service province"><select value={form.zoneCode} onChange={(event) => update("zoneCode", event.target.value)}>{["Ontario", "Manitoba", "Alberta", "British Columbia", "Saskatchewan"].map((province) => <option key={province}>{province}</option>)}</select></Field></div>
    <div className="mt-5 grid gap-5 md:grid-cols-2"><Field label="Your name"><input required value={form.fullName} onChange={(event) => update("fullName", event.target.value)} /></Field><Field label="Mobile number"><input required type="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} /></Field><Field label="Email"><input required type="email" value={form.email} onChange={(event) => update("email", event.target.value)} /></Field><Field label="Vehicle details (optional)"><input value={form.vehicleDetails} placeholder="Make, model, plate" onChange={(event) => update("vehicleDetails", event.target.value)} /></Field></div>
    <Field label="Special instructions (optional)" extra="mt-5"><textarea rows={3} value={form.specialNotes} onChange={(event) => update("specialNotes", event.target.value)} /></Field>
    <div className="mt-6 rounded-2xl bg-slate-50 p-5"><div className="flex items-end justify-between gap-4"><div><p className="text-sm font-medium text-slate-600">Estimated fare</p><p className="mt-1 text-2xl font-bold text-slate-950">{estimate ? money(estimate.fareEstimate, estimate.currency) : "Add trip details"}</p></div>{estimate ? <p className="text-right text-sm text-slate-500">{estimate.billableHours} billable hours<br />Taxes may apply</p> : null}</div><p className="mt-4 text-sm leading-6 text-slate-600">{requestType === "NOW" ? "Your card will be authorized now. You will only be charged after a driver accepts." : "Your card will be charged securely when you confirm this scheduled booking."}</p></div>
    {message ? <p role="alert" className="mt-4 text-sm font-medium text-rose-600">{message}</p> : null}<button disabled={busy || !estimate} className="mt-6 w-full rounded-full bg-[#2563EB] px-5 py-3.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">{busy ? "Preparing secure payment…" : "Continue to secure payment"}</button><p className="mt-4 text-center text-sm text-slate-500">Already a member? <Link href="/login" className="font-semibold text-[#2563EB]">Sign in for member pricing</Link></p>
  </form></div></section>;
}
function Field({ label, children, extra = "" }: { label: string; children: React.ReactNode; extra?: string }) { return <label className={`block text-sm font-medium text-slate-700 ${extra}`}>{label}<span className="mt-1.5 block [&_input,&_select,&_textarea]:w-full [&_input,&_select,&_textarea]:rounded-xl [&_input,&_select,&_textarea]:border [&_input,&_select,&_textarea]:border-slate-300 [&_input,&_select,&_textarea]:px-4 [&_input,&_select,&_textarea]:py-3.5 [&_input,&_select,&_textarea]:font-normal [&_input,&_select,&_textarea]:outline-none [&_input,&_select,&_textarea]:focus:border-[#2563EB]">{children}</span></label>; }
function Address({ label, value, active, suggestions, onFocus, onChange, onChoose }: { label: string; value: string; active: boolean; suggestions: Suggestion[]; onFocus: () => void; onChange: (value: string) => void; onChoose: (item: Suggestion) => void }) { return <label className="relative block text-sm font-medium text-slate-700">{label}<input required value={value} onFocus={onFocus} onChange={(event) => onChange(event.target.value)} placeholder={`Search ${label.toLowerCase()}`} className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3.5 font-normal outline-none focus:border-[#2563EB]" />{active && suggestions.length > 0 ? <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">{suggestions.map((item) => <button type="button" key={item.id} onMouseDown={(event) => event.preventDefault()} onClick={() => onChoose(item)} className="block w-full border-b border-slate-100 px-4 py-3 text-left text-sm font-normal text-slate-700 last:border-0 hover:bg-slate-50">{item.label}</button>)}</div> : null}</label>; }
