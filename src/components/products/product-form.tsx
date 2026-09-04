"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { createProduct, updateProduct } from "@/lib/products/actions";
import type { ProductFormData } from "@/lib/products/actions";

interface ProductFormProps {
  mode: "create" | "edit";
  productId?: string;
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

export function ProductForm({ mode, productId, initial, submitLabel }: ProductFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleAction(formData: FormData) {
    setError(null);
    setSuccess(false);

    const result = mode === "create"
      ? await createProduct(formData)
      : await updateProduct(productId!, formData);

    if (result.ok) {
      if (mode === "create") {
        const created = result as { ok: true; data: { id: string } };
        router.push(`/dashboard/products/${created.data.id}`);
      } else {
        setSuccess(true);
        router.refresh();
      }
    } else {
      setError(result.error || "Something went wrong");
    }
  }

  return (
    <form action={handleAction} className="space-y-6" suppressHydrationWarning>
      {error && (
        <Alert variant="error">{error}</Alert>
      )}
      {success && mode === "edit" && (
        <Alert variant="success">Product updated successfully.</Alert>
      )}

      <div className="space-y-4">
        <Input
          label="Product Title"
          name="title"
          required
          defaultValue={initial?.title}
          placeholder="e.g., Handwoven Silk Scarf"
          suppressHydrationWarning
        />

        <Textarea
          label="Description"
          name="description"
          required
          defaultValue={initial?.description}
          placeholder="Describe your product in detail..."
          suppressHydrationWarning
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
          suppressHydrationWarning
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
            suppressHydrationWarning
          />
          <Input
            label="Max Price"
            name="price_max"
            type="number"
            step="0.01"
            min="0"
            defaultValue={initial?.price_max}
            placeholder="0.00"
            suppressHydrationWarning
          />
        </div>

        <Input
          label="Currency"
          name="currency"
          defaultValue={initial?.currency ?? "INR"}
          placeholder="INR"
          suppressHydrationWarning
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
