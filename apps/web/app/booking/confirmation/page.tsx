"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://chaufx-backend.onrender.com/api";
type Booking = { reference: string; booking: { id: string; pickupLocation: string; destinationLocation: string; scheduledStartAt: string; expectedDurationMinutes: number; vehicleDetails?: string | null; fareEstimate: number; currency: string; status: string; paymentStatus: string; assignedDriverName?: string | null }; claimed: boolean };
const money = (value: number, currency = "CAD") => new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(value);
function track(event: string, data: Record<string, unknown> = {}) {
  if (typeof window !== "undefined") (window as Window & { dataLayer?: unknown[] }).dataLayer?.push({ event, ...data });
}

export default function GuestBookingConfirmationPage() {
  const [booking, setBooking] = useState<Booking | null>(null); const [token, setToken] = useState(""); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  useEffect(() => {
    const access = new URLSearchParams(window.location.search).get("access") ?? window.sessionStorage.getItem("chaufx_guest_booking_access") ?? "";
    setToken(access); if (!access) { setMessage("This booking link is missing or invalid."); return; }
    const returnedToPendingPayment = new URLSearchParams(window.location.search).get("payment") === "pending";
    void load(access).then((loaded) => {
      if (loaded && returnedToPendingPayment) setMessage("Payment is still pending. Complete secure payment when you are ready.");
    });
    const interval = window.setInterval(() => void load(access, true), 15_000); return () => window.clearInterval(interval);
  }, []);
  useEffect(() => {
    if (booking && (booking.booking.paymentStatus === "AUTHORIZED" || booking.booking.paymentStatus === "CAPTURED")) {
      track("guest_booking_payment_confirmed", { booking_id: booking.booking.id, value: booking.booking.fareEstimate, currency: booking.booking.currency, payment_status: booking.booking.paymentStatus });
    }
  }, [booking]);
  async function load(access: string, quiet = false) { try { const response = await fetch(`${API}/guest-bookings/${encodeURIComponent(access)}`); const data = await response.json(); if (!response.ok) throw new Error(data.error?.message ?? "Unable to load booking."); setBooking(data); if (!quiet) setMessage(""); return true; } catch (error) { if (!quiet) setMessage(error instanceof Error ? error.message : "Unable to load booking."); return false; } }
  async function payment() { if (!token) return; setBusy(true); setMessage(""); try { const response = await fetch(`${API}/guest-bookings/${encodeURIComponent(token)}/checkout-session`, { method: "POST" }); const data = await response.json(); if (!response.ok) throw new Error(data.error?.message ?? "Unable to start secure payment."); track("guest_booking_payment_started", { booking_id: booking?.booking.id, value: booking?.booking.fareEstimate, currency: booking?.booking.currency }); if (data.checkoutUrl) window.location.assign(data.checkoutUrl); else await load(token); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to start secure payment."); } finally { setBusy(false); } }
  async function cancel() { if (!token || !window.confirm("Cancel this booking?")) return; setBusy(true); try { const response = await fetch(`${API}/guest-bookings/${encodeURIComponent(token)}/cancel`, { method: "POST" }); const data = await response.json(); if (!response.ok) throw new Error(data.error?.message ?? "Unable to cancel booking."); setMessage("Booking cancelled."); await load(token); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to cancel booking."); } finally { setBusy(false); } }
  if (!booking) return <main className="mx-auto max-w-2xl px-5 py-24"><p className="text-slate-600">{message || "Loading your booking…"}</p>{message ? <Link href="/booking" className="mt-5 inline-block text-sm font-semibold text-[#2563EB]">Return to booking</Link> : null}</main>;
  const { booking: trip } = booking; const paid = trip.paymentStatus === "AUTHORIZED" || trip.paymentStatus === "CAPTURED";
  const canCancel = ["AWAITING_PAYMENT", "PENDING"].includes(trip.status) && !trip.assignedDriverName;
  return <main className="mx-auto max-w-2xl px-5 py-12 md:py-20"><section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-9"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2563EB]">ChaufX booking</p><h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{paid ? "Card authorized — finding your driver" : "Payment pending"}</h1><p className="mt-3 leading-7 text-slate-600">{paid ? "We are matching you with an eligible driver. You will only be charged after a driver accepts for a Book Now trip." : "Your booking is reserved. Complete secure payment when you are ready."}</p><div className="mt-7 space-y-4 rounded-2xl bg-slate-50 p-5 text-sm text-slate-700"><Row label="Booking reference" value={booking.reference} /><Row label="Trip" value={`${trip.pickupLocation} → ${trip.destinationLocation}`} /><Row label="Starts" value={new Date(trip.scheduledStartAt).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })} /><Row label="Duration" value={`${trip.expectedDurationMinutes / 60} hours`} /><Row label="Estimated fare" value={money(trip.fareEstimate, trip.currency)} />{trip.vehicleDetails ? <Row label="Vehicle" value={trip.vehicleDetails} /> : null}</div>{trip.assignedDriverName ? <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800">Driver assigned: {trip.assignedDriverName}</p> : null}{!paid ? <button onClick={payment} disabled={busy} className="mt-7 w-full rounded-full bg-[#2563EB] px-5 py-3.5 text-sm font-semibold text-white disabled:bg-slate-300">{busy ? "Opening secure payment…" : "Continue to secure payment"}</button> : null}{canCancel ? <button onClick={cancel} disabled={busy} className="mt-3 w-full rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700">Cancel booking</button> : null}{message ? <p role="status" className="mt-4 text-sm font-medium text-slate-600">{message}</p> : null}<div className="mt-7 border-t border-slate-200 pt-5 text-center text-sm text-slate-600"><p>Download the ChaufX app to manage future trips.</p><div className="mt-3 flex justify-center gap-4"><Link href="/login" className="font-semibold text-[#2563EB]">Register or sign in</Link><a href="https://apps.apple.com" className="font-semibold text-[#2563EB]">App Store</a><a href="https://play.google.com/store" className="font-semibold text-[#2563EB]">Google Play</a></div></div></section></main>;
}
function Row({ label, value }: { label: string; value: string }) { return <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-6"><span className="text-slate-500">{label}</span><span className="font-semibold text-slate-900 sm:text-right">{value}</span></div>; }
