"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PublicPageShell } from "../../../components/public-page-shell";

const tritonDriverAbstractEnglishUrl = "https://secure.tritoncanada.ca/Eiv/InitiateEiv?id=3053c519-8fa3-e878-6f61-e1d2831a1543&language=en";
const tritonDriverAbstractFrenchUrl = "https://secure.tritoncanada.ca/Eiv/InitiateEiv?id=3053c519-8fa3-e878-6f61-e1d2831a1543&language=fr";

function BackgroundCheckContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const statusHref = email ? `/driver/status?email=${encodeURIComponent(email)}` : "/driver/status";

  return (
    <PublicPageShell>
      <main className="bg-[#F6F8FC] px-5 py-16 sm:py-24">
        <section className="mx-auto max-w-3xl rounded-[36px] border border-[#E5E7EB] bg-white p-8 shadow-[0_30px_90px_-55px_rgba(15,23,42,0.24)] md:p-12">
          <div className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#4338CA]">Background check</div>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-[#0F172A]">Complete your driver abstract verification</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
            ChaufX has partnered with Triton to conduct background checks as part of our verification process. Please select your preferred language below to continue with Triton Verification. Once you complete the driver abstract verification process, ChaufX will review the results and send you an email confirming your verification status and for you to proceed with the final process of the background check.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <a
              href={tritonDriverAbstractEnglishUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-[#2563EB] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_-18px_rgba(37,99,235,0.55)]"
            >
              Continue in English
            </a>
            <a
              href={tritonDriverAbstractFrenchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-[#C7D2FE] bg-[#EEF2FF] px-5 py-3 text-sm font-semibold text-[#4338CA]"
            >
              Continuer en français
            </a>
          </div>

          <Link href={statusHref} className="mt-8 inline-flex text-sm font-semibold text-[#2563EB] hover:text-[#1D4ED8]">
            Check application status
          </Link>
        </section>
      </main>
    </PublicPageShell>
  );
}

export default function DriverBackgroundCheckPage() {
  return (
    <Suspense fallback={null}>
      <BackgroundCheckContent />
    </Suspense>
  );
}
