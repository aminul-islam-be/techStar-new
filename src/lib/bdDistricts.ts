/** Bangladesh: 64 districts in 8 divisions. Used by the checkout and for the courier zone. */

export const DIVISIONS = ["Dhaka", "Chattogram", "Rajshahi", "Khulna", "Barishal", "Sylhet", "Rangpur", "Mymensingh"] as const;

const BY_DIVISION: Record<(typeof DIVISIONS)[number], string[]> = {
  Dhaka: ["Dhaka", "Faridpur", "Gazipur", "Gopalganj", "Kishoreganj", "Madaripur", "Manikganj", "Munshiganj", "Narayanganj", "Narsingdi", "Rajbari", "Shariatpur", "Tangail"],
  Chattogram: ["Bandarban", "Brahmanbaria", "Chandpur", "Chattogram", "Cumilla", "Cox's Bazar", "Feni", "Khagrachari", "Lakshmipur", "Noakhali", "Rangamati"],
  Rajshahi: ["Bogura", "Joypurhat", "Naogaon", "Natore", "Chapainawabganj", "Pabna", "Rajshahi", "Sirajganj"],
  Khulna: ["Bagerhat", "Chuadanga", "Jashore", "Jhenaidah", "Khulna", "Kushtia", "Magura", "Meherpur", "Narail", "Satkhira"],
  Barishal: ["Barguna", "Barishal", "Bhola", "Jhalokati", "Patuakhali", "Pirojpur"],
  Sylhet: ["Habiganj", "Moulvibazar", "Sunamganj", "Sylhet"],
  Rangpur: ["Dinajpur", "Gaibandha", "Kurigram", "Lalmonirhat", "Nilphamari", "Panchagarh", "Rangpur", "Thakurgaon"],
  Mymensingh: ["Jamalpur", "Mymensingh", "Netrokona", "Sherpur"],
};

export const DISTRICTS = DIVISIONS.flatMap((division) => BY_DIVISION[division].map((name) => ({ name, division })));

// the 13 districts of Dhaka Division, in English and Bangla, plus common spellings
const DHAKA_DIVISION_WORDS = [
  ...BY_DIVISION.Dhaka.map((n) => n.toLowerCase()),
  "narayangonj", "narshingdi", "narsinghdi", "munshiganj", "manikgonj", "gazipur", "tangail", "faridpur",
  "ঢাকা", "ফরিদপুর", "গাজীপুর", "গোপালগঞ্জ", "কিশোরগঞ্জ", "মাদারীপুর", "মানিকগঞ্জ", "মুন্সীগঞ্জ", "মুন্সিগঞ্জ",
  "নারায়ণগঞ্জ", "নরসিংদী", "রাজবাড়ী", "শরীয়তপুর", "টাঙ্গাইল",
];

/** true when the district / city text belongs to Dhaka Division (anything else counts as outside). */
export function isDhakaDivision(city: string | undefined | null) {
  const text = String(city || "").toLowerCase();
  if (!text.trim()) return false;
  return DHAKA_DIVISION_WORDS.some((w) => text.includes(w));
}
