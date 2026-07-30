import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'bg-[hsl(var(--primary))] text-white border-transparent hover:bg-[hsl(var(--primary))]/80',
        secondary:
          'bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] border-transparent hover:bg-[hsl(var(--secondary))]/80',
        destructive:
          'bg-red-500/10 text-red-700 dark:text-red-400 border-transparent',
        success:
          'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-transparent',
        warning:
          'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-transparent',
        info:
          'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-transparent',
        outline: 'text-[hsl(var(--foreground))] border border-[hsl(var(--border))]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
