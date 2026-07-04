"use client";

import { AdminShell, Panel } from "../../components/admin-shell";
import {
  EmptyState,
  StatusPill,
  adminPrimaryButtonClass
} from "../../components/admin-primitives";
import { adminFetch, contactMessagesFallback, useAdminResource } from "../../lib/api";

export default function MessagesPage() {
  const { data, loading, error, reload } = useAdminResource("/admin/contact-messages", contactMessagesFallback);

  return (
    <AdminShell
      title="Messages"
      description="Website inquiries and contact requests."
    >
      <Panel title="Incoming messages" subtitle="Review incoming inquiries and resolution status.">
        {loading ? <p className="text-sm text-slate-500">Loading messages...</p> : null}
        {error ? <p className="text-sm text-amber-600">{error}</p> : null}

        <div className="grid gap-3">
          {data.length ? (
            data.map((message) => (
              <div key={message.id} className="rounded-[24px] border border-[#E5E7EB] bg-[#F8FAFC] p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="max-w-3xl">
                    <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#4338CA]">
                      {message.subject || "Driver inquiry"}
                    </div>
                    <h3 className="mt-2 text-[1.02rem] font-semibold tracking-[-0.04em] text-slate-950">{message.fullName}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {message.email}
                      {message.province ? ` • ${message.province}` : ""}
                      {message.source ? ` • ${message.source}` : ""}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-slate-700">{message.message}</p>
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
            <EmptyState title="No messages" description="There are no contact messages at this time." />
          )}
        </div>
      </Panel>
    </AdminShell>
  );
}
