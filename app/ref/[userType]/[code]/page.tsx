"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { AdminBrand } from "../../../../components/admin-brand";

export default function ReferralEntryPage() {
  const params = useParams<{ userType: string; code: string }>();
  const userType = params.userType === "driver" ? "driver" : "customer";
  const code = useMemo(() => decodeURIComponent(params.code ?? "").trim().toUpperCase(), [params.code]);
  const valid = /^CHX-[A-Z0-9]{3,12}$/.test(code);

  useEffect(() => {
    if (valid) window.localStorage.setItem(`chaufx_${userType}_referral_code`, code);
  }, [code, userType, valid]);

  const webHref = userType === "driver" ? `/driver/apply?ref=${encodeURIComponent(code)}` : `/login?mode=signup&role=customer&ref=${encodeURIComponent(code)}`;
  const appHref = `ca.chaufx.customer://register?ref=${encodeURIComponent(code)}`;

  return (
    <main className="min-h-screen bg-[#F7F8FB] px-5 py-12">
      <section className="mx-auto max-w-lg rounded-[28px] border border-[#E5E7EB] bg-white p-8 shadow-sm">
        <AdminBrand href="/" compact variant="login" />
        <div className="mt-7 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#4338CA]">Partner referral</div>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
          {valid ? (userType === "driver" ? "Start driver onboarding" : "Create your customer account") : "Invalid referral link"}
        </h1>
        {valid ? (
          <div className="mt-7 grid gap-3">
            {userType === "customer" ? <a className="rounded-2xl bg-[#2563EB] px-5 py-3 text-center text-sm font-semibold text-white" href={appHref}>Open customer app</a> : null}
            <Link className="rounded-2xl border border-[#DCDDFF] bg-[#EEF0FF] px-5 py-3 text-center text-sm font-semibold text-[#4338CA]" href={webHref}>
              {userType === "driver" ? "Continue to onboarding" : "Continue on web"}
            </Link>
            {userType === "customer" ? (
              <div className="flex justify-center gap-4 pt-2 text-xs font-semibold text-slate-500">
                <a href="https://apps.apple.com/ca/app/chaufx/id6782390628">Install for iOS</a>
                <a href="https://play.google.com/store/apps/details?id=ca.chaufx.customer">Install for Android</a>
              </div>
            ) : null}
          </div>
        ) : <Link className="mt-7 inline-flex font-semibold text-[#2563EB]" href="/">Return home</Link>}
      </section>
    </main>
  );
}
