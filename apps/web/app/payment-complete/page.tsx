import Link from "next/link";
import { PublicPageShell } from "../../components/public-page-shell";

export default function PaymentCompletePage() {
  return (
    <PublicPageShell
      heroTitle="Card authorized"
      heroCopy="We are finding an eligible driver for your ChaufX trip. Your card is charged only after a driver accepts."
      heroTagline="Driver matching"
    >
      <section className="bg-white">
        <div className="mx-auto max-w-3xl px-5 py-10 md:px-8">
          <div className="rounded-[30px] border border-[#E5E7EB] bg-white p-8 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.18)]">
            <div className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#4338CA]">
              Stripe checkout
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[#0F172A]">
              Card authorized — finding your driver.
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600">
              We will notify you as soon as a driver accepts your booking. If no driver accepts within the matching window, the authorization is released automatically.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/customer#upcoming"
                className="inline-flex rounded-full bg-[#2563EB] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1D4ED8]"
              >
                View your trip
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
}
