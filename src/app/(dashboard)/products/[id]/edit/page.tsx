import { getProduct } from "@/lib/products/actions";
import { notFound } from "next/navigation";
import { EditProductForm } from "@/components/products/edit-product-form";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    notFound();
  }

  if (product.status !== "draft") {
    return (
      <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-8 text-center">
        <h1 className="text-lg font-semibold text-yellow-800">Product Cannot Be Edited</h1>
        <p className="mt-2 text-sm text-yellow-600">
          This product has already been submitted for review and can no longer be edited.
        </p>
      </div>
    );
  }

  const editProduct = {
    id: product.id,
    title: product.title,
    description: product.description,
    category: product.category,
    tags: product.tags ?? [],
    price_min: product.price_min,
    price_max: product.price_max,
    currency: product.currency,
    status: product.status,
  };

  return <EditProductForm product={editProduct} />;
}