import { useState } from 'react';
import { useBills } from '@/hooks/useBills';
import { getBillStatus } from '@/types/bill';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { BillCard } from '@/components/dashboard/BillCard';
import { AddBillDialog } from '@/components/dashboard/AddBillDialog';
import { BillsFilter, FilterType } from '@/components/dashboard/BillsFilter';
import { 
  Receipt, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Wallet,
  Server
} from 'lucide-react';
import { toast } from 'sonner';

const Index = () => {
  const { bills, addBill, protocolBill, deleteBill, stats } = useBills();
  const [filter, setFilter] = useState<FilterType>('all');

  const handleProtocol = (id: string) => {
    protocolBill(id);
    toast.success('Conta marcada como protocolada!');
  };

  const handleDelete = (id: string) => {
    deleteBill(id);
    toast.success('Conta excluída com sucesso!');
  };

  const filteredBills = bills.filter((bill) => {
    const status = getBillStatus(bill);
    switch (filter) {
      case 'pending':
        return !bill.isProtocoled && (status === 'pending' || status === 'due-soon');
      case 'overdue':
        return !bill.isProtocoled && status === 'overdue';
      case 'protocoled':
        return bill.isProtocoled;
      default:
        return true;
    }
  }).sort((a, b) => {
    // Sort by: overdue first, then by due date
    const statusA = getBillStatus(a);
    const statusB = getBillStatus(b);
    
    if (a.isProtocoled !== b.isProtocoled) return a.isProtocoled ? 1 : -1;
    if (statusA === 'overdue' && statusB !== 'overdue') return -1;
    if (statusB === 'overdue' && statusA !== 'overdue') return 1;
    
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const filterCounts = {
    all: bills.length,
    pending: bills.filter((b) => !b.isProtocoled && ['pending', 'due-soon'].includes(getBillStatus(b))).length,
    overdue: bills.filter((b) => !b.isProtocoled && getBillStatus(b) === 'overdue').length,
    protocoled: bills.filter((b) => b.isProtocoled).length,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2.5 glow-primary">
                <Server className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">IT Bills Dashboard</h1>
                <p className="text-sm text-muted-foreground">Gestão de contas do time de T.I</p>
              </div>
            </div>
            <AddBillDialog onAdd={addBill} />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatsCard
            title="Total de Contas"
            value={stats.total}
            icon={Receipt}
            delay={0}
          />
          <StatsCard
            title="Pendentes"
            value={stats.pending + stats.dueSoon}
            icon={Clock}
            subtitle={stats.dueSoon > 0 ? `${stats.dueSoon} vencem em breve` : undefined}
            delay={100}
          />
          <StatsCard
            title="Vencidas"
            value={stats.overdue}
            icon={AlertTriangle}
            variant={stats.overdue > 0 ? 'destructive' : 'default'}
            subtitle={stats.overdue > 0 ? 'Requer atenção!' : 'Nenhuma vencida'}
            delay={200}
          />
          <StatsCard
            title="Protocoladas"
            value={stats.protocoled}
            icon={CheckCircle2}
            variant={stats.protocoled > 0 ? 'success' : 'default'}
            delay={300}
          />
          <StatsCard
            title="Total Pendente"
            value={stats.totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            icon={Wallet}
            variant={stats.totalAmount > 5000 ? 'warning' : 'default'}
            delay={400}
          />
        </div>

        {/* Filter and Bills List */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Contas Cadastradas</h2>
            <BillsFilter 
              activeFilter={filter} 
              onFilterChange={setFilter}
              counts={filterCounts}
            />
          </div>

          {filteredBills.length === 0 ? (
            <div className="text-center py-12 bg-card/30 rounded-xl border border-border/50">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-1">Nenhuma conta encontrada</h3>
              <p className="text-sm text-muted-foreground">
                {filter === 'all' 
                  ? 'Clique em "Nova Conta" para cadastrar a primeira conta.'
                  : 'Não há contas com o filtro selecionado.'
                }
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredBills.map((bill, index) => (
                <BillCard
                  key={bill.id}
                  bill={bill}
                  onProtocol={handleProtocol}
                  onDelete={handleDelete}
                  delay={index * 50}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
