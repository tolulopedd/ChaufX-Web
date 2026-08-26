"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ManagedBlogPost } from "../lib/blog";
import { fetchPublicBlogPosts } from "../lib/blog";
import { useSoroBlogArticles } from "./soro-blog-data";

type BlogCard = {
  key: string;
  title: string;
  summary: string;
  href: string;
  imageSrc?: string | null;
  publishedLabel?: string;
  source: "managed" | "soro";
};

function formatPublishedDate(value?: string | null) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(parsed);
}

function buildManagedCard(post: ManagedBlogPost): BlogCard {
  return {
    key: `managed-${post.id}`,
    title: post.title,
    summary: post.summary,
    href: `/blog/${post.slug}`,
    imageSrc: post.coverImageUrl,
    publishedLabel: formatPublishedDate(post.publishedAt ?? post.createdAt),
    source: "managed"
  };
}

function ArticleCard({ article, featured = false }: { article: BlogCard; featured?: boolean }) {
  const cardClass = featured
    ? "grid gap-6 rounded-[30px] border border-[#E5E7EB] bg-white p-5 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.16)] md:grid-cols-[1.15fr_0.95fr] md:p-6"
    : "group flex h-full flex-col overflow-hidden rounded-[28px] border border-[#E5E7EB] bg-white p-4 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5 hover:border-[#C7D2FE] hover:shadow-[0_28px_80px_-52px_rgba(37,99,235,0.22)] md:p-5";

  const image = article.imageSrc ? (
    <img
      src={article.imageSrc}
      alt={article.title}
      className={featured ? "h-full min-h-[220px] w-full rounded-[24px] object-cover" : "h-52 w-full object-cover transition duration-300 group-hover:scale-[1.02]"}
    />
  ) : (
    <div
      className={
        featured
          ? "flex min-h-[220px] items-end rounded-[24px] bg-[radial-gradient(circle_at_top_left,#60A5FA_0%,#E0E7FF_38%,#F8FAFC_100%)] p-6"
          : "flex h-52 items-end bg-[radial-gradient(circle_at_top_left,#60A5FA_0%,#E0E7FF_38%,#F8FAFC_100%)] p-5"
      }
    >
      <div className="max-w-[13rem] text-base font-semibold leading-6 text-[#0F172A]">
        {article.source === "managed" ? "Featured ChaufX article" : "Latest Soro article"}
      </div>
    </div>
  );

  return (
    <Link href={article.href} className={cardClass}>
      {featured ? (
        <>
          <div className="flex flex-col justify-center">
            <div className="inline-flex w-fit rounded-full bg-[#EEF2FF] px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[#4338CA]">
              {article.source === "managed" ? "ChaufX Article" : "Soro Insight"}
            </div>
            <h2 className="mt-5 text-[2.35rem] font-semibold leading-[0.98] tracking-[-0.06em] text-[#0F172A] md:text-[3rem]">
              {article.title}
            </h2>
            {article.publishedLabel ? <div className="mt-4 text-base text-slate-500">{article.publishedLabel}</div> : null}
            <p className="mt-5 text-base leading-8 text-slate-600">{article.summary}</p>
            <div className="mt-8 text-sm font-semibold text-[#2563EB]">Read more</div>
          </div>
          <div className="overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#E0E7FF_0%,#F8FAFC_100%)]">{image}</div>
        </>
      ) : (
        <>
          <div className="overflow-hidden rounded-[22px] bg-[linear-gradient(135deg,#E0E7FF_0%,#F8FAFC_100%)]">{image}</div>
          <h3 className="mt-5 line-clamp-3 text-[1.6rem] font-semibold leading-[1.18] tracking-[-0.05em] text-[#0F172A]">
            {article.title}
          </h3>
          <p className="mt-4 line-clamp-4 text-sm leading-7 text-slate-600">{article.summary}</p>
          {article.publishedLabel ? <div className="mt-4 text-sm font-medium text-slate-500">{article.publishedLabel}</div> : null}
          <div className="mt-auto pt-6 text-sm font-semibold text-[#2563EB]">Read more</div>
        </>
      )}
    </Link>
  );
}

