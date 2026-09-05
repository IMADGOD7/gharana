"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  PlusCircle,
  User,
  Store,
  ShieldCheck,
  LogOut,
  X,
} from "lucide-react";

interface Profile {
  full_name: string;
  email: string;
  role: string;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  profile: Profile;
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/products", label: "My Products", icon: Package },
  { href: "/dashboard/products/new", label: "New Product", icon: PlusCircle },
  { href: "/dashboard/profile", label: "Profile & Brand", icon: User },
  { href: "/dashboard/shops", label: "My Shops", icon: Store },
];

export default function DashboardLayout({
  children,
  profile,
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isAdmin = profile.role === "admin";
  const initials = profile.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex min-h-screen bg-gray-50/50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 border-r border-gray-200 bg-white transition-transform duration-300",
          "md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand */}
        <div className="flex h-16 items-center gap-3 px-5 border-b border-gray-100">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-white">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-gray-900 leading-tight">PandaVerse Gharana</h1>
            <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
              Partner Portal
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive ? "text-blue-600" : "text-gray-400")} />
                {item.label}
                {isActive && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-600" />
                )}
              </Link>
            );
          })}

          {isAdmin && (
            <>
              <div className="pt-4 mt-4 border-t border-gray-100">
                <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
                  Administration
                </p>
                <Link
                  href="/admin"
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                    pathname.startsWith("/admin")
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <ShieldCheck className={cn("h-5 w-5", pathname.startsWith("/admin") ? "text-blue-600" : "text-gray-400")} />
                  Admin Panel
                </Link>
              </div>
            </>
          )}
        </nav>

        {/* User Profile Footer */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-100 p-4">
          <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-semibold text-brand">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">{profile.full_name}</p>
              <p className="truncate text-xs text-gray-400">{profile.email}</p>
            </div>
          </div>
          <form action={signOut} className="mt-2" suppressHydrationWarning>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 md:ml-64">
        {/* Mobile header with hamburger */}
        <div className="md:hidden flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-50"
          >
            {sidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
          <h1 className="text-sm font-semibold text-gray-900">PandaVerse Gharana</h1>
        </div>

        <div className="mx-auto max-w-7xl p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
