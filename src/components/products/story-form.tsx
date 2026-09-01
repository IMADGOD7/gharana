"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

interface StoryFormProps {
  productId: string;
  action: (formData: FormData) => Promise<{ ok: boolean; error?: string }>;
  initial?: {
    inspiration: string;
    crafting_process: string;
    cultural_context: string | null;
  };
}

export function StoryFormClient({ action, initial }: StoryFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleAction(formData: FormData) {
    setError(null);
    setSuccess(false);
    const result = await action(formData);
    if (result.ok) {
      setSuccess(true);
      router.refresh();
    } else {
      setError(result.error || "Failed to save story");
    }
  }

  if (success) {
    return <Alert variant="success">Story saved successfully.</Alert>;
  }

  return (
    <form action={handleAction} className="space-y-6">
      {error && <Alert variant="error">{error}</Alert>}

      <div>
        <label htmlFor="inspiration" className="mb-1.5 block text-sm font-medium text-gray-700">
          Inspiration
        </label>
        <textarea
          id="inspiration"
          name="inspiration"
          rows={4}
          required
          defaultValue={initial?.inspiration}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="What inspired this piece?"
        />
      </div>

      <div>
        <label htmlFor="crafting_process" className="mb-1.5 block text-sm font-medium text-gray-700">
          Crafting Process
        </label>
        <textarea
          id="crafting_process"
          name="crafting_process"
          rows={6}
          required
          defaultValue={initial?.crafting_process}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Describe how this product is made..."
        />
      </div>

      <div>
        <label htmlFor="cultural_context" className="mb-1.5 block text-sm font-medium text-gray-700">
          Cultural Context (optional)
        </label>
        <textarea
          id="cultural_context"
          name="cultural_context"
          rows={3}
          defaultValue={initial?.cultural_context ?? ""}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Any cultural or historical significance..."
        />
      </div>

      <Button type="submit">Save story</Button>
    </form>
  );
}