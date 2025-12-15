import { useEffect, useMemo, useState } from "react";
import { Search, X, Building2, Barcode, ReceiptText } from "lucide-react";
import { cn } from "@/lib/utils";

export type SearchMode = "all" | "company" | "boleto" | "nf";

type BillsSearchProps = {
  value: string;
  onChange: (next: string) => void;
  mode: SearchMode;
  onModeChange: (m: SearchMode) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

function Chip({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition",
        active
          ? "bg-primary text-primary-foreground border-primary/40 shadow-sm"
          : "bg-background hover:bg-accent/50 border-border"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

export function BillsSearch({
  value,
  onChange,
  mode,
  onModeChange,
  placeholder = "Pesquisar por operadora, nº do boleto ou NF…",
  disabled,
  className,
}: BillsSearchProps) {
  const [local, setLocal] = useState(value);

  // debounce: só “commita” depois de 250ms
  useEffect(() => {
    setLocal(value);
  }, [value]);

  useEffect(() => {
    const t = setTimeout(() => onChange(local), 250);
    return () => clearTimeout(t);
  }, [local, onChange]);

  const effectivePlaceholder = useMemo(() => {
    switch (mode) {
      case "company":
        return "Pesquisar por operadora/empresa…";
      case "boleto":
        return "Pesquisar por nº do boleto…";
      case "nf":
        return "Pesquisar por nº da nota fiscal…";
      default:
        return placeholder;
    }
  }, [mode, placeholder]);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm px-3 py-2",
          disabled && "opacity-60 pointer-events-none"
        )}
      >
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          placeholder={effectivePlaceholder}
          className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
          disabled={disabled}
        />
        {local?.trim() ? (
          <button
            type="button"
            onClick={() => setLocal("")}
            className="rounded-md p-2 hover:bg-accent/40"
            aria-label="Limpar pesquisa"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip active={mode === "all"} onClick={() => onModeChange("all")} icon={Search}>
          Tudo
        </Chip>
        <Chip
          active={mode === "company"}
          onClick={() => onModeChange("company")}
          icon={Building2}
        >
          Operadora / Empresa
        </Chip>
        <Chip
          active={mode === "boleto"}
          onClick={() => onModeChange("boleto")}
          icon={Barcode}
        >
          Nº Boleto
        </Chip>
        <Chip
          active={mode === "nf"}
          onClick={() => onModeChange("nf")}
          icon={ReceiptText}
        >
          Nota Fiscal
        </Chip>
      </div>
    </div>
  );
}
