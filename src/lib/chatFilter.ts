/**
 * Detects phone numbers, e-mails, links, messaging apps and "let's deal outside
 * TechStar" talk. Used for chat messages ("chat" mode) and for vendor shop /
 * product text ("listing" mode, which skips app-name words).
 *
 * It runs on the SERVER, so it cannot be bypassed from the browser.
 */

export const CONTACT_BLOCK_MESSAGE =
  "For your safety, phone numbers, e-mails, links and other contact details are not allowed. Please keep all orders and payments on this website.";

const BANGLA_DIGITS = "০১২৩৪৫৬৭৮৯";

const DIGIT_WORDS: Record<string, string> = {
  zero: "0", oh: "0", one: "1", two: "2", three: "3", four: "4", five: "5",
  six: "6", seven: "7", eight: "8", nine: "9",
  shunno: "0", sunno: "0", ek: "1", dui: "2", tin: "3", char: "4",
  pach: "5", panch: "5", choy: "6", chhoy: "6", shat: "7", saat: "7",
  aat: "8", at: "8", noy: "9", nou: "9",
  "শূন্য": "0", "এক": "1", "দুই": "2", "তিন": "3", "চার": "4",
  "পাঁচ": "5", "ছয়": "6", "সাত": "7", "আট": "8", "নয়": "9",
};

// Bangladeshi mobile numbers: 01[3-9]xxxxxxxx, optionally with +88 / 88 in front
const BD_MOBILE = /(?:\+?88)?01[3-9]\d{8}/;

const CHAT_PATTERNS: RegExp[] = [
  // e-mail and links
  /[a-z0-9._%+-]+\s?(?:@|\(at\)|\[at\])\s?[a-z0-9-]+\s?(?:\.|\(dot\)|\[dot\])\s?[a-z]{2,}/i,
  /\b(?:https?:\/\/|www\.)\S+/i,
  /\b[a-z0-9-]{2,}\.(?:com|net|org|bd|xyz|io|me|co|info|shop|store|link|app|site|online|biz|ly|gl)\b/i,
  /\b(?:wa\.me|t\.me|m\.me|fb\.me|bit\.ly|fb\.com)\b/i,
  // messaging apps and social networks
  /\b(?:whats\s?app|whatsap+|watsapp|wa\.me|imo|telegram|viber|wechat|skype|botim|messenger|insta(?:gram)?|facebook|snapchat|tiktok|gmail|yahoo|hotmail|outlook)\b/i,
  /(?:হোয়াটস\s?অ্যাপ|হোয়াটসঅ্যাপ|ইমো|টেলিগ্রাম|ভাইবার|ফেসবুক|মেসেঞ্জার|ইনস্টাগ্রাম|জিমেইল)/,
  // asking for / giving contact details
  /\b(?:call|ring|text|dm|sms|msg|message|contact|inbox)\s+(?:me|us)\b/i,
  /\b(?:my|your|ur|amar|apnar|tomar)\s+(?:number|num|nombor|nambar|contact|whatsapp|(?:mobile|phone|cell)\s*(?:no|number|num))\b/i,
  /\b(?:phone|mobile|cell|contact|whatsapp)\s*(?:no|number|num|nmbr|nombor)\b/i,
  /\b(?:number|num|nambar|nombor|nmbr|no)\s+(?:den|din|dao|dibo|diben|dien|pathan|pathao|bolen|bolun)\b/i,
  /\b(?:call|phone|fone|ring)\s+(?:dao|din|den|korun|koren|kori|korbo|korben)\b/i,
  /\binbox\b/i,
  /(?:ফোন|মোবাইল)\s?(?:নম্বর|নাম্বার)|(?:নম্বর|নাম্বার)\s?(?:দিন|দাও|দেন|পাঠান)|(?:কল|ফোন)\s?(?:করুন|দিন|দাও|করেন)|ইনবক্স|যোগাযোগ\s?করুন/,
  // dealing outside TechStar
  /\b(?:order|buy|purchase|payment|pay|deal|sell)\s+(?:directly|outside|offline|off[\s-]?site|off[\s-]?platform)\b/i,
  /\b(?:directly|outside)\s+(?:from|with)\s+(?:me|us|seller)\b/i,
  /\b(?:outside|off)\s+(?:the\s+)?(?:site|website|app|platform|techstar)\b/i,
  /\b(?:send|pay)\s+(?:me\s+)?(?:money|taka|advance)\b/i,
  /\b(?:bkash|nagad|rocket|upay)\s+(?:number|num|no)\b/i,
  /\badvance\s+(?:pay|payment|taka|dao|den|din)\b/i,
  /\bwithout\s+(?:the\s+)?commission\b/i,
  /\b(?:amar|my)\s+(?:shop|dokan)\s+(?:e|a)?\s*(?:ashen|asun|aso|come|visit)\b/i,
  /(?:সরাসরি\s?(?:অর্ডার|কিনুন|টাকা)|সাইটের\s?বাইরে|ওয়েবসাইটের\s?বাইরে)/,
];

