import type { Metadata } from "next";
import { PublicPageShell } from "../../components/public-page-shell";
import { SoroBlogDetail } from "../../components/soro-blog-detail";
import { SoroBlogGrid } from "../../components/soro-blog-grid";

export const metadata: Metadata = {
  title: "ChaufX Blog",
  description:
    "ChaufX articles, SEO content, and chauffeur insights for customers, drivers, and operators across Canada."
};

type BlogPageProps = {
  searchParams: Promise<{
    post?: string;
  }>;
};

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const { post } = await searchParams;

  return (
    <PublicPageShell
      heroTitle="Blog, News and Articles"
      heroCopy="These content are managed by ChaufX team. New articles are published and updated on a daily and weekly basis."
    >
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-12 md:px-8">
          <div className="rounded-[30px] border border-[#E5E7EB] bg-white p-7 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.18)]">
            {post ? (
              <SoroBlogDetail post={post} />
            ) : (
              <div className="rounded-[24px] border border-[#E5E7EB] bg-[#F8FAFC] p-4 md:p-6">
                <SoroBlogGrid />
              </div>
            )}
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
}
