"use client";

import Link from "next/link";

interface Props {
  searchParams: Promise<{ error?: string }>;
}

export default async function AuthCallbackErrorPage({ searchParams }: Props) {
  const params = await searchParams;
  const rawError = params.error || "unknown";
  const isPkceError = rawError.toLowerCase().includes("pkce") || rawError.toLowerCase().includes("code_verifier");

  const message = isPkceError
    ? "Your confirmation link was opened on a different device or browser than where you signed up. Please sign up again from the same device, or sign in with your email and password."
    : "Your confirmation link is invalid or has expired. Please try signing up again, or sign in if your account is already confirmed.";

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
            {message}
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link href="/signup" className="btn-primary inline-flex justify-center">
              Try signing up again
            </Link>
            <Link href="/login" className="btn-secondary inline-flex justify-center">
              Go to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
