"use client";

import { useState } from "react";
import Link from "next/link";
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
  const initial: Partial<ProductFormData> = {
    title: product.title,
    description: product.description,
    category: product.category ?? "",
    tags: product.tags?.join(", ") ?? "",
    price_min: product.price_min?.toString() ?? "",
    price_max: product.price_max?.toString() ?? "",
    currency: product.currency,
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
      <p className="mt-1 text-gray-500">
        Update your product details. Changes are saved as draft.
      </p>
      <div className="mt-8 max-w-2xl">
        <ProductForm mode="edit" productId={product.id} initial={initial} submitLabel="Save changes" />
      </div>
    </div>
  );
}
