"use client";

import { useState } from "react";
import type { ManagedBlogPost } from "../lib/blog";

function formatArticleDate(value?: string | null) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-CA", {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(parsed);
}

type ArticleBlock =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "image"; src: string; alt: string }
  | { type: "video"; src: string; title: string };

function isVideoUrl(value: string) {
  return /(youtube\.com\/watch\?v=|youtu\.be\/|vimeo\.com\/|\.mp4($|\?))/i.test(value);
}

function buildVideoEmbedUrl(value: string) {
  const url = value.trim();

  const youtubeMatch = url.match(/[?&]v=([^&]+)/i) ?? url.match(/youtu\.be\/([^?&/]+)/i);
  if (youtubeMatch?.[1]) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }

  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/i);
  if (vimeoMatch?.[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  return url;
}

function ArticleImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return null;
  }

  return <img src={src} alt={alt} className="w-full object-cover" onError={() => setFailed(true)} />;
}

export function renderArticleBody(body: string) {
  const lines = body.replace(/\r/g, "").split("\n");
  const blocks: ArticleBlock[] = [];

  let paragraphBuffer: string[] = [];
  let listBuffer: string[] = [];

  const flushParagraph = () => {
    if (paragraphBuffer.length) {
      blocks.push({ type: "paragraph", text: paragraphBuffer.join(" ").trim() });
      paragraphBuffer = [];
    }
  };

  const flushList = () => {
    if (listBuffer.length) {
      blocks.push({ type: "list", items: [...listBuffer] });
      listBuffer = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    if (line.startsWith("### ")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", level: 3, text: line.slice(4).trim() });
      continue;
    }

    if (line.startsWith("## ")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", level: 2, text: line.slice(3).trim() });
      continue;
    }

    if (line.startsWith("- ") || line.startsWith("* ")) {
      flushParagraph();
      listBuffer.push(line.slice(2).trim());
      continue;
    }

    const imageMatch = line.match(/^!\[(.*?)\]\((https?:\/\/[^\s)]+)\)$/i);
    if (imageMatch) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "image",
        alt: imageMatch[1].trim() || "Article image",
        src: imageMatch[2].trim()
      });
      continue;
    }

    const videoMatch = line.match(/^video(?:\[(.*?)\])?:\s*(https?:\/\/\S+)$/i);
    if (videoMatch && isVideoUrl(videoMatch[2])) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "video",
        title: videoMatch[1]?.trim() || "Article video",
        src: buildVideoEmbedUrl(videoMatch[2])
      });
      continue;
    }

    flushList();
    paragraphBuffer.push(line);
  }

  flushParagraph();
  flushList();

  return blocks;
}

export function ManagedBlogArticle({ post }: { post: ManagedBlogPost }) {
  const publishedLabel = formatArticleDate(post.publishedAt ?? post.createdAt);
  const blocks = renderArticleBody(post.body);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="overflow-hidden rounded-[32px] border border-[#E5E7EB] bg-white shadow-[0_36px_90px_-60px_rgba(15,23,42,0.26)]">
        <div className="px-5 py-8 md:px-10 md:py-12">
          <div className="mx-auto max-w-3xl">
            <div className="text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-[#4F46E5]">
              ChaufX Blog
            </div>
            <h1 className="mt-4 text-[2.4rem] font-semibold leading-[0.98] tracking-[-0.06em] text-[#0F172A] md:text-[3.5rem]">
              {post.title}
            </h1>
            {publishedLabel ? <div className="mt-4 text-lg text-slate-500">{publishedLabel}</div> : null}

            {post.coverImageUrl ? (
              <div className="mt-8 overflow-hidden rounded-[28px]">
                <img
                  src={post.coverImageUrl}
                  alt={post.title}
                  className="w-full object-cover shadow-[0_24px_70px_-48px_rgba(15,23,42,0.38)]"
                />
              </div>
            ) : null}

            <div className="mt-8 space-y-6">
              {blocks.map((block, index) => {
                if (block.type === "heading") {
                  const Tag = block.level === 2 ? "h2" : "h3";
                  return (
                    <Tag
                      key={`${block.type}-${index}`}
                      className={
                        block.level === 2
                          ? "text-[1.8rem] font-semibold leading-[1.1] tracking-[-0.05em] text-[#0F172A]"
                          : "text-[1.35rem] font-semibold leading-[1.2] tracking-[-0.04em] text-[#0F172A]"
                      }
                    >
                      {block.text}
                    </Tag>
                  );
                }

                if (block.type === "list") {
                  return (
                    <ul
                      key={`${block.type}-${index}`}
                      className="list-disc space-y-3 pl-5 text-[1.05rem] leading-8 text-slate-600"
                    >
                      {block.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  );
                }

                if (block.type === "image") {
                  return (
                    <div key={`${block.type}-${index}`} className="overflow-hidden rounded-[28px] border border-[#E5E7EB] bg-[#F8FAFC]">
                      <ArticleImage src={block.src} alt={block.alt} />
                    </div>
                  );
                }

                if (block.type === "video") {
                  const isDirectVideo = /\.mp4($|\?)/i.test(block.src);
                  return (
                    <div key={`${block.type}-${index}`} className="space-y-3">
                      {block.title ? (
                        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{block.title}</div>
                      ) : null}
                      <div className="overflow-hidden rounded-[28px] border border-[#E5E7EB] bg-[#0F172A]">
                        {isDirectVideo ? (
                          <video src={block.src} controls className="w-full" />
                        ) : (
                          <iframe
                            src={block.src}
                            title={block.title}
                            className="aspect-video w-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        )}
                      </div>
                    </div>
                  );
                }

                return (
                  <p key={`${block.type}-${index}`} className="text-[1.06rem] leading-8 text-slate-600">
                    {block.text}
                  </p>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
