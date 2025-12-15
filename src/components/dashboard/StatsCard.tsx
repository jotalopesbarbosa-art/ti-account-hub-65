import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'destructive';
  subtitle?: string;
  delay?: number;
}

export const StatsCard = ({ 
  title, 
  value, 
  icon: Icon, 
  variant = 'default',
  subtitle,
  delay = 0 
}: StatsCardProps) => {
  const variantStyles = {
    default: 'border-border/50 bg-card/50',
    success: 'border-success/30 bg-success/5 glow-success',
    warning: 'border-warning/30 bg-warning/5 glow-warning',
    destructive: 'border-destructive/30 bg-destructive/5 glow-destructive',
  };

  const iconStyles = {
    default: 'text-primary bg-primary/10',
    success: 'text-success bg-success/10',
    warning: 'text-warning bg-warning/10',
    destructive: 'text-destructive bg-destructive/10',
  };

  return (
    <div 
      className={cn(
        'relative overflow-hidden rounded-xl border p-6 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02]',
        variantStyles[variant],
        'opacity-0 animate-fade-in'
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className={cn('rounded-lg p-3', iconStyles[variant])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
};
