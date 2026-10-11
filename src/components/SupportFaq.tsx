"use client";

import { useLanguage } from "@/lib/language";

// Policies below match the code: cancel while Pending/Confirmed, 7-day return window,
// courier charge not refunded, cart kept after a failed payment.
const FAQ = [
  {
    q: ["How do I place an order?", "অর্ডার কীভাবে করব?"],
    a: [
      "Add the product to your cart, open Checkout, fill in your delivery address and choose Online payment (bKash, Nagad, Rocket or card) or Cash on Delivery.",
      "পণ্যটি কার্টে যোগ করুন, Checkout-এ গিয়ে ডেলিভারি ঠিকানা দিন, তারপর অনলাইন পেমেন্ট (bKash, Nagad, Rocket বা কার্ড) অথবা ক্যাশ অন ডেলিভারি বেছে নিন।",
    ],
  },
  {
    q: ["How much is the delivery charge?", "ডেলিভারি চার্জ কত?"],
    a: [
      "The courier charge is shown at checkout. Every product is sent as its own parcel, so each product has its own charge, inside or outside Dhaka division.",
      "কুরিয়ার চার্জ Checkout-এ দেখানো হয়। প্রতিটি পণ্য আলাদা পার্সেল হিসেবে যায়, তাই ঢাকা বিভাগের ভেতরে বা বাইরে প্রতি পণ্যের আলাদা চার্জ লাগে।",
    ],
  },
  {
    q: ["How do I track my order?", "অর্ডারের অবস্থা কীভাবে দেখব?"],
    a: [
      "Open Track Order and enter your Order ID, or see all your orders in My Orders.",
      "Track Order পেজে Order ID লিখুন, অথবা My Orders-এ আপনার সব অর্ডার দেখুন।",
    ],
  },
  {
    q: ["Can I cancel my order?", "অর্ডার বাতিল করা যাবে?"],
    a: [
      "Yes, from My Orders while the order is Pending or Confirmed. Once it is being prepared or shipped, it can no longer be cancelled.",
      "হ্যাঁ, My Orders থেকে, অর্ডার Pending বা Confirmed থাকা পর্যন্ত। প্যাকিং বা শিপিং শুরু হলে আর বাতিল করা যায় না।",
    ],
  },
  {
    q: ["What is the return and refund policy?", "ফেরত ও রিফান্ড নীতি কী?"],
    a: [
      "After delivery you have 7 days to ask for a return, refund or exchange from My Orders. Only the product price is refunded. The courier charge is not refunded. Online refunds are paid by our team after checking.",
      "ডেলিভারির পর ৭ দিনের মধ্যে My Orders থেকে রিটার্ন, রিফান্ড বা এক্সচেঞ্জের অনুরোধ করা যাবে। শুধু পণ্যের মূল্য ফেরত দেওয়া হয়, কুরিয়ার চার্জ ফেরতযোগ্য নয়। অনলাইন পেমেন্টের রিফান্ড যাচাইয়ের পর আমাদের টিম দেয়।",
    ],
  },
  {
    q: ["My payment failed or was cancelled. What now?", "পেমেন্ট ব্যর্থ বা বাতিল হলে কী করব?"],
    a: [
      "Your cart is kept, so you can try again from Checkout. If money was deducted but the order still shows unpaid, contact support with your Order ID.",
      "আপনার কার্ট সংরক্ষিত থাকে, Checkout থেকে আবার চেষ্টা করতে পারবেন। টাকা কাটা হলে কিন্তু অর্ডার অপরিশোধিত দেখালে Order ID সহ সাপোর্টে যোগাযোগ করুন।",
    ],
  },
  {
    q: ["Is online payment safe?", "অনলাইন পেমেন্ট কি নিরাপদ?"],
    a: [
      "Yes. You pay on the secure SSLCommerz payment page. Your card or mobile wallet details are not stored on this website.",
      "হ্যাঁ। আপনি নিরাপদ SSLCommerz পেমেন্ট পেজে পেমেন্ট করেন। আপনার কার্ড বা মোবাইল ওয়ালেটের তথ্য এই ওয়েবসাইটে সংরক্ষণ করা হয় না।",
    ],
  },
  {
    q: ["How do I make a complaint?", "অভিযোগ কীভাবে জানাব?"],
    a: [
      "Email or call us using the contact details above. Write your Order ID and describe the problem. If the product is damaged, add photos.",
      "উপরের ইমেইল বা ফোন নম্বরে যোগাযোগ করুন। Order ID ও সমস্যার বিবরণ লিখুন। পণ্য ক্ষতিগ্রস্ত হলে ছবি যুক্ত করুন।",
    ],
  },
];

export default function SupportFaq() {
  const { language } = useLanguage();
  const i = language === "bn" ? 1 : 0;

  return (
    <div className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      {FAQ.map((item) => (
        <details key={item.q[0]} className="group p-4">
          <summary className="cursor-pointer list-none text-sm font-semibold text-white">
            {item.q[i]}
          </summary>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.a[i]}</p>
        </details>
      ))}
    </div>
  );
}
