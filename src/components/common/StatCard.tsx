import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  className?: string;
  variant?: 'indigo' | 'emerald' | 'amber' | 'red' | 'blue' | 'violet';
}

const colorVariants = {
  indigo: {
    bg: 'bg-indigo-500/10 dark:bg-indigo-500/15',
    text: 'text-indigo-600 dark:text-indigo-400',
    iconBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  },
  emerald: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    text: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  amber: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/15',
    text: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  red: {
    bg: 'bg-red-500/10 dark:bg-red-500/15',
    text: 'text-red-600 dark:text-red-400',
    iconBg: 'bg-red-500/10 text-red-600 dark:text-red-400',
  },
  blue: {
    bg: 'bg-blue-500/10 dark:bg-blue-500/15',
    text: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  violet: {
    bg: 'bg-violet-500/10 dark:bg-violet-500/15',
    text: 'text-violet-600 dark:text-violet-400',
    iconBg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
};

export function StatCard({
  title,
  value,
  icon,
  trend,
  className,
  variant = 'indigo',
}: StatCardProps) {
  const colors = colorVariants[variant];

  return (
    <Card className={cn('overflow-hidden relative group hover:translate-y-[-2px] duration-300', className)}>
      {/* Decorative gradient overlay */}
      <div className="absolute top-0 right-0 h-24 w-24 rounded-bl-full bg-linear-to-bl from-[hsl(var(--primary))]/5 to-transparent transition-all duration-300 group-hover:scale-110" />

      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[hsl(var(--muted-foreground))]">
            {title}
          </p>
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-105', colors.iconBg)}>
            {icon}
          </div>
        </div>

        <div className="mt-4">
          <h3 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">
            {value}
          </h3>

          {trend && (
            <div className="flex items-center gap-1.5 mt-2">
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 text-xs font-semibold rounded-md px-1.5 py-0.5',
                  trend.isPositive
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                    : 'bg-red-500/10 text-red-700 dark:text-red-400'
                )}
              >
                {trend.isPositive ? (
                  <TrendingUp className="h-3 w-3 shrink-0" />
                ) : (
                  <TrendingDown className="h-3 w-3 shrink-0" />
                )}
                {trend.value}%
              </span>
              {trend.label && (
                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                  {trend.label}
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
