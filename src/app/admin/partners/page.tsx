import { getAllPartners } from "@/lib/admin/actions";

export default async function AdminPartnersPage() {
  const partners = await getAllPartners();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Partners</h1>
      <p className="mt-1 text-gray-500">
        {partners.length} registered partner{partners.length !== 1 ? "s" : ""}
      </p>

      <div className="mt-8 space-y-4">
        {partners.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-500">No partners yet.</p>
          </div>
        ) : (
          partners.map((partner) => (
            <div
              key={partner.id}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {partner.profiles?.full_name || "Unnamed Partner"}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {partner.brand_name || "No brand name"}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {partner.profiles?.email || "—"}
                  </p>
                </div>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                  Partner
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
