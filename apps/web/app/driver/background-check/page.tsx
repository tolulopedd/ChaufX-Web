"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PublicPageShell } from "../../../components/public-page-shell";
import { fetchDriverAbstractSubmission, submitDriverAbstractForReview } from "../../../lib/api";

const tritonDriverAbstractEnglishUrl = "https://secure.tritoncanada.ca/Eiv/InitiateEiv?id=3053c519-8fa3-e878-6f61-e1d2831a1543&language=en";
const tritonDriverAbstractFrenchUrl = "https://secure.tritoncanada.ca/Eiv/InitiateEiv?id=3053c519-8fa3-e878-6f61-e1d2831a1543&language=fr";

function BackgroundCheckContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [application, setApplication] = useState<{ fullName: string; email: string } | null>(null);
  const [openedTriton, setOpenedTriton] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(Boolean(token));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError("This driver abstract link is invalid or has expired.");
      return;
    }

    void fetchDriverAbstractSubmission(token)
      .then((result) => setApplication(result))
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load this driver abstract step."))
      .finally(() => setLoading(false));
  }, [token]);

  async function submitForReview() {
    if (!token || !confirmed) return;

    setSubmitting(true);
    setError("");
    try {
      await submitDriverAbstractForReview(token);
      setComplete(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to submit for review.");
    } finally {
      setSubmitting(false);
    }
  }

  const statusHref = application ? `/driver/status?email=${encodeURIComponent(application.email)}` : "/driver/status";

  return (
    <PublicPageShell>
      <main className="bg-[#F6F8FC] px-5 py-16 sm:py-24">
        <section className="mx-auto max-w-3xl rounded-[36px] border border-[#E5E7EB] bg-white p-8 shadow-[0_30px_90px_-55px_rgba(15,23,42,0.24)] md:p-12">
          <div className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#4338CA]">Driver abstract</div>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-[#0F172A]">Complete your Drivers Abstract Check Application</h1>

          {loading ? <p className="mt-5 text-base text-slate-600">Loading your application.</p> : null}
          {error ? <p className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

          {complete ? (
            <div className="mt-6 rounded-2xl bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-800">
              Submitted for review.
              <Link href={statusHref} className="ml-2 font-semibold text-[#2563EB]">Check status</Link>
            </div>
          ) : application ? (
            <>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
                Click on the preferred language to complete the Triton Driver Abstract check, then return here and submit your application for ChaufX review.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <a
                  href={tritonDriverAbstractEnglishUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpenedTriton(true)}
                  className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-[#2563EB] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_-18px_rgba(37,99,235,0.55)]"
                >
                  Continue in English
                </a>
                <a
                  href={tritonDriverAbstractFrenchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpenedTriton(true)}
                  className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-[#C7D2FE] bg-[#EEF2FF] px-5 py-3 text-sm font-semibold text-[#4338CA]"
                >
                  Continuer en français
                </a>
              </div>

              <label className="mt-7 flex items-start gap-3 rounded-2xl border border-slate-200 px-4 py-4 text-sm leading-6 text-slate-700">
                <input
                  type="checkbox"
                  checked={confirmed}
                  disabled={!openedTriton}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-[#2563EB]"
                />
                <span>I confirm that I completed the Triton Driver Abstract check on Triton Website.</span>
              </label>

              <button
                type="button"
                disabled={!openedTriton || !confirmed || submitting}
                onClick={submitForReview}
                className="mt-5 inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#0F172A] px-6 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
              >
                {submitting ? "Submitting..." : "Submit for review"}
              </button>
            </>
          ) : null}
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
