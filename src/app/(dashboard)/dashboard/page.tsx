import { getProfile } from "@/lib/auth/session";
import Link from "next/link";

export default async function DashboardPage() {
  const profile = await getProfile();
  if (!profile) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Welcome, {profile.full_name}</h1>
      <p className="mt-1 text-gray-500">
        {profile.role === "admin" ? "Admin Dashboard" : "Partner Dashboard"}
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <DashboardCard
          href="/dashboard/products"
          title="My Products"
          description="View and manage your product listings"
        />
        <DashboardCard
          href="/dashboard/products/new"
          title="New Product"
          description="Create a new product listing"
        />
        <DashboardCard
          href="/dashboard/profile"
          title="Profile"
          description="Update your account details"
        />
      </div>
    </div>
  );
}

function DashboardCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:border-blue-300 hover:shadow-md"
    >
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </Link>
  );
}