'use client';

export function CatalogSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="h-24 rounded-2xl bg-[var(--border-color)]/60" />

      {/* Toolbar Skeleton */}
      <div className="h-12 rounded-2xl bg-[var(--border-color)]/60" />

      {/* Grid Skeleton */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="glass h-80 rounded-3xl p-4 space-y-4"
          >
            <div className="h-40 rounded-2xl bg-[var(--border-color)]/50" />
            <div className="h-5 w-3/4 rounded-md bg-[var(--border-color)]/50" />
            <div className="h-4 w-1/2 rounded-md bg-[var(--border-color)]/50" />
            <div className="h-10 rounded-xl bg-[var(--border-color)]/50 mt-4" />
          </div>
        ))}
      </div>
    </div>
  );
}
