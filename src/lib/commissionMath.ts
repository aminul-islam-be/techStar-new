/**
 * Pure money / date rules for COD commission billing. No database in here, so
 * every rule can be tested on its own.
 *
 *  due    = commission the vendor still owes TechStar
 *  credit = advance money the vendor already paid (used up by future commission)
 */

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

type Balance = { due: number; credit: number };

/** A COD order was delivered: vendor owes `commission`. Advance credit is used first. */
export function computeAccrual(b: Balance, commission: number): Balance & { creditUsed: number } {
  const creditUsed = Math.min(b.credit, commission);
  return {
    due: round2(b.due + commission - creditUsed),
    credit: round2(b.credit - creditUsed),
    creditUsed: round2(creditUsed),
  };
}

/** A delivered COD order was returned/cancelled: the commission is taken back. */
export function computeReversal(b: Balance, commission: number): Balance {
  const cutFromDue = Math.min(b.due, commission);
  return {
    due: round2(b.due - cutFromDue),
    credit: round2(b.credit + (commission - cutFromDue)), // already paid -> becomes advance credit
  };
}

/** Vendor paid `amount`: clears the due first, anything extra becomes advance credit. */
export function computePayment(b: Balance, amount: number): Balance & { appliedToDue: number; addedToCredit: number } {
  const appliedToDue = Math.min(b.due, amount);
  const addedToCredit = amount - appliedToDue;
  return {
    due: round2(b.due - appliedToDue),
    credit: round2(b.credit + addedToCredit),
    appliedToDue: round2(appliedToDue),
    addedToCredit: round2(addedToCredit),
  };
}

/** Bangladesh time (UTC+6, no daylight saving). */
export function dhakaDate(now: Date = new Date()) {
  const d = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  return { year: y, monthNumber: m, day: d.getUTCDate(), month: `${y}-${String(m).padStart(2, "0")}` };
}

/**
 * Should the "lock vendors with unpaid commission" job do its work now?
 *  - first ever run: only remember the month (nobody can owe "last month" yet)
 *  - otherwise: once per month, on lock day (1st + grace days) or later (catches a missed run)
 */
export function lockDecision(opts: {
  now?: Date;
  graceDays: number;
  lastRunMonth?: string | null;
}): "initialize" | "lock" | "skip" {
  const t = dhakaDate(opts.now);
  if (!opts.lastRunMonth) return "initialize";
  if (opts.lastRunMonth === t.month) return "skip";
  return t.day >= 1 + Math.max(0, Math.floor(opts.graceDays)) ? "lock" : "skip";
}

/** The date text shown to vendors, e.g. "1 November". */
export function nextLockDateLabel(graceDays: number, now: Date = new Date()) {
  const t = dhakaDate(now);
  const lockDay = 1 + Math.max(0, Math.floor(graceDays));
  let y = t.year;
  let m = t.monthNumber;
  if (t.day >= lockDay) {
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  const names = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `${lockDay} ${names[m - 1]} ${y}`;
}