// Words that are fine in a product description (e.g. "WhatsApp alerts") but not
// in a chat. Everything else in CHAT_PATTERNS is also checked for listings:
// only e-mail, link and phone rules apply there.
const LISTING_PATTERN_COUNT = 4;

function normalize(raw: string) {
  return raw
    .normalize("NFKC")
    .replace(/[\uFE0F\u20E3\u200B-\u200D\u2060]/g, "") // keycap emoji + zero-width tricks
    .replace(/[০-৯]/g, (d) => String(BANGLA_DIGITS.indexOf(d)))
    .toLowerCase();
}

/** digits hidden behind spelled-out numbers, e.g. "zero one nine two ..." */
function digitsFromWords(text: string) {
  const tokens = text.split(/[^a-z0-9\u0980-\u09ff]+/i).filter(Boolean);
  let best = "";
  let run = "";
  let spelled = 0; // how many real number WORDS are in the run (plain digits alone don't count)
  const close = () => {
    if (spelled >= 3 && run.length > best.length) best = run;
    run = "";
    spelled = 0;
  };
  for (const t of tokens) {
    if (DIGIT_WORDS[t] !== undefined) {
      run += DIGIT_WORDS[t];
      spelled++;
    } else if (/^\d+$/.test(t) && run) run += t;
    else close();
  }
  close();
  return best;
}

function hasPhoneNumber(text: string, strictCross = false) {
  // letter "o" typed instead of zero inside a number: "o1922..."
  const fixedO = text.replace(/o(?=[\d\s.\-_]*\d)|(?<=\d[\s.\-_]*)o/g, "0");
  // remove separators that are placed between digits
  const squeezed = fixedO.replace(/(?<=\d)[\s.\-_*/,|:()[\]]+(?=\d)/g, "");

  if (BD_MOBILE.test(squeezed)) return true;
  if (/\+[\d\s.\-()]{9,}/.test(fixedO) && (fixedO.match(/\d/g) || []).length >= 8) return true;
  // long digit runs (foreign numbers etc.); only "-", "." or "_" may sit between digits,
  // so "total 1500 800 200" (spaces) is NOT treated as a phone number
  const longRun = fixedO.replace(/(?<=\d)[.\-_]+(?=\d)/g, "");
  if (new RegExp(`\\d{${strictCross ? 10 : 9},}`).test(longRun)) return true;

  const words = digitsFromWords(text);
  return BD_MOBILE.test(words) || words.length >= 10;
}

/**
 * Returns a short reason code when the text contains contact details, or null.
 * `previous` = the sender's last messages, so a number cannot be split in parts.
 */
export function findContactInfo(
  rawText: string,
  mode: "chat" | "listing" = "chat",
  previous: string[] = []
): string | null {
  const text = normalize(rawText);
  if (!text.trim()) return null;

  if (hasPhoneNumber(text)) return "phone_number";

  const patterns = mode === "chat" ? CHAT_PATTERNS : CHAT_PATTERNS.slice(0, LISTING_PATTERN_COUNT);
  for (const p of patterns) if (p.test(text)) return "contact_or_offsite";

  if (mode === "chat") {
    // "w h a t s a p p", "t.e.l.e.g.r.a.m" and similar spacing tricks
    const squashed = text.replace(/[^a-z\u0980-\u09ff0-9]/g, "");
    if (/(whatsapp|telegram|messenger|instagram|facebook|gmail|hotmail|viber|wechat)/.test(squashed)) {
      return "contact_or_offsite";
    }
    // a number split over several messages
    if (previous.length) {
      const joined = previous.slice(-2).map(normalize).join(" ") + " " + text;
      if (hasPhoneNumber(joined, true)) return "phone_number";
    }
  }
  return null;
}
