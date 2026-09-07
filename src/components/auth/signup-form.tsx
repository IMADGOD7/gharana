"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp } from "@/lib/auth/actions";
import type { AuthResult } from "@/lib/auth/actions";
import { Loader2 } from "lucide-react";

export function SignupForm() {
  const [state, formAction, pending] = useActionState<AuthResult, FormData>(
    signUp,
    { ok: false, error: "" }
  );
  const submitted = state?.ok === true;

  return (
    <>
      {submitted && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-6 text-center">
          <p className="text-sm font-medium text-emerald-800">Check your email</p>
          <p className="mt-1 text-sm text-emerald-600">
            We sent you a confirmation link. Click it to activate your account.
          </p>
          <p className="mt-3 text-sm">
            <Link href="/login" className="text-brand hover:underline">
              Back to login
            </Link>
          </p>
        </div>
      )}

      {state && !state.ok && state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {!submitted && (
        <form action={formAction} className="space-y-4">
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
              className="input-focus"
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
              className="input-focus"
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
              className="input-focus"
              placeholder="At least 8 characters"
              suppressHydrationWarning
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="btn-primary w-full"
            suppressHydrationWarning
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin inline mr-1" />
                Creating account...
              </>
            ) : (
              "Create account"
            )}
          </button>
        </form>
      )}
    </>
  );
}
