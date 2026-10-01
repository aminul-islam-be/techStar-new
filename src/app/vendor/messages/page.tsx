"use client";

import ChatList from "@/components/ChatList";

export default function VendorMessagesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">Customer messages</h1>
      <p className="text-xs text-slate-400">
        Customers start the chat from your product page. You can reply here. Sharing phone numbers, links or asking
        customers to order outside TechStar is blocked and reviewed by support.
      </p>
      <ChatList
        endpoint="/api/vendor/chats"
        hrefBase="/vendor/messages"
        emptyText="No customer messages yet."
      />
    </div>
  );
}
