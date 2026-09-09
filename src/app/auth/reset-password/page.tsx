// ============================================================
// Reset Password Page (T0.4)
// Server component: exchanges the recovery code from the URL,
// then renders the password form as a client component.
// ============================================================

import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; error?: string }>;
}) {
  const params = await searchParams;

  if (params.error) {
    return <ErrorState error={params.error} />;
  }

  if (!params.code) {
    return <ErrorState error="no_code" />;
  }

  // Exchange the recovery code for a session
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);

  if (error || !data.session) {
    return <ErrorState error="exchange_failed" />;
  }

  // Session established — render the password form
  return <ResetPasswordForm />;
}

function ErrorState({ error }: { error: string }) {
  const messages: Record<string, string> = {
    no_code: "The password reset link is missing or expired.",
    exchange_failed: "The password reset link is invalid or expired. Please request a new one.",
  };

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
        <div className="card p-7 text-center">
          <p className="text-body font-medium text-status-rejected">
            {messages[error] || "Something went wrong."}
          </p>
          <a href="/forgot-password" className="btn-primary mt-5 inline-flex">
            Request new link
          </a>
        </div>
      </div>
    </div>
  );
}
