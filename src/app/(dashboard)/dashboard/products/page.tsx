import { getPartnerProductsFiltered } from "@/lib/products/actions";
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
): Promise<{ status: string; search: string }> {
  return searchParams.then(
    (params) => ({
      status: params?.status || "all",
      search: params?.search || "",
    })
  );
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { status, search } = await resolveSearchParams(searchParams);

  const products: ProductRow[] = await getPartnerProductsFiltered({ status, search });

  const counts: Record<string, number> = {};
  STATUS_TABS.forEach((t) => {
    counts[t.key] = 0;
  });
  products.forEach((p) => {
    counts[p.status] = (counts[p.status] || 0) + 1;
    counts["all"] = (counts["all"] || 0) + 1;
  });

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
        <Link
          href="/dashboard/products/new"
          className="btn-primary"
        >
          <Plus className="h-4 w-4" />
          New Product
        </Link>
      </div>

      {/* Search & Filters */}
      <form method="GET" className="flex items-center gap-3">
        <input type="hidden" name="status" value={status} />
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
            href="/dashboard/products"
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
                  ? "/dashboard/products"
                  : `/dashboard/products?status=${tab.key}${search ? `&search=${encodeURIComponent(search)}` : ""}`
              }
              className={cn(
                "relative whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "text-blue-700"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              {tab.label}
              {(counts[tab.key] || 0) > 0 && (
                <span
                  className={cn(
                    "ml-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                    isActive
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-600"
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

      {/* Products List */}
      <div className="space-y-3">
        {products.length === 0 ? (
          <EmptyState search={search} status={status} />
        ) : (
          products.map((product: ProductRow) => (
            <div
              key={product.id}
              className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:border-gray-300 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                      <Package className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/products/${product.id}`}
                        className="text-sm font-semibold text-gray-900 hover:text-brand truncate block"
                      >
                        {product.title}
                      </Link>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                        {product.description || "No description"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="hidden sm:block text-right">
                    <StatusBadge status={product.status} />
                    <p className="text-xs text-gray-400 mt-1">
                      Updated {new Date(product.updated_at).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
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
            </div>
          ))
        )}
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
