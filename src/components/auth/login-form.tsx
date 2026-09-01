"use client";

import { useState, useEffect } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth/actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, null);
  const router = useRouter();

  useEffect(() => {
    console.log("[DEBUG] LoginForm state:", state);
    if (state?.ok) {
      console.log("[DEBUG] Navigating to /dashboard");
      router.push("/dashboard");
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-4" suppressHydrationWarning>
      {state?.ok === false && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="you@example.com"
          suppressHydrationWarning
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="••••••••"
          suppressHydrationWarning
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        suppressHydrationWarning
      >
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}