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

const membershipTiers = [
  {
    name: "Basic",
    badge: "Pay as you go",
    price: "$0",
    cadence: "/month",
    hourlyRate: "$35/hour",
    summary: "For occasional bookings with no monthly commitment.",
    features: [
      "2-hour minimum booking",
      "Published hourly booking rate",
      "No monthly membership fee",
      "Book when you need a driver"
    ],
    cta: "Book a Driver",
    href: "/booking",
    featured: false
  },
  {
    name: "Plus",
    badge: "Priority access",
    price: "$100",
    cadence: "/month",
    annualPrice: "$999/year",
    hourlyRate: "$29/hour",
    summary: "For regular customers who want better rates and priority booking.",
    features: [
      "14-day free trial where offered",
      "Reduced hourly booking rate",
      "Add authorized users",
      "Priority booking",
      "Preferred driver selection"
    ],
    cta: "Choose Plus",
    href: "/booking",
    featured: true
  },
  {
    name: "Concierge",
    badge: "Premium support",
    price: "$200",
    cadence: "/month",
    annualPrice: "$2,199/year",
    hourlyRate: "$25/hour",
    summary: "For high-touch support, events, and frequent scheduled travel.",
    features: [
      "14-day free trial where offered",
      "Lowest published hourly rate",
      "Add authorized users",
      "Concierge booking assistance",
      "Event drivers and high-demand priority"
    ],
    cta: "Choose Concierge",
    href: "/booking",
    featured: false
  },
  {
    name: "Corporate",
    badge: "Custom",
    price: "Custom",
    cadence: "",
    hourlyRate: "Tailored rates",
    summary: "For organizations that need managed driver access and billing.",
    features: [
      "Custom pricing agreement",
      "Team and authorized-user access",
      "Centralized booking support",
      "Business travel and event coverage"
    ],
    cta: "Contact Sales",
    href: "/contact",
    featured: false
  }
];

const billingNotes = [
  "Plus, Concierge, and Corporate memberships renew automatically until cancelled.",
  "Membership fees are non-refundable once charged and remain active through the billing cycle.",
  "Taxes, tips, cancellation fees, no-show fees, tolls, parking, and pass-through costs may apply.",
  "Payments are processed securely by a third-party payment processor."
];

export default function PricingPage() {
  return (
    <PublicPageShell
      heroTitle="Pricing"
      heroCopy="ChaufX pricing is designed to stay simple, inclusive, and billed in Canadian dollars."
      heroActions={
        <>
          <Link
            href="/booking"
            className="inline-flex items-center justify-center rounded-full bg-[#2563EB] px-[1.875rem] py-[0.9375rem] text-[1.1rem] font-semibold text-white shadow-[0_16px_40px_-18px_rgba(37,99,235,0.8)] transition hover:bg-[#1D4ED8]"
          >
            Book a Driver
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center rounded-full border border-white/28 bg-white/10 px-[1.875rem] py-[0.9375rem] text-[1.1rem] font-semibold text-white backdrop-blur transition hover:bg-white/16"
          >
            Explore Pricing
          </Link>
        </>
      }
    >
      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-5 py-12 md:px-8">
          <div className="rounded-[30px] border border-[#D7DEEF] bg-[#EEF2FF] p-7 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.18)]">
            <div className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#4338CA]">Basic pricing</div>
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

          <div className="mt-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#4338CA]">Memberships</div>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[#0F172A]">Choose how you ride</h2>
              </div>
              <p className="max-w-xl text-sm leading-6 text-slate-600">
                Start with pay-as-you-go pricing or choose a membership for reduced hourly rates and priority access.
              </p>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-4">
              {membershipTiers.map((tier) => (
                <div
                  key={tier.name}
                  className={`group flex h-full flex-col rounded-[28px] border p-5 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.22)] transition duration-200 hover:-translate-y-1 hover:border-[#2563EB] hover:bg-[#F8FAFC] hover:shadow-[0_28px_80px_-48px_rgba(37,99,235,0.35)] ${
                    tier.featured ? "border-[#2563EB] bg-[#EEF2FF]" : "border-[#E5E7EB] bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xl font-semibold tracking-[-0.04em] text-[#0F172A]">{tier.name}</h3>
                    <span className={`rounded-full px-3 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.16em] ${
                      tier.featured ? "bg-[#2563EB] text-white" : "bg-[#EEF2FF] text-[#4338CA]"
                    }`}>
                      {tier.badge}
                    </span>
                  </div>

                  <div className="mt-5">
                    <span className="text-4xl font-semibold tracking-[-0.06em] text-[#0F172A]">{tier.price}</span>
                    <span className="text-sm font-semibold text-slate-500">{tier.cadence}</span>
                  </div>
                  {"annualPrice" in tier ? (
                    <div className="mt-1 text-sm font-semibold text-slate-600">{tier.annualPrice}</div>
                  ) : null}
                  <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#2563EB]">
                    {tier.hourlyRate}
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-600">{tier.summary}</p>

                  <ul className="mt-5 space-y-3 text-sm leading-5 text-slate-700">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex gap-2">
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#2563EB]" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={tier.href}
                    className={`mt-auto inline-flex w-full items-center justify-center rounded-full px-4 py-3 text-sm font-semibold transition duration-200 ${
                      tier.featured ? "bg-[#2563EB] text-white group-hover:bg-[#1D4ED8]" : "border border-[#D7DEEF] text-[#2563EB] group-hover:border-[#2563EB] group-hover:bg-[#2563EB] group-hover:text-white"
                    }`}
                  >
                    {tier.cta}
                  </Link>
                </div>
              ))}
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

          <div className="mt-4 rounded-[28px] border border-[#E5E7EB] bg-white p-6 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.18)]">
            <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#0F172A]">Billing notes</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {billingNotes.map((note) => (
                <div key={note} className="rounded-[18px] border border-[#E5E7EB] bg-[#F8FAFC] p-4 text-sm leading-6 text-slate-600">
                  {note}
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>
    </PublicPageShell>
  );
}
