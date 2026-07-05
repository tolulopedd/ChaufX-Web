"use client";

import Link from "next/link";
import { useEffect } from "react";

const soroScriptSrc = "https://app.trysoro.com/api/embed/2cfcc629-018f-4439-9ba7-4623f08c2651";

type SoroBlogDetailProps = {
  post: string;
};

export function SoroBlogDetail({ post }: SoroBlogDetailProps) {
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("post", post);
    window.history.replaceState({}, "", url.toString());

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${soroScriptSrc}"]`);
    if (existing) {
      return;
    }

    const script = document.createElement("script");
    script.src = soroScriptSrc;
    script.defer = true;
    document.body.appendChild(script);
  }, [post]);

  return (
    <div className="mt-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 rounded-full border border-[#D7DEEF] bg-white px-4 py-2.5 text-sm font-semibold text-[#2563EB] transition hover:border-[#2563EB]"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back to all articles
        </Link>

        <div className="mt-6 overflow-hidden rounded-[32px] border border-[#E5E7EB] bg-white shadow-[0_36px_90px_-60px_rgba(15,23,42,0.26)]">
          <div className="px-5 py-8 md:px-10 md:py-12">
            <div className="editorial-shell mx-auto max-w-3xl">
              <div id="soro-blog" />
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .editorial-shell #soro-blog,
        .editorial-shell #soro-blog article,
        .editorial-shell #soro-blog main,
        .editorial-shell #soro-blog section,
        .editorial-shell #soro-blog > div {
          max-width: 100%;
        }

        .editorial-shell #soro-blog img {
          width: 100%;
          border-radius: 24px;
          object-fit: cover;
          box-shadow: 0 24px 70px -48px rgba(15, 23, 42, 0.38);
        }

        .editorial-shell #soro-blog h1,
        .editorial-shell #soro-blog h2,
        .editorial-shell #soro-blog h3 {
          color: #0f172a;
          font-weight: 600;
          letter-spacing: -0.05em;
        }

        .editorial-shell #soro-blog h1 {
          margin-top: 0;
          margin-bottom: 1rem;
          font-size: clamp(2.2rem, 4vw, 3.4rem);
          line-height: 1.02;
        }

        .editorial-shell #soro-blog h2 {
          margin-top: 3rem;
          margin-bottom: 0.9rem;
          font-size: clamp(1.6rem, 2vw, 2.05rem);
          line-height: 1.12;
        }

        .editorial-shell #soro-blog h3 {
          margin-top: 2.25rem;
          margin-bottom: 0.75rem;
          font-size: 1.35rem;
          line-height: 1.2;
        }

        .editorial-shell #soro-blog p,
        .editorial-shell #soro-blog li,
        .editorial-shell #soro-blog blockquote {
          color: #475569;
          font-size: 1.06rem;
          line-height: 1.95;
        }

        .editorial-shell #soro-blog p + p {
          margin-top: 1.15rem;
        }

        .editorial-shell #soro-blog a {
          color: #2563eb;
          font-weight: 500;
          text-decoration: none;
        }

        .editorial-shell #soro-blog a:hover {
          color: #1d4ed8;
        }

        .editorial-shell #soro-blog ul,
        .editorial-shell #soro-blog ol {
          padding-left: 1.4rem;
        }

        .editorial-shell #soro-blog blockquote {
          margin: 2rem 0;
          border-left: 4px solid #c7d2fe;
          padding-left: 1rem;
          font-style: italic;
          color: #334155;
        }
      `}</style>
    </div>
  );
}
