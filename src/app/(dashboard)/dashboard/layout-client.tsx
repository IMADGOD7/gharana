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
    <div className="flex min-h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 border-r border-stone-200 bg-stone-50 transition-transform duration-300",
          "md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand */}
        <div className="flex h-16 items-center gap-3 px-5 border-b border-stone-200">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-white">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground leading-tight">PandaVerse Gharana</h1>
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted">
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
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-body font-medium transition-all",
                  isActive
                    ? "bg-brand-subtle text-brand font-semibold"
                    : "text-muted hover:bg-stone-100 hover:text-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive ? "text-brand" : "text-stone-400")} />
                {item.label}
                {isActive && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-brand" />
                )}
              </Link>
            );
          })}

          {isAdmin && (
            <>
              <div className="pt-4 mt-4 border-t border-stone-200">
                <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">
                  Administration
                </p>
                <Link
                  href="/admin"
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-body font-medium transition-all",
                    pathname.startsWith("/admin")
                      ? "bg-brand-subtle text-brand font-semibold"
                      : "text-muted hover:bg-stone-100 hover:text-foreground"
                  )}
                >
                  <ShieldCheck className={cn("h-5 w-5", pathname.startsWith("/admin") ? "text-brand" : "text-stone-400")} />
                  Admin Panel
                </Link>
              </div>
            </>
          )}
        </nav>

        {/* User Profile Footer */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-stone-200 p-4">
          <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-surface p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-sm font-semibold text-brand">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-body font-medium text-foreground">{profile.full_name}</p>
              <p className="truncate text-caption text-muted">{profile.email}</p>
            </div>
          </div>
          <form action={signOut} className="mt-2" suppressHydrationWarning>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-body text-muted hover:text-status-rejected hover:bg-status-rejected/10 transition-colors"
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
        <div className="md:hidden flex items-center gap-3 border-b border-stone-200 bg-surface px-4 py-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-2 text-muted hover:bg-stone-100"
          >
            {sidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
          <h1 className="text-sm font-semibold text-foreground">PandaVerse Gharana</h1>
        </div>

        <div className="mx-auto max-w-7xl p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
