import { getPartnerProductsFiltered } from "@/lib/products/actions";
import Link from "next/link";
import { SubmitProductButton } from "@/components/products/submit-product-button";
import type { ProductRow } from "@/lib/products/actions";

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "draft", label: "Drafts" },
  { key: "submitted", label: "Submitted" },
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
    const key = p.status;
    counts[key] = (counts[key] || 0) + 1;
    counts["all"] = (counts["all"] || 0) + 1;
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Products</h1>
          <p className="mt-1 text-gray-500">
            Manage your product catalog
          </p>
        </div>
        <Link
          href="/dashboard/products/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Product
        </Link>
      </div>

      {/* Search */}
      <form method="GET" className="mt-6">
        <input type="hidden" name="status" value={status} />
        <div className="flex items-center gap-2">
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Search products..."
            className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200"
          >
            Search
          </button>
          {(status !== "all" || search) && (
            <Link href="/dashboard/products" className="text-sm text-blue-600 hover:underline">
              Clear filters
            </Link>
          )}
        </div>
      </form>

      {/* Status tabs */}
      <div className="mt-6 flex gap-1 overflow-x-auto border-b border-gray-200">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.key}
            href={
              tab.key === "all"
                ? "/dashboard/products"
                : `/dashboard/products?status=${tab.key}${search ? `&search=${encodeURIComponent(search)}` : ""}`
            }
            className={`whitespace-nowrap px-4 py-2 text-sm font-medium border-b-2 ${
              status === tab.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            {(counts[tab.key] || 0) > 0 && (
              <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${
                status === tab.key ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
              }`}>
                {counts[tab.key]}
              </span>
            )}
          </Link>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {products.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-500">No products match your filters.</p>
            <Link href="/dashboard/products/new" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
              Create your first product
            </Link>
          </div>
        ) : (
          products.map((product: ProductRow) => (
            <div
              key={product.id}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{product.title}</h3>
                    <StatusBadge status={product.status} />
                  </div>
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                    {product.description}
                  </p>
                  <p className="mt-2 text-xs text-gray-400">
                    Updated {new Date(product.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="ml-4 flex gap-2">
                  <Link
                    href={`/dashboard/products/${product.id}`}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    View
                  </Link>
                  {product.status === "draft" && (
                    <>
                      <Link
                        href={`/dashboard/products/${product.id}/edit`}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Edit
                      </Link>
                      <SubmitProductButton productId={product.id} />
                    </>
                  )}
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
  const colors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    submitted: "bg-blue-100 text-blue-700",
    changes_requested: "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] || "bg-gray-100"}`}>
      {status.replace("_", " ")}
    </span>
  );
}
