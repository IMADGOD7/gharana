"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProduct } from "@/lib/products/actions";
import { ProductForm } from "@/components/products/product-form";

export default function NewProductPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleAction(formData: FormData): Promise<{ ok: boolean; error?: string; data?: { id: string } }> {
    setError(null);
    const result = await createProduct(formData);
    if (result.ok) {
      router.push(`/dashboard/products/${result.data.id}`);
    } else {
      setError(result.error || "Failed to create product");
    }
    return result;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">New Product</h1>
      <p className="mt-1 text-gray-500">
        Fill in the basic details. You can add stories, maker info, and media later.
      </p>
      <div className="mt-8 max-w-2xl">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <ProductForm action={handleAction} submitLabel="Save as Draft" />
      </div>
    </div>
  );
}