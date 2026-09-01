import { getAdminProduct } from "@/lib/admin/actions";
import { reviewProduct } from "@/lib/admin/actions";
import { notFound } from "next/navigation";
import { ReviewFormClient } from "@/components/admin/review-form";

export default async function AdminProductReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getAdminProduct(id);

  if (!product) {
    notFound();
  }

  // Curried server action — reviewProduct(productId, decision, notes)
  const submitReview = async (productId: string, formData: FormData) => {
    const decision = String(formData.get("decision") || "") as "approve" | "reject" | "request_changes";
    const notes = String(formData.get("notes") || "");
    return reviewProduct(productId, decision, notes);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">{product.title}</h1>
      <p className="mt-1 text-gray-500">
        Submitted by {product.partner_profiles?.brand_name || "Unknown"}
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Description</h2>
            <p className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">{product.description}</p>
          </section>

          {product.product_stories && (
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Product Story</h2>
              <div className="mt-3 space-y-3 text-sm">
                {product.product_stories.inspiration && (
                  <div>
                    <p className="text-gray-500">Inspiration</p>
                    <p className="mt-1 text-gray-900">{product.product_stories.inspiration}</p>
                  </div>
                )}
                {product.product_stories.crafting_process && (
                  <div>
                    <p className="text-gray-500">Crafting Process</p>
                    <p className="mt-1 text-gray-900">{product.product_stories.crafting_process}</p>
                  </div>
                )}
                {product.product_stories.cultural_context && (
                  <div>
                    <p className="text-gray-500">Cultural Context</p>
                    <p className="mt-1 text-gray-900">{product.product_stories.cultural_context}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {product.makers && product.makers.length > 0 && (
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Maker</h2>
              {product.makers.map((maker: { id: string; name: string; craft_technique: string; bio: string | null }) => (
                <div key={maker.id} className="mt-3">
                  <p className="font-medium text-gray-900">{maker.name}</p>
                  <p className="text-sm text-gray-500">{maker.craft_technique}</p>
                  {maker.bio && <p className="mt-1 text-sm text-gray-600">{maker.bio}</p>}
                </div>
              ))}
            </section>
          )}
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Review</h2>
            <ReviewFormClient productId={product.id} action={submitReview} />
          </section>
        </div>
      </div>
    </div>
  );
}