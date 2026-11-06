import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ManagedBlogArticle } from "../../../components/managed-blog-article";
import { PublicPageShell } from "../../../components/public-page-shell";
import { StructuredData, breadcrumbSchema } from "../../../components/structured-data";
import { fetchPublicBlogPost } from "../../../lib/blog";
import { absoluteUrl } from "../../../lib/seo";

type BlogDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: BlogDetailPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const post = await fetchPublicBlogPost(slug);
    return {
      title: post.title,
      description: post.summary,
      alternates: { canonical: `/blog/${post.slug}` },
      openGraph: {
        type: "article",
        url: `/blog/${post.slug}`,
        title: post.title,
        description: post.summary,
        images: post.coverImageUrl ? [{ url: post.coverImageUrl }] : undefined
      }
    };
  } catch {
    return {
      title: "ChaufX Blog",
      description: "ChaufX articles and customer travel insights."
    };
  }
}

export default async function BlogDetailPage({ params }: BlogDetailPageProps) {
  const { slug } = await params;

  try {
    const post = await fetchPublicBlogPost(slug);

    return (
      <>
        <StructuredData data={[
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Blog", path: "/blog" },
            { name: post.title, path: `/blog/${post.slug}` }
          ]),
          {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: post.summary,
            mainEntityOfPage: absoluteUrl(`/blog/${post.slug}`),
            url: absoluteUrl(`/blog/${post.slug}`),
            datePublished: post.publishedAt ?? post.createdAt,
            dateModified: post.updatedAt,
            image: post.coverImageUrl ?? undefined,
            author: post.author ? { "@type": "Person", name: post.author.fullName } : { "@type": "Organization", name: "ChaufX" },
            publisher: { "@type": "Organization", name: "ChaufX", url: absoluteUrl("/") }
          }
        ]} />
        <PublicPageShell>
        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-5 py-12 md:px-8">
            <div className="mb-8">
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 rounded-full border border-[#D7DEEF] bg-white px-4 py-2.5 text-sm font-semibold text-[#2563EB] transition hover:border-[#2563EB]"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                Back to all articles
              </Link>
            </div>

            <ManagedBlogArticle post={post} />
          </div>
        </section>
        </PublicPageShell>
      </>
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Blog article not found.") {
      notFound();
    }

    notFound();
  }
}
