import { LoginForm } from "@/components/auth/login-form";
import Link from "next/link";
import { Store } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-white mb-4">
            <Store className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">PandaVerse Gharana</h1>
          <p className="mt-1 text-sm text-gray-500">Partner Portal</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Sign in</h2>
          <LoginForm />
        </div>
        <p className="mt-4 text-center text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-brand hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}