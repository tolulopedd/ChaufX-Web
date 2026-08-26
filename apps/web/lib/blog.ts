const PRODUCTION_BLOG_API_BASE = "https://chaufx-backend.onrender.com/api";
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? PRODUCTION_BLOG_API_BASE;

export type ManagedBlogPost = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  body: string;
  coverImageUrl?: string | null;
  status: "DRAFT" | "PUBLISHED";
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
};

export function getBlogApiBase() {
  return API_BASE;
}

async function fetchPublicBlogResource(path: string, init?: RequestInit) {
  const bases = Array.from(new Set([API_BASE, PRODUCTION_BLOG_API_BASE]));
  let lastError: Error | null = null;

  for (const base of bases) {
    try {
      const response = await fetch(`${base}${path}`, {
        cache: "no-store",
        ...init
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Blog article not found.");
        }

        throw new Error(`Unable to load blog resource from ${base}.`);
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unable to load blog resource.");
    }
  }

  throw lastError ?? new Error("Unable to load blog resource.");
}

export async function fetchPublicBlogPosts(init?: RequestInit) {
  const response = await fetchPublicBlogResource("/blog-posts", init);
  return (await response.json()) as ManagedBlogPost[];
}

export async function fetchPublicBlogPost(slug: string, init?: RequestInit) {
  const response = await fetchPublicBlogResource(`/blog-posts/${encodeURIComponent(slug)}`, init);
  return (await response.json()) as ManagedBlogPost;
}
