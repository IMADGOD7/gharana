import { getPartnerShops } from "@/lib/shops/actions";
import { ShopFormClient } from "@/components/products/shop-form";
import { cn } from "@/lib/utils";
import { Store, MapPin, Phone, Globe, Plus, Star } from "lucide-react";

export default async function ShopsPage() {
  const shops = await getPartnerShops();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Shops</h1>
          <p className="mt-1 text-gray-500">
            Manage your shop locations and details
          </p>
        </div>
      </div>

      {/* Shops Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {shops.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-gray-300 py-16 text-center">
            <Store className="mx-auto h-10 w-10 text-gray-300 mb-3" />
            <h3 className="text-sm font-semibold text-gray-900">No shops added yet</h3>
            <p className="mt-1 text-sm text-gray-500">Add your first shop location below.</p>
          </div>
        ) : (
          shops.map((shop) => (
            <div
              key={shop.id}
              className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:border-gray-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-50">
                    <Store className="h-5 w-5 text-gray-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900">{shop.name}</h3>
                      {shop.is_primary && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                          <Star className="h-3 w-3" />
                          Primary
                        </span>
                      )}
                    </div>
                    {shop.description && (
                      <p className="mt-1 text-sm text-gray-500">{shop.description}</p>
                    )}
                    <div className="mt-2 space-y-1">
                      {(shop.address || shop.city || shop.state) && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <MapPin className="h-3 w-3" />
                          {[shop.address, shop.city, shop.state].filter(Boolean).join(", ")}
                        </div>
                      )}
                      {shop.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <Phone className="h-3 w-3" />
                          {shop.phone}
                        </div>
                      )}
                      {shop.website && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <Globe className="h-3 w-3" />
                          {shop.website}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Shop Form */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Shop</h2>
        <div className="max-w-2xl">
          <ShopFormClient />
        </div>
      </div>
    </div>
  );
}
