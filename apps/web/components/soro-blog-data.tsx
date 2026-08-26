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

  return /^(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2},\s+\d{4}$/i.test(normalized);
}

function isSummaryCandidateText(text: string, title: string, publishedLabel?: string) {
  const normalized = normalizeText(text);
  const normalizedTitle = normalizeText(title);

  if (!normalized || normalized === normalizedTitle || normalized === `${normalizedTitle}.`) {
    return false;
  }

  if (publishedLabel && normalized === normalizeText(publishedLabel)) {
    return false;
  }

  const blockedSnippets = [
    "chaufx is a personal driver",
    "read the latest article on the chaufx blog",
    "blog, news and articles",
    "read about our latest content",
    "this section shows our latest blog posts and news summaries",
    "visit blog",
    "read more"
  ];

  const lowered = normalized.toLowerCase();
  if (blockedSnippets.some((snippet) => lowered.includes(snippet))) {
    return false;
  }

  return true;
}

function collectTextBits(container: Element | null | undefined, title: string, selectors = "p, span, time") {
  if (!container) {
    return [];
  }

  return Array.from(container.querySelectorAll(selectors))
    .map((node) => normalizeText(node.textContent ?? ""))
    .filter((text) => isSummaryCandidateText(text, title));
}

function uniqueText(values: string[]) {
  return Array.from(new Set(values.map((value) => normalizeText(value)).filter(Boolean)));
}

function pickSummary(
  anchor: HTMLAnchorElement,
  titleNode: Element | null,
  container: Element | null,
  title: string,
  publishedLabel?: string,
  seenSummaries?: Set<string>
) {
  const articleContainer = anchor.closest("article, li");
  const titleContainer = titleNode?.parentElement ?? null;
  const directParagraphs = uniqueText(
    [titleContainer, articleContainer, container]
      .filter(Boolean)
      .flatMap((candidate) => collectTextBits(candidate, title, "p"))
  ).filter((text) => isSummaryCandidateText(text, title, publishedLabel));

  const fallbackBits = uniqueText(
    [anchor, titleContainer, articleContainer, container]
      .filter(Boolean)
      .flatMap((candidate) => collectTextBits(candidate, title))
  ).filter((text) => isSummaryCandidateText(text, title, publishedLabel));

  const orderedCandidates = [...directParagraphs, ...fallbackBits];
  const unseenCandidate = orderedCandidates.find((text) => !seenSummaries?.has(text));

  return unseenCandidate ?? orderedCandidates[0] ?? "Read the latest article on the ChaufX blog.";
}

function pickPublishedLabel(anchor: HTMLAnchorElement, titleNode: Element | null, title: string) {
  const scopedContainers = [
    anchor,
    titleNode?.parentElement ?? null,
    anchor.closest("article, li")
  ];

  for (const scopedContainer of scopedContainers) {
    const publishedLabel = collectTextBits(scopedContainer, title).find((text) => looksLikePublishedDate(text));
    if (publishedLabel) {
      return publishedLabel;
    }
  }

  return undefined;
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
  const seenSummaries = new Set<string>();
  const anchors = Array.from(root.querySelectorAll<HTMLAnchorElement>("a[href]"));

  for (const anchor of anchors) {
    const href = anchor.getAttribute("href") ?? "";
    if (!href || href.startsWith("#")) {
      continue;
    }

    const container = anchor.closest("article, li") ?? anchor.parentElement;

    const titleNode =
      anchor.querySelector("h1, h2, h3, h4, h5, h6") ??
      container?.querySelector("h1, h2, h3, h4, h5, h6");

    const title = cleanTitle(
      titleNode?.textContent ??
        anchor.getAttribute("title") ??
        anchor.textContent ??
        ""
    );

    if (!isRealArticleTitle(title) || seenTitles.has(title)) {
      continue;
    }

    const publishedLabel = pickPublishedLabel(anchor, titleNode ?? null, title);
    const summary = pickSummary(anchor, titleNode ?? null, container ?? null, title, publishedLabel, seenSummaries);

    const imageSrc = pickBestImage(anchor ?? null, titleNode ?? null, container ?? null, seenImages);

    seenTitles.add(title);
    seenSummaries.add(summary);
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

  const dateCounts = collected.reduce<Record<string, number>>((counts, article) => {
    if (article.publishedLabel) {
      counts[article.publishedLabel] = (counts[article.publishedLabel] ?? 0) + 1;
    }

    return counts;
  }, {});

  return collected.map((article) =>
    article.publishedLabel && dateCounts[article.publishedLabel] > 1
      ? { ...article, publishedLabel: undefined }
      : article
  );
}

export function useSoroBlogArticles(limit?: number) {
  const [articles, setArticles] = useState<SoroArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const sourceRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;
    let observer: MutationObserver | null = null;
    const timers: number[] = [];
    let injectedScript: HTMLScriptElement | null = null;

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
      if (observer || !sourceRef.current) {
        return;
      }

      observer = new MutationObserver(() => {
        if (tryExtract() && observer) {
          observer.disconnect();
        }
      });

      observer.observe(sourceRef.current, { childList: true, subtree: true });

      timers.push(window.setTimeout(() => tryExtract(), 300));
      timers.push(window.setTimeout(() => tryExtract(), 1200));
      timers.push(window.setTimeout(() => tryExtract(), 2600));
      timers.push(
        window.setTimeout(() => {
          if (!mounted || articles.length || !sourceRef.current?.childElementCount) {
            return;
          }

          mountScript(true);
        }, 1800)
      );
      timers.push(window.setTimeout(() => {
        if (mounted) {
          setLoading(false);
        }
      }, 5000));
    };

    const mountScript = (forceReload = false) => {
      if (!mounted || !sourceRef.current) {
        return;
      }

      if (forceReload) {
        sourceRef.current.innerHTML = "";
      }

      const existing = document.querySelector<HTMLScriptElement>(`script[src="${soroScriptSrc}"]`);
      if (existing && !forceReload && tryExtract()) {
        return;
      }

      const script = document.createElement("script");
      script.src = soroScriptSrc;
      script.defer = true;
      script.onload = () => {
        if (!tryExtract()) {
          startObserving();
        }
      };
      document.body.appendChild(script);
      injectedScript = script;
    };

    startObserving();
    if (!tryExtract()) {
      mountScript();
    } else {
      setLoading(false);
    }

    return () => {
      mounted = false;
      if (observer) {
        observer.disconnect();
      }
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
      injectedScript?.remove();
    };
  }, [limit, articles.length]);

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
