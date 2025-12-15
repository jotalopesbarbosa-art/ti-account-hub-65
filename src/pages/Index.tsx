import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useBills } from "@/hooks/useBills";
import { getBillStatus } from "@/types/bill";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { BillCard } from "@/components/dashboard/BillCard";
import { AddBillDialog } from "@/components/dashboard/AddBillDialog";
import { BillsFilter, FilterType } from "@/components/dashboard/BillsFilter";
import { Button } from "@/components/ui/button";
import {
  Receipt,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Wallet,
  Server,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

function getMonthNumber(dateIso: string) {
  const d = new Date(dateIso);
  return d.getMonth() + 1; // 1..12
}

function monthLabelPtBR(month: number) {
  // month 1..12
  const d = new Date(2026, month - 1, 1); // ano qualquer só pra label
  return d.toLocaleDateString("pt-BR", { month: "long" });
}

function billLabel(bill: any) {
  // tenta pegar um nome decente (ajusta se teu tipo tiver campo específico)
  return (
    bill.title ||
    bill.name ||
    bill.vendor ||
    bill.company ||
    bill.description ||
    `Conta ${String(bill.id).slice(0, 6)}`
  );
}

const Index = () => {
  const { bills, addBill, protocolBill, deleteBill, stats } = useBills();
  const [filter, setFilter] = useState<FilterType>("all");

  // ✅ filtro estilo "empresas": primeiro mês, depois a conta do mês
  const [monthFilter, setMonthFilter] = useState<number | "all">("all");
  const [billFilterId, setBillFilterId] = useState<string>("all");

  const handleProtocol = (id: string) => {
    protocolBill(id);
    toast.success("Conta marcada como protocolada!");
  };

  const handleDelete = (id: string) => {
    deleteBill(id);
    toast.success("Conta excluída com sucesso!");
  };

  // ✅ meses disponíveis (somente mês, sem ano)
  const monthOptions = useMemo(() => {
    const months = Array.from(new Set(bills.map((b) => getMonthNumber(b.dueDate))));
    return months.sort((a, b) => a - b); // jan -> dez
  }, [bills]);

  // ✅ contas do mês selecionado (pra aparecer no select "de baixo")
  const billsInSelectedMonth = useMemo(() => {
    if (monthFilter === "all") return bills;

    return bills
      .filter((b) => getMonthNumber(b.dueDate) === monthFilter)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [bills, monthFilter]);

  // ✅ lista final filtrada (mês -> conta -> status)
  const filteredBills = useMemo(() => {
    const base = bills
      .filter((bill) => {
        // 1) mês
        if (monthFilter !== "all" && getMonthNumber(bill.dueDate) !== monthFilter) {
          return false;
        }

        // 2) conta específica (selecionada no dropdown de baixo)
        if (billFilterId !== "all" && bill.id !== billFilterId) {
          return false;
        }

        // 3) status (teu filtro original)
        const status = getBillStatus(bill);
        switch (filter) {
          case "pending":
            return (
              !bill.isProtocoled && (status === "pending" || status === "due-soon")
            );
          case "overdue":
            return !bill.isProtocoled && status === "overdue";
          case "protocoled":
            return bill.isProtocoled;
          default:
            return true;
        }
      })
      .sort((a, b) => {
        const statusA = getBillStatus(a);
        const statusB = getBillStatus(b);

        if (a.isProtocoled !== b.isProtocoled) return a.isProtocoled ? 1 : -1;
        if (statusA === "overdue" && statusB !== "overdue") return -1;
        if (statusB === "overdue" && statusA !== "overdue") return 1;

        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });

    return base;
  }, [bills, monthFilter, billFilterId, filter]);

  // ✅ counts recalculado em cima do "recorte" (mês + conta), pra bater com a realidade
  const filterCounts = useMemo(() => {
    const scope = bills.filter((bill) => {
      if (monthFilter !== "all" && getMonthNumber(bill.dueDate) !== monthFilter) return false;
      if (billFilterId !== "all" && bill.id !== billFilterId) return false;
      return true;
    });

    return {
      all: scope.length,
      pending: scope.filter(
        (b) =>
          !b.isProtocoled &&
          ["pending", "due-soon"].includes(getBillStatus(b))
      ).length,
      overdue: scope.filter(
        (b) => !b.isProtocoled && getBillStatus(b) === "overdue"
      ).length,
      protocoled: scope.filter((b) => b.isProtocoled).length,
    };
  }, [bills, monthFilter, billFilterId]);

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
                <p className="text-sm text-muted-foreground">
                  Gestão de contas do time de T.I
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link to="/analytics">
                <Button variant="outline" className="gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Analytics
                </Button>
              </Link>
              <AddBillDialog onAdd={addBill} />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatsCard title="Total de Contas" value={stats.total} icon={Receipt} delay={0} />
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
            variant={stats.overdue > 0 ? "destructive" : "default"}
            subtitle={stats.overdue > 0 ? "Requer atenção!" : "Nenhuma vencida"}
            delay={200}
          />
          <StatsCard
            title="Protocoladas"
            value={stats.protocoled}
            icon={CheckCircle2}
            variant={stats.protocoled > 0 ? "success" : "default"}
            delay={300}
          />
          <StatsCard
            title="Total Pendente"
            value={stats.totalAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            icon={Wallet}
            variant={stats.totalAmount > 5000 ? "warning" : "default"}
            delay={400}
          />
        </div>

        {/* Filter and Bills List */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Contas Cadastradas</h2>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center w-full sm:w-auto">
              {/* ✅ filtro do MÊS (tipo empresas) */}
              <div className="flex flex-col gap-2 w-full sm:w-[260px]">
                <span className="text-sm text-muted-foreground">Mês</span>
                <select
                  value={monthFilter === "all" ? "all" : String(monthFilter)}
                  onChange={(e) => {
                    const v = e.target.value;
                    setMonthFilter(v === "all" ? "all" : Number(v));
                    setBillFilterId("all"); // ✅ reseta a conta quando troca o mês
                  }}
                  className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="all">Todos</option>
                  {monthOptions.map((m) => (
                    <option key={m} value={m}>
                      {monthLabelPtBR(m)}
                    </option>
                  ))}
                </select>
              </div>

              {/* ✅ "embaixo aparece as contas do mês" */}
              <div className="flex flex-col gap-2 w-full sm:w-[320px]">
                <span className="text-sm text-muted-foreground">Contas do mês</span>
                <select
                  value={billFilterId}
                  onChange={(e) => setBillFilterId(e.target.value)}
                  className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  disabled={billsInSelectedMonth.length === 0}
                >
                  <option value="all">
                    {billsInSelectedMonth.length === 0
                      ? "Nenhuma conta nesse mês"
                      : "Todas as contas do mês"}
                  </option>

                  {billsInSelectedMonth.map((b) => (
                    <option key={b.id} value={b.id}>
                      {billLabel(b)}
                    </option>
                  ))}
                </select>
              </div>

              {/* ✅ teu filtro existente (status) */}
              <BillsFilter
                activeFilter={filter}
                onFilterChange={setFilter}
                counts={filterCounts}
              />
            </div>
          </div>

          {filteredBills.length === 0 ? (
            <div className="text-center py-12 bg-card/30 rounded-xl border border-border/50">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-1">Nenhuma conta encontrada</h3>
              <p className="text-sm text-muted-foreground">
                {filter === "all"
                  ? 'Clique em "Nova Conta" para cadastrar a primeira conta.'
                  : "Não há contas com o filtro selecionado."}
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
