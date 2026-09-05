"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { submitReviewAction } from "@/lib/admin/actions";

interface ReviewFormProps {
  productId: string;
}

export function ReviewFormClient({ productId }: ReviewFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [decision, setDecision] = useState<string>("");

  async function handleAction(formData: FormData) {
    if (!decision) {
      setError("Please select a decision");
      return;
    }

    setError(null);
    setSuccess(false);
    formData.set("productId", productId);
    formData.set("decision", decision);
    const result = await submitReviewAction(formData);
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
              name="decision_radio"
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
              name="decision_radio"
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
              name="decision_radio"
              value="reject"
              checked={decision === "reject"}
              onChange={(e) => setDecision(e.target.value)}
              className="text-red-600"
            />
            <span className="text-sm text-gray-700">Reject</span>
          </label>
        </div>
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
          className={cn("input-focus", "w-full")}
          placeholder="Add feedback for the partner..."
        />
      </div>

      <Button type="submit">Submit Review</Button>
    </form>
  );
}
