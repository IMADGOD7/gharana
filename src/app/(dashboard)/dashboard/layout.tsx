import { signOut } from "@/lib/auth/actions";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();

  if (!profile) {
    redirect("/login");
  }

  const isAdmin = profile.role === "admin";

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-200 bg-white">
        <div className="p-4">
          <Link href="/dashboard" className="text-xl font-bold text-gray-900">
            PandaVerse
          </Link>
        </div>
        <nav className="mt-4 px-3 space-y-1">
          <DashboardLink href="/dashboard" label="Dashboard" />
          <DashboardLink href="/dashboard/products" label="My Products" />
          <DashboardLink href="/dashboard/products/new" label="New Product" />
          <DashboardLink href="/dashboard/profile" label="Profile" />
          {isAdmin && (
            <>
              <div className="pt-4 mt-4 border-t border-gray-200">
                <p className="px-3 text-xs font-medium text-gray-400 uppercase">Admin</p>
              </div>
              <DashboardLink href="/admin" label="Admin Panel" />
            </>
          )}
        </nav>
        <div className="absolute bottom-0 w-64 border-t border-gray-200 p-4">
          <p className="text-sm text-gray-600">{profile.full_name}</p>
          <p className="text-xs text-gray-400">{profile.email}</p>
          <form action={signOut}>
            <button
              type="submit"
              className="mt-3 text-sm text-red-600 hover:text-red-700"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}

function DashboardLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
    >
      {label}
    </Link>
  );
}