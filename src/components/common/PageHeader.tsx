import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface PageHeaderProps {
  title: string;
  description?: string;
  showBackButton?: boolean;
  backHref?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  };
}

export function PageHeader({
  title,
  description,
  showBackButton = false,
  backHref,
  action,
}: PageHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backHref) {
      navigate(backHref);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between border-b border-[hsl(var(--border))]/50 pb-5 mb-6">
      <div className="flex items-center gap-3">
        {showBackButton && (
          <Button
            variant="outline"
            size="icon"
            onClick={handleBack}
            className="h-9 w-9 rounded-lg"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </Button>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {description}
            </p>
          )}
        </div>
      </div>

      {action && (
        <div className="mt-3 md:mt-0 flex shrink-0 items-center gap-2">
          <Button
            variant={action.variant || 'default'}
            onClick={action.onClick}
            className="flex items-center gap-2"
          >
            {action.icon}
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
}
