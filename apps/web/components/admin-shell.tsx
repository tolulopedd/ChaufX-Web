"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode } from "react";
import { AdminBrand } from "./admin-brand";
import {
  ApplicationsIcon,
  BookingsIcon,
  DashboardIcon,
  DriversIcon,
  MessagesIcon,
  ReportsIcon,
  SettlementsIcon,
  SettingsIcon,
  SignOutIcon,
  TripsIcon
} from "./admin-icons";
import { clearStoredToken, getStoredToken } from "../lib/api";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardIcon },
  { href: "/drivers", label: "Drivers", icon: DriversIcon },
  { href: "/applications", label: "Applications", icon: ApplicationsIcon },
  { href: "/bookings", label: "Bookings", icon: BookingsIcon },
  { href: "/trips", label: "Active Trips", icon: TripsIcon },
  { href: "/messages", label: "Messages", icon: MessagesIcon },
  { href: "/reports", label: "Reports", icon: ReportsIcon },
  { href: "/settlements", label: "Settlements", icon: SettlementsIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon }
];

export function AdminShell({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const token = getStoredToken();

  return (
    <div className="min-h-screen bg-[#F7F8FB] text-[#0F172A]">
      <div className="mx-auto grid max-w-[1440px] gap-0 px-3 py-3 lg:grid-cols-[232px_1fr]">
        <aside className="border-r border-[#E5E7EB] bg-white px-4 py-4">
          <AdminBrand />
          <nav className="mt-4 space-y-1.5">
            {navItems.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium transition ${
                    active ? "bg-[#EEF0FF] text-[#4338CA]" : "text-slate-600 hover:bg-[#F7F8FB] hover:text-[#0F172A]"
                  }`}
                >
                  <span
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border transition ${
                      active
                        ? "border-[#DCDDFF] bg-white text-[#4338CA]"
                        : "border-[#E5E7EB] bg-[#F8FAFC] text-slate-500"
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-xl border border-[#E5E7EB] px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:border-[#D1D5DB] hover:bg-[#F3F4F6]"
            onClick={() => {
              clearStoredToken();
              router.push("/login");
            }}
          >
            <SignOutIcon className="h-4.5 w-4.5" />
            Sign out
          </button>

          {!token ? <p className="mt-3 text-xs text-amber-600">No token stored yet. Sign in to make live admin changes.</p> : null}
        </aside>

        <main className="space-y-4 bg-[#F7F8FB] px-4 py-4">
          <section className="border-b border-[#E5E7EB] pb-3">
            <div className="flex flex-col gap-2.5 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#4F46E5]">Admin workspace</div>
                <h1 className="mt-1.5 text-[1.65rem] font-semibold tracking-[-0.05em] text-slate-950">{title}</h1>
                {description ? <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-600">{description}</p> : null}
              </div>
              <div className="rounded-full border border-[#DCDDFF] bg-[#EEF0FF] px-3 py-1.5 text-xs font-medium text-[#4338CA]">
                ChaufX
              </div>
            </div>
          </section>

          {children}
        </main>
      </div>
    </div>
  );
}

export function Panel({
  title,
  children,
  aside,
  subtitle
}: {
  title: string;
  children: ReactNode;
  aside?: ReactNode;
  subtitle?: string;
}) {
  return (
    <section className="rounded-[18px] border border-[#E5E7EB] bg-white">
      <div className="flex flex-col gap-2 border-b border-[#F1F5F9] px-4 py-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-[1.05rem] font-semibold tracking-[-0.04em] text-slate-950">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p> : null}
        </div>
        {aside}
      </div>
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}
