import { requireAdmin } from "@/lib/auth/session";
import { getAllProductsForAdmin } from "@/lib/admin/actions";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Package,
  Users,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
} from "lucide-react";

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

  const pendingReview = products.filter(
    (p) => p.status === "submitted" || p.status === "changes_requested"
  );

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-gray-500">
          Review submissions and manage partner accounts
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Drafts" value={counts.draft} color="gray" />
        <StatCard label="Submitted" value={counts.submitted} color="blue" />
        <StatCard label="Approved" value={counts.approved} color="emerald" />
        <StatCard label="Changes Requested" value={counts.changes_requested} color="amber" />
        <StatCard label="Rejected" value={counts.rejected} color="red" />
      </div>

      {/* Pending Reviews */}
      {pendingReview.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pending Reviews</h2>
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {pendingReview.slice(0, 5).map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between border-b border-gray-100 last:border-b-0 px-5 py-4 hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                    <Package className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{product.title}</p>
                    <p className="text-xs text-gray-400">
                      {product.partner_profiles?.brand_name || "Unknown Partner"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={product.status} />
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="btn-primary text-xs py-1.5 px-3"
                  >
                    Review
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Access</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Link
            href="/admin/products"
            className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:border-blue-300 hover:shadow-md transition-all"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-50 group-hover:bg-blue-50 transition-colors">
              <FileText className="h-6 w-6 text-gray-400 group-hover:text-blue-600 transition-colors" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">All Products</p>
              <p className="text-xs text-gray-500">Browse, search, and review every submission</p>
            </div>
          </Link>
          <Link
            href="/admin/partners"
            className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:border-blue-300 hover:shadow-md transition-all"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-50 group-hover:bg-blue-50 transition-colors">
              <Users className="h-6 w-6 text-gray-400 group-hover:text-blue-600 transition-colors" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Partners</p>
              <p className="text-xs text-gray-500">Manage partner accounts and brands</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "gray" | "blue" | "emerald" | "amber" | "red";
}) {
  const config = {
    gray: { bg: "bg-gray-100", text: "text-gray-700", ring: "ring-gray-600/20", icon: XCircle },
    blue: { bg: "bg-blue-50", text: "text-blue-700", ring: "ring-blue-600/20", icon: Clock },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-600/20", icon: CheckCircle2 },
    amber: { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-600/20", icon: AlertTriangle },
    red: { bg: "bg-red-50", text: "text-red-700", ring: "ring-red-600/20", icon: XCircle },
  };

  const c = config[color];

  return (
    <div className={cn("rounded-xl border p-4 ring-8", c.bg, c.ring)}>
      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold", c.text)}>{value}</p>
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
