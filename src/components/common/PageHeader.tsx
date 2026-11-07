import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export interface PageHeaderAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  className?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  showBackButton?: boolean;
  backHref?: string;
  action?: PageHeaderAction;
  actions?: PageHeaderAction[];
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  showBackButton = false,
  backHref,
  action,
  actions,
  children,
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

      {(action || actions || children) && (
        <div className="mt-3 md:mt-0 flex shrink-0 items-center gap-2 flex-wrap">
          {actions
            ? actions.map((act, idx) => (
                <Button
                  key={idx}
                  variant={act.variant || 'default'}
                  onClick={act.onClick}
                  className={`flex items-center gap-2 ${act.className || ''}`}
                >
                  {act.icon}
                  {act.label}
                </Button>
              ))
            : action ? (
                <Button
                  variant={action.variant || 'default'}
                  onClick={action.onClick}
                  className={`flex items-center gap-2 ${action.className || ''}`}
                >
                  {action.icon}
                  {action.label}
                </Button>
              ) : null}
          {children}
        </div>
      )}
    </div>
  );
}
