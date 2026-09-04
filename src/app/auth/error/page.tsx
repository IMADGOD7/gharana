import Link from "next/link";

const friendlyMessages: Record<string, string> = {
  auth_callback_failed: "The authentication link expired or was invalid. Please try logging in again.",
  credentials_not_found: "No account found with those credentials. Please check your email or create a new account.",
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const params = await searchParams;
  const message = params?.message || "Something went wrong during authentication.";
  const displayMessage = friendlyMessages[message] || message;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold text-gray-900">Authentication Error</h1>
        <p className="mt-2 text-sm text-gray-500">{displayMessage}</p>
        <Link href="/login" className="mt-6 inline-block text-sm text-blue-600 hover:underline">
          Back to login
        </Link>
      </div>
    </div>
  );
}
