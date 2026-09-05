import { getProduct } from "@/lib/products/actions";
import { getProductMedia, getMediaSignedUrl } from "@/lib/media/actions";
import { notFound } from "next/navigation";
import { MediaGallery, type MediaItem } from "@/components/products/media-gallery";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  AlertTriangle,
  FileText,
  Users,
  Image,
  Edit3,
  Calendar,
  Tag,
  IndianRupee,
} from "lucide-react";
import type { ProductWithRelations } from "@/lib/products/actions";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    notFound();
  }

  const story = (product as ProductWithRelations).product_stories;
  const makers = (product as ProductWithRelations).makers;

  const rawMedia = await getProductMedia(id);
  const media: MediaItem[] = await Promise.all(
    rawMedia.map(async (m) => {
      try {
        const signedUrl = await getMediaSignedUrl(m.storage_path, m.media_type);
        return { ...m, signed_url: signedUrl };
      } catch (err) {
        console.error(`Failed to get signed URL for ${m.storage_path}:`, m, err);
        return { ...m, signed_url: undefined, _error: true };
      }
    })
  );

  const isDraft = product.status === "draft";
  const needsChanges = product.status === "changes_requested";

  return (
    <div className="space-y-6">
      {/* Review Feedback Banner */}
      {needsChanges && product.admin_notes && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-900">Changes Requested</h3>
              <p className="mt-1 text-sm text-red-700">{product.admin_notes}</p>
              {product.rejection_reason && (
                <p className="mt-1 text-sm text-red-600">{product.rejection_reason}</p>
              )}
              <div className="mt-3 flex items-center gap-3">
                <Link
                  href={`/dashboard/products/${id}/edit`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Make Changes
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{product.title}</h1>
            <StatusBadge status={product.status} />
          </div>
          <p className="mt-1 text-gray-500">{product.description}</p>
        </div>
        {isDraft && (
          <Link
            href={`/dashboard/products/${id}/edit`}
            className="btn-secondary shrink-0"
          >
            <Edit3 className="h-4 w-4" />
            Edit
          </Link>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Product Details Card */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Product Details</h2>
            <dl className="grid grid-cols-2 gap-5">
              <DetailItem icon={Tag} label="Category" value={product.category || "—"} />
              <DetailItem
                icon={IndianRupee}
                label="Price Range"
                value={
                  product.price_min && product.price_max
                    ? `${product.currency} ${product.price_min.toLocaleString()} – ${product.price_max.toLocaleString()}`
                    : product.price_min
                      ? `${product.currency} ${product.price_min.toLocaleString()}`
                      : "—"
                }
              />
              {product.tags && product.tags.length > 0 && (
                <div className="col-span-2">
                  <dt className="text-sm text-gray-500 mb-2">Tags</dt>
                  <dd className="flex flex-wrap gap-2">
                    {product.tags.map((tag: string) => (
                      <span key={tag} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700 font-medium">
                        {tag}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
            </dl>

            {/* Tab Navigation */}
            <nav className="mt-6 flex gap-1 border-t border-gray-100 pt-4">
              <TabLink href={`/dashboard/products/${id}/story`} icon={FileText} label="Story" hasContent={!!story?.inspiration} />
              <TabLink href={`/dashboard/products/${id}/makers`} icon={Users} label="Makers" hasContent={makers && makers.length > 0} count={makers?.length} />
            </nav>
          </section>

          {/* Media Gallery */}
          <MediaGallery
            productId={id}
            initialMedia={media}
            isDraft={isDraft}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Story Summary */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Craft Story</h3>
            {story?.inspiration || story?.crafting_process ? (
              <div className="space-y-3 text-sm">
                {story.inspiration && (
                  <div>
                    <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Inspiration</p>
                    <p className="mt-1 text-gray-600">{story.inspiration}</p>
                  </div>
                )}
                {story.crafting_process && (
                  <div>
                    <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Crafting Process</p>
                    <p className="mt-1 text-gray-600 line-clamp-3">{story.crafting_process}</p>
                  </div>
                )}
                {story.cultural_context && (
                  <div>
                    <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Cultural Context</p>
                    <p className="mt-1 text-gray-600">{story.cultural_context}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No story added yet.</p>
            )}
          </section>

          {/* Maker Summary */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Maker</h3>
            {makers && makers.length > 0 && makers[0] ? (
              <div className="text-sm">
                <p className="font-medium text-gray-900">{makers[0].name}</p>
                <p className="text-gray-500">{makers[0].craft_technique}</p>
                {makers[0].years_of_experience && (
                  <p className="text-xs text-gray-400 mt-1">{makers[0].years_of_experience} years experience</p>
                )}
                {makers[0].location && (
                  <p className="text-xs text-gray-400">{makers[0].location}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No maker information added.</p>
            )}
          </section>

          {/* Timestamps */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Timeline</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-gray-500">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>Created {new Date(product.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>Updated {new Date(product.updated_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
              </div>
              {product.submitted_at && (
                <div className="flex items-center gap-2 text-gray-500">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>Submitted {new Date(product.submitted_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-sm text-gray-500">
        <Icon className="h-4 w-4 text-gray-400" />
        {label}
      </dt>
      <dd className="mt-1 font-medium text-gray-900">{value}</dd>
    </div>
  );
}

function TabLink({
  href,
  icon: Icon,
  label,
  hasContent,
  count,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hasContent?: boolean;
  count?: number;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
    >
      <Icon className="h-4 w-4 text-gray-400" />
      {label}
      {hasContent && <span className="text-emerald-500">✓</span>}
      {count !== undefined && count > 0 && !hasContent && (
        <span className="text-xs text-gray-400">({count})</span>
      )}
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    draft: { label: "Draft", className: "bg-gray-100 text-gray-700" },
    submitted: { label: "Under Review", className: "bg-blue-100 text-blue-700" },
    changes_requested: { label: "Action Required", className: "bg-red-100 text-red-700" },
    approved: { label: "Approved / Live", className: "bg-emerald-100 text-emerald-700" },
    rejected: { label: "Rejected", className: "bg-gray-100 text-gray-500" },
  };

  const badgeConfig = config[status] ?? config.draft;
  const { label, className } = badgeConfig!;

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
