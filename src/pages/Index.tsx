import { useMemo, useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
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
import { format } from "date-fns";

import { nocodb } from "@/lib/nocodbClient";
import { nocodbTables, nocodbLinks } from "@/lib/nocodb.config";

// =====================
// Helpers
// =====================
function reqId(name: string, v?: string) {
  if (!v) throw new Error(`[NocoDB] ENV ausente: ${name}`);
  return v;
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

function formatMoneyBRL(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function toMonthKey(dateIso: string) {
  const d = parseYmdLocal(dateIso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}


function monthLabelPtBR(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, (m ?? 1) - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function safeDateForDay(year: number, monthIndex0: number, day: number) {
  const lastDay = new Date(year, monthIndex0 + 1, 0).getDate();
  const d = Math.min(day, lastDay);
  return new Date(year, monthIndex0, d, 12, 0, 0);
}

// COMPETENCIA pode vir "2026-01" OU "2026-01-01"
function parseCompetenciaToDate(competencia: string) {
  const s = (competencia || "").trim();
  if (!s) return null;

  if (/^\d{4}-\d{2}$/.test(s)) {
    const [y, m] = s.split("-").map(Number);
    return new Date(y, (m ?? 1) - 1, 1, 12, 0, 0);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0);
  }

  const dt = new Date(s);
  return isNaN(dt.getTime()) ? null : dt;
}

// ✅ pega campo mesmo se tiver acento/maiúscula/variação
function getByNormKey(obj: any, wanted: string[]) {
  const keys = Object.keys(obj || {});
  const map = new Map(keys.map((k) => [normKey(k), k]));
  for (const w of wanted) {
    const real = map.get(normKey(w));
    if (real != null) return obj[real];
  }
  return undefined;
}

  function parseMoney(v: any): number {
    if (v == null) return 0;
    if (typeof v === "number") return Number.isFinite(v) ? v : 0;

    let s = String(v).trim();
    if (!s) return 0;

    // remove moeda e espaços
    s = s.replace(/[R$\s]/g, "");

    const hasComma = s.includes(",");
    const hasDot = s.includes(".");

    // Caso "1.234,56" (pt-BR) ou "1,234.56" (en-US)
    if (hasComma && hasDot) {
      const lastComma = s.lastIndexOf(",");
      const lastDot = s.lastIndexOf(".");

      if (lastComma > lastDot) {
        // pt-BR: "." milhar, "," decimal
        s = s.replace(/\./g, "").replace(",", ".");
      } else {
        // en-US: "," milhar, "." decimal
        s = s.replace(/,/g, "");
      }
    } else if (hasComma && !hasDot) {
      // "1234,56" -> decimal vírgula
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      // só ponto ou nada: "1234.56" ou "1234"
      s = s.replace(/,/g, "");
    }

    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }


function parseYmdLocal(dateIso: string) {
  const s = (dateIso || "").trim();
  // "yyyy-MM-dd"
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0);
  }
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? new Date() : dt;
}


// ✅ parse de data do NocoDB: "25-01-2026" (dd-MM-yyyy) ou "2026-01-25"
function parseNocoDate(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;

  const s = String(v).trim();
  if (!s) return null;

  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.split("-").map(Number);
    return new Date(yyyy, (mm ?? 1) - 1, dd ?? 1, 12, 0, 0);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [yyyy, mm, dd] = s.split("-").map(Number);
    return new Date(yyyy, (mm ?? 1) - 1, dd ?? 1, 12, 0, 0);
  }

  const dt = new Date(s);
  return isNaN(dt.getTime()) ? null : dt;
}

// =====================
// Noco types
// =====================
type NocoRecord<T> = { id: any; fields: T };

type SetorFields = { SETORES: string; EMAIL: string };

type ContaFields = {
  NOME?: string;
  "DESCRIÇÃO"?: string;
  VALOR?: any;
  DIA_VENCIMENTO?: any;
  DATA_VENCIMENTO?: any; // ✅ título único
};

type EmpresaFields = { EMPRESA_FORNECEDOR?: string };
type CategoriaFields = { CATEGORIA?: string };

type GeracaoFields = {
  COMPETENCIA?: string;
};

// =====================
// Noco helpers
// =====================
async function listLinkRecords<TFields>(
  tableId: string,
  linkFieldId: string,
  recordId: string
): Promise<Array<NocoRecord<TFields>>> {
  // @ts-ignore
  if (typeof nocodb.listLinkRecords === "function") {
    // @ts-ignore
    const res = await nocodb.listLinkRecords<TFields>(tableId, linkFieldId, recordId, {
      pageSize: 200,
    });
    return res.records || [];
  }

  // @ts-ignore
  if (typeof nocodb.request === "function") {
    // @ts-ignore
    const res = await nocodb.request(
      `/api/v3/data/${nocodb.projectId}/${tableId}/links/${linkFieldId}/${recordId}?pageSize=200`
    );
    return res.records || [];
  }

  throw new Error("Seu nocodbClient não tem listLinkRecords nem request().");
}

async function resolveLoggedSetorId(tables: { SETORES: string }) {
  const cached = localStorage.getItem("nc_setor_id");
  if (cached) return cached;

  const email = localStorage.getItem("nc_email");
  if (!email) throw new Error("Sessão sem email (nc_email). Faça login novamente.");

  // @ts-ignore
  const res = await nocodb.listRecords<SetorFields>(tables.SETORES, {
    where: `(EMAIL,eq,${email})`,
    pageSize: 1,
  });

  const setorId = res?.records?.[0]?.id;
  if (!setorId) throw new Error(`Setor não encontrado no NocoDB para EMAIL=${email}`);

  localStorage.setItem("nc_setor_id", String(setorId));
  return String(setorId);
}

// =====================
// UI bill shape
// =====================
type BillLike = {
  id: string;
  dueDate: string; // yyyy-MM-dd
  isProtocoled: boolean;

  name?: string | null;
  company?: string | null;
  description?: string | null;
  amount?: number | null;

  boletoNumber?: string | null;
  invoiceNumber?: string | null;
  protocol?: {
    boletoNumber?: string | null;
    invoiceNumber?: string | null;
  } | null;

  // extras
  contaId?: string;
  geracaoId?: string;
  competencia?: string;

  // pra não quebrar BillCard (que usa category)
  category?: any;
};

function billLabel(bill: BillLike) {
  return bill.name || bill.company || bill.description || `Conta ${String(bill.id).slice(0, 6)}`;
}

function pickCompanyLabel(bill: BillLike) {
  return bill.company || bill.name || billLabel(bill);
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

function billGeneralText(b: BillLike) {
  return `${billCompanyText(b)} ${billLabel(b)} ${safeStr(b.description)}`;
}

export default function Index() {
  // =====================
  // state
  // =====================
  const [loading, setLoading] = useState(false);
  const [bills, setBills] = useState<BillLike[]>([]);

  const [filter, setFilter] = useState<FilterType>("all");
  const [monthFilter, setMonthFilter] = useState<string>("auto");
  const [companyFilterKey, setCompanyFilterKey] = useState<string>("all");

  const [search, setSearch] = useState<string>("");
  const [searchMode, setSearchMode] = useState<SearchMode>("all");

  // =====================
  // Noco config (tables + links)
  // =====================
  const tables = useMemo(() => {
    return {
      SETORES: reqId("VITE_NOCODB_TABLE_SETORES", nocodbTables.SETORES),

      CONTAS: reqId("VITE_NOCODB_TABLE_CONTAS", nocodbTables.CONTAS),
      CATEGORIAS: reqId("VITE_NOCODB_TABLE_CATEGORIAS", nocodbTables.CATEGORIAS),
      EMPRESAS: reqId("VITE_NOCODB_TABLE_EMPRESAS_FORNECEDORES", nocodbTables.EMPRESAS_FORNECEDORES),

      GERACOES: reqId("VITE_NOCODB_TABLE_GERACOES_RECORRENCIA", nocodbTables.GERACOES_RECORRENCIA),
    };
  }, []);

  const links = useMemo(() => {
    return {
      SETOR_CONTAS: reqId("VITE_NOCODB_LINK_SETOR_CONTAS", nocodbLinks.SETOR_CONTAS),

      CONTA_EMPRESA: reqId("VITE_NOCODB_LINK_CONTA_EMPRESA", nocodbLinks.CONTA_EMPRESA),
      CONTA_CATEGORIA: reqId("VITE_NOCODB_LINK_CONTA_CATEGORIA", nocodbLinks.CONTA_CATEGORIA),
      CONTA_GERACOES: reqId(
        "VITE_NOCODB_LINK_CONTA_GERACOES_RECORRENCIA",
        nocodbLinks.CONTA_GERACOES_RECORRENCIA
      ),
    };
  }, []);

    // =====================
    // Load bills from NocoDB
    // =====================
    const loadBills = useCallback(async () => {
      setLoading(true);
      try {
        const setorId = await resolveLoggedSetorId({ SETORES: tables.SETORES });

        const contas = await listLinkRecords<ContaFields>(
          tables.SETORES,
          links.SETOR_CONTAS,
          setorId
        );

        const empresaCache = new Map<string, string>();
        const categoriaCache = new Map<string, string>();

        const allBills: BillLike[] = [];

        for (const conta of contas) {
          const contaId = String(conta.id);
          const f: any = conta.fields || {};

          const nome = String(getByNormKey(f, ["NOME"]) ?? "");
          const desc = String(getByNormKey(f, ["DESCRIÇÃO", "DESCRICAO"]) ?? "");

          const valorRaw = getByNormKey(f, ["VALOR"]);
          const valor = parseMoney(valorRaw);

          // ✅ DEBUG (remove depois)
          if (valor === 0 && valorRaw != null && String(valorRaw).trim() !== "" && String(valorRaw) !== "0") {
            console.log("[DEBUG VALOR ZEROU]", { contaId, valorRaw, parsed: valor, fields: f });
          }

          const dia = Number(getByNormKey(f, ["DIA_VENCIMENTO"]) ?? 1) || 1;

          const dataVencRaw = getByNormKey(f, ["DATA_VENCIMENTO"]);
          const dataVenc = parseNocoDate(dataVencRaw);

          // 2) empresa (label)
          let empresaLabel = "";
          try {
            const empLinks = await listLinkRecords<EmpresaFields>(
              tables.CONTAS,
              links.CONTA_EMPRESA,
              contaId
            );
            const empId = empLinks?.[0]?.id != null ? String(empLinks[0].id) : "";
            if (empId) {
              if (!empresaCache.has(empId)) {
                empresaCache.set(empId, empLinks[0]?.fields?.EMPRESA_FORNECEDOR || "");
              }
              empresaLabel = empresaCache.get(empId) || "";
            }
          } catch {
            // ignora
          }

          // 3) categoria (cache)
          try {
            const catLinks = await listLinkRecords<CategoriaFields>(
              tables.CONTAS,
              links.CONTA_CATEGORIA,
              contaId
            );
            const catId = catLinks?.[0]?.id != null ? String(catLinks[0].id) : "";
            if (catId && !categoriaCache.has(catId)) {
              categoriaCache.set(catId, catLinks[0]?.fields?.CATEGORIA || "");
            }
          } catch {
            // ignora
          }

          // ✅ se tiver DATA_VENCIMENTO, cria 1 card e pronto
          if (dataVenc) {
            allBills.push({
              id: `${contaId}-single`,
              contaId,
              dueDate: format(dataVenc, "yyyy-MM-dd"),
              isProtocoled: false,
              name: nome || null,
              company: empresaLabel || null,
              description: desc || null,
              amount: valor,
              category: "outros",
            });
            continue;
          }

          // 4) recorrente -> gerações
          const geracoes = await listLinkRecords<GeracaoFields>(
            tables.CONTAS,
            links.CONTA_GERACOES,
            contaId
          );

          for (const g of geracoes) {
            const geracaoId = String(g.id);
            const comp = (g.fields?.COMPETENCIA || "").trim();
            const base = parseCompetenciaToDate(comp);
            if (!base) continue;

            const venc = safeDateForDay(base.getFullYear(), base.getMonth(), dia);
            const dueDate = format(venc, "yyyy-MM-dd");

            allBills.push({
              id: geracaoId,
              geracaoId,
              contaId,
              competencia: comp,
              dueDate,
              isProtocoled: false,
              name: nome || null,
              company: empresaLabel || null,
              description: desc || null,
              amount: valor,
              category: "outros",
            });
          }
        }

        // ✅ SORT 100% sem timezone-bug
        allBills.sort(
          (a, b) => parseYmdLocal(a.dueDate).getTime() - parseYmdLocal(b.dueDate).getTime()
        );

        setBills(allBills);
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || "Falha ao carregar contas do NocoDB");
      } finally {
        setLoading(false);
      }
    }, [tables.SETORES, tables.CONTAS, links]);

    useEffect(() => {
      loadBills();
    }, [loadBills]);

  // =====================
  // Actions (stub por enquanto)
  // =====================
  const protocolBill = async (_id: string, _payload?: ProtocolPayload) => {
    toast.info("Protocolar no NocoDB: falta ligar tabela CONTAS_PROTOCOLADAS/links.");
  };

  const deleteBill = async (_id: string) => {
    toast.info("Excluir no NocoDB: falta ligar deleção por geracao/conta.");
  };

  const handleProtocol = (id: string, payload?: ProtocolPayload) => {
    protocolBill(id, payload);
    toast.success("Ação de protocolo enviada!");
  };

  const handleDelete = (id: string) => {
    deleteBill(id);
    toast.success("Ação de exclusão enviada!");
  };

  // =====================
  // Filters/search
  // =====================
  const toggleFilter = useCallback((next: FilterType) => {
    setFilter((cur) => (cur === next ? "all" : next));
  }, []);

  const currentMonthKey = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }, []);

  const monthOptions = useMemo(() => {
    const keys = Array.from(new Set(bills.map((b) => toMonthKey(b.dueDate))));
    return keys.sort((a, b) => a.localeCompare(b));
  }, [bills]);

  const resolvedMonthFilter = useMemo(() => {
    if (monthFilter !== "auto") return monthFilter;
    return monthOptions.includes(currentMonthKey) ? currentMonthKey : "all";
  }, [monthFilter, monthOptions, currentMonthKey]);

  useEffect(() => {
    if (monthFilter !== "auto") return;
    if (monthOptions.includes(currentMonthKey)) setMonthFilter(currentMonthKey);
    else setMonthFilter("all");
  }, [monthFilter, monthOptions, currentMonthKey]);

  const billsInSelectedMonth = useMemo(() => {
    return bills
      .filter((b) => (resolvedMonthFilter === "all" ? true : toMonthKey(b.dueDate) === resolvedMonthFilter))
      .sort((a, b) => parseYmdLocal(a.dueDate).getTime()
 - new Date(b.dueDate).getTime());
  }, [bills, resolvedMonthFilter]);

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

  useEffect(() => {
    setCompanyFilterKey("all");
  }, [resolvedMonthFilter]);

  useEffect(() => {
    if (companyFilterKey === "all") return;
    const stillExists = companyOptions.some((c) => c.key === companyFilterKey);
    if (!stillExists) setCompanyFilterKey("all");
  }, [companyOptions, companyFilterKey]);

  const scopedBills = useMemo(() => {
    return bills.filter((bill) => {
      if (resolvedMonthFilter !== "all" && toMonthKey(bill.dueDate) !== resolvedMonthFilter) return false;

      if (companyFilterKey !== "all") {
        const label = pickCompanyLabel(bill);
        const key = normKey(label);
        if (key !== companyFilterKey) return false;
      }
      return true;
    });
  }, [bills, resolvedMonthFilter, companyFilterKey]);

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

      return company.includes(q) || boleto.includes(q) || nf.includes(q) || general.includes(q);
    });
  }, [scopedBills, search, searchMode]);

  const filteredBills = useMemo(() => {
    return searchedBills
      .filter((bill) => {
        const status = getBillStatus(bill as any);
        switch (filter) {
          case "pending":
            return !bill.isProtocoled && (status === "pending" || status === "due-soon");
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

        return parseYmdLocal(a.dueDate).getTime()
 - new Date(b.dueDate).getTime();
      });
  }, [searchedBills, filter]);

  const filterCounts = useMemo(() => {
    return {
      all: searchedBills.length,
      pending: searchedBills.filter(
        (b) => !b.isProtocoled && ["pending", "due-soon"].includes(getBillStatus(b as any))
      ).length,
      overdue: searchedBills.filter((b) => !b.isProtocoled && getBillStatus(b as any) === "overdue").length,
      protocoled: searchedBills.filter((b) => b.isProtocoled).length,
    };
  }, [searchedBills]);

  // stats
  const stats = useMemo(() => {
    const total = bills.length;
    const protocoled = bills.filter((b) => b.isProtocoled).length;

    const pending = bills.filter((b) => !b.isProtocoled && getBillStatus(b as any) === "pending").length;
    const dueSoon = bills.filter((b) => !b.isProtocoled && getBillStatus(b as any) === "due-soon").length;
    const overdue = bills.filter((b) => !b.isProtocoled && getBillStatus(b as any) === "overdue").length;

    const totalAmount = bills
      .filter((b) => !b.isProtocoled)
      .reduce((acc, b) => acc + Number(b.amount || 0), 0);

    return { total, pending, dueSoon, overdue, protocoled, totalAmount };
  }, [bills]);

  return (
    <div className="min-h-screen bg-background">
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
                  Gestão de contas do time de T.I {loading ? "• carregando..." : ""}
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

              <AddBillDialog />
              <Button variant="outline" onClick={loadBills}>
                Atualizar
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
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
            subtitle={stats.dueSoon > 0 ? `${stats.dueSoon} vencem em breve` : undefined}
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

        <div className="space-y-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Contas Cadastradas</h2>
            </div>

            <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm p-4">
              <div className="grid grid-cols-1 lg:grid-cols-[260px_320px_1fr] gap-3 items-end">
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Mês</span>
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

                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Empresa / Fornecedor</span>
                  <select
                    value={companyFilterKey}
                    onChange={(e) => setCompanyFilterKey(e.target.value)}
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
                    disabled={companyOptions.length === 0}
                  >
                    <option value="all">
                      {companyOptions.length === 0 ? "Nenhuma conta nesse mês" : "Todas as empresas"}
                    </option>

                    {companyOptions.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label} ({c.count})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="lg:justify-self-end">
                  <BillsFilter activeFilter={filter} onFilterChange={setFilter} counts={filterCounts} />
                </div>
              </div>

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
              <h3 className="text-lg font-medium mb-1">Nenhuma conta encontrada</h3>
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
