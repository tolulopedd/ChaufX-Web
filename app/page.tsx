import type { Metadata } from "next";
import Link from "next/link";
import { PublicPageShell } from "../components/public-page-shell";
import { SoroBlogPreview } from "../components/soro-blog-preview";
import { featuredFaqs } from "../lib/faqs";
import { policyDocuments } from "../lib/policy-documents";

export const metadata: Metadata = {
  title: "ChaufX",
  description: "ChaufX Canada public website."
};

const services = [
  {
    title: "Airport Travel",
    body: "Skip expensive parking and rideshare uncertainty. A professional driver gets you to and from the airport while you travel in your own vehicle."
  },
  {
    title: "Medical Appointments",
    body: "Comfortable transportation for seniors, caregivers, and patients using the vehicle they already know and trust."
  },
  {
    title: "Business Travel",
    body: "Turn travel time into productive time while a professional driver handles the road."
  },
  {
    title: "Evenings Out",
    body: "Enjoy dinner, celebrations, and nightlife knowing you'll return home safely in your own vehicle."
  }
];

const flow = [
  {
    title: "Tell us where you're going.",
    body: "Enter your pickup location, destination, and preferred time."
  },
  {
    title: "Get matched with a professional driver.",
    body: "An approved driver accepts your booking."
  },
  {
    title: "Enjoy the ride.",
    body: "Relax, work, or spend time with family while your professional driver takes the wheel."
  }
];

const highlights = [
  {
    title: "Keep Your Car",
    body: "Enjoy every trip in the comfort and familiarity of your own vehicle.",
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
    title: "Trusted Professional Drivers",
    body: "Every driver completes our approval process before accepting trips.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="8" r="3" />
        <path d="M6 19c0-3 2.7-5 6-5s6 2 6 5" />
        <path d="M18.5 6.5l1 1 2-2" />
      </svg>
    )
  },
  {
    title: "Simple, Transparent Pricing",
    body: "One hourly rate with no surge pricing or hidden fees.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3v18" />
        <path d="M16.5 7.5c0-1.7-1.8-3-4.5-3S7.5 5.8 7.5 7.5 9.3 10 12 10s4.5 1.3 4.5 3-1.8 3-4.5 3-4.5-1.3-4.5-3" />
      </svg>
    )
  }
];

const trustItems = [
  {
    title: "Professional drivers",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="7.5" r="3" />
        <path d="M5.5 20c.7-3.5 3.2-5.4 6.5-5.4s5.8 1.9 6.5 5.4" />
      </svg>
    )
  },
  {
    title: "Driver screening and approval",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3.5 19 6v5.5c0 4.4-2.8 7.2-7 9-4.2-1.8-7-4.6-7-9V6l7-2.5Z" />
        <path d="m9.2 12 1.9 1.9 3.9-4" />
      </svg>
    )
  },
  {
    title: "Your own vehicle",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m4 13 1.7-4.2A2 2 0 0 1 7.6 7.5h8.8a2 2 0 0 1 1.9 1.3L20 13" />
        <path d="M5 13h14v4.5a1 1 0 0 1-1 1h-1" />
        <path d="M6 18.5H5a1 1 0 0 1-1-1V13" />
        <circle cx="7.5" cy="16.5" r="1.4" />
        <circle cx="16.5" cy="16.5" r="1.4" />
      </svg>
    )
  },
  {
    title: "Transparent pricing",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M7 4h10v16H7z" />
        <path d="M9.5 8h5" />
        <path d="M9.5 12h5" />
        <path d="M9.5 16h2.5" />
      </svg>
    )
  },
  {
    title: "Easy online booking",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="5" y="4" width="14" height="16" rx="2.2" />
        <path d="M9 8h6" />
        <path d="M9 12h4" />
        <path d="m9 16 1.5 1.5L15 13" />
      </svg>
    )
  },
  {
    title: "Canadian customer support",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 12a7 7 0 0 1 14 0" />
        <path d="M5 12v3a2 2 0 0 0 2 2h1v-6H7a2 2 0 0 0-2 2Z" />
        <path d="M19 12v3a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2Z" />
        <path d="M15.5 19H13" />
      </svg>
    )
  }
];

