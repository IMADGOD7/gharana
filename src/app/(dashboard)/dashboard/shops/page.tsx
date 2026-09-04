import { getPartnerShops } from "@/lib/shops/actions";
import { ShopFormClient } from "@/components/products/shop-form";

export default async function ShopsPage() {
  const shops = await getPartnerShops();

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Shops</h1>
          <p className="mt-1 text-gray-500">
            Manage your shop locations and details
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        {shops.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-500">No shops added yet.</p>
          </div>
        ) : (
          shops.map((shop) => (
            <div
              key={shop.id}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{shop.name}</h3>
                    {shop.is_primary && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        Primary
                      </span>
                    )}
                  </div>
                  {shop.description && (
                    <p className="mt-1 text-sm text-gray-500">{shop.description}</p>
                  )}
                  <p className="mt-2 text-xs text-gray-400">
                    {[shop.address, shop.city, shop.state].filter(Boolean).join(", ") || "No address"}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {shop.phone || shop.email || shop.website || "No contact info"}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}

        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">Add New Shop</h2>
          <div className="mt-4 max-w-2xl">
            <ShopFormClient />
          </div>
        </div>
      </div>
    </div>
  );
}
