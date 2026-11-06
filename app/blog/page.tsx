import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PublicPageShell } from "../../components/public-page-shell";
import { ChaufxBlogGrid } from "../../components/chaufx-blog-grid";
import { SoroBlogDetail } from "../../components/soro-blog-detail";
import { StructuredData, breadcrumbSchema } from "../../components/structured-data";
import { fetchPublicBlogPost, fetchPublicBlogPosts, type ManagedBlogPost } from "../../lib/blog";
import { pageMetadata } from "../../lib/seo";

export const metadata: Metadata = pageMetadata({ title: "Blog", description: "Read ChaufX articles about professional drivers, travelling in your own vehicle, booking tips, safety, and service updates.", path: "/blog" });

type BlogPageProps = {
  searchParams: Promise<{
    post?: string;
  }>;
};

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const { post } = await searchParams;

  if (post) {
    try {
      const managedPost = await fetchPublicBlogPost(post);
      redirect(`/blog/${managedPost.slug}`);
    } catch {
      // Fall back to the legacy Soro embed for non-managed articles.
    }
  }

  let managedPosts: ManagedBlogPost[] = [];
  try {
    managedPosts = await fetchPublicBlogPosts({ next: { revalidate: 3600 } });
  } catch {
    // Keep the blog available if the publishing API is temporarily unavailable.
  }

  return (
    <>
      <StructuredData data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Blog", path: "/blog" }])} />
      <PublicPageShell>
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-12 md:px-8">
          <div className="rounded-[30px] border border-[#E5E7EB] bg-white p-7 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.18)]">
            {post ? (
              <SoroBlogDetail post={post} />
            ) : (
              <div className="rounded-[24px] border border-[#E5E7EB] bg-[#F8FAFC] p-4 md:p-6">
                <ChaufxBlogGrid managedPosts={managedPosts} />
              </div>
            )}
          </div>
        </div>
      </section>
      </PublicPageShell>
    </>
  );
}
