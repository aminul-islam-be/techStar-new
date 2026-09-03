"use client";

import { useEffect, useState } from "react";

export type SortOrder = "" | "low" | "high";

type FilterSortModalProps = {
  open: boolean;
  onClose: () => void;
  categories: string[];
  sortOrder: SortOrder;
  selectedCategory: string;
  onApply: (sortOrder: SortOrder, category: string) => void;
};

export default function FilterSortModal({
  open,
  onClose,
  categories,
  sortOrder,
  selectedCategory,
  onApply,
}: FilterSortModalProps) {
  const [draftSort, setDraftSort] = useState<SortOrder>(sortOrder);
  const [draftCategory, setDraftCategory] =
    useState(selectedCategory);

  useEffect(() => {
    if (open) {
      setDraftSort(sortOrder);
      setDraftCategory(selectedCategory);
    }
  }, [open, sortOrder, selectedCategory]);

  useEffect(() => {
    if (!open) return;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function handleApply() {
    onApply(draftSort, draftCategory);
    onClose();
  }

  function handleReset() {
    setDraftSort("");
    setDraftCategory("all");
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
          {/* Handle */}
          <div className="flex justify-center pt-3">
            <div className="h-1.5 w-10 rounded-full bg-white/15" />
          </div>

          {/* Header */}
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
            {/* Sort by price */}
            <div className="mb-2 text-[11px] font-bold tracking-[0.15em] text-slate-500">
              SORT BY PRICE
            </div>

            <div className="mb-6 grid grid-cols-2 gap-3">
              <button
                onClick={() =>
                  setDraftSort((current) =>
                    current === "low" ? "" : "low"
                  )
                }
                className={`rounded-xl border px-4 py-3 text-sm font-bold transition ${
                  draftSort === "low"
                    ? "border-blue-500/40 bg-blue-500/15 text-blue-300"
                    : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
                }`}
              >
                Low to High
              </button>

              <button
                onClick={() =>
                  setDraftSort((current) =>
                    current === "high" ? "" : "high"
                  )
                }
                className={`rounded-xl border px-4 py-3 text-sm font-bold transition ${
                  draftSort === "high"
                    ? "border-blue-500/40 bg-blue-500/15 text-blue-300"
                    : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
                }`}
              >
                High to Low
              </button>
            </div>

            {/* Categories */}
            <div className="mb-2 text-[11px] font-bold tracking-[0.15em] text-slate-500">
              CATEGORIES
            </div>

            <div className="mb-2 flex flex-wrap gap-2">
              <button
                onClick={() => setDraftCategory("all")}
                className={`rounded-full border px-4 py-2 text-xs font-bold transition ${
                  draftCategory === "all"
                    ? "border-blue-500/50 bg-blue-500/15 text-blue-300"
                    : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
                }`}
              >
                All
              </button>

              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setDraftCategory(category)}
                  className={`rounded-full border px-4 py-2 text-xs font-bold transition ${
                    draftCategory === category
                      ? "border-blue-500/50 bg-blue-500/15 text-blue-300"
                      : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 border-t border-white/10 px-5 py-4">
            <button
              onClick={handleReset}
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
