import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold text-gray-900">Authentication Error</h1>
        <p className="mt-2 text-sm text-gray-500">
          Something went wrong during authentication. Please try again.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm text-blue-600 hover:underline"
        >
          Back to login
        </Link>
      </div>
    </div>
  );
}