"use client";

import { useMemo, useState } from "react";
import { AdminShell, Panel } from "../../components/admin-shell";
import {
  EmptyState,
  StatusPill,
  adminFilterButtonActiveClass,
  adminFilterButtonClass,
  adminGhostButtonClass,
  adminInputClass,
  adminPrimaryButtonClass
} from "../../components/admin-primitives";
import { adminFetch, contactMessagesFallback, useAdminResource } from "../../lib/api";

const monthNumbers: Record<string, number> = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
  JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11
};

function parseFilterDate(value: string, endOfDay = false) {
  const match = value.trim().toUpperCase().match(/^(\d{2})-([A-Z]{3})-(\d{4})$/);
  if (!match || monthNumbers[match[2]] === undefined) return null;

  const date = new Date(Number(match[3]), monthNumbers[match[2]], Number(match[1]), endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  return date.getFullYear() === Number(match[3]) && date.getMonth() === monthNumbers[match[2]] && date.getDate() === Number(match[1]) ? date : null;
}

export default function MessagesPage() {
  const { data, loading, error, reload } = useAdminResource("/admin/contact-messages", contactMessagesFallback);
  const [filter, setFilter] = useState<"all" | "account-deletion">("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [replyError, setReplyError] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);

  const deletionRequestCount = useMemo(
    () => data.filter((message) => String(message.source ?? "").toLowerCase() === "account-deletion").length,
    [data]
  );
  const filteredMessages = useMemo(
    () => {
      const searchTerm = search.trim().toLowerCase();
      const from = dateFrom ? parseFilterDate(dateFrom) : null;
      const to = dateTo ? parseFilterDate(dateTo, true) : null;

      return (filter === "account-deletion"
        ? data.filter((message) => String(message.source ?? "").toLowerCase() === "account-deletion")
        : data).filter((message) => {
        const receivedAt = new Date(message.createdAt);
        const matchesSearch = !searchTerm || `${message.fullName} ${message.email}`.toLowerCase().includes(searchTerm);
        return matchesSearch && (!from || receivedAt >= from) && (!to || receivedAt <= to);
      });
    },
    [data, dateFrom, dateTo, filter, search]
  );
  const hasInvalidDate = Boolean((dateFrom && !parseFilterDate(dateFrom)) || (dateTo && !parseFilterDate(dateTo, true)));

  return (
    <AdminShell title="Messages">
      <Panel title="Incoming messages">
        {loading ? <p className="text-sm text-slate-500">Loading messages...</p> : null}
        {error ? <p className="text-sm text-amber-600">{error}</p> : null}

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={filter === "all" ? adminFilterButtonActiveClass : adminFilterButtonClass}
            onClick={() => setFilter("all")}
          >
            All messages
          </button>
          <button
            type="button"
            className={filter === "account-deletion" ? adminFilterButtonActiveClass : adminFilterButtonClass}
            onClick={() => setFilter("account-deletion")}
          >
            Account deletion
          </button>
          {deletionRequestCount ? <StatusPill label={`${deletionRequestCount} deletion request${deletionRequestCount === 1 ? "" : "s"}`} tone="rose" /> : null}
        </div>

        <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_11rem_11rem_auto]">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or email"
            aria-label="Search messages by name or email"
            className={adminInputClass}
          />
          <label className="grid gap-1 text-xs font-medium text-slate-500">
            From date
            <input
              type="text"
              inputMode="numeric"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value.toUpperCase())}
              placeholder="DD-MON-YYYY"
              aria-label="Messages from date in DD-MON-YYYY format"
              className={adminInputClass}
            />
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-500">
            To date
            <input
              type="text"
              inputMode="numeric"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value.toUpperCase())}
              placeholder="DD-MON-YYYY"
              aria-label="Messages to date in DD-MON-YYYY format"
              className={adminInputClass}
            />
          </label>
          {search || dateFrom || dateTo ? (
            <button
              type="button"
              className={`${adminGhostButtonClass} self-end`}
              onClick={() => {
                setSearch("");
                setDateFrom("");
                setDateTo("");
              }}
            >
              Clear
            </button>
          ) : null}
        </div>
        {hasInvalidDate ? <p className="-mt-2 mb-4 text-xs text-rose-600">Use DD-MON-YYYY for dates, for example 16-OCT-2026.</p> : null}

        <div className="grid gap-3">
          {filteredMessages.length ? (
            filteredMessages.map((message) => {
              const isOpen = expandedMessageId === message.id;
              const isReplying = replyingTo === message.id;
              const replies = message.replies ?? [];

              return (
              <div key={message.id} className="rounded-[18px] border border-[#E5E7EB] bg-[#F8FAFC] p-3.5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#4338CA]">
                        {message.subject || "Driver inquiry"}
                      </div>
                      {String(message.source ?? "").toLowerCase() === "account-deletion" ? (
                        <StatusPill label="Account deletion" tone="rose" />
                      ) : null}
                    </div>
                    <div className="mt-2">
                      <h3 className="text-[1.02rem] font-semibold tracking-[-0.04em] text-slate-950">{message.fullName}</h3>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {message.email}
                      {message.province ? ` • ${message.province}` : ""}
                      {message.source ? ` • ${message.source}` : ""}
                    </p>
                    <p className="mt-3 text-xs uppercase tracking-[0.22em] text-slate-400">
                      Received {new Date(message.createdAt).toLocaleString()}
                    </p>

                    {isOpen ? <>
                      <p className="mt-3 text-sm leading-6 text-slate-700 whitespace-pre-line">{message.message}</p>
                      {replies.length ? (
                      <div className="mt-4 space-y-2 border-t border-slate-200 pt-3">
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-400">Conversation</p>
                        {replies.map((reply) => {
                          const fromAdmin = reply.author === "ADMIN";
                          return (
                            <div key={reply.id} className={`rounded-xl border px-3 py-2.5 text-sm ${fromAdmin ? "border-blue-100 bg-blue-50/70" : "border-slate-200 bg-white"}`}>
                              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                                <span className="font-semibold text-slate-700">
                                  {fromAdmin ? reply.adminUser?.fullName || "ChaufX Team" : message.fullName}
                                </span>
                                <span>{new Date(reply.createdAt).toLocaleString()}</span>
                              </div>
                              <p className="mt-1 whitespace-pre-line leading-6 text-slate-700">{reply.message}</p>
                              {fromAdmin ? <p className="mt-1 text-xs text-slate-400">{reply.emailSentAt ? "Email sent" : "Email delivery pending"}</p> : null}
                            </div>
                          );
                        })}
                      </div>
                      ) : null}
                    </> : null}
                  </div>

                  <div className="flex flex-col items-start gap-3 md:items-end">
                    <StatusPill label={message.status === "NEW" ? "New" : "Resolved"} tone={message.status === "NEW" ? "amber" : "emerald"} />
                    <button
                      type="button"
                      className={adminGhostButtonClass}
                      aria-expanded={isOpen}
                      onClick={() => {
                        setExpandedMessageId(isOpen ? null : message.id);
                        if (isOpen) {
                          setReplyingTo(null);
                          setReplyDraft("");
                          setReplyError("");
                        }
                      }}
                    >
                      {isOpen ? "Close" : "Open"}
                    </button>
                    {isOpen && isReplying ? (
                      <div className="w-full min-w-[18rem] space-y-2 rounded-xl border border-[#DCDDFF] bg-white p-3 md:w-[25rem]">
                        <label className="block text-sm font-semibold text-slate-800" htmlFor={`reply-${message.id}`}>Reply</label>
                        <textarea
                          id={`reply-${message.id}`}
                          className={`${adminInputClass} min-h-28 resize-y`}
                          value={replyDraft}
                          onChange={(event) => setReplyDraft(event.target.value)}
                          placeholder="Write a clear response to the customer…"
                          maxLength={2000}
                        />
                        {replyError ? <p className="text-sm text-rose-600">{replyError}</p> : null}
                        <p className="text-xs leading-5 text-slate-500">A secure link to view this conversation and reply is sent to the recipient&apos;s email.</p>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className={adminGhostButtonClass}
                            disabled={replyLoading}
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyDraft("");
                              setReplyError("");
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className={adminPrimaryButtonClass}
                            disabled={!replyDraft.trim() || replyLoading}
                            onClick={async () => {
                              setReplyLoading(true);
                              setReplyError("");
                              try {
                                await adminFetch(`/admin/contact-messages/${message.id}/replies`, {
                                  method: "POST",
                                  body: JSON.stringify({ message: replyDraft.trim() })
                                });
                                setReplyingTo(null);
                                setReplyDraft("");
                                setExpandedMessageId(null);
                                await reload();
                              } catch (replyFailure) {
                                setReplyError(replyFailure instanceof Error ? replyFailure.message : "Unable to send the reply.");
                              } finally {
                                setReplyLoading(false);
                              }
                            }}
                          >
                            {replyLoading ? "Sending…" : "Send"}
                          </button>
                        </div>
                      </div>
                    ) : isOpen ? (
                      <>
                        <button
                          type="button"
                          className={adminPrimaryButtonClass}
                          onClick={() => {
                            setReplyingTo(message.id);
                            setReplyDraft("");
                            setReplyError("");
                          }}
                        >
                          Reply
                        </button>
                        {message.status === "NEW" ? (
                      <button
                        type="button"
                        className={adminGhostButtonClass}
                        onClick={async () => {
                          await adminFetch(`/admin/contact-messages/${message.id}/status`, {
                            method: "POST",
                            body: JSON.stringify({ status: "RESOLVED" })
                          });
                          await reload();
                        }}
                      >
                        Mark resolved
                      </button>
                        ) : (
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        Resolved {message.resolvedAt ? new Date(message.resolvedAt).toLocaleDateString() : ""}
                      </p>
                        )}
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
              );
            })
          ) : (
            <EmptyState
              title={filter === "account-deletion" ? "No account deletion requests" : "No messages"}
            />
          )}
        </div>
      </Panel>
    </AdminShell>
  );
}
