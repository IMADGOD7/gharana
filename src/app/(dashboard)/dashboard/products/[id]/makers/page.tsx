import { getMakers } from "@/lib/makers/actions";
import { getProduct } from "@/lib/products/actions";
import { notFound } from "next/navigation";
import { MakerFormClient } from "@/components/products/maker-form";

export default async function MakersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);
  const makers = await getMakers(id);

  if (!product) {
    notFound();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Makers</h1>
      <p className="mt-1 text-gray-500">Add artisan information for {product.title}</p>

      <div className="mt-8 space-y-8">
        <MakerFormClient productId={id} />

        {makers.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Added Makers</h2>
            <div className="mt-4 space-y-3">
              {makers.map((maker) => (
                <div key={maker.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <h3 className="font-medium text-gray-900">{maker.name}</h3>
                  <p className="text-sm text-gray-500">{maker.craft_technique}</p>
                  {maker.bio && <p className="mt-1 text-sm text-gray-600">{maker.bio}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}