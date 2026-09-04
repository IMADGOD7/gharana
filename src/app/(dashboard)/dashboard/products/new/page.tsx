// ============================================================
// New Product Page (T4)
// Server component. Renders ProductForm (client component).
// ============================================================

import { ProductForm } from "@/components/products/product-form";

export default function NewProductPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">New Product</h1>
      <p className="mt-1 text-gray-500">
        Fill in the basic details. You can add stories, maker info, and media later.
      </p>
      <div className="mt-8 max-w-2xl">
        <ProductForm mode="create" submitLabel="Save as Draft" />
      </div>
    </div>
  );
}
