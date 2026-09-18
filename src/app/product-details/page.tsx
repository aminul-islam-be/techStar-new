"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Ingredient = {
  name: string;
  function: string;
  amount: string;
};

type ProductDetail = {
  _id: string;
  productId?: string | null;
  productName: string;
  category: string;
  purpose: string;
  benefits: string[];
  howToUse: string;
  suitableFor: string;
  ingredients: Ingredient[];
  safety: string;
  storage: string;
  source: "pdf" | "ai" | "fallback" | "manual";
  generatedAt?: string;
};

export default function ProductDetailsPage() {
  return (
    <Suspense fallback={<ProductDetailsLoadingFallback />}>
      <ProductDetailsContent />
    </Suspense>
  );
}

function ProductDetailsLoadingFallback() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
          <p className="text-sm text-slate-500">
            Loading product details...
          </p>
        </div>
      </div>
    </main>
  );
}

function ProductDetailsContent() {
  const searchParams = useSearchParams();
  const productId = searchParams.get("productId");

  const [details, setDetails] = useState<ProductDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [openId, setOpenId] = useState<string | null>(null);

  // Editing a product's formula (admin action)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRows, setEditRows] = useState<Ingredient[]>([]);
  const [savingFormula, setSavingFormula] = useState(false);
  const [formulaError, setFormulaError] = useState("");

  function startEditFormula(item: ProductDetail) {
    const hasRealIngredients =
      item.source === "manual" ||
      item.source === "pdf" ||
      (item.ingredients.length > 0 &&
        item.ingredients[0].name !== "Ingredient information");

    setEditRows(
      hasRealIngredients && item.ingredients.length > 0
        ? item.ingredients.map((ing) => ({ ...ing }))
        : [{ name: "", function: "", amount: "" }]
    );
    setFormulaError("");
    setEditingId(item._id);
  }

  function cancelEditFormula() {
    setEditingId(null);
    setEditRows([]);
    setFormulaError("");
  }

  function updateEditRow(
    index: number,
    field: keyof Ingredient,
    value: string
  ) {
    setEditRows((current) =>
      current.map((row, i) =>
        i === index ? { ...row, [field]: value } : row
      )
    );
  }

  function addEditRow() {
    setEditRows((current) => [
      ...current,
      { name: "", function: "", amount: "" },
    ]);
  }

  function removeEditRow(index: number) {
    setEditRows((current) =>
      current.length === 1
        ? current
        : current.filter((_, i) => i !== index)
    );
  }

  async function saveFormula(item: ProductDetail) {
    try {
      setSavingFormula(true);
      setFormulaError("");

      const cleanRows = editRows.filter(
        (row) => row.name.trim().length > 0
      );

      const response = await fetch("/api/product-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _id: item.productId || undefined,
          name: item.productName,
          category: item.category,
          description: item.purpose,
          ingredients: cleanRows,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to save the formula."
        );
      }

      setDetails((current) =>
        current.map((d) => (d._id === item._id ? data.detail : d))
      );
      setEditingId(null);
      setEditRows([]);
    } catch (error) {
      setFormulaError(
        error instanceof Error
          ? error.message
          : "Unable to save the formula."
      );
    } finally {
      setSavingFormula(false);
    }
  }

  useEffect(() => {
    loadDetails(productId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function loadDetails(forProductId: string | null) {
    try {
      setLoading(true);

      const url = forProductId
        ? `/api/product-details?productId=${encodeURIComponent(
            forProductId
          )}`
        : "/api/product-details";

      const response = await fetch(url, {
        cache: "no-store",
      });

      const data = await response.json();

      if (data.success) {
        const list: ProductDetail[] = data.details || [];
        setDetails(list);

        // Deep-linked from a product page: jump straight to that
        // product's details instead of leaving every card collapsed.
        if (forProductId && list.length > 0) {
          setOpenId(list[0]._id);
        }
      }
    } catch (error) {
      console.error("Failed to load product details:", error);
    } finally {
      setLoading(false);
    }
  }

  const categories = useMemo(() => {
    const values = details
      .map((item) => item.category)
      .filter(Boolean);

    return ["All", ...Array.from(new Set(values))];
  }, [details]);

  const filteredDetails = useMemo(() => {
    const query = search.trim().toLowerCase();

    return details.filter((item) => {
      const matchesCategory =
        category === "All" || item.category === category;

      if (!matchesCategory) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchable = [
        item.productName,
        item.category,
        item.purpose,
        item.suitableFor,
        item.howToUse,
        ...item.benefits,
        ...item.ingredients.map((x) => x.name),
        ...item.ingredients.map((x) => x.function),
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [details, search, category]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* Header */}
        <section className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 text-white shadow-xl sm:p-8">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm backdrop-blur">
              🤖 TechStar Product Intelligence
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Product Details
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">
              Detailed product information, ingredients, functions,
              quantities, usage and important product notes in one place.
            </p>
          </div>
        </section>

        {/* Deep link banner */}
        {productId && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
            <span>Showing details for this product only.</span>
            <Link
              href="/product-details"
              className="font-semibold text-indigo-700 underline hover:text-indigo-900"
            >
              View all Product Details →
            </Link>
          </div>
        )}

        {/* Search + Filter */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row">

            <div className="flex min-w-0 flex-1">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search product, ingredient or category..."
                className="min-w-0 flex-1 rounded-l-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />

              <button
                type="button"
                onClick={() => setSearch(search.trim())}
                className="rounded-r-xl bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Search
              </button>
            </div>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500"
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Loading */}
        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
            <p className="text-sm text-slate-500">
              Loading product details...
            </p>
          </div>
        )}

        {/* Empty */}
        {!loading && filteredDetails.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <div className="text-4xl">📋</div>

            <h2 className="mt-3 text-lg font-semibold">
              No Product Details Found
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Product details will appear here after they are added.
            </p>
          </div>
        )}

        {/* Products */}
        {!loading && filteredDetails.length > 0 && (
          <div className="space-y-5">

            {filteredDetails.map((item) => {
              const isOpen = openId === item._id;

              return (
                <article
                  key={item._id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                >
                  {/* Product Header */}
                  <button
                    type="button"
                    onClick={() =>
                      setOpenId(isOpen ? null : item._id)
                    }
                    className="flex w-full items-center justify-between gap-4 p-5 text-left sm:p-6"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                          {item.category}
                        </span>

                        {item.source === "ai" && (
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            🤖 AI Generated
                          </span>
                        )}

                        {item.source === "manual" && (
                          <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                            ✍️ Admin Formula
                          </span>
                        )}

                        {item.source === "pdf" && (
                          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                            📄 PDF Formula
                          </span>
                        )}
                      </div>

                      <h2 className="mt-3 truncate text-xl font-bold text-slate-900 sm:text-2xl">
                        {item.productName}
                      </h2>

                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                        {item.purpose}
                      </p>
                    </div>

                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    >
                      ↓
                    </div>
                  </button>

                  {/* Details */}
                  {isOpen && (
                    <div className="border-t border-slate-200 px-5 pb-6 pt-5 sm:px-6">

                      {/* Purpose */}
                      <div className="mb-6 grid gap-4 md:grid-cols-2">

                        <InfoBox
                          title="Purpose"
                          value={item.purpose}
                        />

                        <InfoBox
                          title="Suitable For"
                          value={item.suitableFor}
                        />

                        <InfoBox
                          title="How To Use"
                          value={item.howToUse}
                        />

                        <InfoBox
                          title="Storage"
                          value={item.storage}
                        />
                      </div>

                      {/* Benefits */}
                      {item.benefits.length > 0 && (
                        <section className="mb-6">
                          <h3 className="mb-3 text-lg font-bold">
                            Benefits
                          </h3>

                          <div className="grid gap-2 sm:grid-cols-2">
                            {item.benefits.map((benefit, index) => (
                              <div
                                key={index}
                                className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700"
                              >
                                <span className="mr-2 font-bold text-indigo-600">
                                  ✓
                                </span>
                                {benefit}
                              </div>
                            ))}
                          </div>
                        </section>
                      )}

                      {/* Ingredient Table */}
                      <section className="mb-6">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                          <h3 className="text-lg font-bold">
                            Ingredients / Formula
                          </h3>

                          <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-500">
                              {item.ingredients.length} item
                              {item.ingredients.length !== 1 ? "s" : ""}
                            </span>

                            {editingId !== item._id && (
                              <button
                                type="button"
                                onClick={() => startEditFormula(item)}
                                className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                              >
                                ✏️ Edit Formula
                              </button>
                            )}
                          </div>
                        </div>

                        {editingId === item._id ? (
                          <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
                            <p className="mb-3 text-xs leading-5 text-slate-600">
                              Enter the real formula here. This is saved
                              exactly as typed — nothing is generated or
                              guessed. Leave a row blank and it will be
                              dropped when you save.
                            </p>

                            <div className="space-y-2">
                              {editRows.map((row, index) => (
                                <div
                                  key={index}
                                  className="grid grid-cols-1 gap-2 sm:grid-cols-[1.4fr_1.4fr_1fr_auto]"
                                >
                                  <input
                                    value={row.name}
                                    onChange={(e) =>
                                      updateEditRow(
                                        index,
                                        "name",
                                        e.target.value
                                      )
                                    }
                                    placeholder="Ingredient name"
                                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                                  />

                                  <input
                                    value={row.function}
                                    onChange={(e) =>
                                      updateEditRow(
                                        index,
                                        "function",
                                        e.target.value
                                      )
                                    }
                                    placeholder="Function"
                                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                                  />

                                  <input
                                    value={row.amount}
                                    onChange={(e) =>
                                      updateEditRow(
                                        index,
                                        "amount",
                                        e.target.value
                                      )
                                    }
                                    placeholder="Amount"
                                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                                  />

                                  <button
                                    type="button"
                                    onClick={() => removeEditRow(index)}
                                    disabled={editRows.length === 1}
                                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-red-600 disabled:opacity-40"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>

                            <button
                              type="button"
                              onClick={addEditRow}
                              className="mt-3 rounded-lg border border-dashed border-slate-400 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white"
                            >
                              ➕ Add Row
                            </button>

                            {formulaError && (
                              <p className="mt-3 text-xs font-semibold text-red-600">
                                {formulaError}
                              </p>
                            )}

                            <div className="mt-4 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => saveFormula(item)}
                                disabled={savingFormula}
                                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                              >
                                {savingFormula
                                  ? "Saving..."
                                  : "💾 Save Formula"}
                              </button>

                              <button
                                type="button"
                                onClick={cancelEditFormula}
                                disabled={savingFormula}
                                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <table className="w-full min-w-[650px] border-collapse text-sm">
                              <thead>
                                <tr className="bg-slate-900 text-white">
                                  <th className="px-4 py-3 text-left font-semibold">
                                    #
                                  </th>
                                  <th className="px-4 py-3 text-left font-semibold">
                                    Ingredient
                                  </th>
                                  <th className="px-4 py-3 text-left font-semibold">
                                    Function
                                  </th>
                                  <th className="px-4 py-3 text-right font-semibold">
                                    Amount
                                  </th>
                                </tr>
                              </thead>

                              <tbody>
                                {item.ingredients.map(
                                  (ingredient, index) => (
                                    <tr
                                      key={`${ingredient.name}-${index}`}
                                      className={
                                        index % 2 === 0
                                          ? "bg-white"
                                          : "bg-slate-50"
                                      }
                                    >
                                      <td className="border-t border-slate-200 px-4 py-3 text-slate-500">
                                        {index + 1}
                                      </td>

                                      <td className="border-t border-slate-200 px-4 py-3 font-medium text-slate-900">
                                        {ingredient.name}
                                      </td>

                                      <td className="border-t border-slate-200 px-4 py-3 text-slate-600">
                                        {ingredient.function}
                                      </td>

                                      <td className="border-t border-slate-200 px-4 py-3 text-right font-semibold text-indigo-700">
                                        {ingredient.amount}
                                      </td>
                                    </tr>
                                  )
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </section>

                      {/* Safety */}
                      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <h3 className="font-bold text-amber-900">
                          ⚠ Safety Information
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-amber-800">
                          {item.safety}
                        </p>
                      </section>

                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {/* Footer note */}
        <div className="mt-8 rounded-xl bg-slate-100 p-4 text-center text-xs leading-5 text-slate-500">
          Formula quantities shown for PDF-based products are reproduced
          from the supplied TechStar cosmetics formula document.
          They should be treated as illustrative formulation information,
          not as a guaranteed commercial manufacturing specification.
        </div>
      </div>
    </main>
  );
}

function InfoBox({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        {value || "Not provided"}
      </p>
    </div>
  );
}
