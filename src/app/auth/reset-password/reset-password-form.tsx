// ============================================================
// Reset Password Form — Client Component (T0.4)
// Handles password update via useFormState after the
// server-side code exchange has established a session.
// ============================================================

"use client";

import { useActionState } from "react";
import { resetPassword } from "@/lib/auth/actions";

export function ResetPasswordForm() {
  const [state, formAction] = useActionState(resetPassword, null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          </div>
          <h1 className="text-display mt-4">PandaVerse Gharana</h1>
          <p className="text-caption mt-1">Partner Portal</p>
        </div>
        <div className="card p-7">
          <h2 className="text-h2 mb-4">Set new password</h2>
          <p className="text-body mb-5 text-foreground/70">
            Choose a new password for your account.
          </p>
          {state && !state.ok && (
            <div className="mb-4 rounded-lg border border-status-rejected/30 bg-status-rejected/10 px-4 py-3 text-body text-status-rejected">
              {(state as { error: string }).error}
            </div>
          )}
          {state?.ok && (
            <div className="mb-4 rounded-lg border border-status-approved/30 bg-status-approved/10 px-4 py-3 text-body text-status-approved">
              {state.message}
            </div>
          )}
          <form action={formAction} className="space-y-5">
            <div>
              <label htmlFor="password" className="text-body mb-1.5 block font-medium">
                New password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                className="input-focus w-full"
                placeholder="At least 8 characters"
              />
            </div>
            <div>
              <label htmlFor="confirm_password" className="text-body mb-1.5 block font-medium">
                Confirm password
              </label>
              <input
                id="confirm_password"
                name="confirm_password"
                type="password"
                required
                minLength={8}
                className="input-focus w-full"
                placeholder="Repeat your password"
              />
            </div>
            <button type="submit" className="btn-primary w-full">
              Update password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
