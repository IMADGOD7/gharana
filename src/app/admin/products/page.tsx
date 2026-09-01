import { getAllProductsForAdmin } from "@/lib/admin/actions";
import Link from "next/link";

export default async function AdminProductsPage() {
  const products = await getAllProductsForAdmin();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">All Products</h1>
      <p className="mt-1 text-gray-500">Review partner submissions</p>

      <div className="mt-8 space-y-4">
        {products.length === 0 ? (
          <p className="text-sm text-gray-500">No products yet.</p>
        ) : (
          products.map((product) => (
            <div key={product.id} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{product.title}</h3>
                    <StatusBadge status={product.status} />
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {product.partner_profiles?.brand_name || "Unknown"}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Submitted {new Date(product.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Link
                  href={`/admin/products/${product.id}`}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Review
                </Link>
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