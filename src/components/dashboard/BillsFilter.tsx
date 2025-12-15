import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Clock, AlertTriangle, CheckCircle2, List } from "lucide-react";

export type FilterType = "all" | "pending" | "overdue" | "protocoled";

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
    { value: "all", label: "Todas", icon: List },
    { value: "pending", label: "Pendentes", icon: Clock },
    { value: "overdue", label: "Vencidas", icon: AlertTriangle },
    { value: "protocoled", label: "Protocoladas", icon: CheckCircle2 },
  ];

  return (
    // ✅ não deixa quebrar linha; se faltar espaço, rola (e não desce)
    <div className="w-full overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex flex-nowrap items-center justify-end gap-2 min-w-max">
        {filters.map(({ value, label, icon: Icon }) => {
          const active = activeFilter === value;

          return (
            <Button
              key={value}
              type="button"
              variant="outline"
              onClick={() => onFilterChange(value)}
              className={cn(
                "h-10 px-3 inline-flex items-center justify-center gap-2 rounded-md",
                "transition-all duration-200",
                "whitespace-nowrap",
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card/50 hover:bg-card"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="text-sm leading-none">{label}</span>

              <span
                className={cn(
                  "ml-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-2 text-[11px] leading-none",
                  active
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-foreground"
                )}
              >
                {counts[value]}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );

};
