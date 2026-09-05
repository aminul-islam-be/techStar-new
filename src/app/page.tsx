"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useCurrency } from "@/lib/useCurrency";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCustomerUserId } from "@/lib/customerAuth";
import LocationCurrencySelector from "@/components/LocationCurrencySelector";
import SideMenu from "@/components/SideMenu";
import FilterSortModal, {
  type SortOrder,
} from "@/components/FilterSortModal";
import BottomNav from "@/components/BottomNav";
import { useLanguage } from "@/lib/language";

type Product = {
  _id: string;
  name: string;
  slug: string;
  category: string;
  description?: string;
  price: number;
  currency?: string;
  image?: string;
  stock: number;
  featured?: boolean;
  active?: boolean;
};

type Banner = {
  _id: string;
  title?: string;
  type: "image" | "video";
  mediaUrl: string;
  linkUrl?: string;
};

import { categories } from "@/lib/categories";

export default function Home() {
  const { format } = useCurrency();
  const router = useRouter();
  const { t, language, toggleLanguage } = useLanguage();

  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const touchStartX = useRef<number | null>(null);

  function handleBannerTouchStart(
    event: React.TouchEvent
  ) {
    touchStartX.current = event.touches[0].clientX;
  }

  function handleBannerTouchEnd(
    event: React.TouchEvent
  ) {
    if (touchStartX.current === null) return;
    if (banners.length <= 1) {
      touchStartX.current = null;
      return;
    }

    const deltaX =
      event.changedTouches[0].clientX -
      touchStartX.current;

    const SWIPE_THRESHOLD = 50;

    if (deltaX > SWIPE_THRESHOLD) {
      setCurrentBanner(
        (current) =>
          (current - 1 + banners.length) %
          banners.length
      );
    } else if (deltaX < -SWIPE_THRESHOLD) {
      setCurrentBanner(
        (current) => (current + 1) % banners.length
      );
    }

    touchStartX.current = null;
  }

  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productError, setProductError] = useState("");
  const [addingId, setAddingId] = useState("");
  const [buyingId, setBuyingId] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [message, setMessage] = useState("");

  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentBanner, setCurrentBanner] = useState(0);

  const [menuOpen, setMenuOpen] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(
    new Set()
  );
  const [wishlistBusyId, setWishlistBusyId] = useState("");

  async function loadBanners() {
    try {
      const response = await fetch("/api/banners", {
        cache: "no-store",
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setBanners(
          Array.isArray(data.banners) ? data.banners : []
        );
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function loadProducts(query = "") {
    try {
      setLoadingProducts(true);
      setProductError("");

      const url = query.trim()
        ? `/api/products?search=${encodeURIComponent(query.trim())}`
        : "/api/products";

      const response = await fetch(url, {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || t("home.unableToLoadProducts")
        );
      }

      setProducts(data.products || []);
    } catch (error) {
      console.error(error);

      setProductError(
        error instanceof Error
          ? error.message
          : t("home.unableToLoadProducts")
      );
    } finally {
      setLoadingProducts(false);
    }
  }

  async function loadCartCount() {
    const userId = getCustomerUserId();

    if (!userId) {
      setCartCount(0);
      return;
    }

    try {
      const response = await fetch("/api/cart", {
        headers: {
          "x-user-id": userId,
        },
        cache: "no-store",
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const count = (data.cart?.items || []).reduce(
          (total: number, item: { quantity: number }) =>
            total + item.quantity,
          0
        );

        setCartCount(count);
      }
    } catch (error) {
      console.error("Cart count error:", error);
    }
  }

  async function loadWishlist() {
    const userId = getCustomerUserId();

    if (!userId) {
      setWishlistIds(new Set());
      return;
    }

    try {
      const response = await fetch("/api/wishlist", {
        headers: {
          "x-user-id": userId,
        },
        cache: "no-store",
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setWishlistIds(
          new Set(
            (data.products || []).map(
              (product: { _id: string }) => product._id
            )
          )
        );
      }
    } catch (error) {
      console.error("Wishlist load error:", error);
    }
  }

  async function toggleWishlist(
    product: Product,
    event: React.MouseEvent
  ) {
    event.stopPropagation();

    const userId = getCustomerUserId();

    if (!userId) {
      router.push("/login");
      return;
    }

    const isSaved = wishlistIds.has(product._id);

    setWishlistBusyId(product._id);

    try {
      if (isSaved) {
        await fetch(
          `/api/wishlist?productId=${product._id}`,
          {
            method: "DELETE",
            headers: { "x-user-id": userId },
          }
        );

        setWishlistIds((prev) => {
          const next = new Set(prev);
          next.delete(product._id);
          return next;
        });
      } else {
        await fetch("/api/wishlist", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": userId,
          },
          body: JSON.stringify({ productId: product._id }),
        });

        setWishlistIds((prev) => {
          const next = new Set(prev);
          next.add(product._id);
          return next;
        });
      }
    } catch (error) {
      console.error("Wishlist toggle error:", error);
    } finally {
      setWishlistBusyId("");
    }
  }

  useEffect(() => {
    const pendingCategory =
      typeof window !== "undefined"
        ? sessionStorage.getItem("techstar_pending_category")
        : null;

    if (pendingCategory) {
      sessionStorage.removeItem("techstar_pending_category");
      setSearch(pendingCategory);
      loadProducts(pendingCategory);

      setTimeout(() => {
        document
          .getElementById("products")
          ?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    } else {
      loadProducts();
    }

    loadCartCount();
    loadWishlist();
    loadBanners();
  }, []);

  async function handleSearch() {
    await loadProducts(search);

    const searcherId = getCustomerUserId();
    if (searcherId && search.trim()) {
      fetch("/api/history/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": searcherId,
        },
        body: JSON.stringify({ query: search.trim() }),
      }).catch(() => {});
    }
  }

  function handleSearchKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Enter") {
      handleSearch();
    }
  }
  useEffect(() => {
    if (banners.length <= 1) return;

    const activeBanner = banners[currentBanner];

    if (activeBanner?.type === "video") return;

    const timer = setInterval(() => {
      setCurrentBanner(
        (current) => (current + 1) % banners.length
      );
    }, 5000);

    return () => clearInterval(timer);
  }, [banners, currentBanner]);

  useEffect(() => {
    const activeBanner = banners[currentBanner];

    if (!activeBanner) return;

    Object.entries(videoRefs.current).forEach(
      ([id, videoEl]) => {
        if (!videoEl) return;

        if (id === activeBanner._id) {
          videoEl.currentTime = 0;
          videoEl.play().catch(() => {});
        } else {
          videoEl.pause();
        }
      }
    );
  }, [currentBanner, banners]);

  async function addToCart(product: Product) {
    const userId = getCustomerUserId();

    if (!userId) {
      window.location.href = "/login";
      return;
    }

    if (product.stock <= 0) {
      setMessage("This product is out of stock.");
      return;
    }

    try {
      setAddingId(product._id);
      setMessage("");

      const response = await fetch("/api/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({
          productId: product._id,
          quantity: 1,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || t("home.unableToAddToCart")
        );
      }

      const count = (data.cart?.items || []).reduce(
        (total: number, item: { quantity: number }) =>
          total + item.quantity,
        0
      );

      setCartCount(count);
      setMessage(`${product.name} added to cart.`);
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : t("home.unableToAddToCart")
      );
    } finally {
      setAddingId("");
    }
  }

  const featuredProducts = useMemo(() => {
    return products.filter((product) => product.featured);
  }, [products]);

  const productCategories = useMemo(() => {
    const unique = new Set(
      products
        .map((product) => product.category?.trim())
        .filter((value): value is string => Boolean(value))
    );
    return Array.from(unique).sort();
  }, [products]);

  const visibleProducts = useMemo(() => {
    let list = [...products];

    if (categoryFilter !== "all") {
      list = list.filter(
        (product) => product.category === categoryFilter
      );
    }

    if (sortOrder === "low") {
      list.sort((a, b) => a.price - b.price);
    } else if (sortOrder === "high") {
      list.sort((a, b) => b.price - a.price);
    }

    return list;
  }, [products, categoryFilter, sortOrder]);

  const activeFilterCount =
    (sortOrder ? 1 : 0) + (categoryFilter !== "all" ? 1 : 0);

  async function buyNow(product: Product) {
    const userId = getCustomerUserId();

    if (!userId) {
      window.location.href = "/login";
      return;
    }

    if (product.stock <= 0) {
      setMessage("This product is out of stock.");
      return;
    }

    try {
      setBuyingId(product._id);
      setMessage("");

      const response = await fetch("/api/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({
          productId: product._id,
          quantity: 1,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || t("home.unableToProcessOrder")
        );
      }

      router.push("/checkout");
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : t("home.unableToProcessOrder")
      );
    } finally {
      setBuyingId("");
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-950 pb-20 text-white sm:pb-0">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-2xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">

          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-black shadow-lg shadow-blue-600/20">
              T
            </div>

            <div>
              <div className="text-[18px] font-extrabold tracking-tight">
                TechStar
              </div>

              <div className="hidden text-[10px] font-medium tracking-[0.18em] text-slate-500 sm:block">
                {t("home.tagline")}
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 text-[14px] font-medium text-slate-400 lg:flex">
            <a
              href="#"
              className="text-white transition hover:text-blue-400"
            >
              {t("nav.home")}
            </a>

            <a
              href="#products"
              className="transition hover:text-white"
            >
              {t("home.navProducts")}
            </a>

            <a
              href="#categories"
              className="transition hover:text-white"
            >
              {t("menu.categories")}
            </a>

            <a
              href="#about"
              className="transition hover:text-white"
            >
              {t("home.navAbout")}
            </a>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <LocationCurrencySelector />

            <button
              onClick={toggleLanguage}
              className="hidden rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.07] hover:text-white sm:block sm:px-3"
            >
              {language === "en" ? "EN" : "বাং"}
            </button>

            <Link
              href="/cart"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-lg transition hover:bg-white/[0.08]"
              aria-label="Shopping Cart"
            >
              🛒

              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-black text-white">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>

            <Link
              href="/login"
              className="ml-1 hidden rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-slate-200 sm:block"
            >
              {t("menu.signIn")}
            </Link>

            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="ml-1 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-lg text-slate-300 transition hover:bg-white/10"
            >
              ☰
            </button>
          </div>
        </div>
      </header>

      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <FilterSortModal
        open={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        categories={productCategories}
        sortOrder={sortOrder}
        selectedCategory={categoryFilter}
        onApply={(nextSort, nextCategory) => {
          setSortOrder(nextSort);
          setCategoryFilter(nextCategory);
        }}
      />
      <section className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute -left-32 top-0 h-[420px] w-[420px] rounded-full bg-blue-600/15 blur-[110px]" />
        <div className="pointer-events-none absolute -right-32 top-20 h-[380px] w-[380px] rounded-full bg-indigo-600/10 blur-[110px]" />

        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 sm:pb-20 sm:pt-20 lg:px-8 lg:pb-24 lg:pt-28">

          <div className="mb-7 flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/15 bg-blue-500/[0.08] px-4 py-2 text-xs font-semibold text-blue-300">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
              {t("home.heroBadge")}
            </div>
          </div>

          <div className="text-center">
            <h1 className="mx-auto max-w-5xl text-[42px] font-black leading-[1.02] tracking-[-0.045em] sm:text-6xl lg:text-7xl xl:text-[82px]">
              {t("home.heroTitleLine1")}
              <span className="block bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent">
                {t("home.heroTitleLine2")}
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base sm:leading-7">
              {t("home.heroSubtitle")}
            </p>
          </div>

          <div className="mx-auto mt-9 max-w-3xl">
            <div className="flex h-[58px] items-stretch rounded-2xl border border-white/10 bg-white/[0.055] p-1.5 shadow-2xl shadow-black/30 backdrop-blur-xl transition focus-within:border-blue-500/40">

              <div className="flex min-w-0 flex-1 items-center">
                <span className="pl-3 pr-2 text-lg text-slate-500">
                  ⌕
                </span>

                <input
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search products..."
                  className="min-w-0 flex-1 bg-transparent px-1 text-sm text-white outline-none placeholder:text-slate-500 sm:text-[15px]"
                />
              </div>

              <button
                onClick={handleSearch}
                className="shrink-0 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 active:scale-[0.98] sm:px-6"
              >
                <span className="hidden sm:inline">
                  {t("home.searchButton")}
                </span>

                <span className="text-base sm:hidden">
                  {"→"}
                </span>
              </button>
            </div>

            <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
              <span>English</span>
              <span>বাংলা</span>
              <span>Banglish</span>
              <span>{t("home.smartSearch")}</span>
            </div>
          </div>

          {search && (
            <p className="mt-4 text-center text-xs text-slate-500">
              {t("home.searchingFor")}{" "}
              <span className="font-semibold text-slate-300">
                “{search}”
              </span>
            </p>
          )}

          <div className="mx-auto mt-12 flex max-w-2xl flex-wrap justify-center gap-x-7 gap-y-3 text-xs text-slate-500">
            <span>{t("home.guestBrowsing")}</span>
            <span>{t("home.secureCheckout")}</span>
            <span>{t("home.globalLanguageSupport")}</span>
          </div>
        </div>
      </section>

      {banners.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
          <div
            onTouchStart={handleBannerTouchStart}
            onTouchEnd={handleBannerTouchEnd}
            className="relative aspect-video w-full touch-pan-y overflow-hidden rounded-3xl border border-white/[0.08] bg-slate-900"
          >
            {banners.map((banner, index) => {
              const isActive = index === currentBanner;

              return (
                <div
                  key={banner._id}
                  className={`absolute inset-0 transition-opacity duration-700 ${
                    isActive
                      ? "opacity-100"
                      : "pointer-events-none opacity-0"
                  }`}
                >
                  {banner.type === "video" ? (
                    <>
                      <video
                        ref={(el) => {
                          videoRefs.current[
                            banner._id
                          ] = el;
                        }}
                        src={banner.mediaUrl}
                        muted
                        controls
                        playsInline
                        onEnded={() =>
                          setCurrentBanner(
                            (current) =>
                              (current + 1) %
                              banners.length
                          )
                        }
                        className="h-full w-full object-cover"
                      />

                      {banner.linkUrl && (
                        <Link
                          href={banner.linkUrl}
                          className="absolute bottom-4 right-4 z-10 rounded-full bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg hover:bg-blue-500"
                        >
                          {`${t("home.learnMore")} →`}
                        </Link>
                      )}
                    </>
                  ) : banner.linkUrl ? (
                    <Link
                      href={banner.linkUrl}
                      className="block h-full w-full"
                    >
                      <img
                        src={banner.mediaUrl}
                        alt={banner.title || "Banner"}
                        className="h-full w-full object-cover"
                      />
                    </Link>
                  ) : (
                    <img
                      src={banner.mediaUrl}
                      alt={banner.title || "Banner"}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
              );
            })}

            {banners.length > 1 && (
              <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
                {banners.map((banner, index) => (
                  <button
                    key={banner._id}
                    onClick={() =>
                      setCurrentBanner(index)
                    }
                    className={`h-2 rounded-full transition-all ${
                      index === currentBanner
                        ? "w-6 bg-white"
                        : "w-2 bg-white/40"
                    }`}
                    aria-label={`Go to banner ${
                      index + 1
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <section
        id="categories"
        className="border-y border-white/[0.07] bg-white/[0.018]"
      >
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">

          <div className="mb-8">
            <div className="mb-2 text-[11px] font-bold tracking-[0.2em] text-blue-400">
              {t("home.exploreLabel")}
            </div>

            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {t("home.shopByCategory")}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map(
              ([icon, name, description]) => (
                <button
                  key={name}
                  onClick={() => {
                    setSearch(name);
                    loadProducts(name);
                    document
                      .getElementById("products")
                      ?.scrollIntoView({
                        behavior: "smooth",
                      });
                  }}
                  className="group rounded-2xl border border-white/[0.08] bg-slate-900/70 p-4 text-left transition duration-300 hover:-translate-y-1 hover:border-blue-500/30 hover:bg-slate-800/80 sm:p-5"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] text-xl transition group-hover:bg-blue-500/10">
                    {icon}
                  </div>

                  <div className="mt-4 text-sm font-bold">
                    {name}
                  </div>

                  <div className="mt-1 text-[10px] leading-4 text-slate-500">
                    {description}
                  </div>
                </button>
              )
            )}
          </div>
        </div>
      </section>
      <section
        id="products"
        className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20"
      >
        <div className="mb-8">
          <div className="mb-2 text-[11px] font-bold tracking-[0.2em] text-blue-400">
            {t("home.marketplaceLabel")}
          </div>

          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {t("home.productsHeading")}
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                {t("home.productsSubtitle")}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {!loadingProducts && products.length > 0 && (
                <div className="text-xs font-semibold text-slate-500">
                  {visibleProducts.length}{" "}
                  {visibleProducts.length === 1
                    ? t("home.productSingular")
                    : t("home.productPlural")}
                </div>
              )}

              <button
                onClick={() => setFilterModalOpen(true)}
                className="relative flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-bold text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
              >
                <span>⚙️</span>
                {t("home.filterSort")}
                {activeFilterCount > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-black text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {message && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-200">
            <span>✓ {message}</span>

            <Link
              href="/cart"
              className="shrink-0 font-bold text-white hover:text-blue-300"
            >
              {`${t("home.viewCart")} →`}
            </Link>
          </div>
        )}

        {loadingProducts ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse overflow-hidden rounded-3xl border border-white/[0.08] bg-slate-900/70"
              >
                <div className="h-56 bg-white/[0.04]" />

                <div className="space-y-3 p-5">
                  <div className="h-3 w-20 rounded bg-white/[0.06]" />
                  <div className="h-5 w-4/5 rounded bg-white/[0.06]" />
                  <div className="h-4 w-full rounded bg-white/[0.04]" />
                  <div className="h-10 w-full rounded-xl bg-white/[0.06]" />
                </div>
              </div>
            ))}
          </div>
        ) : productError ? (
          <div className="rounded-3xl border border-red-500/20 bg-red-500/[0.06] px-5 py-16 text-center">
            <div className="text-4xl">⚠️</div>

            <h3 className="mt-4 text-xl font-bold">
              {t("home.unableToLoadProductsTitle")}
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              {productError}
            </p>

            <button
              onClick={() => loadProducts(search)}
              className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-500"
            >
              {t("home.tryAgain")}
            </button>
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className="relative overflow-hidden rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-20 text-center">
            <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] border border-white/10 bg-slate-900 text-4xl shadow-2xl">
              🛍️
            </div>

            <h3 className="mt-6 text-xl font-bold">
              {search
                ? t("home.noMatchingProducts")
                : t("home.noProductsAvailable")}
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              {search
                ? `${t("home.noProductsFoundFor")} "${search}". ${t("home.tryAnotherSearch")}`
                : t("home.productsWillAppear")}
            </p>

            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  loadProducts();
                }}
                className="mt-6 rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-bold text-white hover:bg-white/[0.08]"
              >
                {t("home.showAllProducts")}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {visibleProducts.map((product) => (
              <article
                key={product._id}
                onClick={() =>
                  router.push(`/products/${product.slug}`)
                }
                className="group cursor-pointer overflow-hidden rounded-3xl border border-white/[0.08] bg-slate-900/70 transition duration-300 hover:-translate-y-1 hover:border-blue-500/30 hover:bg-slate-900"
              >
                <div className="relative h-56 overflow-hidden bg-slate-950">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950 text-6xl">
                      ⚡
                    </div>
                  )}

                  <div className="absolute left-3 top-3 rounded-full border border-white/10 bg-slate-950/80 px-3 py-1.5 text-[10px] font-bold text-blue-300 backdrop-blur">
                    {product.category}
                  </div>

                  <div className="absolute right-3 top-3 flex flex-col items-end gap-2">
                    <button
                      onClick={(event) =>
                        toggleWishlist(product, event)
                      }
                      disabled={
                        wishlistBusyId === product._id
                      }
                      aria-label="Toggle wishlist"
                      className={`flex h-9 w-9 items-center justify-center rounded-full border text-base shadow-lg backdrop-blur transition disabled:opacity-60 ${
                        wishlistIds.has(product._id)
                          ? "border-red-500/40 bg-red-500/20"
                          : "border-white/10 bg-slate-950/80 hover:bg-slate-900"
                      }`}
                    >
                      {wishlistIds.has(product._id)
                        ? "❤️"
                        : "🤍"}
                    </button>

                    {product.featured && (
                      <div className="rounded-full bg-blue-600 px-3 py-1.5 text-[10px] font-bold text-white shadow-lg">
                        {t("home.featured")}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="line-clamp-2 min-h-[48px] text-base font-bold leading-6 text-white">
                    {product.name}
                  </h3>

                  <p className="mt-2 line-clamp-2 min-h-[40px] text-xs leading-5 text-slate-500">
                    {product.description ||
                      t("home.defaultProductDescription")}
                  </p>

                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div>
                      <div className="text-xl font-extrabold tracking-tight">
                        {format(product.price)}
                      </div>

                      <div
                        className={`mt-1 text-[11px] font-semibold ${
                          product.stock > 0
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {product.stock > 0
                          ? `${product.stock} ${t("home.inStock")}`
                          : t("home.outOfStock")}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center gap-2">
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        addToCart(product);
                      }}
                      disabled={
                        product.stock <= 0 ||
                        addingId === product._id ||
                        buyingId === product._id
                      }
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-800 px-3 py-3 text-xs font-bold text-white shadow-lg transition hover:bg-slate-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
                    >
                      {addingId === product._id ? (
                        t("home.adding")
                      ) : product.stock <= 0 ? (
                        t("home.outOfStockBtn")
                      ) : (
                        <>🛒 {t("common.addToCart")}</>
                      )}
                    </button>

                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        buyNow(product);
                      }}
                      disabled={
                        product.stock <= 0 ||
                        addingId === product._id ||
                        buyingId === product._id
                      }
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-3 text-xs font-bold text-white shadow-lg shadow-blue-600/10 transition hover:bg-blue-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
                    >
                      {buyingId === product._id
                        ? t("home.processing")
                        : t("common.buyNow")}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <section
        id="about"
        className="border-y border-white/[0.07] bg-white/[0.018]"
      >
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-3xl border border-white/[0.08] bg-slate-900/70 p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-xl">
                🌍
              </div>

              <h3 className="mt-5 font-bold">
                {t("home.featureGlobalTitle")}
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {t("home.featureGlobalDesc")}
              </p>
            </div>

            <div className="rounded-3xl border border-white/[0.08] bg-slate-900/70 p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-xl">
                🔐
              </div>

              <h3 className="mt-5 font-bold">
                {t("home.featureSecureTitle")}
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {t("home.featureSecureDesc")}
              </p>
            </div>

            <div className="rounded-3xl border border-white/[0.08] bg-slate-900/70 p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-xl">
                ✦
              </div>

              <h3 className="mt-5 font-bold">
                {t("home.featureAiTitle")}
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {t("home.featureAiDesc")}
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/[0.07] pt-8 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-black">
              T
            </div>

            <span className="font-bold">
              TechStar
            </span>
          </div>

          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} TechStar. {t("home.footerRights")}
          </p>
        </div>
      </footer>

      <Link
        href="/cart"
        aria-label="Open Shopping Cart"
        className="fixed bottom-5 right-4 z-50 hidden h-14 w-14 items-center justify-center rounded-full border border-blue-400/20 bg-blue-600 text-xl shadow-2xl shadow-blue-600/30 transition duration-300 hover:scale-105 hover:bg-blue-500 active:scale-95 sm:flex sm:right-6"
      >
        🛒

        {cartCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-black text-blue-600">
            {cartCount > 99 ? "99+" : cartCount}
          </span>
        )}
      </Link>

      <BottomNav cartCount={cartCount} />
    </main>
  );
}

