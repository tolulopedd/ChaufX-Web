"use client";

import { useMemo, useState } from "react";
import { AdminShell, Panel } from "../../components/admin-shell";
import {
  EmptyState,
  StatusPill,
  adminGhostButtonClass,
  adminPrimaryButtonClass
} from "../../components/admin-primitives";
import { adminFetch, contactMessagesFallback, useAdminResource } from "../../lib/api";

export default function MessagesPage() {
  const { data, loading, error, reload } = useAdminResource("/admin/contact-messages", contactMessagesFallback);
  const [filter, setFilter] = useState<"all" | "account-deletion">("all");

  const deletionRequestCount = useMemo(
    () => data.filter((message) => String(message.source ?? "").toLowerCase() === "account-deletion").length,
    [data]
  );
  const filteredMessages = useMemo(
    () =>
      filter === "account-deletion"
        ? data.filter((message) => String(message.source ?? "").toLowerCase() === "account-deletion")
        : data,
    [data, filter]
  );

  return (
    <AdminShell title="Messages">
      <Panel title="Incoming messages">
        {loading ? <p className="text-sm text-slate-500">Loading messages...</p> : null}
        {error ? <p className="text-sm text-amber-600">{error}</p> : null}

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={filter === "all" ? adminPrimaryButtonClass : adminGhostButtonClass}
            onClick={() => setFilter("all")}
          >
            All messages
          </button>
          <button
            type="button"
            className={filter === "account-deletion" ? adminPrimaryButtonClass : adminGhostButtonClass}
            onClick={() => setFilter("account-deletion")}
          >
            Account deletion
          </button>
          {deletionRequestCount ? <StatusPill label={`${deletionRequestCount} deletion request${deletionRequestCount === 1 ? "" : "s"}`} tone="rose" /> : null}
        </div>

        <div className="grid gap-3">
          {filteredMessages.length ? (
            filteredMessages.map((message) => (
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
                    <p className="mt-3 text-sm leading-6 text-slate-700 whitespace-pre-line">{message.message}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.22em] text-slate-400">
                      Received {new Date(message.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex flex-col items-start gap-3 md:items-end">
                    <StatusPill label={message.status === "NEW" ? "New" : "Resolved"} tone={message.status === "NEW" ? "violet" : "navy"} />
                    {message.status === "NEW" ? (
                      <button
                        type="button"
                        className={adminPrimaryButtonClass}
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
                  </div>
                </div>
              </div>
            ))
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
