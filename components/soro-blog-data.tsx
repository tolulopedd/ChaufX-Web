"use client";

import { useEffect, useRef, useState } from "react";

export type SoroArticle = {
  title: string;
  summary: string;
  href: string;
  imageSrc?: string;
  publishedLabel?: string;
};

const soroScriptSrc = "https://app.trysoro.com/api/embed/2cfcc629-018f-4439-9ba7-4623f08c2651";
const sourceContainerId = "soro-blog";

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function cleanTitle(value: string) {
  return normalizeText(value)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b([A-Z][a-z]{2,8}\s+\d{1,2},\s+\d{4})\b/g, "")
    .replace(/\?([A-Z])/g, "? $1")
    .replace(/\.([A-Z])/g, ". $1")
    .trim();
}

function isRealArticleTitle(value: string) {
  const normalized = normalizeText(value).toLowerCase();

  if (!normalized) {
    return false;
  }

  const blockedTitles = new Set([
    "all articles",
    "latest article",
    "read on the blog",
    "read more",
    "blog",
    "blogs",
    "latest blogs",
    "latest articles"
  ]);

  if (blockedTitles.has(normalized)) {
    return false;
  }

  return normalized.length >= 12;
}

function looksLikePublishedDate(value: string) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return false;
  }

  return /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2},\s+\d{4}/i.test(normalized);
}

function pickArticleContainer(anchor: HTMLAnchorElement, titleNode: Element | null) {
  return (
    titleNode?.closest("article, li, section") ??
    anchor.closest("article, li, section") ??
    titleNode?.parentElement ??
    anchor.parentElement
  );
}

function collectDateCandidates(nodes: Array<Element | null | undefined>) {
  const seen = new Set<string>();
  const candidates: string[] = [];

  for (const node of nodes) {
    if (!node) {
      continue;
    }

    const values = Array.from(node.querySelectorAll("time, span, p"))
      .map((child) => normalizeText(child.textContent ?? ""))
      .filter((text) => looksLikePublishedDate(text));

    for (const value of values) {
      if (seen.has(value)) {
        continue;
      }

      seen.add(value);
      candidates.push(value);
    }
  }

  return candidates;
}

function pickPublishedLabel(anchor: HTMLAnchorElement, titleNode: Element | null, container: Element | null) {
  const candidates = collectDateCandidates([
    titleNode?.parentElement,
    anchor,
    anchor.parentElement,
    container
  ]);

  return candidates[0];
}

export function normalizeArticleHref(href: string) {
  const normalized = normalizeText(href);

  if (!normalized) {
    return "/blog";
  }

  if (normalized.startsWith("?post=")) {
    return `/blog${normalized}`;
  }

  if (normalized.startsWith("/?post=")) {
    return `/blog${normalized.slice(1)}`;
  }

  if (/^https?:\/\//i.test(normalized)) {
    try {
      const url = new URL(normalized);
      const post = url.searchParams.get("post");
      if (post) {
        return `/blog?post=${encodeURIComponent(post)}`;
      }
    } catch {
      return normalized;
    }
  }

  return normalized;
}

function pickImageFromElement(element: Element | null) {
  if (!element) {
    return undefined;
  }

  const image = element.querySelector<HTMLImageElement>("img[src]");
  if (!image?.src) {
    return undefined;
  }

  const src = image.getAttribute("src") ?? image.src;
  if (!src || src.startsWith("data:")) {
    return undefined;
  }

  return src;
}

function pickBestImage(
  anchor: Element | null | undefined,
  titleNode: Element | null,
  container: Element | null,
  seenImages: Set<string>
) {
  const candidates: Array<Element | null> = [
    anchor ?? null,
    anchor?.parentElement ?? null,
    titleNode?.parentElement ?? null,
    anchor?.closest("article, li") ?? null,
    anchor?.closest("section") ?? null,
    container
  ];

  for (const candidate of candidates) {
    const src = pickImageFromElement(candidate);
    if (!src || seenImages.has(src)) {
      continue;
    }

    return src;
  }

  return undefined;
}

function extractArticlePreviews(root: HTMLElement, limit?: number) {
  const collected: SoroArticle[] = [];
  const seenTitles = new Set<string>();
  const seenImages = new Set<string>();
  const anchors = Array.from(root.querySelectorAll<HTMLAnchorElement>("a[href]"));

  for (const anchor of anchors) {
    const href = anchor.getAttribute("href") ?? "";
    if (!href || href.startsWith("#")) {
      continue;
    }

    const titleNode =
      anchor.querySelector("h1, h2, h3, h4, h5, h6") ??
      anchor.parentElement?.querySelector("h1, h2, h3, h4, h5, h6");

    const container = pickArticleContainer(anchor, titleNode ?? null);

    const title = cleanTitle(
      titleNode?.textContent ??
        anchor.getAttribute("title") ??
        anchor.textContent ??
        ""
    );

    if (!isRealArticleTitle(title) || seenTitles.has(title)) {
      continue;
    }

    const textBits = container
      ? Array.from(container.querySelectorAll("p, span, time"))
          .map((node) => normalizeText(node.textContent ?? ""))
          .filter((text) => text && text !== title && text !== `${title}.`)
      : [];

    const publishedLabel = pickPublishedLabel(anchor, titleNode ?? null, container) ?? undefined;
    const summary =
      textBits.find((text) => text.length >= 40 && text !== publishedLabel) ??
      textBits.find((text) => text !== publishedLabel) ??
      "Read the latest article on the ChaufX blog.";

    const imageSrc = pickBestImage(anchor ?? null, titleNode ?? null, container ?? null, seenImages);

    seenTitles.add(title);
    if (imageSrc) {
      seenImages.add(imageSrc);
    }

    collected.push({
      title,
      summary,
      href: normalizeArticleHref(href),
      imageSrc,
      publishedLabel
    });

    if (limit && collected.length >= limit) {
      break;
    }
  }

  return collected;
}

export function useSoroBlogArticles(limit?: number) {
  const [articles, setArticles] = useState<SoroArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const sourceRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;
    let observer: MutationObserver | null = null;
    const timers: number[] = [];

    const tryExtract = () => {
      if (!mounted || !sourceRef.current) {
        return false;
      }

      const nextArticles = extractArticlePreviews(sourceRef.current, limit);
      if (nextArticles.length) {
        setArticles(nextArticles);
        setLoading(false);
        return true;
      }

      return false;
    };

    const startObserving = () => {
      observer = new MutationObserver(() => {
        if (tryExtract() && observer) {
          observer.disconnect();
        }
      });

      if (sourceRef.current) {
        observer.observe(sourceRef.current, { childList: true, subtree: true });
      }

      timers.push(window.setTimeout(() => tryExtract(), 1200));
      timers.push(window.setTimeout(() => tryExtract(), 2600));
      timers.push(window.setTimeout(() => {
        if (mounted) {
          setLoading(false);
        }
      }, 5000));
    };

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${soroScriptSrc}"]`);

    if (existing) {
      if (!tryExtract()) {
        startObserving();
      }
    } else {
      const script = document.createElement("script");
      script.src = soroScriptSrc;
      script.defer = true;
      script.onload = () => {
        if (!tryExtract()) {
          startObserving();
        }
      };
      document.body.appendChild(script);
    }

    return () => {
      mounted = false;
      if (observer) {
        observer.disconnect();
      }
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, [limit]);

  return {
    articles,
    loading,
    sourceNode: (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden opacity-0"
      >
        <div id={sourceContainerId} ref={sourceRef} />
      </div>
    )
  };
}
