"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AdminShell, Panel } from "../../components/admin-shell";
import { ManagedBlogArticle } from "../../components/managed-blog-article";
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

function buildPreviewPost(form: EditableBlogForm): ManagedBlogPost {
  const now = new Date().toISOString();

  return {
    id: "preview",
    title: form.title.trim() || "Untitled article",
    slug: form.slug.trim() || "preview-article",
    summary: form.summary.trim() || "",
    body: form.body.trim() || "Start writing your article here.",
    coverImageUrl: form.coverImageUrl.trim() || null,
    status: form.status,
    publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : now,
    createdAt: now,
    updatedAt: now,
    author: {
      id: "preview-author",
      fullName: "Preview",
      email: "preview@chaufx.ca"
    }
  };
}

export default function BlogManagerPage() {
  const [posts, setPosts] = useState<ManagedBlogPost[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<EditableBlogForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [editorMode, setEditorMode] = useState<"write" | "preview">("write");
  const [mediaInsert, setMediaInsert] = useState<{ type: "image" | "video"; url: string; title: string } | null>(null);
  const bodyEditorRef = useRef<HTMLTextAreaElement>(null);

  async function loadPosts() {
    setLoading(true);
    try {
      const result = await adminFetch<ManagedBlogPost[]>("/admin/blog-posts");
      setPosts(result);
      setError("");
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
    null;

  useEffect(() => {
    if (selectedPost) {
      setForm(buildForm(selectedPost));
      setIsCreating(false);
      setStatusMessage("");
    }
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
        await adminFetch<ManagedBlogPost>("/admin/blog-posts", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        setSelectedId("");
        setIsCreating(false);
        setForm(emptyForm);
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
      setIsCreating(false);
      setForm(emptyForm);
      await loadPosts();
      setStatusMessage("Blog article deleted.");
    } catch (deleteError) {
      setStatusMessage(deleteError instanceof Error ? deleteError.message : "Unable to delete this article.");
    } finally {
      setSaving(false);
    }
  }

  async function handleMakeInactive() {
    if (!selectedPost) {
      return;
    }

    setSaving(true);
    setStatusMessage("");

    try {
      await adminFetch(`/admin/blog-posts/${selectedPost.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "DRAFT"
        })
      });
      await loadPosts();
      setStatusMessage("Article moved to draft.");
    } catch (inactiveError) {
      setStatusMessage(inactiveError instanceof Error ? inactiveError.message : "Unable to update this article.");
    } finally {
      setSaving(false);
    }
  }

  function replaceBodySelection(value: string, selectionStart?: number, selectionEnd?: number) {
    const editor = bodyEditorRef.current;
    const start = selectionStart ?? editor?.selectionStart ?? form.body.length;
    const end = selectionEnd ?? editor?.selectionEnd ?? start;
    const nextBody = `${form.body.slice(0, start)}${value}${form.body.slice(end)}`;
    const cursor = start + value.length;

    setForm((current) => ({ ...current, body: nextBody }));
    requestAnimationFrame(() => {
      editor?.focus();
      editor?.setSelectionRange(cursor, cursor);
    });
  }

  function insertBlock(value: string) {
    const editor = bodyEditorRef.current;
    const start = editor?.selectionStart ?? form.body.length;
    const end = editor?.selectionEnd ?? start;
    const needsLeadingBreak = start > 0 && !form.body.slice(0, start).endsWith("\n\n");
    const needsTrailingBreak = end < form.body.length && !form.body.slice(end).startsWith("\n\n");
    const block = `${needsLeadingBreak ? "\n\n" : ""}${value}${needsTrailingBreak ? "\n\n" : ""}`;

    replaceBodySelection(block, start, end);
  }

  function applyHeading(level: 2 | 3) {
    const editor = bodyEditorRef.current;
    const start = editor?.selectionStart ?? form.body.length;
    const end = editor?.selectionEnd ?? start;
    const selectedText = form.body.slice(start, end).trim() || (level === 2 ? "Section heading" : "Subheading");

    insertBlock(`${"#".repeat(level)} ${selectedText}`);
  }

  function applyBulletList() {
    const editor = bodyEditorRef.current;
    const start = editor?.selectionStart ?? form.body.length;
    const end = editor?.selectionEnd ?? start;
    const selectedText = form.body.slice(start, end).trim();
    const list = selectedText ? selectedText.split(/\r?\n/).map((line) => `- ${line.trim()}`).join("\n") : "- Bullet point";

    insertBlock(list);
  }

  function insertMedia() {
    if (!mediaInsert?.url.trim()) {
      return;
    }

    const title = mediaInsert.title.trim() || (mediaInsert.type === "image" ? "Article image" : "Article video");
    insertBlock(
      mediaInsert.type === "image"
        ? `![${title}](${mediaInsert.url.trim()})`
        : `video[${title}]: ${mediaInsert.url.trim()}`
    );
    setMediaInsert(null);
  }

  const previewPost = useMemo(() => buildPreviewPost(form), [form]);

  return (
    <AdminShell title="Blog" description="Articles.">
      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard title="Articles" value={posts.length} detail="All articles." />
        <StatCard title="Published" value={publishedCount} detail="Live articles." />
        <StatCard title="Drafts" value={draftCount} detail="Unpublished articles." />
      </div>

      <div className="flex items-center justify-end">
        <button
          type="button"
          className={adminSecondaryButtonClass}
          onClick={() => {
            setSelectedId("");
            setIsCreating(true);
            setForm(emptyForm);
            setStatusMessage("");
            setEditorMode("write");
          }}
        >
          Create article
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[400px_1fr]">
        <Panel title="Articles">
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
                      onClick={() => {
                        setSelectedId(post.id);
                        setIsCreating(false);
                        setStatusMessage("");
                        setEditorMode("write");
                      }}
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
              <EmptyState title="No articles yet" />
            )}
          </div>
        </Panel>

        {selectedPost || isCreating ? (
          <Panel
            title={selectedPost ? "Edit article" : "Create article"}
            aside={
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={editorMode === "write" ? adminPrimaryButtonClass : adminGhostButtonClass}
                  onClick={() => setEditorMode("write")}
                >
                  Write
                </button>
                <button
                  type="button"
                  className={editorMode === "preview" ? adminPrimaryButtonClass : adminGhostButtonClass}
                  onClick={() => setEditorMode("preview")}
                >
                  Preview
                </button>
                {selectedPost ? (
                  <Link href={`/blog/${selectedPost.slug}`} target="_blank" className={adminGhostButtonClass}>
                    View article
                  </Link>
                ) : null}
              </div>
            }
          >
            {editorMode === "write" ? (
              <>
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
                      placeholder="Summary"
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
                      onChange={(event) =>
                        setForm((current) => ({ ...current, status: event.target.value as EditableBlogForm["status"] }))
                      }
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

                  <div className="md:col-span-2 flex flex-wrap gap-2">
                    <button type="button" className={adminGhostButtonClass} onClick={() => applyHeading(2)}>
                      H2
                    </button>
                    <button type="button" className={adminGhostButtonClass} onClick={() => applyHeading(3)}>
                      H3
                    </button>
                    <button type="button" className={adminGhostButtonClass} onClick={applyBulletList}>
                      Bullet
                    </button>
                    <button type="button" className={adminGhostButtonClass} onClick={() => setMediaInsert({ type: "image", url: "", title: "" })}>
                      Image
                    </button>
                    <button type="button" className={adminGhostButtonClass} onClick={() => setMediaInsert({ type: "video", url: "", title: "" })}>
                      Video
                    </button>
                  </div>

                  {mediaInsert ? (
                    <div className="md:col-span-2 grid gap-3 rounded-2xl border border-[#D7DEEF] bg-[#F8FAFC] p-4 md:grid-cols-[1fr_1fr_auto]">
                      <input
                        value={mediaInsert.url}
                        onChange={(event) => setMediaInsert((current) => (current ? { ...current, url: event.target.value } : current))}
                        className={adminInputClass}
                        placeholder={mediaInsert.type === "image" ? "Image URL" : "YouTube, Vimeo, or MP4 URL"}
                      />
                      <input
                        value={mediaInsert.title}
                        onChange={(event) => setMediaInsert((current) => (current ? { ...current, title: event.target.value } : current))}
                        className={adminInputClass}
                        placeholder={mediaInsert.type === "image" ? "Image description" : "Video title"}
                      />
                      <div className="flex gap-2">
                        <button type="button" className={adminPrimaryButtonClass} onClick={insertMedia} disabled={!mediaInsert.url.trim()}>
                          Insert
                        </button>
                        <button type="button" className={adminGhostButtonClass} onClick={() => setMediaInsert(null)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <label className="block md:col-span-2">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Article body</span>
                    <textarea
                      ref={bodyEditorRef}
                      value={form.body}
                      onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
                      className={`${adminInputClass} min-h-[420px]`}
                      placeholder="Write your article"
                    />
                  </label>
                </div>
              </>
            ) : (
              <div className="rounded-[24px] bg-[#F8FAFC] p-3">
                <ManagedBlogArticle post={previewPost} />
              </div>
            )}

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
              {selectedPost && selectedPost.status === "PUBLISHED" ? (
                <button type="button" className={adminGhostButtonClass} onClick={handleMakeInactive} disabled={saving}>
                  Make inactive
                </button>
              ) : null}
              <button
                type="button"
                className={adminGhostButtonClass}
                onClick={() => {
                  setSelectedId("");
                  setIsCreating(false);
                  setForm(emptyForm);
                  setStatusMessage("");
                }}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </Panel>
        ) : null}
      </div>
    </AdminShell>
  );
}
