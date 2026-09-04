import { getProduct } from "@/lib/products/actions";
import { getProductMedia, getMediaSignedUrl } from "@/lib/media/actions";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MediaGallery, type MediaItem } from "@/components/products/media-gallery";
import type { ProductWithRelations } from "@/lib/products/actions";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    notFound();
  }

  const story = (product as ProductWithRelations).product_stories;
  const makers = (product as ProductWithRelations).makers;

  // Fetch media with signed URLs for display
  const rawMedia = await getProductMedia(id);
  const media: MediaItem[] = await Promise.all(
    rawMedia.map(async (m) => {
      try {
        const signedUrl = await getMediaSignedUrl(m.storage_path, m.media_type);
        return { ...m, signed_url: signedUrl };
      } catch {
        return { ...m, signed_url: undefined };
      }
    })
  );

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{product.title}</h1>
            <StatusBadge status={product.status} />
          </div>
          <p className="mt-1 text-gray-500">{product.description}</p>
        </div>
        {product.status === "draft" && (
          <Link
            href={`/dashboard/products/${product.id}/edit`}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Edit
          </Link>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Details</h2>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">Category</dt>
                <dd className="mt-1 font-medium text-gray-900">{product.category || "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Price</dt>
                <dd className="mt-1 font-medium text-gray-900">
                  {product.price_min && product.price_max
                    ? `${product.currency} ${product.price_min} – ${product.price_max}`
                    : product.price_min
                      ? `${product.currency} ${product.price_min}`
                      : "—"}
                </dd>
              </div>
            </dl>
            {product.tags && product.tags.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-gray-500">Tags</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {product.tags.map((tag: string) => (
                    <span key={tag} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          <nav className="flex gap-3">
            <Link
              href={`/dashboard/products/${id}/story`}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Story {story ? "✓" : "(add)"}
            </Link>
            <Link
              href={`/dashboard/products/${id}/makers`}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Makers {makers?.length ? `(${makers.length})` : "(add)"}
            </Link>
            <Link
              href={`/dashboard/shops`}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Shop
            </Link>
          </nav>

          <MediaGallery
            productId={id}
            initialMedia={media}
            isDraft={product.status === "draft"}
          />
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Story</h2>
            {story?.inspiration || story?.crafting_process ? (
              <div className="mt-3 space-y-3 text-sm">
                {story.inspiration && (
                  <div>
                    <p className="text-gray-500">Inspiration</p>
                    <p className="mt-1 text-gray-900">{story.inspiration}</p>
                  </div>
                )}
                {story.crafting_process && (
                  <div>
                    <p className="text-gray-500">Crafting Process</p>
                    <p className="mt-1 text-gray-900">{story.crafting_process}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-500">No story added yet.</p>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Maker</h2>
            {makers && makers.length > 0 && makers[0] ? (
              <div className="mt-3 text-sm">
                <p className="font-medium text-gray-900">{makers[0].name}</p>
                <p className="text-gray-500">{makers[0].craft_technique}</p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-500">No maker information added.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    submitted: "bg-blue-100 text-blue-700",
    changes_requested: "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
  };

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] || "bg-gray-100"}`}>
      {status.replace("_", " ")}
    </span>
  );
}