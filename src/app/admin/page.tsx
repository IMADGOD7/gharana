import { requireAdmin } from "@/lib/auth/session";
import { getAllProductsForAdmin } from "@/lib/admin/actions";
import Link from "next/link";

export default async function AdminDashboard() {
  await requireAdmin();
  const products = await getAllProductsForAdmin();

  const counts = {
    draft: products.filter((p) => p.status === "draft").length,
    submitted: products.filter((p) => p.status === "submitted").length,
    approved: products.filter((p) => p.status === "approved").length,
    rejected: products.filter((p) => p.status === "rejected").length,
    changes_requested: products.filter((p) => p.status === "changes_requested").length,
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
      <p className="mt-1 text-gray-500">Review and manage partner submissions</p>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Draft" value={counts.draft} color="gray" />
        <Stat label="Submitted" value={counts.submitted} color="blue" />
        <Stat label="Approved" value={counts.approved} color="green" />
        <Stat label="Changes Requested" value={counts.changes_requested} color="yellow" />
        <Stat label="Rejected" value={counts.rejected} color="red" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Link
          href="/admin/products"
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:border-blue-300"
        >
          <h2 className="text-lg font-semibold text-gray-900">All Products</h2>
          <p className="mt-1 text-sm text-gray-500">Browse, search, and review every submission</p>
        </Link>
        <Link
          href="/admin/partners"
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:border-blue-300"
        >
          <h2 className="text-lg font-semibold text-gray-900">Partners</h2>
          <p className="mt-1 text-sm text-gray-500">Manage partner accounts and brands</p>
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    gray: "bg-gray-100 text-gray-700",
    blue: "bg-blue-100 text-blue-700",
    green: "bg-green-100 text-green-700",
    yellow: "bg-yellow-100 text-yellow-700",
    red: "bg-red-100 text-red-700",
  };
  return (
    <div className={`rounded-xl p-4 ${colors[color]}`}>
      <p className="text-xs uppercase font-medium opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}