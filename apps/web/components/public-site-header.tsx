"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const navItems = [
  { label: "Services", href: "/services" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
  { label: "Become a Driver", href: "/driver/apply" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" }
] as const;

export function PublicSiteHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="rounded-[28px] border border-white/10 bg-[#081120]/84 px-6 py-5 backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        <Link href="/" className="relative block h-10 w-[172px] shrink-0 md:h-11 md:w-[224px]" aria-label="ChaufX home">
          <Image
            src="/chaufx-wordmark-header.png?v=1"
            alt="ChaufX"
            fill
            sizes="(min-width: 768px) 224px, 172px"
            className="object-contain object-left"
            priority
          />
        </Link>

        <nav className="hidden flex-wrap items-center justify-center gap-5 text-sm font-semibold text-white/70 lg:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden flex-wrap gap-3 lg:flex">
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
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white transition hover:border-white/30 hover:bg-white/6 lg:hidden"
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
        <div id="public-mobile-menu" className="mt-5 rounded-[24px] border border-white/10 bg-[#081120]/95 p-4 lg:hidden">
          <div className="grid gap-1">
            {navItems.map((item) => (
              <Link
                key={`mobile-${item.href}`}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-2xl px-3 py-3 text-sm font-medium text-white/82 transition hover:bg-white/8 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="mt-4 grid gap-3">
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
