import { getProducts } from "@/lib/products/actions";
import Link from "next/link";
import { SubmitProductButton } from "@/components/products/submit-product-button";
import type { ProductRow } from "@/lib/products/actions";

export default async function ProductsPage() {
  const products: ProductRow[] = await getProducts();

  const drafts = products.filter((p) => p.status === "draft");
  const submitted = products.filter((p) => p.status !== "draft");

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Products</h1>
          <p className="mt-1 text-gray-500">
            {drafts.length} draft{drafts.length !== 1 ? "s" : ""}, {submitted.length} submitted
          </p>
        </div>
        <Link
          href="/dashboard/products/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Product
        </Link>
      </div>

      <div className="mt-8 space-y-4">
        {products.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-500">No products yet</p>
            <Link
              href="/dashboard/products/new"
              className="mt-4 inline-block text-sm text-blue-600 hover:underline"
            >
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