"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminShell, Panel } from "../../components/admin-shell";
import {
  EmptyState,
  StatCard,
  StatusPill,
  adminGhostButtonClass,
  adminInputClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass
} from "../../components/admin-primitives";
import { adminFetch } from "../../lib/api";
import type { ManagedBlogPost } from "../../lib/blog";

type EditableBlogForm = {
  title: string;
  slug: string;
  summary: string;
  body: string;
  coverImageUrl: string;
  status: "DRAFT" | "PUBLISHED";
  publishedAt: string;
};

const emptyForm: EditableBlogForm = {
  title: "",
  slug: "",
  summary: "",
  body: "",
  coverImageUrl: "",
  status: "DRAFT",
  publishedAt: ""
};

function buildForm(post?: ManagedBlogPost | null): EditableBlogForm {
  if (!post) {
    return emptyForm;
  }

  return {
    title: post.title,
    slug: post.slug,
    summary: post.summary,
    body: post.body,
    coverImageUrl: post.coverImageUrl ?? "",
    status: post.status,
    publishedAt: post.publishedAt ? post.publishedAt.slice(0, 16) : ""
  };
}

export default function BlogManagerPage() {
  const [posts, setPosts] = useState<ManagedBlogPost[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState<EditableBlogForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");

  async function loadPosts() {
    setLoading(true);
    try {
      const result = await adminFetch<ManagedBlogPost[]>("/admin/blog-posts");
      setPosts(result);
      setError("");
      if (!selectedId && result[0]?.id) {
        setSelectedId(result[0].id);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load blog articles.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPosts();
  }, []);

  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return posts.filter((post) => {
      if (!normalizedQuery) {
        return true;
      }

      return [post.title, post.slug, post.summary, post.author?.fullName ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [posts, query]);

  const selectedPost =
    filteredPosts.find((post) => post.id === selectedId) ??
    posts.find((post) => post.id === selectedId) ??
    filteredPosts[0] ??
    null;

  useEffect(() => {
    setForm(buildForm(selectedPost));
    setStatusMessage("");
  }, [selectedPost]);

  const publishedCount = posts.filter((post) => post.status === "PUBLISHED").length;
  const draftCount = posts.filter((post) => post.status === "DRAFT").length;

  async function handleSave() {
    setSaving(true);
    setStatusMessage("");

    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim() || undefined,
      summary: form.summary.trim(),
      body: form.body.trim(),
      coverImageUrl: form.coverImageUrl.trim() || null,
      status: form.status,
      publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : null
    };

    try {
      if (selectedPost) {
        await adminFetch(`/admin/blog-posts/${selectedPost.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
      } else {
        const created = await adminFetch<ManagedBlogPost>("/admin/blog-posts", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        setSelectedId(created.id);
      }

      await loadPosts();
      setStatusMessage(selectedPost ? "Blog article updated." : "Blog article created.");
    } catch (saveError) {
      setStatusMessage(saveError instanceof Error ? saveError.message : "Unable to save this article.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedPost) {
      return;
    }

    setSaving(true);
    setStatusMessage("");

    try {
      await adminFetch(`/admin/blog-posts/${selectedPost.id}`, {
        method: "DELETE"
      });
      setSelectedId("");
      await loadPosts();
      setStatusMessage("Blog article deleted.");
    } catch (deleteError) {
      setStatusMessage(deleteError instanceof Error ? deleteError.message : "Unable to delete this article.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell
      title="Blog"
      description="Create, edit, and publish ChaufX articles while keeping the existing Soro blog content live on the public site."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard title="Managed posts" value={posts.length} detail="Articles stored directly in ChaufX." />
        <StatCard title="Published" value={publishedCount} detail="Visible on the public blog." />
        <StatCard title="Drafts" value={draftCount} detail="Internal work that is not live yet." />
      </div>

      <div className="grid gap-4 xl:grid-cols-[400px_1fr]">
        <Panel
          title="Article library"
          subtitle="Select an article to edit or start a new ChaufX post."
          aside={
            <button
              type="button"
              className={adminSecondaryButtonClass}
              onClick={() => {
                setSelectedId("");
                setForm(emptyForm);
                setStatusMessage("");
              }}
            >
              New article
            </button>
          }
        >
          <div className="space-y-3">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by title, slug, or author"
              className={adminInputClass}
            />

            {loading ? <p className="text-sm text-slate-500">Loading blog articles...</p> : null}
            {error ? <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">{error}</p> : null}

            {filteredPosts.length ? (
              <div className="space-y-3">
                {filteredPosts.map((post) => {
                  const active = post.id === selectedPost?.id;
                  return (
                    <button
                      key={post.id}
                      type="button"
                      onClick={() => setSelectedId(post.id)}
                      className={`w-full rounded-[18px] border p-4 text-left transition ${
                        active
                          ? "border-[#C7D2FE] bg-[#EEF2FF]"
                          : "border-[#E5E7EB] bg-[#F8FAFC] hover:border-[#D7DEEF] hover:bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-base font-semibold tracking-[-0.04em] text-slate-950">{post.title}</div>
                          <div className="mt-1 text-sm text-slate-500">/{post.slug}</div>
                        </div>
                        <StatusPill label={post.status === "PUBLISHED" ? "Published" : "Draft"} tone={post.status === "PUBLISHED" ? "emerald" : "neutral"} />
                      </div>
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{post.summary}</p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="No blog articles yet"
                description="Start your first managed ChaufX article here. Soro content will still remain visible on the public blog."
              />
            )}
          </div>
        </Panel>

        <Panel
          title={selectedPost ? "Edit article" : "Create article"}
          subtitle="Keep the summary tight for the card view, then add the full article body for the detail page."
          aside={
            selectedPost ? (
              <Link href={`/blog/${selectedPost.slug}`} target="_blank" className={adminGhostButtonClass}>
                View live article
              </Link>
            ) : null
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Title</span>
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                className={adminInputClass}
                placeholder="What Is ChaufX? Everything You Need to Know"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Slug</span>
              <input
                value={form.slug}
                onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
                className={adminInputClass}
                placeholder="what-is-chaufx-everything-you-need-to-know"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-medium text-slate-700">Summary</span>
              <textarea
                value={form.summary}
                onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
                className={`${adminInputClass} min-h-[110px]`}
                placeholder="Short card summary shown on the public blog listing."
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-medium text-slate-700">Cover image URL</span>
              <input
                value={form.coverImageUrl}
                onChange={(event) => setForm((current) => ({ ...current, coverImageUrl: event.target.value }))}
                className={adminInputClass}
                placeholder="https://..."
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Status</span>
              <select
                value={form.status}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as EditableBlogForm["status"] }))}
                className={adminInputClass}
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Published at</span>
              <input
                type="datetime-local"
                value={form.publishedAt}
                onChange={(event) => setForm((current) => ({ ...current, publishedAt: event.target.value }))}
                className={adminInputClass}
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-medium text-slate-700">Article body</span>
              <textarea
                value={form.body}
                onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
                className={`${adminInputClass} min-h-[420px]`}
                placeholder={"Use blank lines between paragraphs. Use ## for section headings and - for bullet lists."}
              />
            </label>
          </div>

          {statusMessage ? <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">{statusMessage}</p> : null}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="button" className={adminPrimaryButtonClass} onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : selectedPost ? "Save changes" : "Create article"}
            </button>
            {selectedPost ? (
              <button type="button" className={adminGhostButtonClass} onClick={handleDelete} disabled={saving}>
                Delete article
              </button>
            ) : null}
          </div>
        </Panel>
      </div>
    </AdminShell>
  );
}
