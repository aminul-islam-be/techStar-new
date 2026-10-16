import { SEARCH_SYNONYMS } from "@/lib/searchSynonyms";

// The fields a search text is compared with.
const SEARCH_FIELDS = ["name", "category", "brand", "sku", "description"];

const MAX_QUERY_LENGTH = 80;
const MAX_WORDS = 6;

// Zero-width joiners and the byte-order mark are invisible but break a match.
// Bangla typing often adds them. They are written as numbers, so that no
// invisible character sits in this file.
const INVISIBLE_CODES = [0x200b, 0x200c, 0x200d, 0xfeff];

// Spaces, dashes, dots and underscores do not matter: "T-Shirt", "t shirt"
// and "tshirt" are the same search.
const SEPARATORS = /[\s\-_.]+/g;

// Anything other than a letter, a digit, a Bangla character or - _ . ends a word,
// so "Phone & Tablet" is two words.
const WORD_BREAK = /[^a-zA-Z0-9ঀ-৿\-_.]+/;

// A separator may sit between any two letters of a word.
const BETWEEN_LETTERS = "[\\s\\-_.]*";

// folded word -> the whole line of synonyms it belongs to
const synonymGroups = new Map<string, string[]>();
for (const group of SEARCH_SYNONYMS) {
  for (const word of group) {
    const key = foldWord(word);
    if (!synonymGroups.has(key)) {
      synonymGroups.set(key, group);
    }
  }
}

function stripInvisible(text: string): string {
  return Array.from(text)
    .filter((ch) => !INVISIBLE_CODES.includes(ch.charCodeAt(0)))
    .join("");
}

export function cleanSearchQuery(raw: unknown): string {
  return stripInvisible(String(raw ?? "").normalize("NFC"))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_QUERY_LENGTH);
}

// "T-Shirt", "t shirt" and "tshirt" all become "tshirt".
export function foldWord(text: string): string {
  return stripInvisible(text.normalize("NFC"))
    .replace(SEPARATORS, "")
    .toLowerCase();
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// The letters of a word in order, with separators allowed between them.
function looseRegex(word: string): string {
  return Array.from(foldWord(word)).map(escapeRegex).join(BETWEEN_LETTERS);
}

// A short English synonym such as "tel" or "tar" must be a whole word,
// so the synonym "tel" does not find "Hotel".
function synonymRegex(word: string): string {
  const folded = foldWord(word);
  const core = looseRegex(word);

  if (folded.length <= 4 && /^[a-z0-9]+$/.test(folded)) {
    return `(^|[^a-z0-9])${core}([^a-z0-9]|$)`;
  }

  return core;
}

// One search word: it matches the word itself (anywhere in the text),
// or any word that means the same thing.
function wordClause(word: string): Record<string, unknown> {
  const group = synonymGroups.get(foldWord(word)) || [];
  const patterns = [looseRegex(word)];
  const seen = new Set<string>([foldWord(word)]);

  for (const other of group) {
    const key = foldWord(other);

    if (key && !seen.has(key)) {
      seen.add(key);
      patterns.push(synonymRegex(other));
    }
  }

  const conditions: Record<string, unknown>[] = [];

  for (const pattern of patterns) {
    for (const field of SEARCH_FIELDS) {
      conditions.push({ [field]: { $regex: pattern, $options: "i" } });
    }
  }

  return { $or: conditions };
}

// Used when only punctuation was typed: search for it exactly as it is.
function literalClause(text: string): Record<string, unknown> {
  return {
    $or: SEARCH_FIELDS.map((field) => ({
      [field]: { $regex: escapeRegex(text), $options: "i" },
    })),
  };
}

// The conditions for Mongo's $and: every word of the search must match.
// A phrase from the synonym list ("t shirt") counts as one word.
export function searchClauses(raw: unknown): Record<string, unknown>[] {
  const query = cleanSearchQuery(raw);

  if (!query) return [];

  if (synonymGroups.has(foldWord(query))) {
    return [wordClause(query)];
  }

  const words = query
    .split(WORD_BREAK)
    .filter((word) => foldWord(word) !== "")
    .slice(0, MAX_WORDS);

  if (words.length === 0) {
    return [literalClause(query)];
  }

  return words.map((word) => wordClause(word));
}
