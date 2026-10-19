import Link from "next/link";
import { PublicPageShell } from "../../components/public-page-shell";

export default function BookingPage() {
  return (
    <PublicPageShell
      heroTitle="Book a trip"
      heroCopy="Book now or schedule ahead."
    >
      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-5 py-12 md:px-8">
          <div className="grid gap-4 md:grid-cols-2">
            <div id="drive-now" className="rounded-[28px] border border-[#E5E7EB] bg-white p-6 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.18)]">
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#0F172A]">Book Now</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Request a driver for your vehicle now.
              </p>
            </div>
            <div id="schedule-drive" className="rounded-[28px] border border-[#E5E7EB] bg-white p-6 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.18)]">
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#0F172A]">Schedule a trip</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Choose a date, start time, and duration.
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-[28px] border border-[#E5E7EB] bg-[#F8FAFC] p-6">
            <p className="text-sm leading-7 text-slate-600">Sign in to manage bookings, payments, and trip history.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/login" className="rounded-full bg-[#2563EB] px-5 py-3 text-sm font-semibold text-white">
                Sign in to book
              </Link>
              <Link href="/pricing" className="rounded-full border border-[#D7DEEF] px-5 py-3 text-sm font-semibold text-[#2563EB]">
                See Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
}
