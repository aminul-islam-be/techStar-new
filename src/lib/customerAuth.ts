export type CustomerUser = {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  role: "customer" | "admin";
};

const USER_KEY = "techstar_user";

export function saveCustomerUser(user: CustomerUser) {
  if (typeof window === "undefined") return;

  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getCustomerUser(): CustomerUser | null {
  if (typeof window === "undefined") return null;

  try {
    const value = localStorage.getItem(USER_KEY);

    if (!value) return null;

    return JSON.parse(value) as CustomerUser;
  } catch {
    return null;
  }
}

export function getCustomerUserId(): string {
  return getCustomerUser()?.id || "";
}

export function logoutCustomer() {
  if (typeof window === "undefined") return;

  localStorage.removeItem(USER_KEY);
}

