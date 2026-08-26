const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://chaufx-backend.onrender.com/api";

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

export async function fetchPublicBlogPosts(init?: RequestInit) {
  const response = await fetch(`${API_BASE}/blog-posts`, {
    cache: "no-store",
    ...init
  });

  if (!response.ok) {
    throw new Error("Unable to load blog posts.");
  }

  return (await response.json()) as ManagedBlogPost[];
}

export async function fetchPublicBlogPost(slug: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE}/blog-posts/${encodeURIComponent(slug)}`, {
    cache: "no-store",
    ...init
  });

  if (!response.ok) {
    throw new Error(response.status === 404 ? "Blog article not found." : "Unable to load blog article.");
  }

  return (await response.json()) as ManagedBlogPost;
}