export function ChaufxBlogGrid() {
  const [managedPosts, setManagedPosts] = useState<ManagedBlogPost[]>([]);
  const [managedError, setManagedError] = useState("");
  const [managedLoading, setManagedLoading] = useState(true);
  const { articles: soroArticles, loading: soroLoading, sourceNode } = useSoroBlogArticles();

  useEffect(() => {
    let mounted = true;

    fetchPublicBlogPosts()
      .then((posts) => {
        if (!mounted) {
          return;
        }

        setManagedPosts(posts);
        setManagedError("");
      })
      .catch((error: Error) => {
        if (!mounted) {
          return;
        }

        setManagedError(error.message);
      })
      .finally(() => {
        if (mounted) {
          setManagedLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const combinedArticles = useMemo<BlogCard[]>(() => {
    const managedCards = managedPosts.map(buildManagedCard);
    const soroCards = soroArticles.map((article, index) => ({
      key: `soro-${index}-${article.title}`,
      title: article.title,
      summary: article.summary,
      href: article.href,
      imageSrc: article.imageSrc,
      publishedLabel: article.publishedLabel,
      source: "soro" as const
    }));

    return [...managedCards, ...soroCards].sort((left, right) => {
      const leftManaged = left.source === "managed";
      const rightManaged = right.source === "managed";
      if (leftManaged !== rightManaged) {
        return leftManaged ? -1 : 1;
      }

      return left.title.localeCompare(right.title);
    });
  }, [managedPosts, soroArticles]);

  const featuredArticle = combinedArticles[0];
  const remainingArticles = combinedArticles.slice(1);
  const loading = managedLoading && soroLoading && !combinedArticles.length;
  const placeholders = Array.from({ length: 6 }, (_, index) => index);

  return (
    <>
      {sourceNode}

      <div className="rounded-[28px] border border-[#E5E7EB] bg-white p-5 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.12)] md:p-7">
        <div className="text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-[#4F46E5]">Blog & Articles</div>
        <h1 className="mt-4 max-w-4xl text-[2.6rem] font-semibold leading-[0.96] tracking-[-0.07em] text-[#0F172A] md:text-[4.35rem]">
          ChaufX insights, driver stories, and customer travel guidance across Canada.
        </h1>
        <p className="mt-5 max-w-4xl text-lg leading-8 text-slate-600">
          We’re keeping the existing Soro content live while adding first-class ChaufX articles that your team can now manage directly.
        </p>
      </div>

      {featuredArticle ? (
        <div className="mt-8">
          <ArticleCard article={featuredArticle} featured />
        </div>
      ) : null}

      {managedError ? <p className="mt-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">{managedError}</p> : null}

      <div className="mt-10 flex items-center justify-between gap-3">
        <div>
          <div className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#4F46E5]">Latest Articles</div>
          <h2 className="mt-2 text-[2rem] font-semibold tracking-[-0.05em] text-[#0F172A]">Read the latest from ChaufX</h2>
        </div>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {remainingArticles.length
          ? remainingArticles.map((article) => <ArticleCard key={article.key} article={article} />)
          : placeholders.map((placeholder) => (
              <div
                key={placeholder}
                className="flex h-full flex-col overflow-hidden rounded-[28px] border border-[#E5E7EB] bg-white p-4 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.1)] md:p-5"
              >
                <div className="h-52 rounded-[22px] bg-[#E2E8F0]" />
                <div className="mt-5 h-7 w-4/5 rounded-full bg-[#E2E8F0]" />
                <div className="mt-4 h-4 w-full rounded-full bg-[#E2E8F0]" />
                <div className="mt-2 h-4 w-11/12 rounded-full bg-[#E2E8F0]" />
                <div className="mt-4 h-4 w-28 rounded-full bg-[#E2E8F0]" />
                <div className="mt-auto pt-6 text-sm font-semibold text-[#2563EB]">
                  {loading ? "Loading latest articles..." : "Read more"}
                </div>
              </div>
            ))}
      </div>
    </>
  );
}
