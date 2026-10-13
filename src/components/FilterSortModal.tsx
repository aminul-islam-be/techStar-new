"use client";

import { useEffect, useState } from "react";

export type SortOrder = "" | "low" | "high" | "popular";

export type ListingFilters = {
  sort: SortOrder;
  category: string;
  minPrice: string;
  maxPrice: string;
  minRating: number;
  inStockOnly: boolean;
};

type FilterSortModalProps = {
  open: boolean;
  onClose: () => void;
  categories: string[];
  value: ListingFilters;
  onApply: (next: ListingFilters) => void;
};

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "", label: "Newest" },
  { value: "low", label: "Price: Low to High" },
  { value: "high", label: "Price: High to Low" },
  { value: "popular", label: "Most Popular" },
];

const RATING_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Any" },
  { value: 2, label: "2★ & up" },
  { value: 3, label: "3★ & up" },
  { value: 4, label: "4★ & up" },
];

const DEFAULT_FILTERS: ListingFilters = {
  sort: "",
  category: "all",
  minPrice: "",
  maxPrice: "",
  minRating: 0,
  inStockOnly: false,
};

const chipClass = (active: boolean) =>
  `rounded-xl border px-4 py-3 text-sm font-bold transition ${
    active
      ? "border-blue-500/40 bg-blue-500/15 text-blue-300"
      : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
  }`;

const pillClass = (active: boolean) =>
  `rounded-full border px-4 py-2 text-xs font-bold transition ${
    active
      ? "border-blue-500/50 bg-blue-500/15 text-blue-300"
      : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
  }`;

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-blue-500/50";

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="mb-2 text-[11px] font-bold tracking-[0.15em] text-slate-500">
      {children}
    </div>
  );
}

export default function FilterSortModal({
  open,
  onClose,
  categories,
  value,
  onApply,
}: FilterSortModalProps) {
  const [draft, setDraft] = useState<ListingFilters>(value);
  const [wasOpen, setWasOpen] = useState(open);

  // Each time the sheet opens, start the draft from the applied filters.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDraft(value);
  }

  useEffect(() => {
    if (!open) return;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function update<K extends keyof ListingFilters>(
    key: K,
    nextValue: ListingFilters[K]
  ) {
    setDraft((current) => ({ ...current, [key]: nextValue }) as ListingFilters);
  }

  function handleApply() {
    onApply(draft);
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        aria-hidden="true"
      />

      {/* Bottom sheet */}
      <div
        className={`fixed inset-x-0 bottom-0 z-[80] rounded-t-3xl border-t border-white/10 bg-slate-950 shadow-2xl shadow-black/50 transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Filter and sort products"
      >
        <div className="mx-auto flex max-h-[85vh] w-full max-w-2xl flex-col">
          <div className="flex justify-center pt-3">
            <div className="h-1.5 w-10 rounded-full bg-white/15" />
          </div>

          <div className="flex items-center justify-between px-5 pb-4 pt-3">
            <h2 className="text-lg font-extrabold text-white">
              Filter & Sort Products
            </h2>

            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-5">
            <SectionLabel>SORT BY</SectionLabel>
            <div className="mb-6 grid grid-cols-2 gap-3">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.label}
                  onClick={() => update("sort", option.value)}
                  className={chipClass(draft.sort === option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <SectionLabel>PRICE RANGE</SectionLabel>
            <div className="mb-6 grid grid-cols-2 gap-3">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="Min price"
                value={draft.minPrice}
                onChange={(event) => update("minPrice", event.target.value)}
                className={inputClass}
              />
              <input
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="Max price"
                value={draft.maxPrice}
                onChange={(event) => update("maxPrice", event.target.value)}
                className={inputClass}
              />
            </div>

            <SectionLabel>MINIMUM RATING</SectionLabel>
            <div className="mb-6 flex flex-wrap gap-2">
              {RATING_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => update("minRating", option.value)}
                  className={pillClass(draft.minRating === option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <SectionLabel>AVAILABILITY</SectionLabel>
            <div className="mb-6">
              <button
                onClick={() => update("inStockOnly", !draft.inStockOnly)}
                className={chipClass(draft.inStockOnly)}
              >
                In stock only
              </button>
            </div>

            <SectionLabel>CATEGORIES</SectionLabel>
            <div className="mb-2 flex flex-wrap gap-2">
              <button
                onClick={() => update("category", "all")}
                className={pillClass(draft.category === "all")}
              >
                All
              </button>

              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => update("category", category)}
                  className={pillClass(draft.category === category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 border-t border-white/10 px-5 py-4">
            <button
              onClick={() => setDraft(DEFAULT_FILTERS)}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-bold text-slate-300 transition hover:bg-white/[0.08]"
            >
              Reset
            </button>

            <button
              onClick={handleApply}
              className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-500"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
