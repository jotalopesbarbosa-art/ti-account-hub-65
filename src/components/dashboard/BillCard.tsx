import { Bill, getBillStatus, getCategoryLabel } from '@/types/bill';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Trash2
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface BillCardProps {
  bill: Bill;
  onProtocol: (id: string) => void;
  onDelete: (id: string) => void;
  delay?: number;
}

const categoryIcons = {
  internet: Wifi,
  telefone: Phone,
  software: Monitor,
  hardware: HardDrive,
  outros: MoreHorizontal,
};

export const BillCard = ({ bill, onProtocol, onDelete, delay = 0 }: BillCardProps) => {
  const status = getBillStatus(bill);
  const CategoryIcon = categoryIcons[bill.category];

  const statusConfig = {
    pending: {
      label: 'Pendente',
      className: 'bg-primary/10 text-primary border-primary/20',
      icon: Clock,
    },
    'due-soon': {
      label: 'Vence em breve',
      className: 'bg-warning/10 text-warning border-warning/20',
      icon: AlertTriangle,
    },
    overdue: {
      label: 'Vencida',
      className: 'bg-destructive/10 text-destructive border-destructive/20 animate-pulse-glow',
      icon: AlertTriangle,
    },
    protocoled: {
      label: 'Protocolada',
      className: 'bg-success/10 text-success border-success/20',
      icon: CheckCircle2,
    },
  };

  const StatusIcon = statusConfig[status].icon;

  const dueDate = new Date(bill.dueDate);
  const isOverdue = status === 'overdue';

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border bg-card/50 backdrop-blur-xl p-5 transition-all duration-300 hover:bg-card/80',
        status === 'overdue' && !bill.isProtocoled && 'border-destructive/30',
        status === 'due-soon' && !bill.isProtocoled && 'border-warning/30',
        bill.isProtocoled && 'border-success/30 opacity-75',
        'opacity-0 animate-slide-in'
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className={cn(
            'rounded-lg p-2.5 shrink-0',
            bill.isProtocoled ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'
          )}>
            <CategoryIcon className="h-5 w-5" />
          </div>
          
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold truncate">{bill.name}</h3>
              <Badge 
                variant="outline" 
                className={cn('text-xs shrink-0', statusConfig[status].className)}
              >
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig[status].label}
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground truncate">{bill.description}</p>
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(dueDate, "dd 'de' MMM", { locale: ptBR })}
              </span>
              <span className="text-xs">
                {isOverdue && !bill.isProtocoled
                  ? `Venceu ${formatDistanceToNow(dueDate, { locale: ptBR, addSuffix: true })}`
                  : !bill.isProtocoled && `Vence ${formatDistanceToNow(dueDate, { locale: ptBR, addSuffix: true })}`
                }
                {bill.isProtocoled && bill.protocoledAt && 
                  `Protocolada ${formatDistanceToNow(new Date(bill.protocoledAt), { locale: ptBR, addSuffix: true })}`
                }
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="text-lg font-bold">
              {bill.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
            <p className="text-xs text-muted-foreground">{getCategoryLabel(bill.category)}</p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!bill.isProtocoled && (
                <DropdownMenuItem onClick={() => onProtocol(bill.id)}>
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

      {!bill.isProtocoled && status !== 'protocoled' && (
        <div className="mt-4 pt-4 border-t border-border/50">
          <Button 
            onClick={() => onProtocol(bill.id)}
            variant="outline"
            className="w-full bg-success/5 border-success/30 text-success hover:bg-success/10 hover:text-success"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Marcar como Protocolada
          </Button>
        </div>
      )}
    </div>
  );
};
