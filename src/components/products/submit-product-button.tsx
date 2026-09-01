"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitProduct } from "@/lib/products/actions";

export function SubmitProductButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    const result = await submitProduct(productId);
    if (result.ok) {
      router.refresh();
    } else {
      setError(result.error || "Failed to submit product");
      setLoading(false);
    }
  }

  return (
    <>
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Submitting..." : "Submit for Review"}
      </button>
    </>
  );
}