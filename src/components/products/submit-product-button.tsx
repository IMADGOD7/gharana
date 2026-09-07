"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitProduct } from "@/lib/products/actions";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export function SubmitProductButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    setSubmitted(false);
    const result = await submitProduct(productId);
    if (result.ok) {
      setSubmitted(true);
      toast.success("Product submitted for review");
      router.refresh();
    } else {
      setError(result.error || "Failed to submit product");
      toast.error(result.error || "Failed to submit product");
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
        <CheckCircle2 className="h-4 w-4" />
        Submitted
      </span>
    );
  }

  return (
    <>
      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}
        {loading ? "Submitting..." : "Submit for Review"}
      </button>
    </>
  );
}