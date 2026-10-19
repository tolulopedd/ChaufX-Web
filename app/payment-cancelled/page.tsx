import Link from "next/link";
import { PublicPageShell } from "../../components/public-page-shell";

export default function PaymentCancelledPage() {
  return (
    <PublicPageShell
      heroTitle="Payment not completed"
      heroCopy="No charge was made. Your booking is still available in Payments."
    >
      <section className="bg-white">
        <div className="mx-auto max-w-3xl px-5 py-10 md:px-8">
          <div className="rounded-[30px] border border-[#E5E7EB] bg-white p-8 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.18)]">
            <h1 className="text-3xl font-semibold tracking-[-0.05em] text-[#0F172A]">
              Payment cancelled
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Return to your account whenever you’re ready to continue.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/customer#awaiting-payment"
                className="inline-flex rounded-full border border-[#D7DEEF] px-5 py-3 text-sm font-semibold text-[#2563EB] transition hover:border-[#2563EB]"
              >
                View payments
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
}
