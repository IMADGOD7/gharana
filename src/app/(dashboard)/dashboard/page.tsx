import { getProfile } from "@/lib/auth/session";
import { getPartnerProductsFiltered } from "@/lib/products/actions";
import Link from "next/link";
import { Package, FileEdit, Eye, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function DashboardPage() {
  const profile = await getProfile();
  if (!profile) return null;

  // Fetch all products to compute stats
  const allProducts = await getPartnerProductsFiltered({ status: "all" });
  const drafts = allProducts.filter((p) => p.status === "draft");
  const submitted = allProducts.filter((p) => p.status === "submitted" || p.status === "changes_requested");
  const approved = allProducts.filter((p) => p.status === "approved");

  const recentProducts = [...allProducts]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  const firstName = profile.full_name.split(" ")[0];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1 text-gray-500">
          Manage your artisanal products, craft stories, and submissions.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Products"
          value={allProducts.length}
          icon={Package}
          color="blue"
        />
        <StatCard
          label="Drafts in Progress"
          value={drafts.length}
          icon={FileEdit}
          color="amber"
        />
        <StatCard
          label="Under Curation Review"
          value={submitted.length}
          icon={Eye}
          color="indigo"
        />
        <StatCard
          label="Live / Approved"
          value={approved.length}
          icon={Package}
          color="emerald"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <QuickActionCard
            href="/dashboard/products/new"
            title="Create Product Listing"
            description="Start a new product with story and media"
            icon={PlusCircle}
          />
          <QuickActionCard
            href="/dashboard/profile"
            title="Update Craft Profile"
            description="Edit your brand and workshop details"
            icon={FileEdit}
          />
          <QuickActionCard
            href="/dashboard/products"
            title="View All Products"
            description="Browse and manage your catalog"
            icon={Package}
          />
        </div>
      </div>

      {/* Recent Products */}
      {recentProducts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Products</h2>
            <Link
              href="/dashboard/products"
              className="text-sm text-brand hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Updated
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/products/${product.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-brand"
                      >
                        {product.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={product.status} />
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-400">
                      {new Date(product.updated_at).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: "blue" | "amber" | "indigo" | "emerald";
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-600 ring-blue-600/20",
    amber: "bg-amber-50 text-amber-600 ring-amber-600/20",
    indigo: "bg-indigo-50 text-indigo-600 ring-indigo-600/20",
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-600/20",
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl ring-8", colors[color])}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function QuickActionCard({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:border-blue-300 hover:shadow-md transition-all"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-50 group-hover:bg-blue-50 transition-colors">
        <Icon className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
    </Link>
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
  const badgeLabel = badgeConfig.label;
  const badgeClassName = badgeConfig.className;

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClassName}`}>
      {badgeLabel}
    </span>
  );
}

