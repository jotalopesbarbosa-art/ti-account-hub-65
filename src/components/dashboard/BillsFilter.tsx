import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Clock, AlertTriangle, CheckCircle2, List } from "lucide-react";

export type FilterType = "all" | "pending" | "overdue" | "protocoled";

interface BillsFilterProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  counts: Record<FilterType, number>;
}

export const BillsFilter = ({
  activeFilter,
  onFilterChange,
  counts,
}: BillsFilterProps) => {
  const filters: { value: FilterType; label: string; icon: typeof List }[] = [
    { value: "all", label: "Todas", icon: List },
    { value: "pending", label: "Pendentes", icon: Clock },
    { value: "overdue", label: "Vencidas", icon: AlertTriangle },
    { value: "protocoled", label: "Protocoladas", icon: CheckCircle2 },
  ];

  return (
    <div className="relative w-full">
      {/* fade nas laterais (cara de app) */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-background to-transparent" />

      {/* barra rolável no mobile */}
      <div className="w-full overflow-x-auto px-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div
          className={cn(
            "flex flex-nowrap items-center gap-2 py-1",
            "min-w-max",
            "snap-x snap-mandatory"
          )}
        >
          {filters.map(({ value, label, icon: Icon }) => {
            const active = activeFilter === value;

            return (
              <Button
                key={value}
                type="button"
                variant="outline"
                onClick={() => onFilterChange(value)}
                className={cn(
                  "snap-start",
                  "h-9 sm:h-10",
                  "px-2.5 sm:px-3",
                  "inline-flex items-center justify-center gap-2",
                  "rounded-full", // pill fica bem mais “mobile”
                  "whitespace-nowrap",
                  "transition-all duration-200",
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card/60 hover:bg-card border-border/60"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />

                {/* no mobile some o texto pra não ficar um trambolho */}
                <span className="hidden sm:inline text-sm leading-none">
                  {label}
                </span>

                <span
                  className={cn(
                    "inline-flex items-center justify-center",
                    "h-5 sm:h-5",
                    "min-w-[1.25rem]",
                    "rounded-full px-1.5",
                    "text-[11px] leading-none",
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
    </div>
  );
};
