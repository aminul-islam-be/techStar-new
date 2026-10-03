"use client";

import { useSite } from "@/lib/siteContext";
import ChatList from "@/components/ChatList";

export default function VendorMessagesPage() {
  const { siteName } = useSite();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">Customer messages</h1>
      <p className="text-xs text-slate-400">
        Customers start the chat from your product page. You can reply here. Sharing phone numbers, links or asking
        customers to order outside {siteName} is blocked and reviewed by support.
      </p>
      <ChatList
        endpoint="/api/vendor/chats"
        hrefBase="/vendor/messages"
        emptyText="No customer messages yet."
      />
    </div>
  );
}
