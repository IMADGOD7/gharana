"use client";

import { useState } from "react";
import Link from "next/link";
import { updateProduct } from "@/lib/products/actions";
import { ProductForm } from "@/components/products/product-form";
import type { ProductFormData } from "@/lib/products/actions";

interface EditProductFormProps {
  product: {
    id: string;
    title: string;
    description: string;
    category: string | null;
    tags: string[];
    price_min: number | null;
    price_max: number | null;
    currency: string;
    status: string;
  };
}

export function EditProductForm({ product }: EditProductFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const initial: Partial<ProductFormData> = {
    title: product.title,
    description: product.description,
    category: product.category ?? "",
    tags: product.tags?.join(", ") ?? "",
    price_min: product.price_min?.toString() ?? "",
    price_max: product.price_max?.toString() ?? "",
    currency: product.currency,
  };

  async function handleAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
    setError(null);
    setSuccess(false);
    const result = await updateProduct(product.id, formData);
    if (result.ok) {
      setSuccess(true);
      return { ok: true };
    } else {
      const errMsg = result.error || "Failed to update product";
      setError(errMsg);
      return { ok: false, error: errMsg };
    }
  }

  if (success) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
        <div className="mt-8 rounded-xl border border-green-200 bg-green-50 p-6 text-center">
          <p className="text-sm font-medium text-green-800">Product updated</p>
          <Link href={`/dashboard/products/${product.id}`} className="mt-2 inline-block text-sm text-blue-600 hover:underline">
            View product
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
      <p className="mt-1 text-gray-500">
        Update your product details. Changes are saved as draft.
      </p>
      <div className="mt-8 max-w-2xl">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <ProductForm mode="edit" productId={product.id} initial={initial} submitLabel="Save changes" />
      </div>
    </div>
  );
}