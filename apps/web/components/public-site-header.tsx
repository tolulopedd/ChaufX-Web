"use client";

import Link from "next/link";
import { useState } from "react";
import { AdminBrand } from "./admin-brand";

const menus = [
  {
    label: "Services",
    items: [
      { label: "All services", href: "/services" },
      { label: "Personal driving", href: "/services#personal-driving" },
      { label: "Senior & assisted trips", href: "/services#senior-assisted" },
      { label: "Business & long trips", href: "/services#business-travel" }
    ]
  },
  {
    label: "About",
    items: [
      { label: "About Us", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Become a driver", href: "/driver/apply" },
      { label: "Feedback", href: "/feedback" },
      { label: "Inquiry", href: "/inquiry" }
    ]
  },
  {
    label: "How It Works",
    items: [
      { label: "Customer journey", href: "/how-it-works#customer-journey" },
      { label: "Driver onboarding", href: "/how-it-works#driver-onboarding" },
      { label: "Application status", href: "/driver/status" },
      { label: "Login", href: "/login" }
    ]
  },
  {
    label: "Blog",
    items: [
      { label: "Blogs", href: "/blog" },
      { label: "Latest articles", href: "/blog" }
    ]
  },
  {
    label: "Policies",
    items: [
      { label: "All policies", href: "/policies" },
      { label: "Privacy policy", href: "/policies/privacy-policy" },
      { label: "Terms and conditions", href: "/policies/terms-and-conditions" },
      { label: "Driver agreement", href: "/policies/driver-contractor-agreement" }
    ]
  },
  {
    label: "Pricing & Booking",
    items: [
      { label: "Pricing", href: "/pricing" },
      { label: "Book online", href: "/booking" },
      { label: "Drive now", href: "/booking#drive-now" },
      { label: "Schedule a drive", href: "/booking#schedule-drive" }
    ]
  }
] as const;

export function PublicSiteHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="rounded-[28px] border border-white/10 bg-[#081120]/84 px-6 py-5 backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        <AdminBrand href="/" theme="dark" />

        <nav className="hidden flex-wrap gap-5 text-sm font-semibold text-white/70 md:flex">
          {menus.map((menu) => (
            <details key={menu.label} className="group relative">
              <summary className="list-none cursor-pointer transition hover:text-white [&::-webkit-details-marker]:hidden">
                {menu.label}
              </summary>
              <div className="mt-2 pointer-events-none absolute left-0 top-full pt-3 opacity-0 transition duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-open:pointer-events-auto group-open:opacity-100">
                <div className="min-w-[220px] rounded-[22px] border border-white/10 bg-[#081120]/95 p-3 shadow-[0_28px_70px_-48px_rgba(15,23,42,0.85)] backdrop-blur">
                  {menu.items.map((item) => (
                    <Link
                      key={`${menu.label}-${item.href}`}
                      href={item.href}
                      className="block rounded-2xl px-3 py-2.5 text-sm font-medium text-white/78 transition hover:bg-white/8 hover:text-white"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </details>
          ))}
        </nav>

        <div className="hidden flex-wrap gap-3 md:flex">
          <Link
            href="/driver/apply"
            className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white/88"
          >
            Become a driver
          </Link>
          <Link
            href="/login"
            className="rounded-full bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_16px_36px_-18px_rgba(37,99,235,0.65)]"
          >
            Login
          </Link>
        </div>

        <button
          type="button"
          aria-expanded={mobileMenuOpen}
          aria-controls="public-mobile-menu"
          onClick={() => setMobileMenuOpen((value) => !value)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white transition hover:border-white/30 hover:bg-white/6 md:hidden"
        >
          <span className="sr-only">Toggle menu</span>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            {mobileMenuOpen ? (
              <>
                <path d="M6 6l12 12" />
                <path d="M18 6L6 18" />
              </>
            ) : (
              <>
                <path d="M4 7h16" />
                <path d="M4 12h16" />
                <path d="M4 17h16" />
              </>
            )}
          </svg>
        </button>
      </div>

      {mobileMenuOpen ? (
        <div id="public-mobile-menu" className="mt-5 rounded-[24px] border border-white/10 bg-[#081120]/95 p-4 md:hidden">
          <div className="space-y-4">
            {menus.map((menu) => (
              <div key={menu.label} className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/45">
                  {menu.label}
                </div>
                <div className="mt-3 flex flex-col gap-1">
                  {menu.items.map((item) => (
                    <Link
                      key={`${menu.label}-mobile-${item.href}`}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded-2xl px-3 py-2.5 text-sm font-medium text-white/82 transition hover:bg-white/8 hover:text-white"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-3">
            <Link
              href="/driver/apply"
              onClick={() => setMobileMenuOpen(false)}
              className="inline-flex items-center justify-center rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white/88"
            >
              Become a driver
            </Link>
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="inline-flex items-center justify-center rounded-full bg-[#2563EB] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_36px_-18px_rgba(37,99,235,0.65)]"
            >
              Login
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
