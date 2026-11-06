import type { MetadataRoute } from "next";
import { fetchPublicBlogPosts } from "../lib/blog";
import { policyDocuments } from "../lib/policy-documents";

const siteUrl = "https://chaufx.ca";

const publicPages: Array<{ path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }> = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/services", changeFrequency: "monthly", priority: 0.9 },
  { path: "/pricing", changeFrequency: "monthly", priority: 0.9 },
  { path: "/how-it-works", changeFrequency: "monthly", priority: 0.8 },
  { path: "/about", changeFrequency: "monthly", priority: 0.7 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.8 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.7 },
  { path: "/driver", changeFrequency: "weekly", priority: 0.9 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.8 },
  { path: "/policies", changeFrequency: "yearly", priority: 0.4 }
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const policyPages: MetadataRoute.Sitemap = policyDocuments.map((policy) => ({
    url: `${siteUrl}/policies/${policy.slug}`,
    changeFrequency: "yearly",
    priority: 0.3
  }));
  let blogPages: MetadataRoute.Sitemap = [];

  try {
    const posts = await fetchPublicBlogPosts({ next: { revalidate: 3600 } });
    blogPages = posts.filter((post) => post.status === "PUBLISHED" && post.slug).map((post) => ({
      url: `${siteUrl}/blog/${post.slug}`,
      lastModified: new Date(post.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.7
    }));
  } catch {
    // Keep the sitemap available if the publishing API is temporarily unavailable.
  }

  return [...publicPages.map((page) => ({ url: `${siteUrl}${page.path}`, changeFrequency: page.changeFrequency, priority: page.priority })), ...policyPages, ...blogPages];
}
