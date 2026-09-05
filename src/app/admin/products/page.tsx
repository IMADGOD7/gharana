import { getAllProductsForAdmin, getAdminProductsFiltered } from "@/lib/admin/actions";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Search, X, Eye } from "lucide-react";

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "draft", label: "Drafts" },
  { key: "submitted", label: "Under Review" },
  { key: "changes_requested", label: "Action Required" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const status = params?.status || "all";
  const search = params?.search || "";

  const products =
    status !== "all" || search
      ? await getAdminProductsFiltered({ status, search })
      : await getAllProductsForAdmin();

  const counts: Record<string, number> = {};
  STATUS_TABS.forEach((t) => {
    counts[t.key] = 0;
  });
  products.forEach((p) => {
    counts[p.status] = (counts[p.status] || 0) + 1;
  });
  counts["all"] = products.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">All Products</h1>
        <p className="mt-1 text-gray-500">Review and manage partner submissions</p>
      </div>

      {/* Search */}
      <form method="GET" className="flex items-center gap-3">
        <input type="hidden" name="status" value={status} />
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Search by product or partner..."
            className="input-focus pl-10"
          />
        </div>
        <button type="submit" className="btn-secondary">
          Search
        </button>
        {(status !== "all" || search) && (
          <Link
            href="/admin/products"
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
                  ? "/admin/products"
                  : `/admin/products?status=${tab.key}${search ? `&search=${encodeURIComponent(search)}` : ""}`
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
      <div className="space-y-3">
        {products.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
            <Eye className="mx-auto h-10 w-10 text-gray-300 mb-3" />
            <h3 className="text-sm font-semibold text-gray-900">No products found</h3>
            <p className="mt-1 text-sm text-gray-500">No products match your current filters.</p>
          </div>
        ) : (
          products.map((product) => (
            <div
              key={product.id}
              className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:border-gray-300 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                    <Eye className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="text-sm font-semibold text-gray-900 hover:text-brand truncate"
                      >
                        {product.title}
                      </Link>
                      <StatusBadge status={product.status} />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      by {product.partner_profiles?.brand_name || "Unknown Partner"} ·{" "}
                      {product.profiles?.full_name || "Unknown"}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(product.created_at).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="btn-primary text-xs py-1.5 px-3"
                  >
                    Review
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    draft: { label: "Draft", className: "bg-gray-100 text-gray-700" },
    submitted: { label: "Under Review", className: "bg-blue-100 text-blue-700" },
    changes_requested: { label: "Action Required", className: "bg-amber-100 text-amber-700" },
    approved: { label: "Approved", className: "bg-emerald-100 text-emerald-700" },
    rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
  };

  const badgeConfig = (config[status] ?? config.draft)!;
  const { label, className } = badgeConfig;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
