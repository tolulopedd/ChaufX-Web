import Link from "next/link";
import { PublicPageShell } from "../../components/public-page-shell";

export default function AboutPage() {
  return (
    <PublicPageShell
      heroTitle="About Us"
      heroCopy="ChaufX is a Canadian trusted company that connects you with trusted professional drivers."
    >
      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-5 py-12 md:px-8">
          <div className="rounded-[30px] border border-[#E5E7EB] bg-white p-7 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.18)]">
            <h2 className="text-3xl font-semibold tracking-[-0.05em] text-[#0F172A]">
              ChaufX is a Canadian trusted company that connects you with trusted professional drivers.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
              ChaufX was created to give Canadians a better option by connecting them with trusted professional drivers who drive their own vehicles.
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Whether you're travelling to the airport, attending an important meeting, supporting a loved one, or simply taking a night off from driving, ChaufX helps you get there safely, comfortably, and confidently.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/contact" className="rounded-full bg-[#2563EB] px-5 py-3 text-sm font-semibold text-white">
                Contact us
              </Link>
              <Link href="/driver/apply" className="rounded-full border border-[#D7DEEF] px-5 py-3 text-sm font-semibold text-[#2563EB]">
                Become a driver
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
}
