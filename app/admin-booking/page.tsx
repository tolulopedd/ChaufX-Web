"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminShell, Panel } from "../../components/admin-shell";
import { adminFetch, useAdminResource } from "../../lib/api";
import { adminFilterButtonActiveClass, adminFilterButtonClass, adminInputClass, adminPrimaryButtonClass, adminSecondaryButtonClass } from "../../components/admin-primitives";
import { toCurrency } from "../../lib/config";

type AddressSuggestion = { id: string; label: string; latitude: number; longitude: number };
type Customer = {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  membershipTier: string;
  membershipStatus: string;
  customerProfile?: { id: string; vehicles: Array<{ id: string; make: string; model: string; plateNumber: string; isPrimary: boolean }> } | null;
};

const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
const provinces = ["Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador", "Nova Scotia", "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan"];

function defaultStart() {
  const value = new Date(Date.now() + 65 * 60_000);
  value.setSeconds(0, 0);
  return value.toISOString().slice(0, 16);
}

async function searchAddresses(query: string) {
  if (!mapboxToken || query.trim().length < 3) return [] as AddressSuggestion[];
  const params = new URLSearchParams({ access_token: mapboxToken, autocomplete: "true", limit: "5", country: "ca", types: "address,poi,place,postcode" });
  const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query.trim())}.json?${params}`);
  if (!response.ok) throw new Error("Unable to load address suggestions.");
  const payload = await response.json();
  return (payload.features ?? []).map((feature: any) => ({
    id: String(feature.id), label: String(feature.place_name ?? feature.text ?? ""), latitude: Number(feature.center?.[1]), longitude: Number(feature.center?.[0])
  })).filter((item: AddressSuggestion) => item.id && item.label && Number.isFinite(item.latitude) && Number.isFinite(item.longitude));
}

export default function AdminBookingPage() {
  const { data: customers, reload: reloadCustomers } = useAdminResource<Customer[]>("/admin/assisted-bookings/customers", []);
  const { data: bookings, reload: reloadBookings } = useAdminResource<any[]>("/admin/bookings", []);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [customerMode, setCustomerMode] = useState<"existing" | "new">("existing");
  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerSearchFocused, setCustomerSearchFocused] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ fullName: "", email: "", phone: "", temporaryPassword: "" });
  const [form, setForm] = useState({
    requestType: "LATER", pickupLocation: "", pickupLat: "", pickupLng: "", destinationLocation: "", destinationLat: "", destinationLng: "",
    scheduledStartAt: defaultStart(), hours: 2, vehicleId: "", vehicleDetails: "", specialNotes: "", zoneCode: "Manitoba", sendPaymentInstructions: true
  });
  const [activeAddress, setActiveAddress] = useState<"pickup" | "destination" | null>(null);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [estimate, setEstimate] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [confirmingBookingId, setConfirmingBookingId] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<"AWAITING" | "CONFIRMED" | "ALL">("AWAITING");
  const [message, setMessage] = useState("");

  const selectedCustomer = customers.find((customer) => customer.id === customerId) ?? null;
  const filteredCustomers = customers.filter((customer) => `${customer.fullName} ${customer.email} ${customer.phone ?? ""}`.toLowerCase().includes(customerSearch.toLowerCase()));
  const vehicleLabel = (vehicle: NonNullable<Customer["customerProfile"]>["vehicles"][number]) => `${vehicle.make} ${vehicle.model} · ${vehicle.plateNumber}`;
  const canEstimate = Boolean(customerId && form.pickupLocation && form.pickupLat && form.pickupLng && form.scheduledStartAt && form.vehicleDetails && form.hours >= 2);
  const canCreate = customerMode === "existing" ? canEstimate : Boolean(newCustomer.fullName && newCustomer.email && newCustomer.phone && newCustomer.temporaryPassword);
  const assistedPaymentBookings = bookings.filter((booking) => booking.adminAssistedAt && booking.payment?.method === "INTERAC");
  const visiblePaymentBookings = assistedPaymentBookings.filter((booking) => paymentFilter === "ALL" || (paymentFilter === "AWAITING" ? booking.payment?.status === "PENDING" && booking.status === "AWAITING_PAYMENT" : booking.payment?.status === "RECORDED"));

  useEffect(() => {
    if (!selectedCustomer) return;
    const vehicle = selectedCustomer.customerProfile?.vehicles.find((item) => item.isPrimary) ?? selectedCustomer.customerProfile?.vehicles[0];
    setForm((current) => ({ ...current, vehicleId: vehicle?.id ?? "", vehicleDetails: vehicle ? `${vehicle.make} ${vehicle.model} · ${vehicle.plateNumber}` : current.vehicleDetails }));
  }, [selectedCustomer?.id]);

  useEffect(() => {
    if (!activeAddress) { setSuggestions([]); return; }
    const query = activeAddress === "pickup" ? form.pickupLocation : form.destinationLocation;
    const timer = window.setTimeout(() => void searchAddresses(query).then(setSuggestions).catch(() => setSuggestions([])), 250);
    return () => window.clearTimeout(timer);
  }, [activeAddress, form.destinationLocation, form.pickupLocation]);

  useEffect(() => {
    if (!canEstimate || customerMode !== "existing") { setEstimate(null); return; }
    const timer = window.setTimeout(() => {
      void adminFetch<any>("/admin/assisted-bookings/estimate", {
        method: "POST",
        body: JSON.stringify({ ...form, customerUserId: customerId, expectedDurationMinutes: form.hours * 60, pickupLat: Number(form.pickupLat), pickupLng: Number(form.pickupLng), destinationLat: form.destinationLat ? Number(form.destinationLat) : undefined, destinationLng: form.destinationLng ? Number(form.destinationLng) : undefined })
      }).then(setEstimate).catch((error) => { setEstimate(null); setMessage(error instanceof Error ? error.message : "Pricing is unavailable."); });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [canEstimate, customerId, customerMode, form]);

  function selectAddress(address: AddressSuggestion) {
    const locationKey = activeAddress === "pickup" ? "pickup" : "destination";
    setForm((current) => ({ ...current, [`${locationKey}Location`]: address.label, [`${locationKey}Lat`]: String(address.latitude), [`${locationKey}Lng`]: String(address.longitude) }));
    setActiveAddress(null);
  }

  async function createCustomer() {
    setBusy(true); setMessage("");
    try {
      const customer = await adminFetch<Customer>("/admin/assisted-bookings/customers", { method: "POST", body: JSON.stringify(newCustomer) });
      await reloadCustomers();
      setCustomerId(customer.id); setCustomerMode("existing");
      setMessage("Customer created. Complete the booking details below.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to create customer."); }
    finally { setBusy(false); }
  }

  async function createBooking() {
    if (!estimate) { setMessage("Wait for a valid fare estimate before creating this booking."); return; }
    setBusy(true); setMessage("");
    try {
      const result = await adminFetch<any>("/admin/assisted-bookings", {
        method: "POST",
        body: JSON.stringify({ ...form, customerUserId: customerId, expectedDurationMinutes: form.hours * 60, pickupLat: Number(form.pickupLat), pickupLng: Number(form.pickupLng), destinationLat: form.destinationLat ? Number(form.destinationLat) : undefined, destinationLng: form.destinationLng ? Number(form.destinationLng) : undefined })
      });
      setMessage(`Booking ${result.reference} is awaiting payment.${result.emailSent ? " Payment instructions were emailed." : " Payment instructions were created; email was not sent."}`);
      setEstimate(null);
      await reloadBookings();
      setShowBookingForm(false);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to create booking."); }
    finally { setBusy(false); }
  }

  function selectCustomer(customer: Customer) {
    setCustomerId(customer.id);
    setCustomerSearch(`${customer.fullName} · ${customer.email}`);
    setCustomerSearchFocused(false);
  }

  async function confirmPayment(booking: any) {
    const reference = booking.payment.providerReference ?? booking.id;
    if (!window.confirm(`Confirm receipt of ${toCurrency(Number(booking.payment.amount), "CAD")} for ${reference}? This records the payment now and starts driver routing.`)) return;
    setConfirmingBookingId(booking.id);
    setMessage("");
    try {
      const result = await adminFetch<any>(`/admin/assisted-bookings/${booking.id}/confirm-payment`, {
        method: "POST",
        body: JSON.stringify({})
      });
      await reloadBookings();
      setMessage(result.dispatch?.notifiedDrivers ? `Payment recorded. The booking is active and was sent to ${result.dispatch.notifiedDrivers} eligible driver${result.dispatch.notifiedDrivers === 1 ? "" : "s"}.` : "Payment recorded. The booking is active; matching will continue when an eligible driver is available.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to confirm the payment.");
    } finally {
      setConfirmingBookingId("");
    }
  }

  return <AdminShell title="Manual booking">
    {showBookingForm ? <>
    <Panel title="New booking" aside={<div className="flex gap-2"><button type="button" onClick={() => setShowBookingForm(false)} className={adminSecondaryButtonClass}>Cancel</button></div>}>
      <div className="mb-4 flex gap-2"><button type="button" onClick={() => setCustomerMode("existing")} className={customerMode === "existing" ? adminFilterButtonActiveClass : adminFilterButtonClass}>Existing customer</button><button type="button" onClick={() => setCustomerMode("new")} className={customerMode === "new" ? adminFilterButtonActiveClass : adminFilterButtonClass}>New customer</button></div>
      {customerMode === "new" ? <div className="grid gap-3 md:grid-cols-2">{(["fullName", "email", "phone", "temporaryPassword"] as const).map((field) => <input key={field} type={field === "temporaryPassword" ? "password" : field === "email" ? "email" : "text"} value={newCustomer[field]} onChange={(event) => setNewCustomer((current) => ({ ...current, [field]: event.target.value }))} placeholder={{ fullName: "Full name", email: "Email", phone: "Phone", temporaryPassword: "Temporary password" }[field]} className={adminInputClass} />)}<button type="button" disabled={busy || !canCreate} onClick={() => void createCustomer()} className={`${adminPrimaryButtonClass} md:col-span-2`}>{busy ? "Creating..." : "Create customer"}</button></div> : <div className="relative"><label className="mb-1 block text-sm font-medium">Search customer</label><input value={customerSearch} onFocus={() => setCustomerSearchFocused(true)} onBlur={() => window.setTimeout(() => setCustomerSearchFocused(false), 150)} onChange={(event) => { setCustomerSearch(event.target.value); setCustomerId(""); setCustomerSearchFocused(true); }} placeholder="Start typing a name, email, or phone number" className={adminInputClass}/>{customerSearchFocused && customerSearch.trim() ? <CustomerOptions items={filteredCustomers.slice(0, 8)} onSelect={selectCustomer}/> : null}</div>}
    </Panel>

    {customerMode === "existing" ? <Panel title="Booking details">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="relative"><label className="mb-1 block text-sm font-medium">Pickup address</label><input value={form.pickupLocation} onFocus={() => setActiveAddress("pickup")} onChange={(event) => setForm((current) => ({ ...current, pickupLocation: event.target.value, pickupLat: "", pickupLng: "" }))} className={adminInputClass} placeholder="Search and select pickup address"/>{activeAddress === "pickup" && suggestions.length ? <AddressOptions items={suggestions} onSelect={selectAddress}/> : null}</div>
        <div className="relative"><label className="mb-1 block text-sm font-medium">Destination address <span className="text-slate-400">(optional)</span></label><input value={form.destinationLocation} onFocus={() => setActiveAddress("destination")} onChange={(event) => setForm((current) => ({ ...current, destinationLocation: event.target.value, destinationLat: "", destinationLng: "" }))} className={adminInputClass} placeholder="Search and select destination"/>{activeAddress === "destination" && suggestions.length ? <AddressOptions items={suggestions} onSelect={selectAddress}/> : null}</div>
        <label className="text-sm font-medium">Booking type<select value={form.requestType} onChange={(event) => setForm((current) => ({ ...current, requestType: event.target.value }))} className={`${adminInputClass} mt-1`}><option value="LATER">Schedule later</option><option value="NOW">Book now</option></select></label>
        <label className="text-sm font-medium">Booking date and time<input type="datetime-local" value={form.scheduledStartAt} min={defaultStart()} onChange={(event) => setForm((current) => ({ ...current, scheduledStartAt: event.target.value }))} className={`${adminInputClass} mt-1`}/></label>
        <label className="text-sm font-medium">Number of hours<select value={form.hours} onChange={(event) => setForm((current) => ({ ...current, hours: Number(event.target.value) }))} className={`${adminInputClass} mt-1`}>{Array.from({ length: 11 }, (_, index) => index + 2).map((hours) => <option key={hours} value={hours}>{hours} hours</option>)}</select></label>
        <label className="text-sm font-medium">Province pricing<select value={form.zoneCode} onChange={(event) => setForm((current) => ({ ...current, zoneCode: event.target.value }))} className={`${adminInputClass} mt-1`}>{provinces.map((province) => <option key={province}>{province}</option>)}</select></label>
        <label className="text-sm font-medium">Vehicle details<input list="customer-vehicles" value={form.vehicleDetails} onChange={(event) => { const vehicle = selectedCustomer?.customerProfile?.vehicles.find((item) => vehicleLabel(item) === event.target.value); setForm((current) => ({ ...current, vehicleId: vehicle?.id ?? "", vehicleDetails: event.target.value })); }} className={`${adminInputClass} mt-1`} placeholder="Enter vehicle details or select a saved vehicle"/><datalist id="customer-vehicles">{selectedCustomer?.customerProfile?.vehicles.map((vehicle) => <option key={vehicle.id} value={vehicleLabel(vehicle)} />)}</datalist></label>
        <label className="text-sm font-medium md:col-span-2">Special instructions<textarea value={form.specialNotes} onChange={(event) => setForm((current) => ({ ...current, specialNotes: event.target.value }))} className={`${adminInputClass} mt-1 min-h-24`} placeholder="Optional pickup or trip instructions"/></label>
      </div>
      {estimate ? <div className="mt-4 rounded-2xl border border-[#C7D2FE] bg-[#EEF2FF] p-4"><div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#4338CA]">Estimated fare</div><div className="mt-1 text-2xl font-semibold text-slate-950">{toCurrency(Number(estimate.fareEstimate), "CAD")}</div><p className="mt-1 text-sm text-slate-600">{estimate.membershipApplied ? "Customer membership pricing applied." : "Standard provincial pricing applied."}{estimate.firstRidePromotion?.discountAmount ? ` First Ride Discount: ${toCurrency(Number(estimate.firstRidePromotion.discountAmount), "CAD")}.` : ""}</p></div> : <p className="mt-4 text-sm text-slate-500">Select a pickup address and customer vehicle details to calculate the fare.</p>}
      <label className="mt-4 flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={form.sendPaymentInstructions} onChange={(event) => setForm((current) => ({ ...current, sendPaymentInstructions: event.target.checked }))}/> Email payment instructions to the customer</label>
      <button type="button" disabled={busy || !canCreate || !estimate} onClick={() => void createBooking()} className={`${adminPrimaryButtonClass} mt-4`}>{busy ? "Creating..." : "Create booking"}</button>
    </Panel> : null}
    </> : <Panel title="Manual bookings" subtitle="Interac e-Transfer bookings only." aside={<button type="button" onClick={() => setShowBookingForm(true)} className={adminPrimaryButtonClass}>New booking</button>}><p className="text-sm text-slate-600">Driver routing starts after payment is confirmed.</p></Panel>}
    <Panel title="e-Transfer payments" aside={<div className="flex flex-wrap gap-2"><button type="button" onClick={() => setPaymentFilter("AWAITING")} className={paymentFilter === "AWAITING" ? adminFilterButtonActiveClass : adminFilterButtonClass}>Awaiting</button><button type="button" onClick={() => setPaymentFilter("CONFIRMED")} className={paymentFilter === "CONFIRMED" ? adminFilterButtonActiveClass : adminFilterButtonClass}>Confirmed</button><button type="button" onClick={() => setPaymentFilter("ALL")} className={paymentFilter === "ALL" ? adminFilterButtonActiveClass : adminFilterButtonClass}>All</button></div>}>
      {visiblePaymentBookings.length ? <div className="space-y-4">{visiblePaymentBookings.map((booking) => <div key={booking.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{booking.payment.status === "RECORDED" ? "Payment confirmed" : "Awaiting payment"}</div><div className="mt-1 font-semibold text-slate-950">{booking.customer?.user?.fullName} · {toCurrency(Number(booking.payment.amount), "CAD")}</div><p className="mt-1 text-sm text-slate-600">{booking.pickupLocation}{booking.destinationLocation ? ` to ${booking.destinationLocation}` : ""}</p><p className="mt-1 text-xs text-slate-500">Reference: {booking.payment.providerReference ?? booking.id}</p></div>{booking.payment.status === "PENDING" ? <button type="button" disabled={confirmingBookingId === booking.id} onClick={() => void confirmPayment(booking)} className={adminPrimaryButtonClass}>{confirmingBookingId === booking.id ? "Confirming..." : "Confirm payment"}</button> : <div className="text-right text-sm text-emerald-700">Confirmed by {booking.payment.confirmedByAdminName ?? "Admin"}<br/><span className="text-xs text-slate-500">{booking.payment.recordedAt ? new Date(booking.payment.recordedAt).toLocaleString() : "Recorded"}</span></div>}</div></div>)}</div> : <p className="text-sm text-slate-500">No {paymentFilter === "AWAITING" ? "payments awaiting confirmation" : paymentFilter === "CONFIRMED" ? "confirmed payments" : "admin-assisted e-Transfer payments"}.</p>}
    </Panel>
    {message ? <p className="rounded-xl border border-[#C7D2FE] bg-[#EEF2FF] px-4 py-3 text-sm text-[#312E81]">{message}</p> : null}
  </AdminShell>;
}

function AddressOptions({ items, onSelect }: { items: AddressSuggestion[]; onSelect: (item: AddressSuggestion) => void }) {
  return <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">{items.map((item) => <button key={item.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => onSelect(item)} className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm text-slate-700 last:border-0 hover:bg-slate-50">{item.label}</button>)}</div>;
}

function CustomerOptions({ items, onSelect }: { items: Customer[]; onSelect: (item: Customer) => void }) {
  if (!items.length) return <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 shadow-lg">No customers found. Try a different search or create a new customer.</div>;
  return <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">{items.map((customer) => <button key={customer.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => onSelect(customer)} className="block w-full border-b border-slate-100 px-3 py-2 text-left last:border-0 hover:bg-slate-50"><span className="block text-sm font-medium text-slate-800">{customer.fullName}</span><span className="block text-xs text-slate-500">{customer.email} · {customer.membershipTier}</span></button>)}</div>;
}
