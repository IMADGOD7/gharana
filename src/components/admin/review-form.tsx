"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

interface ReviewFormProps {
  productId: string;
  action: (productId: string, formData: FormData) => Promise<{ ok: boolean; error?: string }>;
}

export function ReviewFormClient({ productId, action }: ReviewFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [decision, setDecision] = useState<string>("");

  async function handleAction(_formData: FormData) {
    if (!decision) {
      setError("Please select a decision");
      return;
    }

    setError(null);
    setSuccess(false);
    const result = await action(productId, _formData);
    if (result.ok) {
      setSuccess(true);
      router.refresh();
    } else {
      setError(result.error || "Failed to submit review");
    }
  }

  if (success) {
    return (
      <div>
        <Alert variant="success">Review submitted successfully.</Alert>
        <Link href="/admin/products" className="mt-4 block text-sm text-blue-600 hover:underline">
          Back to all products
        </Link>
      </div>
    );
  }

  return (
    <form action={handleAction} className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">Decision</label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="decision"
              value="approve"
              checked={decision === "approve"}
              onChange={(e) => setDecision(e.target.value)}
              className="text-green-600"
            />
            <span className="text-sm text-gray-700">Approve</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="decision"
              value="request_changes"
              checked={decision === "request_changes"}
              onChange={(e) => setDecision(e.target.value)}
              className="text-yellow-600"
            />
            <span className="text-sm text-gray-700">Request Changes</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="decision"
              value="reject"
              checked={decision === "reject"}
              onChange={(e) => setDecision(e.target.value)}
              className="text-red-600"
            />
            <span className="text-sm text-gray-700">Reject</span>
          </label>
        </div>
        <input type="hidden" name="decision_hidden" value={decision} />
      </div>

      <div>
        <label htmlFor="notes" className="mb-1.5 block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Add feedback for the partner..."
        />
      </div>

      <Button type="submit">Submit Review</Button>
    </form>
  );
}