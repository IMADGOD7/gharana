"use client";

import { useState, useEffect } from "react";
import { useActionState } from "react";
import Link from "next/link";
import { signUp } from "@/lib/auth/actions";

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signUp, null);

  if (state?.ok) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-6 text-center">
        <p className="text-sm font-medium text-green-800">Check your email</p>
        <p className="mt-1 text-sm text-green-600">
          We sent you a confirmation link. Click it to activate your account.
        </p>
        <p className="mt-3 text-sm">
          <Link href="/login" className="text-blue-600 hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4" suppressHydrationWarning>
      {state?.ok === false && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div>
        <label htmlFor="full_name" className="mb-1.5 block text-sm font-medium text-gray-700">
          Full Name
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          required
          autoComplete="name"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Your full name"
          suppressHydrationWarning
        />
      </div>

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
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="At least 8 characters"
          suppressHydrationWarning
        />
        <p className="mt-1 text-xs text-gray-500">Minimum 8 characters</p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        suppressHydrationWarning
      >
        {pending ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}