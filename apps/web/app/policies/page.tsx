import Link from "next/link";
import { PublicPageShell } from "../../components/public-page-shell";
import { policyDocuments } from "../../lib/policy-documents";

export default function PoliciesPage() {
  return (
    <PublicPageShell
      heroTitle="Policies"
      heroCopy="ChaufX keeps its public policy documents clear, accessible, and easy to review from one place."
    >
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-12 md:px-8">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {policyDocuments.map((policy) => (
              <div
                key={policy.slug}
                id={policy.slug}
                className="flex h-full flex-col rounded-[28px] border border-[#E5E7EB] bg-white p-6 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.18)]"
              >
                <div className="inline-flex w-fit rounded-full bg-[#EEF2FF] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#4338CA]">
                  Policy
                </div>
                <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[#0F172A]">{policy.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{policy.summary}</p>
                <p className="mt-4 text-sm font-medium text-slate-500">{policy.updatedLabel}</p>
                <div className="mt-auto pt-6">
                  <Link href={`/policies/${policy.slug}`} className="text-sm font-semibold text-[#2563EB] transition hover:text-[#1D4ED8]">
                    Read more
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
}
