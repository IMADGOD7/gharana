import { getAllPartners } from "@/lib/admin/actions";
import { cn } from "@/lib/utils";
import { Users } from "lucide-react";

export default async function AdminPartnersPage() {
  const partners = await getAllPartners();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Partners</h1>
        <p className="mt-1 text-gray-500">
          {partners.length} registered partner{partners.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Partners List */}
      <div className="space-y-3">
        {partners.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
            <Users className="mx-auto h-10 w-10 text-gray-300 mb-3" />
            <h3 className="text-sm font-semibold text-gray-900">No partners yet</h3>
            <p className="mt-1 text-sm text-gray-500">Partners will appear here after they register.</p>
          </div>
        ) : (
          partners.map((partner) => {
            const initials = partner.profiles?.full_name
              ?.split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2) || "?";

            return (
              <div
                key={partner.id}
                className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:border-gray-300 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-semibold text-brand">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {partner.profiles?.full_name || "Unnamed Partner"}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {partner.brand_name || "No brand name"}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {partner.profiles?.email || "—"}
                    </p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                    Partner
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
