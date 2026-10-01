"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type Msg = { _id: string; sender: "customer" | "vendor"; text: string; createdAt: string };
type Conv = { _id: string; title: string; subtitle: string; locked: boolean; reported: boolean };

export default function ChatThread({
  endpoint,
  role,
  backHref,
  getHeaders,
  reportEndpoint,
}: {
  endpoint: string;
  role: "customer" | "vendor";
  backHref: string;
  getHeaders?: () => Record<string, string>;
  reportEndpoint?: string;
}) {
  const [conv, setConv] = useState<Conv | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastCount = useRef(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch(endpoint, { headers: getHeaders?.(), cache: "no-store" });
      const d = await res.json();
      if (d.redirectToLogin) {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
        return;
      }
      if (d.success) {
        setConv(d.conversation);
        setMessages(d.messages);
      } else {
        setError(d.message || "Unable to load chat.");
      }
    } catch {
      /* temporary network problem, next poll will retry */
    }
  }, [endpoint, getHeaders]);

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (messages.length !== lastCount.current) {
      lastCount.current = messages.length;
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  async function send() {
    if (!text.trim() || sending) return;
    setSending(true);
    setError("");
    setInfo("");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(getHeaders?.() || {}) },
        body: JSON.stringify({ text }),
      });
      const d = await res.json();
      if (!res.ok || !d.success) {
        setError(d.message || "Message not sent.");
        if (d.locked) await load();
      } else {
        setText("");
        await load();
      }
    } finally {
      setSending(false);
    }
  }

  async function report() {
    if (!reportEndpoint) return;
    const reason = window.prompt("What went wrong? (for example: the seller asked me to order outside TechStar)") || "";
    if (!reason.trim()) return;
    const res = await fetch(reportEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(getHeaders?.() || {}) },
      body: JSON.stringify({ reason }),
    });
    const d = await res.json();
    setInfo(d.message || "Reported.");
  }

  return (
    <div className="flex flex-col">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Link href={backHref} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-sm">
            ←
          </Link>
          <div className="min-w-0">
            <p className="truncate font-bold">{conv?.title || "Chat"}</p>
            {conv?.subtitle && <p className="truncate text-[11px] text-slate-500">About: {conv.subtitle}</p>}
          </div>
        </div>
        {role === "customer" && reportEndpoint && (
          <button onClick={report} className="shrink-0 rounded-lg border border-red-500/30 px-2.5 py-1.5 text-[11px] text-red-300">
            Report
          </button>
        )}
      </div>

      <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] leading-relaxed text-amber-200">
        🔒 Keep every order and payment on TechStar. Phone numbers, e-mails, links and chat apps are blocked, and chats are
        monitored.{" "}
        {role === "customer"
          ? "If a seller asks you to order outside TechStar, tap Report."
          : "Orders can only be placed by the customer on the website."}
      </div>

      <div className="max-h-[55dvh] min-h-[40dvh] space-y-2 overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-3">
        {messages.length === 0 && <p className="text-center text-sm text-slate-500">No messages yet.</p>}
        {messages.map((m) => {
          const mine = m.sender === role;
          return (
            <div key={m._id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${
                  mine ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-100"
                }`}
              >
                {m.text}
                <p className={`mt-1 text-[10px] ${mine ? "text-blue-200" : "text-slate-500"}`}>
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {error && <p className="mt-2 rounded-lg bg-red-500/10 p-2.5 text-xs text-red-300">{error}</p>}
      {info && <p className="mt-2 rounded-lg bg-emerald-500/10 p-2.5 text-xs text-emerald-300">{info}</p>}

      {conv?.locked ? (
        <p className="mt-3 rounded-xl bg-slate-900 p-3 text-center text-sm text-red-300">
          This chat is locked by TechStar support.
        </p>
      ) : (
        <div className="mt-3 flex gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Write a message..."
            className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white outline-none focus:border-blue-500"
          />
          <button
            onClick={send}
            disabled={sending || !text.trim()}
            className="rounded-xl bg-blue-600 px-5 text-sm font-bold text-white disabled:opacity-50"
          >
            {sending ? "..." : "Send"}
          </button>
        </div>
      )}
    </div>
  );
}
