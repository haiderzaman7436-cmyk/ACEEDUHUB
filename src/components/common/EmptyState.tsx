import { Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
}

export function EmptyState({
  title = 'No results found',
  description = 'There is no data to show in this view right now.',
  icon = <Inbox className="h-10 w-10 text-[hsl(var(--muted-foreground))] opacity-60" />,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-[350px] flex-col items-center justify-center rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card))]/50 p-8 text-center animate-fade-in">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[hsl(var(--muted))] mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-[hsl(var(--foreground))]">
        {title}
      </h3>
      <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))] max-w-sm leading-relaxed">
        {description}
      </p>
      {action && (
        <Button
          variant="outline"
          onClick={action.onClick}
          className="mt-6 flex items-center gap-2 border-[hsl(var(--primary))]/30 text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/5 hover:text-[hsl(var(--primary))]"
        >
          {action.icon}
          {action.label}
        </Button>
      )}
    </div>
  );
}
