import { useMemo, useState } from "react";
import { Bill, getBillStatus, getCategoryLabel } from "@/types/bill";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Wifi,
  Phone,
  Monitor,
  HardDrive,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProtocolBillModal } from "@/components/dashboard/ProtocolBillModal";

export type ProtocolPayload = { invoiceNumber?: string; boletoNumber?: string };

interface BillCardProps {
  bill: Bill;
  onProtocol: (id: string, payload?: ProtocolPayload) => void;
  onDelete: (id: string) => void;
  delay?: number;
}

const categoryIcons = {
  internet: Wifi,
  telefone: Phone,
  software: Monitor,
  hardware: HardDrive,
  outros: MoreHorizontal,
} as const;

export const BillCard = ({ bill, onProtocol, onDelete, delay = 0 }: BillCardProps) => {
  const status = getBillStatus(bill);
  const CategoryIcon = categoryIcons[bill.category];

  const [protocolOpen, setProtocolOpen] = useState(false);

  // ✅ evita badge vazia (ex: "   ")
  const invoice = useMemo(() => bill.invoiceNumber?.trim(), [bill.invoiceNumber]);
  const boleto = useMemo(() => bill.boletoNumber?.trim(), [bill.boletoNumber]);
  const hasProtocolRefs = bill.isProtocoled && (!!invoice || !!boleto);

  const statusConfig = {
    pending: {
      label: "Pendente",
      className: "bg-primary/10 text-primary border-primary/20",
      icon: Clock,
    },
    "due-soon": {
      label: "Vence já já",
      className: "bg-warning/10 text-warning border-warning/20",
      icon: AlertTriangle,
    },
    overdue: {
      label: "Vencida",
      className: "bg-destructive/10 text-destructive border-destructive/20",
      icon: AlertTriangle,
    },
    protocoled: {
      label: "Protocolada",
      className: "bg-success/10 text-success border-success/20",
      icon: CheckCircle2,
    },
  } as const;

  const StatusIcon = statusConfig[status].icon;
  const dueDate = new Date(bill.dueDate);

  const subtitle = (() => {
    if (bill.isProtocoled && bill.protocoledAt) {
      return `Protocolada ${formatDistanceToNow(new Date(bill.protocoledAt), {
        locale: ptBR,
        addSuffix: true,
      })}`;
    }
    if (status === "overdue" && !bill.isProtocoled) {
      return `Venceu ${formatDistanceToNow(dueDate, { locale: ptBR, addSuffix: true })}`;
    }
    if (!bill.isProtocoled) {
      return `Vence ${formatDistanceToNow(dueDate, { locale: ptBR, addSuffix: true })}`;
    }
    return "";
  })();

  const handleOpenProtocol = () => setProtocolOpen(true);

  const handleConfirmProtocol = (payload?: ProtocolPayload) => {
    onProtocol(bill.id, payload);
    setProtocolOpen(false);
  };

  return (
    <>
      <div
        className={cn(
          "group relative overflow-hidden rounded-xl border bg-card/50 backdrop-blur-xl",
          "px-4 py-3 transition-all duration-200 hover:bg-card/80",
          "opacity-0 animate-slide-in",
          status === "overdue" && !bill.isProtocoled && "border-destructive/30",
          status === "due-soon" && !bill.isProtocoled && "border-warning/30",
          bill.isProtocoled && "border-success/30 opacity-80"
        )}
        style={{ animationDelay: `${delay}ms` }}
      >
        <div className="flex items-start justify-between gap-3">
          {/* ESQUERDA */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div
              className={cn(
                "rounded-lg p-2 shrink-0",
                bill.isProtocoled ? "bg-success/10 text-success" : "bg-primary/10 text-primary"
              )}
            >
              <CategoryIcon className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="font-semibold text-sm truncate">{bill.name}</h3>

                <Badge
                  variant="outline"
                  className={cn("text-[11px] h-5 px-2 shrink-0", statusConfig[status].className)}
                >
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusConfig[status].label}
                </Badge>
              </div>

              {bill.description ? (
                <p className="text-xs text-muted-foreground truncate mt-0.5">{bill.description}</p>
              ) : null}

              <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(dueDate, "dd 'de' MMM", { locale: ptBR })}
                </span>
                <span className="truncate">{subtitle}</span>
              </div>

              {/* ✅ NF + BOLETO: só aparece quando protocolada e tiver valor */}
              {hasProtocolRefs ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {invoice ? (
                    <Badge
                      variant="outline"
                      className="text-[11px] h-5 px-2 bg-success/10 text-success border-success/20"
                    >
                      NF: <span className="ml-1 font-semibold">{invoice}</span>
                    </Badge>
                  ) : null}

                  {boleto ? (
                    <Badge
                      variant="outline"
                      className="text-[11px] h-5 px-2 bg-success/10 text-success border-success/20"
                    >
                      Boleto: <span className="ml-1 font-semibold">{boleto}</span>
                    </Badge>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          {/* DIREITA */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right leading-tight">
              <p className="text-base font-bold">
                {bill.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
              <p className="text-[11px] text-muted-foreground">{getCategoryLabel(bill.category)}</p>
            </div>

            {!bill.isProtocoled && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleOpenProtocol}
                className="h-8 px-2.5 border-success/30 text-success hover:bg-success/10 hover:text-success"
                title="Marcar como Protocolada"
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!bill.isProtocoled && (
                  <DropdownMenuItem onClick={handleOpenProtocol}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Marcar como Protocolada
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => onDelete(bill.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <ProtocolBillModal
        open={protocolOpen}
        onOpenChange={setProtocolOpen}
        billName={bill.name}
        onConfirm={handleConfirmProtocol}
      />
    </>
  );
};