const portals = [
  {
    eyebrow: "Driver onboarding",
    title: "Join the chauffeur network",
    body: "Create your application, upload your documents, and track your review status.",
    href: "/driver/apply",
    cta: "Apply to Become a Driver"
  },
  {
    eyebrow: "Login",
    title: "Access your account",
    body: "Use one login page for approved driver and admin accounts. ChaufX routes each user to the correct platform after sign-in.",
    href: "/login",
    cta: "Login"
  }
];

export default function HomePage() {
  return (
    <PublicPageShell
      heroTitle="Professional Drivers for Your Own Car"
      heroCopy="ChaufX connects you with trusted professional drivers who drive your vehicle, so you can travel safely, comfortably, and on your schedule. Whether you're heading to the airport, attending a business meeting, visiting a medical appointment, or enjoying a night out, you stay in your own car while we handle the driving."
      heroTagline="Your Car, Your Convenience, Your Safety"
      heroActions={
        <>
          <Link
            href="/booking"
            className="inline-flex items-center justify-center rounded-full bg-[#2563EB] px-[1.875rem] py-[0.9375rem] text-[1.1rem] font-semibold text-white shadow-[0_16px_40px_-18px_rgba(37,99,235,0.8)] transition hover:bg-[#1D4ED8]"
          >
            Book a Driver
          </Link>
          <Link
            href="/driver"
            className="inline-flex items-center justify-center rounded-full border border-white/28 bg-white/10 px-[1.875rem] py-[0.9375rem] text-[1.1rem] font-semibold text-white backdrop-blur transition hover:bg-white/16"
          >
            Become a Driver
          </Link>
        </>
      }
    >
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-6 md:px-8">
          <div className="grid gap-4 lg:grid-cols-3">
            {highlights.map((item) => (
              <div
                key={item.title}
                className="rounded-[28px] border border-[#E5E7EB] bg-white p-6 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.18)]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EEF2FF] text-[#2563EB]">
                  {item.icon}
                </div>
                <div className="mt-4 text-lg font-semibold tracking-[-0.04em] text-[#0F172A]">{item.title}</div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-14">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#4338CA]">Trust</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#0F172A] md:text-4xl">
                Why Canadians Trust ChaufX
              </h2>
            </div>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {trustItems.map((item) => (
              <div
                key={item.title}
                className="flex items-center gap-4 rounded-[24px] border border-[#E5E7EB] bg-[#F8FAFC] p-5 shadow-[0_20px_55px_-48px_rgba(15,23,42,0.34)]"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#2563EB] shadow-[0_18px_38px_-28px_rgba(37,99,235,0.7)]">
                  {item.icon}
                </div>
                <div className="text-base font-semibold tracking-[-0.03em] text-[#0F172A]">{item.title}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="services" className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-12 md:px-8">
          <div className="max-w-3xl">
            <div className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#4338CA]">Services</div>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-[#0F172A]">
              Simple chauffeur service in your own vehicle.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600 lg:whitespace-nowrap">
              ChaufX is built for customers who want a professional driver without giving up the comfort, privacy, and convenience of their own car.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {services.map((item) => (
              <div
                key={item.title}
                className="rounded-[28px] border border-[#E5E7EB] bg-white p-6 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.24)]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EEF2FF] text-[#2563EB]">
                    <div className="h-2.5 w-2.5 rounded-full bg-current" />
                  </div>
                  <div className="text-lg font-semibold tracking-[-0.04em] text-[#0F172A]">{item.title}</div>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-6 md:px-8">
          <div className="rounded-[30px] border border-[#E5E7EB] bg-white p-7 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.18)]">
            <div className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#4338CA]">About Us</div>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[#0F172A]">
              Professional driving for your everyday plans and important journeys.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
              Whether it is a personal errand, a night out, a medical appointment, a busy workday, or a longer trip, ChaufX helps you reclaim your time while a vetted chauffeur drives your vehicle.
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              We focus on simple booking, reliable arrival, senior-friendly service, and a clean operating system for approved chauffeurs and admins.
            </p>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-6 md:px-8">
          <div className="rounded-[30px] border border-[#E5E7EB] bg-white p-7 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.18)]">
            <div className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#4338CA]">How It Works</div>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[#0F172A]">A clear three(3) steps customer flow.</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {flow.map((item, index) => (
                <div key={item.title} className="rounded-[24px] border border-[#E5E7EB] bg-[#F8FAFC] p-5">
                  <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#4338CA]">
                    Step {index + 1}
                  </div>
                  <h3 className="mt-3 text-base font-semibold tracking-[-0.03em] text-[#0F172A]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="portals" className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-6 md:px-8">
          <div className="max-w-3xl">
            <div className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#4338CA]">Join us</div>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-[#0F172A]">
              Use the path that fits your role.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Once you know what ChaufX is about, use the right entry point for onboarding, login, or platform control.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {portals.map((item) => (
              <div
                key={item.title}
                className="rounded-[28px] border border-[#E5E7EB] bg-white p-6 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.18)]"
              >
                <div className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#4338CA]">{item.eyebrow}</div>
                <h3 className="mt-3 text-xl font-semibold tracking-[-0.04em] text-[#0F172A]">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.body}</p>
                <Link
                  href={item.href}
                  className="mt-6 inline-flex rounded-full border border-[#D7DEEF] px-5 py-2.5 text-sm font-semibold text-[#2563EB] transition hover:border-[#2563EB]"
                >
                  {item.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="blog-preview" className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-6 md:px-8">
          <div className="rounded-[30px] border border-[#E5E7EB] bg-white p-7 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.18)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="max-w-3xl">
                <div className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#4338CA]">
                  Blog, News and Articles
                </div>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[#0F172A]">
                  Read about our latest content.
                </h2>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  This section shows our latest blog posts and news summaries that are managed by ChaufX team.
                </p>
              </div>

              <Link
                href="/blog"
                className="inline-flex rounded-full bg-[#2563EB] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_36px_-18px_rgba(37,99,235,0.65)]"
              >
                Visit blog
              </Link>
            </div>

            <SoroBlogPreview />
          </div>
        </div>
      </section>

      <section id="faq-preview" className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-6 md:px-8">
          <div className="rounded-[30px] border border-[#E5E7EB] bg-[#F8FAFC] p-7 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.18)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="max-w-3xl">
                <div className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#4338CA]">FAQ</div>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[#0F172A]">Frequently Asked Questions</h2>
              </div>

              <Link
                href="/faq"
                className="inline-flex rounded-full bg-[#2563EB] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_36px_-18px_rgba(37,99,235,0.65)]"
              >
                View all FAQs
              </Link>
            </div>

            <div className="mt-7 grid gap-4 md:grid-cols-2">
              {featuredFaqs.map((item) => (
                <details key={item.question} className="group rounded-[24px] border border-[#E5E7EB] bg-white p-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-base font-semibold tracking-[-0.03em] text-[#0F172A]">
                    {item.question}
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EEF2FF] text-[#2563EB] transition group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600">
                    {item.answer.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                    {item.bullets?.length ? (
                      <ul className="grid gap-2">
                        {item.bullets.slice(0, 3).map((bullet) => (
                          <li key={bullet} className="flex gap-3">
                            <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2563EB]" />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="policies" className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-6 md:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <div className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#4338CA]">Policies</div>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[#0F172A]">See all ChaufX policies.</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                We make our public policies easy to review before using the service, creating an account, or applying as a driver.
              </p>
            </div>

            <Link
              href="/policies"
              className="inline-flex rounded-full bg-[#2563EB] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_36px_-18px_rgba(37,99,235,0.65)]"
            >
              View all policies
            </Link>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {policyDocuments.map((item) => (
              <div
                key={item.slug}
                className="flex h-full flex-col rounded-[28px] border border-[#E5E7EB] bg-white p-6 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.14)]"
              >
                <div className="inline-flex w-fit rounded-full bg-[#EEF2FF] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#4338CA]">
                  Policy
                </div>
                <h3 className="mt-4 text-xl font-semibold tracking-[-0.04em] text-[#0F172A]">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.summary}</p>
                <div className="mt-4 text-sm font-medium text-slate-500">{item.updatedLabel}</div>
                <div className="mt-auto pt-6">
                  <Link href={`/policies/${item.slug}`} className="text-sm font-semibold text-[#2563EB] transition hover:text-[#1D4ED8]">
                    Read more
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
}
