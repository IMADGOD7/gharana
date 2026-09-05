import { getProfile } from "@/lib/auth/session";
import { getProduct } from "@/lib/products/actions";
import { ProductWizard } from "@/components/products/product-wizard";
import { notFound, redirect } from "next/navigation";

export default async function NewProductPage() {
  const profile = await getProfile();
  if (!profile) return redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create New Product</h1>
        <p className="mt-1 text-gray-500">
          Build your product listing step by step with craft stories, maker info, and media.
        </p>
      </div>

      <ProductWizard mode="create" />
    </div>
  );
}
