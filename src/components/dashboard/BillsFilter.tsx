import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Clock, AlertTriangle, CheckCircle2, List } from 'lucide-react';

export type FilterType = 'all' | 'pending' | 'overdue' | 'protocoled';

interface BillsFilterProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  counts: {
    all: number;
    pending: number;
    overdue: number;
    protocoled: number;
  };
}

export const BillsFilter = ({ activeFilter, onFilterChange, counts }: BillsFilterProps) => {
  const filters: { value: FilterType; label: string; icon: typeof List }[] = [
    { value: 'all', label: 'Todas', icon: List },
    { value: 'pending', label: 'Pendentes', icon: Clock },
    { value: 'overdue', label: 'Vencidas', icon: AlertTriangle },
    { value: 'protocoled', label: 'Protocoladas', icon: CheckCircle2 },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map(({ value, label, icon: Icon }) => (
        <Button
          key={value}
          variant="outline"
          size="sm"
          onClick={() => onFilterChange(value)}
          className={cn(
            'transition-all duration-200',
            activeFilter === value 
              ? 'bg-primary text-primary-foreground border-primary' 
              : 'bg-card/50 hover:bg-card'
          )}
        >
          <Icon className="h-4 w-4 mr-1.5" />
          {label}
          <span className={cn(
            'ml-1.5 text-xs px-1.5 py-0.5 rounded-full',
            activeFilter === value 
              ? 'bg-primary-foreground/20' 
              : 'bg-muted'
          )}>
            {counts[value]}
          </span>
        </Button>
      ))}
    </div>
  );
};
