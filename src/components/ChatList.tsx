"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Row = {
  _id: string;
  title: string;
  subtitle: string;
  lastMessageText: string;
  lastMessageAt: string;
  unread: number;
  locked: boolean;
};

export default function ChatList({
  endpoint,
  hrefBase,
  getHeaders,
  emptyText,
}: {
  endpoint: string;
  hrefBase: string;
  getHeaders?: () => Record<string, string>;
  emptyText: string;
}) {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch(endpoint, { headers: getHeaders?.(), cache: "no-store" });
        const d = await res.json();
        if (alive) setRows(d.success ? d.conversations : []);
      } catch {
        if (alive) setRows([]);
      }
    }
    load();
    const t = setInterval(load, 8000);
    return () => {
      alive = false;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  if (!rows) return <p className="text-slate-400">Loading...</p>;
  if (!rows.length) return <p className="text-sm text-slate-400">{emptyText}</p>;

  return (
    <div className="space-y-2">
      {rows.map((c) => (
        <Link
          key={c._id}
          href={`${hrefBase}/${c._id}`}
          className="block rounded-2xl border border-white/10 bg-slate-900 p-3 hover:bg-slate-800"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-bold">{c.title}</p>
            <span className="shrink-0 text-[11px] text-slate-500">
              {new Date(c.lastMessageAt).toLocaleDateString()}
            </span>
          </div>
          {c.subtitle && <p className="truncate text-[11px] text-slate-500">About: {c.subtitle}</p>}
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="truncate text-sm text-slate-300">{c.lastMessageText || "No messages yet"}</p>
            {c.unread > 0 && (
              <span className="shrink-0 rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-bold">{c.unread}</span>
            )}
          </div>
          {c.locked && <p className="mt-1 text-[11px] text-red-300">Locked by support</p>}
        </Link>
      ))}
    </div>
  );
}
