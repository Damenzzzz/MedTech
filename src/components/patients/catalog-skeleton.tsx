'use client';

export function CatalogSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="h-24 rounded-2xl bg-slate-200/80" />

      {/* Toolbar Skeleton */}
      <div className="h-12 rounded-2xl bg-slate-200/80" />

      {/* Grid Skeleton */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-80 rounded-3xl border border-slate-200 bg-white p-4 space-y-4"
          >
            <div className="h-40 rounded-2xl bg-slate-200/70" />
            <div className="h-5 w-3/4 rounded-md bg-slate-200/70" />
            <div className="h-4 w-1/2 rounded-md bg-slate-200/70" />
            <div className="h-10 rounded-xl bg-slate-200/70 mt-4" />
          </div>
        ))}
      </div>
    </div>
  );
}
