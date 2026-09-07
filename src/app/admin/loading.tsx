import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboardLoading() {
  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-80" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-4">
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-8 w-8" />
          </div>
        ))}
      </div>

      {/* Pending Reviews Section */}
      <div>
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between border-b border-gray-100 last:border-b-0 px-5 py-4"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                <div>
                  <Skeleton className="h-4 w-40 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <Skeleton className="h-8 w-20 ml-4" />
            </div>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5"
            >
              <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
