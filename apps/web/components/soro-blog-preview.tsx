"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchPublicBlogPosts, type ManagedBlogPost } from "../lib/blog";
import { useSoroBlogArticles } from "./soro-blog-data";

export function SoroBlogPreview() {
  const { articles, loading, sourceNode } = useSoroBlogArticles(3);
  const [managedPosts, setManagedPosts] = useState<ManagedBlogPost[]>([]);
  const [managedLoading, setManagedLoading] = useState(true);
  const placeholders = [0, 1, 2];

  useEffect(() => {
    let mounted = true;

    fetchPublicBlogPosts()
      .then((posts) => {
        if (mounted) {
          setManagedPosts(posts.slice(0, 3));
        }
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

  const previewArticles = useMemo(() => {
    const managed = managedPosts.map((post) => ({
      key: post.id,
      href: `/blog/${post.slug}`,
      imageSrc: post.coverImageUrl,
      title: post.title,
      summary: post.summary,
      publishedLabel: post.publishedAt
        ? new Intl.DateTimeFormat("en-CA", {
            month: "short",
            day: "numeric",
            year: "numeric"
          }).format(new Date(post.publishedAt))
        : undefined
    }));

    const soro = articles.map((article) => ({
      key: article.title,
      ...article
    }));

    return [...managed, ...soro].slice(0, 3);
  }, [articles, managedPosts]);

  return (
    <>
      {sourceNode}

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {previewArticles.length
          ? previewArticles.map((article) => (
              <a
                key={article.key}
                href={article.href}
                className="flex h-full flex-col overflow-hidden rounded-[28px] border border-dashed border-[#D7DEEF] bg-[#F8FAFC] p-4 transition hover:border-[#C7D2FE] hover:bg-white md:p-5"
              >
                <div className="overflow-hidden rounded-[22px] bg-[linear-gradient(135deg,#E0E7FF_0%,#F8FAFC_100%)]">
                  {article.imageSrc ? (
                    <img
                      src={article.imageSrc}
                      alt={article.title}
                      className="h-44 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-44 items-end bg-[radial-gradient(circle_at_top_left,#60A5FA_0%,#E0E7FF_38%,#F8FAFC_100%)] p-5">
                      <div className="max-w-[11rem] text-sm font-semibold leading-5 text-[#0F172A]">
                        Latest ChaufX article
                      </div>
                    </div>
                  )}
                </div>
                <h3 className="mt-4 line-clamp-3 text-[1.65rem] font-semibold leading-[1.18] tracking-[-0.05em] text-[#0F172A]">
                  {article.title}
                </h3>
                <p className="mt-4 line-clamp-4 text-sm leading-7 text-slate-600">{article.summary}</p>
                {article.publishedLabel ? (
                  <div className="mt-4 text-sm font-medium text-slate-500">{article.publishedLabel}</div>
                ) : null}
                <div className="mt-auto pt-6 text-sm font-semibold text-[#2563EB]">Read more</div>
              </a>
            ))
          : placeholders.map((placeholder) => (
              <Link
                key={placeholder}
                href="/blog"
                className="flex h-full flex-col overflow-hidden rounded-[28px] border border-dashed border-[#D7DEEF] bg-[#F8FAFC] p-4 transition hover:border-[#C7D2FE] hover:bg-white md:p-5"
              >
                <div className="h-44 rounded-[22px] bg-[#E2E8F0]" />
                <div className="mt-4 h-6 w-4/5 rounded-full bg-[#E2E8F0]" />
                <div className="mt-3 h-4 w-full rounded-full bg-[#E2E8F0]" />
                <div className="mt-2 h-4 w-11/12 rounded-full bg-[#E2E8F0]" />
                <div className="mt-4 h-4 w-28 rounded-full bg-[#E2E8F0]" />
                <div className="mt-auto pt-6 text-sm font-semibold text-[#2563EB]">
                  {loading || managedLoading ? "Loading latest articles..." : "Read more"}
                </div>
              </Link>
            ))}
      </div>
    </>
  );
}
