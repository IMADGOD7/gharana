import { getPartnerProductsWithMedia } from "@/lib/products/actions";
import { createSignedUrl } from "@/lib/media/storage";
import Link from "next/link";
import { SubmitProductButton } from "@/components/products/submit-product-button";
import type { ProductRow } from "@/lib/products/actions";
import { cn } from "@/lib/utils";
import { Plus, Search, X, Package } from "lucide-react";

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "draft", label: "Drafts" },
  { key: "submitted", label: "Under Review" },
  { key: "changes_requested", label: "Changes Requested" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

function resolveSearchParams(
  searchParams: Promise<Record<string, string | undefined>>
): Promise<{ status: string; search: string; view: string }> {
  return searchParams.then(
    (params) => ({
      status: params?.status || "all",
      search: params?.search || "",
      view: params?.view === "grid" ? "grid" : "list",
    })
  );
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { status, search, view } = await resolveSearchParams(searchParams);

  const products = await getPartnerProductsWithMedia({ status, search });

  // Resolve signed URLs for primary media so both grid and list views can render thumbnails.
  const productsWithUrls: (ProductRow & { primary_media_url?: string | null })[] = await Promise.all(
    products.map(async (product) => {
      const primary = product.primary_media;
      if (!primary?.storage_path) return { ...product, primary_media_url: null };
      try {
        const bucket = primary.media_type === "video" ? "product-videos" : "product-photos";
        const url = await createSignedUrl(bucket, primary.storage_path);
        return { ...product, primary_media_url: url };
      } catch {
        return { ...product, primary_media_url: null };
      }
    })
  );

  const counts: Record<string, number> = {};
  STATUS_TABS.forEach((t) => {
    counts[t.key] = 0;
  });
  products.forEach((p) => {
    counts[p.status] = (counts[p.status] || 0) + 1;
    counts["all"] = (counts["all"] || 0) + 1;
  });

  const isGridView = view === "grid";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Products</h1>
          <p className="mt-1 text-gray-500">
            Manage your product catalog and submissions
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center rounded-lg border border-gray-200 bg-white p-0.5">
            <Link
              href={`/dashboard/products?status=${status}${search ? `&search=${encodeURIComponent(search)}` : ""}&view=list`}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                !isGridView
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              {/* List icon */}
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
              <span className="hidden sm:inline">List</span>
            </Link>
            <Link
              href={`/dashboard/products?status=${status}${search ? `&search=${encodeURIComponent(search)}` : ""}&view=grid`}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                isGridView
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              {/* Grid icon */}
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
              <span className="hidden sm:inline">Grid</span>
            </Link>
          </div>
          <Link
            href="/dashboard/products/new"
            className="btn-primary"
          >
            <Plus className="h-4 w-4" />
            New Product
          </Link>
        </div>
      </div>

      {/* Search & Filters */}
      <form method="GET" className="flex items-center gap-3">
        <input type="hidden" name="status" value={status} />
        <input type="hidden" name="view" value={view} />
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Search products..."
            className="input-focus pl-10"
          />
        </div>
        <button type="submit" className="btn-secondary">
          Search
        </button>
        {(status !== "all" || search) && (
          <Link
            href={`/dashboard/products?view=${view}`}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </Link>
        )}
      </form>

      {/* Status Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200">
        {STATUS_TABS.map((tab) => {
          const isActive = status === tab.key;
          return (
            <Link
              key={tab.key}
              href={
                tab.key === "all"
                  ? `/dashboard/products?view=${view}`
                  : `/dashboard/products?status=${tab.key}${search ? `&search=${encodeURIComponent(search)}` : ""}&view=${view}`
              }
              className={cn(
                "relative whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors",
                isActive ? "text-blue-700" : "text-gray-500 hover:text-gray-700"
              )}
            >
              {tab.label}
              {(counts[tab.key] || 0) > 0 && (
                <span
                  className={cn(
                    "ml-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                    isActive ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                  )}
                >
                  {counts[tab.key]}
                </span>
              )}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>

      {/* Products */}
      {products.length === 0 ? (
        <EmptyState search={search} status={status} />
      ) : isGridView ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {productsWithUrls.map((product) => (
            <ProductGridCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {productsWithUrls.map((product) => (
            <ProductListItem key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductGridCard({ product }: { product: ProductRow & { primary_media_url?: string | null } }) {
  const mediaSrc = product.primary_media_url;

  const tags = product.tags ?? [];
  const displayTags = tags.slice(0, 2);
  const remainingCount = tags.length - displayTags.length;

  return (
    <Link
      href={`/dashboard/products/${product.id}`}
      className="group rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:border-gray-300 hover:shadow-md transition-all flex flex-col"
    >
      {/* Media Thumbnail */}
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
        {mediaSrc ? (
          product.primary_media?.media_type === "video" ? (
            <video
              src={mediaSrc}
              className="h-full w-full object-cover"
              muted
              preload="metadata"
            />
          ) : (
            <img
              src={mediaSrc}
              alt={product.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
        )
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-8 w-8 text-gray-300" />
          </div>
        )}

        {/* Status badge overlay */}
        <div className="absolute top-2 left-2">
          <StatusBadge status={product.status} />
        </div>

        {/* Tags overlay */}
        {displayTags.length > 0 && (
          <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1">
            {displayTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm"
              >
                {tag}
              </span>
            ))}
            {remainingCount > 0 && (
              <span className="inline-flex items-center rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                +{remainingCount}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col p-3">
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-brand transition-colors">
          {product.title}
        </h3>
        <div className="mt-auto flex items-center justify-between pt-2">
          {product.price_min != null && (
            <span className="text-xs font-medium text-gray-700">
              ₹{product.price_min.toLocaleString("en-IN")}
              {product.price_max != null && product.price_max !== product.price_min
                ? ` – ₹{product.price_max.toLocaleString("en-IN")}`
                : ""}
            </span>
          )}
          {!product.price_min && (
            <span className="text-xs text-gray-400">Price on request</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function ProductListItem({ product }: { product: ProductRow & { primary_media_url?: string | null } }) {
  const mediaSrc = product.primary_media_url;

  return (
    <div
      className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:border-gray-300 hover:shadow-md transition-all"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Thumbnail */}
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400 overflow-hidden">
            {mediaSrc ? (
              product.primary_media?.media_type === "video" ? (
                <video src={mediaSrc} className="h-full w-full object-cover" muted preload="metadata" />
              ) : (
                <img src={mediaSrc} alt={product.title} className="h-full w-full object-cover" loading="lazy" />
              )
            ) : (
              <Package className="h-5 w-5" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Link
                href={`/dashboard/products/${product.id}`}
                className="text-sm font-semibold text-gray-900 hover:text-brand truncate"
              >
                {product.title}
              </Link>
              <StatusBadge status={product.status} />
            </div>
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
              {product.description || "No description"}
            </p>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-xs text-gray-400">
                Updated{" "}
                {new Date(product.updated_at).toLocaleDateString("en-IN", {
                  month: "short",
                  day: "numeric",
                })}
              </p>
              {product.price_min != null && (
                <span className="text-xs font-medium text-gray-600">
                  ₹{product.price_min.toLocaleString("en-IN")}
                  {product.price_max != null && product.price_max !== product.price_min
                    ? ` – ₹{product.price_max.toLocaleString("en-IN")}`
                    : ""}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/products/${product.id}`}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            View
          </Link>
          {product.status === "draft" && (
            <>
              <Link
                href={`/dashboard/products/${product.id}/edit`}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Edit
              </Link>
              <SubmitProductButton productId={product.id} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ search, status }: { search: string; status: string }) {
  const hasFilters = search || status !== "all";

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-50 mb-4">
        <Package className="h-7 w-7 text-gray-300" />
      </div>
      <h3 className="text-sm font-semibold text-gray-900">
        {hasFilters ? "No products match your filters" : "No products yet"}
      </h3>
      <p className="mt-1 text-sm text-gray-500 max-w-sm">
        {hasFilters
          ? "Try adjusting your search or filters to find what you're looking for."
          : "Get started by creating your first product listing with craft stories and media."}
      </p>
      {!hasFilters && (
        <Link
          href="/dashboard/products/new"
          className="btn-primary mt-4"
        >
          <Plus className="h-4 w-4" />
          Create your first product
        </Link>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    draft: { label: "Draft", className: "bg-status-draft text-status-draft" },
    submitted: { label: "Under Review", className: "bg-status-submitted text-status-submitted" },
    changes_requested: { label: "Action Required", className: "bg-status-changes text-status-changes" },
    approved: { label: "Approved / Live", className: "bg-status-approved text-status-approved" },
    rejected: { label: "Rejected", className: "bg-status-rejected text-status-rejected" },
  };

  const badgeConfig = (config[status] ?? config.draft)!;
  const { label, className } = badgeConfig;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
