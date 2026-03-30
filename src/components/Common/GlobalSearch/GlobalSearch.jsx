"use client";
import Loader from "@/components/Loader";
import useSubRoleTranslations from "@/hook/useSubRoleTranslations";
import IconsLibrary from "@/util/IconsLibrary";
import { resolveAmbassadorSlug } from "@/util/resolveAmbassadorSlug";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function GlobalSearch() {
  const t = useTranslations("Header");
  const tt = useTranslations("globalSearch");
  const router = useRouter();
  const translateSubRole = useSubRoleTranslations();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);
  const abortRef = useRef(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Debounced fetch suggestions
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      setError(null);
      if (abortRef.current) abortRef.current.abort();
      return;
    }

    setLoading(true);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/search-users?q=${encodeURIComponent(query)}&limit=5`,
          {
            signal: controller.signal,
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch suggestions");
        }

        const json = await response.json();
        setResults(json?.data || []);
        setOpen(true);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError("Error fetching suggestions");
        }
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const onDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Prefetch highlighted result
  useEffect(() => {
    if (open && highlightedIndex >= 0 && results[highlightedIndex]) {
      const item = results[highlightedIndex];
      const prefetchResult = async () => {
        try {
          const slug = await resolveAmbassadorSlug(item);
          if (slug) {
            router.prefetch(`/ambassador/${slug}`);
          } else {
            router.prefetch(
              `/sports-ambassador-profile/${item.subRole}/${item.supabaseId}`
            );
          }
        } catch (err) {
          // ignore prefetch errors
        }
      };
      prefetchResult();
    }
  }, [highlightedIndex, open, results, router]);

  const onSubmit = (e) => {
    e.preventDefault();
    if (open && highlightedIndex >= 0 && highlightedIndex < results.length) {
      handleSelect(results[highlightedIndex], "ambassador");
      return;
    }
    const q = (query || "").trim();
    setOpen(false);
    router.push(`/marketplace${q ? `?search=${encodeURIComponent(q)}` : ""}`);
  };

  const handleSelect = async (item, type) => {
    setOpen(false);

    // Navigate directly to the user's profile page
    const slug = await resolveAmbassadorSlug(item);
    if (slug) {
      router.push(`/ambassador/${slug}`);
    } else {
      router.push(
        `/sports-ambassador-profile/${item.subRole}/${item.supabaseId}`
      );
    }
  };

  const handleShowAllResults = () => {
    const q = (query || "").trim();
    setOpen(false);
    router.push(`/marketplace${q ? `?search=${encodeURIComponent(q)}` : ""}`);
  };

  const handleClearSearch = (e) => {
    e.preventDefault();
    setQuery('');
    setOpen(false);
    // Don't navigate, just clear the search
    // Only update URL if we're already on the marketplace page
    if (window.location.pathname === '/marketplace') {
      router.push('/marketplace', undefined, { shallow: true });
    }
  };

  return (
    <div
      className="w-full mt-4 lg:mt-0 lg:flex items-center justify-center min-[1150px]:w-auto relative z-50"
      ref={containerRef}
    >
      <form
        action="/marketplace"
        method="GET"
        className="relative w-full flex lg:max-w-[600px]"
        onSubmit={onSubmit}
        autoComplete="off"
      >
        <input
          type="text"
          name="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0 && query.length >= 2) setOpen(true);
            setHighlightedIndex(-1);
          }}
          onKeyDown={(e) => {
            const total = results.length;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              if (!open) setOpen(true);
              setHighlightedIndex((prev) => {
                const next = prev + 1;
                return next >= total ? 0 : next;
              });
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              if (!open) setOpen(true);
              setHighlightedIndex((prev) => {
                const next = prev - 1;
                return next < 0 ? Math.max(total - 1, -1) : next;
              });
            } else if (e.key === "Enter") {
              // submit handled by form onSubmit
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className="defaultInput w-full rounded-full placeholder:text-white pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-opacity-50"
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
        />
        <div className="absolute left-3 top-1/4 transform -translate-y-1/25">
          <IconsLibrary name="search" size="20" />
        </div>
        {query && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
            aria-label="Clear search"
          >
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
            >
              <path 
                d="M18 6L6 18M6 6L18 18" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}

        {/* Suggestions dropdown */}
        {open && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="max-h-80 overflow-auto py-2">
              {loading && (
                <div className="px-4 py-2 text-sm text-gray-500">
                  <Loader />
                </div>
              )}
              {error && (
                <div className="px-4 py-2 text-sm text-red-500">{error}</div>
              )}

              {!loading && !error && (
                <>
                  {/* Ambassadors section */}
                  {results.length > 0 && (
                    <div>
                      <div className="px-4 py-1 text-xs uppercase tracking-wide text-gray-500">
                        {tt("ambassadors")}
                      </div>
                      <ul className="divide-y divide-gray-100">
                        {results.map((item, idx) => {
                          const isActive = highlightedIndex === idx;
                          return (
                            <li key={item._id}>
                              <button
                                type="button"
                                onClick={() => handleSelect(item, "ambassador")}
                                className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 ${
                                  isActive ? "bg-gray-100" : ""
                                }`}
                              >
                                  <div className="h-8 w-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 relative">
                                    {item.avatar ? (
                                      <Image
                                        src={item.avatar}
                                        alt={item.name}
                                        fill
                                        sizes="32px"
                                        className="object-cover"
                                      />
                                    ) : (
                                      <div className="h-full w-full flex items-center justify-center text-gray-500">
                                        <IconsLibrary name="user" size={16} />
                                      </div>
                                    )}
                                  </div>
                                <div className="flex-1 min-w-0 text-left">
                                  <div className="text-sm text-gray-900 truncate">
                                    {item.name}
                                  </div>
                                  {item.subRole && (
                                    <div className="text-xs text-gray-500 truncate">
                                      {translateSubRole(item.subRole)}
                                    </div>
                                  )}
                                </div>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {/* Brands section */}
                  {results.length === 0 && (
                    <div className="px-4 py-2 text-sm text-gray-500">
                      {tt("noResults")}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
