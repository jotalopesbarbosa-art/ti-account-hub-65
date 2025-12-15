import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant?: "default" | "success" | "warning" | "destructive";
  subtitle?: string;
  delay?: number;

  // ✅ novos
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}

export const StatsCard = ({
  title,
  value,
  icon: Icon,
  variant = "default",
  subtitle,
  delay = 0,
  onClick,
  active = false,
  disabled = false,
}: StatsCardProps) => {
  const variantStyles = {
    default: "border-border/50 bg-card/50",
    success: "border-success/30 bg-success/5 glow-success",
    warning: "border-warning/30 bg-warning/5 glow-warning",
    destructive: "border-destructive/30 bg-destructive/5 glow-destructive",
  };

  const iconStyles = {
    default: "text-primary bg-primary/10",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
    destructive: "text-destructive bg-destructive/10",
  };

  const ringStyles = {
    default: "ring-primary/25",
    success: "ring-success/25",
    warning: "ring-warning/25",
    destructive: "ring-destructive/25",
  };

  const clickable = typeof onClick === "function" && !disabled;
  const Comp: any = clickable ? "button" : "div";

  return (
    <Comp
      type={clickable ? "button" : undefined}
      onClick={clickable ? onClick : undefined}
      disabled={clickable ? disabled : undefined}
      aria-pressed={clickable ? active : undefined}
      className={cn(
        "relative overflow-hidden rounded-xl border p-6 backdrop-blur-xl transition-all duration-300",
        variantStyles[variant],
        "opacity-0 animate-fade-in",

        // ✅ interação
        clickable && "cursor-pointer hover:scale-[1.02] hover:bg-card/70",
        clickable && "focus:outline-none focus:ring-2 focus:ring-primary/30",

        // ✅ ativo (fica “selecionado”)
        active && "ring-2",
        active && ringStyles[variant],

        // ✅ disabled
        disabled && "opacity-60 pointer-events-none"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>

        <div className={cn("rounded-lg p-3", iconStyles[variant])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </Comp>
  );
};
