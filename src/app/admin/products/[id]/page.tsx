import { getAdminProduct, getSubmissionHistory } from "@/lib/admin/actions";
import { notFound } from "next/navigation";
import { ReviewFormClient } from "@/components/admin/review-form";
import { SubmissionTimeline } from "@/components/shared/submission-timeline";

export default async function AdminProductReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, history] = await Promise.all([
    getAdminProduct(id),
    getSubmissionHistory(id),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{product.title}</h1>
            <StatusBadge status={product.status} />
          </div>
          <p className="mt-1 text-gray-500">
            by {product.partner_profiles?.brand_name || "Unknown Partner"} ·{" "}
            {product.profiles?.full_name || "Unknown"}
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Description</h2>
            <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
              {product.description}
            </p>
          </section>

          {/* Story */}
          {product.product_stories && (
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Product Story</h2>
              <div className="space-y-4">
                {product.product_stories.inspiration && (
                  <StoryField label="Inspiration" value={product.product_stories.inspiration} />
                )}
                {product.product_stories.crafting_process && (
                  <StoryField label="Crafting Process" value={product.product_stories.crafting_process} />
                )}
                {product.product_stories.cultural_context && (
                  <StoryField label="Cultural Context" value={product.product_stories.cultural_context} />
                )}
              </div>
            </section>
          )}

          {/* Makers */}
          {product.makers && product.makers.length > 0 && (
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Maker Information</h2>
              <div className="space-y-4">
                {product.makers.map((maker: { id: string; name: string; craft_technique: string; bio: string | null; years_of_experience: number | null; location: string | null }) => (
                  <div key={maker.id} className="rounded-lg bg-gray-50/50 border border-gray-100 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-sm font-semibold text-brand">
                        {maker.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{maker.name}</p>
                        <p className="text-xs text-gray-500">{maker.craft_technique}</p>
                      </div>
                    </div>
                    {maker.bio && (
                      <p className="mt-3 text-sm text-gray-600">{maker.bio}</p>
                    )}
                    <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                      {maker.years_of_experience && (
                        <span>{maker.years_of_experience} years experience</span>
                      )}
                      {maker.location && <span>{maker.location}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Submission History */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Submission History</h2>
            <SubmissionTimeline history={history} />
          </section>
        </div>

        {/* Sidebar - Review */}
        <div className="space-y-6">
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Review</h2>
            <ReviewFormClient productId={product.id} />
          </section>

          {/* Product Details Sidebar */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Product Details</h3>
            <dl className="space-y-3 text-sm">
              <DetailItem label="Category" value={product.category || "—"} />
              <DetailItem
                label="Price Range"
                value={
                  product.price_min && product.price_max
                    ? `${product.currency} ${product.price_min.toLocaleString()} – ${product.price_max.toLocaleString()}`
                    : product.price_min
                      ? `${product.currency} ${product.price_min.toLocaleString()}`
                      : "—"
                }
              />
              <DetailItem
                label="Submitted"
                value={new Date(product.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
              />
              {product.submitted_at && (
                <DetailItem
                  label="Submitted At"
                  value={new Date(product.submitted_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                />
              )}
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}

function StoryField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-sm text-gray-700 leading-relaxed">{value}</p>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-900">{value}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    draft: { label: "Draft", className: "bg-gray-100 text-gray-700" },
    submitted: { label: "Under Review", className: "bg-blue-100 text-blue-700" },
    changes_requested: { label: "Action Required", className: "bg-amber-100 text-amber-700" },
    approved: { label: "Approved", className: "bg-emerald-100 text-emerald-700" },
    rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
  };

  const badgeConfig = (config[status] ?? config.draft)!;
  const { label, className } = badgeConfig;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
