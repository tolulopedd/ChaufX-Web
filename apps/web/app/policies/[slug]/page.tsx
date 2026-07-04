import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicPageShell } from "../../../components/public-page-shell";
import { getPolicyDocument, policyDocuments } from "../../../lib/policy-documents";

type PolicyDocumentPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  return policyDocuments.map((document) => ({
    slug: document.slug
  }));
}

export async function generateMetadata({ params }: PolicyDocumentPageProps): Promise<Metadata> {
  const { slug } = await params;
  const document = getPolicyDocument(slug);

  if (!document) {
    return {
      title: "Policy Not Found | ChaufX"
    };
  }

  return {
    title: `${document.title} | ChaufX`,
    description: document.description
  };
}

export default async function PolicyDocumentPage({ params }: PolicyDocumentPageProps) {
  const { slug } = await params;
  const document = getPolicyDocument(slug);

  if (!document) {
    notFound();
  }

  return (
    <PublicPageShell heroTitle={document.title} heroCopy={document.description}>
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-12 md:px-8">
          <div className="rounded-[30px] border border-[#E5E7EB] bg-white p-6 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.18)] md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="max-w-3xl">
                <div className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#4338CA]">Policy document</div>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[#0F172A]">{document.title}</h2>
                <p className="mt-4 text-base leading-7 text-slate-600">{document.summary}</p>
                <div className="mt-4 flex flex-wrap gap-3 text-sm font-medium text-slate-500">
                  {document.effectiveLabel ? <span>{document.effectiveLabel}</span> : null}
                  <span>{document.updatedLabel}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3 md:items-end">
                <Link
                  href="/policies"
                  className="inline-flex items-center justify-center rounded-full border border-[#D7DEEF] px-5 py-3 text-sm font-semibold text-[#0F172A] transition hover:border-[#C7D2FE] hover:text-[#2563EB]"
                >
                  All policies
                </Link>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              {document.sections.map((section) => (
                <section
                  key={section.title}
                  className="rounded-[26px] border border-[#E5E7EB] bg-[#F8FAFC] p-5 md:p-6"
                >
                  <h3 className="text-xl font-semibold tracking-[-0.04em] text-[#0F172A]">{section.title}</h3>

                  {section.paragraphs?.map((paragraph) => (
                    <p key={paragraph} className="mt-3 text-sm leading-7 text-slate-600">
                      {paragraph}
                    </p>
                  ))}

                  {section.bullets?.length ? (
                    <ul className="mt-4 space-y-3">
                      {section.bullets.map((bullet) => (
                        <li key={bullet} className="flex gap-3 text-sm leading-7 text-slate-600">
                          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#2563EB]" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ))}
            </div>
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
}
