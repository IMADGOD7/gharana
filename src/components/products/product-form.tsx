"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import type { ProductFormData } from "@/lib/products/actions";

interface ProductFormProps {
  action: (formData: FormData) => Promise<{ ok: boolean; error?: string; data?: { id: string } }>;
  initial?: Partial<ProductFormData>;
  submitLabel?: string;
}

function SubmitButton({ submitLabel }: { submitLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving..." : submitLabel || "Save product"}
    </Button>
  );
}

export function ProductForm({ action, initial, submitLabel }: ProductFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleAction(formData: FormData) {
    setError(null);
    setSuccess(false);
    const result = await action(formData);
    if (result.ok) {
      setSuccess(true);
    } else {
      setError(result.error || "Something went wrong");
    }
  }

  if (success) {
    return (
      <Alert variant="success">
        Product saved as draft. You can continue editing or submit it for review.
      </Alert>
    );
  }

  return (
    <form action={handleAction} className="space-y-6">
      {error && (
        <Alert variant="error">{error}</Alert>
      )}

      <div className="space-y-4">
        <Input
          label="Product Title"
          name="title"
          required
          defaultValue={initial?.title}
          placeholder="e.g., Handwoven Silk Scarf"
        />

        <Textarea
          label="Description"
          name="description"
          required
          defaultValue={initial?.description}
          placeholder="Describe your product in detail..."
        />

        <Select
          label="Category"
          name="category"
          defaultValue={initial?.category ?? ""}
          options={[
            { value: "", label: "Select a category" },
            { value: "textiles", label: "Textiles" },
            { value: "pottery", label: "Pottery" },
            { value: "jewelry", label: "Jewelry" },
            { value: "paintings", label: "Paintings" },
            { value: "sculptures", label: "Sculptures" },
            { value: "furniture", label: "Furniture" },
            { value: "other", label: "Other" },
          ]}
        />

        <Input
          label="Tags"
          name="tags"
          defaultValue={initial?.tags}
          placeholder="handmade, silk, traditional (comma-separated)"
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Min Price"
            name="price_min"
            type="number"
            step="0.01"
            min="0"
            defaultValue={initial?.price_min}
            placeholder="0.00"
          />
          <Input
            label="Max Price"
            name="price_max"
            type="number"
            step="0.01"
            min="0"
            defaultValue={initial?.price_max}
            placeholder="0.00"
          />
        </div>

        <Input
          label="Currency"
          name="currency"
          defaultValue={initial?.currency ?? "INR"}
          placeholder="INR"
        />
      </div>

      <div className="flex gap-3">
        <SubmitButton submitLabel={submitLabel} />
        <a
          href="/dashboard/products"
          className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}