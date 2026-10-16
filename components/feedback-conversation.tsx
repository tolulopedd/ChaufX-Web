"use client";

import { FormEvent, useEffect, useState } from "react";
import { fetchContactFeedback, replyToContactFeedback, type ContactFeedbackConversation } from "../lib/api";

export function FeedbackConversation() {
  const [token, setToken] = useState("");
  const [conversation, setConversation] = useState<ContactFeedbackConversation | null>(null);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const threadToken = new URLSearchParams(window.location.search).get("thread") ?? "";
    if (!threadToken) return;
    setToken(threadToken);
    setLoading(true);
    void fetchContactFeedback(threadToken)
      .then(setConversation)
      .catch((error) => setStatus(error instanceof Error ? error.message : "Unable to open this feedback conversation."))
      .finally(() => setLoading(false));
  }, []);

  if (!token) return null;

  async function submitReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim()) return;
    setLoading(true);
    setStatus("");
    try {
      await replyToContactFeedback(token, message.trim());
      setConversation((current) => current ? {
        ...current,
        entries: [...current.entries, { author: "CONTACT", message: message.trim(), createdAt: new Date().toISOString(), displayName: "You" }]
      } : current);
      setMessage("");
      setStatus("Your reply has been sent to the ChaufX Team.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to send your reply.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-3xl px-5 py-12 md:px-8">
        <div className="rounded-[30px] border border-[#E5E7EB] bg-white p-7 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.18)]">
          <div className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[#4338CA]">ChaufX conversation</div>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[#0F172A]">{conversation?.subject ?? "Loading conversation"}</h2>
          {loading && !conversation ? <p className="mt-4 text-sm text-slate-500">Loading your conversation...</p> : null}
          {status && !conversation ? <p className="mt-4 text-sm text-rose-600">{status}</p> : null}
          {conversation ? <>
            <div className="mt-6 space-y-3">
              {conversation.entries.map((entry, index) => (
                <article key={`${entry.createdAt}-${index}`} className={`max-w-[88%] rounded-2xl px-4 py-3 ${entry.author === "ADMIN" ? "bg-[#EEF4FF] text-[#0F172A]" : "ml-auto bg-[#F8FAFC] text-slate-800"}`}>
                  <div className="text-xs font-semibold text-slate-500">{entry.author === "ADMIN" ? "ChaufX Team" : entry.displayName}</div>
                  <p className="mt-1 whitespace-pre-line text-sm leading-6">{entry.message}</p>
                  <div className="mt-2 text-[0.68rem] text-slate-400">{new Date(entry.createdAt).toLocaleString()}</div>
                </article>
              ))}
            </div>
            <form className="mt-6 border-t border-[#E5E7EB] pt-6" onSubmit={submitReply}>
              <label className="block text-sm font-semibold text-slate-800" htmlFor="feedback-reply">Reply to the ChaufX Team</label>
              <textarea id="feedback-reply" value={message} onChange={(event) => setMessage(event.target.value)} className="mt-2 min-h-32 w-full rounded-2xl border border-[#E5E7EB] px-4 py-3 outline-none transition focus:border-[#2563EB]" maxLength={2000} required />
              {status ? <p className={`mt-3 text-sm ${status.includes("sent") ? "text-emerald-600" : "text-rose-600"}`}>{status}</p> : null}
              <button type="submit" disabled={loading || !message.trim()} className="mt-4 rounded-full bg-[#2563EB] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{loading ? "Sending..." : "Send reply"}</button>
            </form>
          </> : null}
        </div>
      </div>
    </section>
  );
}
