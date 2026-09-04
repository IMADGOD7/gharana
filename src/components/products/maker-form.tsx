"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { addMakerAction } from "@/lib/makers/actions";

interface MakerFormProps {
  productId: string;
  onSuccess?: () => void;
}

export function MakerFormClient({ productId }: MakerFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleAction(formData: FormData) {
    setError(null);
    setSuccess(false);
    const result = await addMakerAction(formData);
    if (result.ok) {
      setSuccess(true);
      router.refresh();
    } else {
      setError(result.error || "Failed to add maker");
    }
  }

  if (success) {
    return <p className="text-sm text-green-700">Maker added.</p>;
  }

  return (
    <form action={handleAction} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
      {/* Hidden field so the server action knows which product */}
      <input type="hidden" name="productId" value={productId} />
      <h2 className="text-lg font-semibold text-gray-900">Add Maker</h2>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-gray-700">
            Name *
          </label>
          <input
            id="name"
            name="name"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="craft_technique" className="mb-1.5 block text-sm font-medium text-gray-700">
            Craft Technique *
          </label>
          <input
            id="craft_technique"
            name="craft_technique"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div>
        <label htmlFor="bio" className="mb-1.5 block text-sm font-medium text-gray-700">
          Bio
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="years_of_experience" className="mb-1.5 block text-sm font-medium text-gray-700">
            Years of Experience
          </label>
          <input
            id="years_of_experience"
            name="years_of_experience"
            type="number"
            min="0"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="location" className="mb-1.5 block text-sm font-medium text-gray-700">
            Location
          </label>
          <input
            id="location"
            name="location"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>
      <Button type="submit">Add Maker</Button>
    </form>
  );
}
