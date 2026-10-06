import { DISTRICTS } from "@/lib/bdDistricts";

export const ADDRESS_TITLES = ["Home", "Office", "Other"] as const;
export const MAX_ADDRESSES = 10;

type AddressLike = {
  _id: unknown;
  title: string;
  name: string;
  phone: string;
  address: string;
  area?: string;
  city: string;
  division: string;
  country?: string;
  isDefault: boolean;
};

/** Cleans + validates what the browser sent. Returns { error } or { data }. */
export function cleanAddressBody(body: Record<string, unknown>) {
  const title =
    ADDRESS_TITLES.find((t) => t === String(body.title || "").trim()) ?? "Home";
  const name = String(body.name || "").trim().slice(0, 80);
  const phone = String(body.phone || "").trim().slice(0, 20);
  const address = String(body.address || "").trim().slice(0, 250);
  const area = String(body.area || "").trim().slice(0, 80);
  const cityInput = String(body.city || "").trim().toLowerCase();
  const district = DISTRICTS.find((d) => d.name.toLowerCase() === cityInput);

  if (name.length < 2) {
    return { error: "Please enter the receiver's name." };
  }

  const digits = phone.replace(/\D/g, "");

  if (digits.length < 10 || digits.length > 15) {
    return { error: "Please enter a valid phone number." };
  }

  if (!district) {
    return { error: "Please select a district." };
  }

  if (address.length < 5) {
    return { error: "Please enter the full address (house, road, area)." };
  }

  return {
    data: {
      title,
      name,
      phone,
      address,
      area,
      city: district.name,
      division: district.division,
      country: "Bangladesh",
    },
  };
}

export function addressDto(a: AddressLike) {
  return {
    _id: String(a._id),
    title: a.title,
    name: a.name,
    phone: a.phone,
    address: a.address,
    area: a.area || "",
    city: a.city,
    division: a.division,
    country: a.country || "Bangladesh",
    isDefault: Boolean(a.isDefault),
  };
}
