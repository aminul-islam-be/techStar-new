import ChatConversation from "@/models/ChatConversation";
import ChatMessage from "@/models/ChatMessage";
import Vendor from "@/models/Vendor";
import { findContactInfo, CONTACT_BLOCK_MESSAGE } from "@/lib/chatFilter";

export const MAX_CHAT_LENGTH = 500;
const MAX_MESSAGES_PER_MINUTE = 12;
const LOCK_AFTER_VENDOR_VIOLATIONS = 3;

type Sender = "customer" | "vendor" | "admin";

// One flat shape (instead of a union) so every caller can read the same fields.
type SendResult = {
  ok: boolean;
  status?: number;
  error?: string;
  blocked?: boolean;
  locked?: boolean;
  message?: { _id: string; sender: Sender; text: string; createdAt: Date };
};

/**
 * The ONLY way a chat message is stored. Every check lives here, so the
 * customer, vendor, admin and any future entry point behave the same.
 *
 * Two kinds of chat:
 *  - vendor chat  (customer <-> vendor): contact details are blocked, 3 strikes lock it
 *  - TechStar chat (customer <-> admin): no vendor to protect against, so no contact filter
 */
export async function postChatMessage(conversationId: string, sender: Sender, rawText: string): Promise<SendResult> {
  const text = String(rawText || "").replace(/\n{3,}/g, "\n\n").trim();

  if (!text) return { ok: false, status: 400, error: "Write a message first." };
  if (text.length > MAX_CHAT_LENGTH) {
    return { ok: false, status: 400, error: `Message is too long (max ${MAX_CHAT_LENGTH} characters).` };
  }

  const conv = await ChatConversation.findById(conversationId);
  if (!conv) return { ok: false, status: 404, error: "Conversation not found." };

  const platform = Boolean(conv.isPlatform);

  // who may speak in which chat
  if (sender === "admin" && !platform) {
    return { ok: false, status: 403, error: "The admin can only reply in support chats." };
  }
  if (sender === "vendor" && platform) {
    return { ok: false, status: 403, error: "Not allowed." };
  }
  if (sender === "vendor" && conv.locked) {
    return { ok: false, status: 403, error: "This chat is locked by support.", locked: true };
  }

  // anti-spam
  const since = new Date(Date.now() - 60 * 1000);
  const recentCount = await ChatMessage.countDocuments({ conversationId: conv._id, sender, createdAt: { $gte: since } });
  if (recentCount >= MAX_MESSAGES_PER_MINUTE) {
    return { ok: false, status: 429, error: "You are sending messages too fast. Please wait a moment." };
  }

  if (!platform) {
    // the sender's last messages: a phone number can't be smuggled out in pieces
    const previous = await ChatMessage.find({
      conversationId: conv._id,
      sender,
      blocked: { $ne: true },
      createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) },
    })
      .sort({ createdAt: -1 })
      .limit(2)
      .lean();

    const reason = findContactInfo(text, "chat", previous.reverse().map((m) => m.text));

    if (reason) {
      // keep the attempt for the admin, never show it to the other person
      await ChatMessage.create({ conversationId: conv._id, sender, text, blocked: true, blockReason: reason });

      const field = sender === "vendor" ? "violationsVendor" : "violationsCustomer";
      const updated = await ChatConversation.findByIdAndUpdate(
        conv._id,
        { $inc: { [field]: 1 } },
        { returnDocument: "after" }
      );

      let locked = false;
      if (sender === "vendor") {
        await Vendor.updateOne({ _id: conv.vendorId }, { $inc: { chatViolations: 1 } });
        if (updated && updated.violationsVendor >= LOCK_AFTER_VENDOR_VIOLATIONS && !updated.locked) {
          await ChatConversation.updateOne({ _id: conv._id }, { $set: { locked: true } });
          locked = true;
        }
      }

      return {
        ok: false,
        status: 422,
        blocked: true,
        locked,
        error: locked
          ? "This chat has been locked because contact details were shared repeatedly. Our support team will review it."
          : CONTACT_BLOCK_MESSAGE,
      };
    }
  }

  const message = await ChatMessage.create({ conversationId: conv._id, sender, text });

  await ChatConversation.updateOne(
    { _id: conv._id },
    {
      $set: { lastMessageAt: message.createdAt, lastMessageText: text.slice(0, 80) },
      // customer writes -> vendor (or admin) has something unread; vendor/admin writes -> customer does
      $inc: sender === "customer" ? { unreadVendor: 1 } : { unreadCustomer: 1 },
    }
  );

  return {
    ok: true,
    message: { _id: String(message._id), sender, text, createdAt: message.createdAt },
  };
}
