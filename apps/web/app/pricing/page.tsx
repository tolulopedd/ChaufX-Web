import Link from "next/link";
import { PublicPageShell } from "../../components/public-page-shell";

const includedItems = [
  {
    label: "Professional approved driver",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="8" r="3" />
        <path d="M6 19c0-3 2.7-5 6-5s6 2 6 5" />
        <path d="M18.5 6.5l1 1 2-2" />
      </svg>
    )
  },
  {
    label: "Your own vehicle",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 14l2-5a2 2 0 0 1 1.9-1.4h10.2A2 2 0 0 1 19 9l2 5" />
        <path d="M5 14h14v4a1 1 0 0 1-1 1h-1" />
        <path d="M5 14v4a1 1 0 0 0 1 1h1" />
        <circle cx="7.5" cy="17.5" r="1.5" />
        <circle cx="16.5" cy="17.5" r="1.5" />
      </svg>
    )
  },
  {
    label: "Transparent hourly pricing",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        <path d="M12 7v5l3 2" />
        <path d="M8 19l-2 2" />
        <path d="M16 19l2 2" />
      </svg>
    )
  },
  {
    label: "No surge pricing",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3v18" />
        <path d="M16.5 7.5c0-1.7-1.8-3-4.5-3S7.5 5.8 7.5 7.5 9.3 10 12 10s4.5 1.3 4.5 3-1.8 3-4.5 3-4.5-1.3-4.5-3" />
        <path d="M5 5l14 14" />
      </svg>
    )
  },
  {
    label: "Easy scheduling",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M8 3v4" />
        <path d="M16 3v4" />
        <path d="M4 10h16" />
        <path d="M9 15l2 2 4-4" />
      </svg>
    )
  }
];

export default function PricingPage() {
  return (
    <PublicPageShell
      heroTitle="Pricing"
      heroCopy="ChaufX pricing is designed to stay simple, inclusive, and billed in Canadian dollars."
    >
      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-5 py-12 md:px-8">
          <div className="rounded-[30px] border border-[#D7DEEF] bg-[#EEF2FF] p-7 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.18)]">
            <div className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#4338CA]">Public pricing</div>
            <div className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-[#0F172A]">Flat-rate $35 CAD/hour</div>
            <p className="mt-3 text-base leading-7 text-slate-700">
              Minimum booking is 2 hours. No hidden fees.
            </p>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-[28px] border border-[#E5E7EB] bg-white p-6 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.18)]">
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#0F172A]">Simple pricing model</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Flat-rate $35 CAD per hour, stays simple, and is billed in Canadian dollars. Once your booking is confirmed, there is no surge repricing.
              </p>
            </div>
            <div className="rounded-[28px] border border-[#E5E7EB] bg-white p-6 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.18)]">
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#0F172A]">Booking terms</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Customers can review an estimate before submitting a request. Minimum booking is 2 hours and pricing is shown without hidden fees.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-[28px] border border-[#E5E7EB] bg-white p-6 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.18)]">
            <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#0F172A]">What's Included</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {includedItems.map((item) => (
                <div key={item.label} className="rounded-[18px] border border-[#E5E7EB] bg-[#F8FAFC] p-4 text-sm font-semibold text-slate-700">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#2563EB]">
                    {item.icon}
                  </div>
                  <div className="mt-3 leading-5">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/booking" className="rounded-full bg-[#2563EB] px-5 py-3 text-sm font-semibold text-white">
              Book online
            </Link>
            <Link href="/services" className="rounded-full border border-[#D7DEEF] px-5 py-3 text-sm font-semibold text-[#2563EB]">
              Explore Services
            </Link>
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
}
