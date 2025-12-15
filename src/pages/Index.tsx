import { useMemo, useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useBills } from "@/hooks/useBills";
import type { ProtocolPayload } from "@/hooks/useBills";
import { getBillStatus } from "@/types/bill";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { BillCard } from "@/components/dashboard/BillCard";
import { AddBillDialog } from "@/components/dashboard/AddBillDialog";
import { BillsFilter, FilterType } from "@/components/dashboard/BillsFilter";
import { BillsSearch } from "@/components/dashboard/BillsSearch";
import type { SearchMode } from "@/components/dashboard/BillsSearch";
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

// =====================
// Helpers
// =====================
function toMonthKey(dateIso: string) {
  const d = new Date(dateIso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthLabelPtBR(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, (m ?? 1) - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

type BillLike = {
  id: string;
  dueDate: string;
  isProtocoled: boolean;

  title?: string | null;
  name?: string | null;
  vendor?: string | null;
  company?: string | null;
  description?: string | null;
  amount?: number | null;

  // ✅ search fields (direto ou dentro do protocol)
  boletoNumber?: string | null;
  invoiceNumber?: string | null;
  protocol?: {
    boletoNumber?: string | null;
    invoiceNumber?: string | null;
  } | null;
};

function billLabel(bill: BillLike) {
  return (
    bill.title ||
    bill.name ||
    bill.vendor ||
    bill.company ||
    bill.description ||
    `Conta ${String(bill.id).slice(0, 6)}`
  );
}

function pickCompanyLabel(bill: BillLike) {
  return bill.company || bill.vendor || bill.name || bill.title || billLabel(bill);
}

function normKey(s: string) {
  return (s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function safeStr(v: any) {
  return (v ?? "").toString();
}

function billBoletoNumber(b: BillLike) {
  return safeStr((b as any).boletoNumber) || safeStr((b as any).protocol?.boletoNumber) || "";
}

function billInvoiceNumber(b: BillLike) {
  return safeStr((b as any).invoiceNumber) || safeStr((b as any).protocol?.invoiceNumber) || "";
}

function billCompanyText(b: BillLike) {
  return pickCompanyLabel(b);
}

// bônus: busca geral também pega título/descrição (fica “inteligente”)
function billGeneralText(b: BillLike) {
  return `${billCompanyText(b)} ${billLabel(b)} ${safeStr(b.description)}`;
}

function formatMoneyBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Index() {
  const { bills, addBill, protocolBill, deleteBill, stats } = useBills();

  const [filter, setFilter] = useState<FilterType>("all");

  // ✅ começa em "auto" -> a gente resolve pro mês atual quando tiver dados
  const [monthFilter, setMonthFilter] = useState<string>("auto");

  // ✅ filtro por empresa/fornecedor (único por nome)
  const [companyFilterKey, setCompanyFilterKey] = useState<string>("all");

  // ✅ SEARCH
  const [search, setSearch] = useState<string>("");
  const [searchMode, setSearchMode] = useState<SearchMode>("all");

  const handleProtocol = (id: string, payload?: ProtocolPayload) => {
    protocolBill(id, payload);
    toast.success("Conta marcada como protocolada!");
  };

  const handleDelete = (id: string) => {
    deleteBill(id);
    toast.success("Conta excluída com sucesso!");
  };

  // ✅ toggle: clicou no mesmo filtro -> volta pra all
  const toggleFilter = useCallback((next: FilterType) => {
    setFilter((cur) => (cur === next ? "all" : next));
  }, []);

  // ✅ mês atual do calendário (YYYY-MM)
  const currentMonthKey = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }, []);

  const monthOptions = useMemo(() => {
    const keys = Array.from(
      new Set((bills as BillLike[]).map((b) => toMonthKey(b.dueDate)))
    );
    return keys.sort((a, b) => a.localeCompare(b));
  }, [bills]);

  // ✅ resolve o mês "real" (auto -> mês atual, se existir; senão -> all)
  const resolvedMonthFilter = useMemo(() => {
    if (monthFilter !== "auto") return monthFilter;
    return monthOptions.includes(currentMonthKey) ? currentMonthKey : "all";
  }, [monthFilter, monthOptions, currentMonthKey]);

  // ✅ auto-seta UMA vez quando tiver monthOptions (e só se estiver em "auto")
  useEffect(() => {
    if (monthFilter !== "auto") return;

    if (monthOptions.includes(currentMonthKey)) setMonthFilter(currentMonthKey);
    else setMonthFilter("all");
  }, [monthFilter, monthOptions, currentMonthKey]);

  // ✅ bills dentro do mês selecionado (ou todos)
  const billsInSelectedMonth = useMemo(() => {
    return (bills as BillLike[])
      .filter((b) =>
        resolvedMonthFilter === "all"
          ? true
          : toMonthKey(b.dueDate) === resolvedMonthFilter
      )
      .sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      );
  }, [bills, resolvedMonthFilter]);

  // ✅ opções únicas por empresa/fornecedor, baseado no mês selecionado
  const companyOptions = useMemo(() => {
    const map = new Map<string, { key: string; label: string; count: number }>();

    for (const b of billsInSelectedMonth) {
      const label = pickCompanyLabel(b);
      const key = normKey(label);

      const cur = map.get(key);
      if (!cur) map.set(key, { key, label, count: 1 });
      else map.set(key, { ...cur, count: cur.count + 1 });
    }

    return Array.from(map.values()).sort((a, b) =>
      a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" })
    );
  }, [billsInSelectedMonth]);

  // ✅ reset automático: mudou mês, volta empresa pra "all"
  useEffect(() => {
    setCompanyFilterKey("all");
  }, [resolvedMonthFilter]);

  // ✅ se a empresa selecionada sumir, volta pra all
  useEffect(() => {
    if (companyFilterKey === "all") return;
    const stillExists = companyOptions.some((c) => c.key === companyFilterKey);
    if (!stillExists) setCompanyFilterKey("all");
  }, [companyOptions, companyFilterKey]);

  // ✅ escopo final: mês + empresa
  const scopedBills = useMemo(() => {
    return (bills as BillLike[]).filter((bill) => {
      if (
        resolvedMonthFilter !== "all" &&
        toMonthKey(bill.dueDate) !== resolvedMonthFilter
      )
        return false;

      if (companyFilterKey !== "all") {
        const label = pickCompanyLabel(bill);
        const key = normKey(label);
        if (key !== companyFilterKey) return false;
      }

      return true;
    });
  }, [bills, resolvedMonthFilter, companyFilterKey]);

  // ✅ SEARCH (aplica depois do scopo)
  const searchedBills = useMemo(() => {
    const q = normKey(search || "");
    if (!q) return scopedBills;

    return scopedBills.filter((b) => {
      const company = normKey(billCompanyText(b));
      const boleto = normKey(billBoletoNumber(b));
      const nf = normKey(billInvoiceNumber(b));
      const general = normKey(billGeneralText(b));

      if (searchMode === "company") return company.includes(q) || general.includes(q);
      if (searchMode === "boleto") return boleto.includes(q);
      if (searchMode === "nf") return nf.includes(q);

      // all
      return (
        company.includes(q) ||
        boleto.includes(q) ||
        nf.includes(q) ||
        general.includes(q)
      );
    });
  }, [scopedBills, search, searchMode]);

  const filteredBills = useMemo(() => {
    return searchedBills
      .filter((bill) => {
        const status = getBillStatus(bill as any);
        switch (filter) {
          case "pending":
            return (
              !bill.isProtocoled &&
              (status === "pending" || status === "due-soon")
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
        const statusA = getBillStatus(a as any);
        const statusB = getBillStatus(b as any);

        if (a.isProtocoled !== b.isProtocoled) return a.isProtocoled ? 1 : -1;
        if (statusA === "overdue" && statusB !== "overdue") return -1;
        if (statusB === "overdue" && statusA !== "overdue") return 1;

        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
  }, [searchedBills, filter]);

  // ✅ counts coerentes com search + scopo
  const filterCounts = useMemo(() => {
    return {
      all: searchedBills.length,
      pending: searchedBills.filter(
        (b) =>
          !b.isProtocoled &&
          ["pending", "due-soon"].includes(getBillStatus(b as any))
      ).length,
      overdue: searchedBills.filter(
        (b) => !b.isProtocoled && getBillStatus(b as any) === "overdue"
      ).length,
      protocoled: searchedBills.filter((b) => b.isProtocoled).length,
    };
  }, [searchedBills]);

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
                <h1 className="text-xl font-bold tracking-tight">
                  IT Bills Dashboard
                </h1>
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
          <StatsCard
            title="Total de Contas"
            value={stats.total}
            icon={Receipt}
            delay={0}
            onClick={() => toggleFilter("all")}
            active={filter === "all"}
          />

          <StatsCard
            title="Pendentes"
            value={stats.pending + stats.dueSoon}
            icon={Clock}
            subtitle={
              stats.dueSoon > 0 ? `${stats.dueSoon} vencem em breve` : undefined
            }
            delay={100}
            onClick={() => toggleFilter("pending")}
            active={filter === "pending"}
          />

          <StatsCard
            title="Vencidas"
            value={stats.overdue}
            icon={AlertTriangle}
            variant={stats.overdue > 0 ? "destructive" : "default"}
            subtitle={stats.overdue > 0 ? "Requer atenção!" : "Nenhuma vencida"}
            delay={200}
            onClick={() => toggleFilter("overdue")}
            active={filter === "overdue"}
          />

          <StatsCard
            title="Protocoladas"
            value={stats.protocoled}
            icon={CheckCircle2}
            variant={stats.protocoled > 0 ? "success" : "default"}
            delay={300}
            onClick={() => toggleFilter("protocoled")}
            active={filter === "protocoled"}
          />

          <StatsCard
            title="Total Pendente"
            value={formatMoneyBRL(stats.totalAmount)}
            icon={Wallet}
            variant={stats.totalAmount > 5000 ? "warning" : "default"}
            delay={400}
            onClick={() => toggleFilter("pending")}
            active={filter === "pending"}
          />
        </div>

        {/* Filter and Bills List */}
        <div className="space-y-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Contas Cadastradas</h2>
            </div>

            <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm p-4">
              <div className="grid grid-cols-1 lg:grid-cols-[260px_320px_1fr] gap-3 items-end">
                {/* filtro do MÊS */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Mês
                  </span>
                  <select
                    value={resolvedMonthFilter}
                    onChange={(e) => setMonthFilter(e.target.value)}
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="all">Todos</option>
                    {monthOptions.map((m) => (
                      <option key={m} value={m}>
                        {monthLabelPtBR(m)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* empresas/fornecedores (único por nome) */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Empresa / Fornecedor
                  </span>
                  <select
                    value={companyFilterKey}
                    onChange={(e) => setCompanyFilterKey(e.target.value)}
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
                    disabled={companyOptions.length === 0}
                  >
                    <option value="all">
                      {companyOptions.length === 0
                        ? "Nenhuma conta nesse mês"
                        : "Todas as empresas"}
                    </option>

                    {companyOptions.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label} ({c.count})
                      </option>
                    ))}
                  </select>
                </div>

                {/* filtro status */}
                <div className="lg:justify-self-end">
                  <BillsFilter
                    activeFilter={filter}
                    onFilterChange={setFilter}
                    counts={filterCounts}
                  />
                </div>
              </div>

              {/* ✅ SEARCH */}
              <div className="mt-4">
                <BillsSearch
                  value={search}
                  onChange={setSearch}
                  mode={searchMode}
                  onModeChange={setSearchMode}
                  disabled={scopedBills.length === 0}
                />
              </div>
            </div>
          </div>

          {filteredBills.length === 0 ? (
            <div className="text-center py-12 bg-card/30 rounded-xl border border-border/50">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-1">
                Nenhuma conta encontrada
              </h3>
              <p className="text-sm text-muted-foreground">
                {filter === "all" && !search.trim()
                  ? 'Clique em "Nova Conta" para cadastrar a primeira conta.'
                  : "Não há contas com o filtro/pesquisa selecionado."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredBills.map((bill, index) => (
                <BillCard
                  key={bill.id}
                  bill={bill as any}
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
}
