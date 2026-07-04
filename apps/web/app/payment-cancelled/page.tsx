import Link from "next/link";
import { PublicPageShell } from "../../components/public-page-shell";

export default function PaymentCancelledPage() {
  return (
    <PublicPageShell
      heroTitle="Payment not completed"
      heroCopy="Your Stripe checkout was cancelled before payment finished. You can return to the ChaufX app and try again whenever you are ready."
      heroTagline="Payment paused"
    >
      <section className="bg-white">
        <div className="mx-auto max-w-3xl px-5 py-10 md:px-8">
          <div className="rounded-[30px] border border-[#E5E7EB] bg-white p-8 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.18)]">
            <div className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#4338CA]">
              Stripe checkout
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[#0F172A]">
              Payment cancelled.
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600">
              No charge was recorded. Return to the ChaufX app to resume payment for your completed trip whenever it suits you.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/"
                className="inline-flex rounded-full border border-[#D7DEEF] px-5 py-3 text-sm font-semibold text-[#2563EB] transition hover:border-[#2563EB]"
              >
                Back to site
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
}
