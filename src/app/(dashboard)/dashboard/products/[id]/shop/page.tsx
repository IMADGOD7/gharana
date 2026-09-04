import { getProduct } from "@/lib/products/actions";
import { getPartnerShops } from "@/lib/shops/actions";
import { notFound } from "next/navigation";
import { ShopFormClient } from "@/components/products/shop-form";

export default async function ProductShopPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    notFound();
  }

  const shops = await getPartnerShops();

  // Find if any shop is associated (using first shop as default for now)
  const associatedShop = shops.length > 0 ? shops[0] : null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Shop Information</h1>
      <p className="mt-1 text-gray-500">
        Add shop details for {product.title}
      </p>
      <div className="mt-8 max-w-2xl">
        <ShopFormClient productId={id} initial={associatedShop} allShops={shops} />
      </div>
    </div>
  );
}
