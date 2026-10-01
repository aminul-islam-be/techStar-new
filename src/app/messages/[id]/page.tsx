"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ChatThread from "@/components/ChatThread";
import { getCustomerUserId } from "@/lib/customerAuth";

const headers = () => ({ "x-user-id": getCustomerUserId() });

export default function CustomerChatPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getCustomerUserId()) router.replace(`/login?redirect=/messages/${id}`);
    else setReady(true);
  }, [router, id]);

  if (!ready) return <main className="min-h-screen bg-slate-950" />;

  return (
    <main className="min-h-screen bg-slate-950 pb-24 text-white">
      <div className="mx-auto max-w-2xl px-4 py-4">
        <ChatThread
          endpoint={`/api/chat/conversations/${id}`}
          reportEndpoint={`/api/chat/conversations/${id}/report`}
          role="customer"
          backHref="/messages"
          getHeaders={headers}
        />
      </div>
    </main>
  );
}
