"use client";

import { useParams } from "next/navigation";
import ChatThread from "@/components/ChatThread";

export default function VendorChatPage() {
  const { id } = useParams<{ id: string }>();
  return <ChatThread endpoint={`/api/vendor/chats/${id}`} role="vendor" backHref="/vendor/messages" />;
}
