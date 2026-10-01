"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ChatList from "@/components/ChatList";
import { getCustomerUserId } from "@/lib/customerAuth";

const headers = () => ({ "x-user-id": getCustomerUserId() });

export default function CustomerMessagesPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getCustomerUserId()) router.replace("/login?redirect=/messages");
    else setReady(true);
  }, [router]);

  if (!ready) return <main className="min-h-screen bg-slate-950" />;

  return (
    <main className="min-h-screen bg-slate-950 pb-24 text-white">
      <div className="mx-auto max-w-2xl px-4 py-5">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-extrabold">Messages</h1>
          <Link href="/" className="text-xs text-slate-400">
            ← Store
          </Link>
        </div>
        <ChatList
          endpoint="/api/chat/conversations"
          hrefBase="/messages"
          getHeaders={headers}
          emptyText="No chats yet. Open a seller's product and tap “Chat with seller”."
        />
      </div>
    </main>
  );
}
