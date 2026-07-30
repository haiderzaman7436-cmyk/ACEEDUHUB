import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('rounded-md animate-shimmer bg-[hsl(var(--muted))]', className)}
      {...props}
    />
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full space-y-4 animate-pulse-soft">
      {/* Search Header skeleton */}
      <div className="flex items-center justify-between pb-2">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-10 w-24 rounded-xl" />
      </div>

      {/* Table grid skeleton */}
      <div className="rounded-2xl border border-[hsl(var(--border))] overflow-hidden bg-[hsl(var(--card))]">
        {/* Table Head */}
        <div className="flex border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/50 px-6 py-4">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={`head-${i}`} className="h-4 flex-1 rounded-md max-w-[150px]" />
          ))}
        </div>

        {/* Table Body */}
        <div className="divide-y divide-[hsl(var(--border))]/50">
          {Array.from({ length: rows }).map((_, r) => (
            <div key={`row-${r}`} className="flex items-center px-6 py-4 gap-4">
              {Array.from({ length: cols }).map((_, c) => (
                <Skeleton key={`cell-${r}-${c}`} className="h-5 flex-1 rounded-md max-w-[170px]" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-pulse-soft">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-[hsl(var(--border))] p-6 bg-[hsl(var(--card))] space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-24 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-4 w-32 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
