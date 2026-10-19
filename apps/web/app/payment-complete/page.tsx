import Link from "next/link";
import { PublicPageShell } from "../../components/public-page-shell";

export default function PaymentCompletePage() {
  return (
    <PublicPageShell
      heroTitle="Card authorized"
      heroCopy="We’re finding your driver. Your card is charged only after a driver accepts."
    >
      <section className="bg-white">
        <div className="mx-auto max-w-3xl px-5 py-10 md:px-8">
          <div className="rounded-[30px] border border-[#E5E7EB] bg-white p-8 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.18)]">
            <h1 className="text-3xl font-semibold tracking-[-0.05em] text-[#0F172A]">
              Finding your driver
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600">
              We’ll notify you when a driver accepts. If no driver accepts, your authorization is released automatically.
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
