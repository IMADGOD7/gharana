import { getProduct } from "@/lib/products/actions";
import { notFound } from "next/navigation";
import { ProductWizard } from "@/components/products/product-wizard";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    notFound();
  }

  if (product.status !== "draft") {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-yellow-200 bg-yellow-50 p-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 mb-4">
          <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-yellow-800">Product Cannot Be Edited</h1>
        <p className="mt-2 text-sm text-yellow-600 max-w-sm">
          This product has already been submitted for review and can no longer be edited.
        </p>
      </div>
    );
  }

  const initial = {
    title: product.title,
    description: product.description,
    category: product.category ?? "",
    tags: product.tags?.join(", ") ?? "",
    price_min: product.price_min?.toString() ?? "",
    price_max: product.price_max?.toString() ?? "",
    currency: product.currency,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
        <p className="mt-1 text-gray-500">
          Update your product details. Changes are saved as draft.
        </p>
      </div>

      <ProductWizard mode="edit" productId={product.id} initial={initial} />
    </div>
  );
}
