// Admin sections a moderator can be given. The "admin" role always has every section.
export const ADMIN_SECTIONS = [
  "orders",
  "requests",
  "products",
  "reviews",
  "chats",
  "coupons",
  "banners",
  "notifications",
  "users",
  "analytics",
  "pricing",
  "commission",
  "marketplace",
  "site-settings",
] as const;

export type AdminSection = (typeof ADMIN_SECTIONS)[number];

export const SECTION_LABELS: Record<AdminSection, string> = {
  orders: "Orders",
  requests: "Order requests",
  products: "Products",
  reviews: "Reviews",
  chats: "Chats",
  coupons: "Coupons",
  banners: "Banners",
  notifications: "Notifications",
  users: "Users",
  analytics: "Analytics",
  pricing: "Pricing",
  commission: "Commission",
  marketplace: "Marketplace",
  "site-settings": "Website settings",
};

export function isAdminSection(value: unknown): value is AdminSection {
  return typeof value === "string" && (ADMIN_SECTIONS as readonly string[]).includes(value);
}
