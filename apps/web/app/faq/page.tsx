import type { Metadata } from "next";
import Link from "next/link";
import { PublicPageShell } from "../../components/public-page-shell";
import { faqCategories } from "../../lib/faqs";

export const metadata: Metadata = {
  title: "Frequently Asked Questions | ChaufX",
  description: "Answers to common questions about ChaufX bookings, drivers, pricing, safety, accounts, and support."
};

export default function FaqPage() {
  return (
    <PublicPageShell
      heroTitle="Frequently Asked Questions"
      heroCopy="Find quick answers about booking a professional driver, travelling in your own vehicle, pricing, driver approval, and support."
    >
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-12 md:px-8">
          <div className="grid gap-5 lg:grid-cols-[0.8fr_1.8fr]">
            <aside className="h-fit rounded-[28px] border border-[#E5E7EB] bg-[#F8FAFC] p-5 lg:sticky lg:top-6">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2563EB]">FAQ Topics</div>
              <div className="mt-4 grid gap-2">
                {faqCategories.map((category) => (
                  <a
                    key={category.title}
                    href={`#${category.title.toLowerCase().replaceAll(" ", "-").replaceAll("&", "and")}`}
                    className="rounded-2xl px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-[#2563EB]"
                  >
                    {category.title}
                  </a>
                ))}
              </div>
            </aside>

            <div className="space-y-5">
              {faqCategories.map((category) => (
                <section
                  key={category.title}
                  id={category.title.toLowerCase().replaceAll(" ", "-").replaceAll("&", "and")}
                  className="rounded-[30px] border border-[#E5E7EB] bg-white p-5 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.18)] md:p-7"
                >
                  <h2 className="text-2xl font-semibold tracking-[-0.05em] text-[#0F172A]">{category.title}</h2>
                  <div className="mt-5 divide-y divide-[#E5E7EB]">
                    {category.items.map((item) => (
                      <details key={item.question} className="group py-4 first:pt-0 last:pb-0">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-base font-semibold tracking-[-0.03em] text-[#0F172A]">
                          {item.question}
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EEF2FF] text-[#2563EB] transition group-open:rotate-45">
                            +
                          </span>
                        </summary>
                        <div className="mt-3 max-w-3xl space-y-3 text-sm leading-7 text-slate-600">
                          {item.answer.map((paragraph) => (
                            <p key={paragraph}>{paragraph}</p>
                          ))}
                          {item.bullets?.length ? (
                            <ul className="grid gap-2">
                              {item.bullets.map((bullet) => (
                                <li key={bullet} className="flex gap-3">
                                  <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2563EB]" />
                                  <span>{bullet}</span>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      </details>
                    ))}
                  </div>
                </section>
              ))}

              <section className="rounded-[30px] bg-[#050B15] p-6 text-white md:p-8">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#60A5FA]">Still Have Questions?</div>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em]">Our team is here to help.</h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-white/72">
                  Contact ChaufX Support for assistance with bookings, driver applications, pricing, or any other questions about our services.
                </p>
                <Link
                  href="/contact"
                  className="mt-6 inline-flex rounded-full bg-[#2563EB] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_36px_-18px_rgba(37,99,235,0.65)]"
                >
                  Contact Support
                </Link>
              </section>
            </div>
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
}
