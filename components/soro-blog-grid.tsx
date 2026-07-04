"use client";

import { useSoroBlogArticles } from "./soro-blog-data";

export function SoroBlogGrid() {
  const { articles, loading, sourceNode } = useSoroBlogArticles();
  const placeholders = Array.from({ length: 6 }, (_, index) => index);

  return (
    <>
      {sourceNode}

      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {articles.length
          ? articles.map((article, index) => (
              <a
                key={`${article.title}-${index}`}
                href={article.href}
                target="_blank"
                rel="noreferrer"
                className="group flex h-full flex-col overflow-hidden rounded-[28px] border border-[#E5E7EB] bg-white p-4 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5 hover:border-[#C7D2FE] hover:shadow-[0_28px_80px_-52px_rgba(37,99,235,0.22)] md:p-5"
              >
                <div className="overflow-hidden rounded-[22px] bg-[linear-gradient(135deg,#E0E7FF_0%,#F8FAFC_100%)]">
                  {article.imageSrc ? (
                    <img
                      src={article.imageSrc}
                      alt={article.title}
                      className="h-52 w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-52 items-end bg-[radial-gradient(circle_at_top_left,#60A5FA_0%,#E0E7FF_38%,#F8FAFC_100%)] p-5">
                      <div className="max-w-[13rem] text-base font-semibold leading-6 text-[#0F172A]">
                        ChaufX article
                      </div>
                    </div>
                  )}
                </div>

                <h3 className="mt-5 line-clamp-3 text-[1.6rem] font-semibold leading-[1.18] tracking-[-0.05em] text-[#0F172A]">
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
