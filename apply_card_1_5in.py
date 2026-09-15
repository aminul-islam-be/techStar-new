import pathlib

path = pathlib.Path("src/app/page.tsx")
text = path.read_text()

old = '''                  className="group cursor-pointer pl-[4mm] pr-[calc(1.25rem+2cm)] pt-[2mm] pb-[4mm] sm:pl-[4mm] sm:pr-[calc(1.5rem+2cm)] sm:pt-[2mm] sm:pb-[4mm]"
                >
                  <div className="mb-1 line-clamp-1 text-xs leading-tight text-slate-500">
                    {product.category}
                    {product.description && (
                      <> / {product.description}</>
                    )}
                  </div>

                  <h3 className="mb-5 line-clamp-2 text-sm font-bold leading-snug text-blue-700 sm:mb-6 sm:text-base">
                    {product.name}
                  </h3>

                  <div className="relative mb-8 flex h-[calc(14rem+1.5cm+10mm+2cm)] items-center justify-start sm:mb-10 sm:h-[calc(16rem+1.5cm+10mm+2cm)]">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="h-full w-full object-contain object-left transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="text-5xl">⚡</div>
                    )}

                    <button
                      onClick={(event) =>
                        toggleWishlist(product, event)
                      }
                      disabled={wishlistBusyId === product._id}
                      aria-label="Toggle wishlist"
                      className="absolute right-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-sm shadow-sm transition hover:scale-110 disabled:opacity-60"
                    >
                      {wishlistIds.has(product._id) ? "💗" : "🤍"}
                    </button>

                    {product.compareAtPrice &&
                      product.compareAtPrice > product.price && (
                        <span className="absolute bottom-0 left-0 rounded-md bg-[#3fae29] px-4 py-2 text-sm font-bold text-white shadow">
                          {t("home.promotion")}
                        </span>
                      )}
                  </div>

                  {product.compareAtPrice &&
                  product.compareAtPrice > product.price ? (
                    <div className="flex flex-col">
                      <span className="text-sm text-slate-400 line-through">
                        {format(product.compareAtPrice)}
                      </span>
                      <span className="text-xl font-extrabold text-red-600 sm:text-2xl">
                        {format(product.price)}
                      </span>
                    </div>
                  ) : (
                    <div className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                      {format(product.price)}
                    </div>
                  )}
                </article>'''

new = '''                  className="group flex h-[1.5in] cursor-pointer flex-col overflow-hidden pb-[4mm] pl-[4mm] pr-[calc(1.25rem+2cm)] pt-[2mm] sm:pr-[calc(1.5rem+2cm)]"
                >
                  <div className="line-clamp-1 shrink-0 text-[10px] leading-tight text-slate-500">
                    {product.category}
                    {product.description && (
                      <> / {product.description}</>
                    )}
                  </div>

                  <h3 className="line-clamp-1 shrink-0 text-xs font-bold leading-tight text-blue-700">
                    {product.name}
                  </h3>

                  <div className="relative my-1 flex min-h-0 flex-1 items-center justify-start">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="h-full w-full object-contain object-left transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="text-3xl">⚡</div>
                    )}

                    <button
                      onClick={(event) =>
                        toggleWishlist(product, event)
                      }
                      disabled={wishlistBusyId === product._id}
                      aria-label="Toggle wishlist"
                      className="absolute right-0 top-0 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-xs shadow-sm transition hover:scale-110 disabled:opacity-60"
                    >
                      {wishlistIds.has(product._id) ? "💗" : "🤍"}
                    </button>

                    {product.compareAtPrice &&
                      product.compareAtPrice > product.price && (
                        <span className="absolute bottom-0 left-0 rounded-md bg-[#3fae29] px-2 py-0.5 text-[10px] font-bold text-white shadow">
                          {t("home.promotion")}
                        </span>
                      )}
                  </div>

                  {product.compareAtPrice &&
                  product.compareAtPrice > product.price ? (
                    <div className="shrink-0 flex flex-col leading-tight">
                      <span className="text-[10px] text-slate-400 line-through">
                        {format(product.compareAtPrice)}
                      </span>
                      <span className="text-sm font-extrabold text-red-600">
                        {format(product.price)}
                      </span>
                    </div>
                  ) : (
                    <div className="shrink-0 text-sm font-extrabold text-slate-900">
                      {format(product.price)}
                    </div>
                  )}
                </article>'''

if old not in text:
    raise SystemExit("Pattern not found - file may have changed since last conversation step. Paste the current card section here and I'll adjust.")

text = text.replace(old, new, 1)
path.write_text(text)
print("Patched successfully.")
