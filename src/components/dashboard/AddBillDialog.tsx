import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { addMonths, format, isBefore, startOfDay } from "date-fns";

import { nocodb } from "@/lib/nocodbClient";
import { nocodbTables, nocodbLinks } from "@/lib/nocodb.config";

// ---------------------
// Utils
// ---------------------
function reqId(name: string, v?: string) {
  if (!v) throw new Error(`[NocoDB] ENV ausente: ${name}`);
  return v;
}

function safeDateForDay(year: number, monthIndex0: number, day: number) {
  const lastDay = new Date(year, monthIndex0 + 1, 0).getDate();
  const d = Math.min(day, lastDay);
  return new Date(year, monthIndex0, d, 12, 0, 0);
}

// ✅ parse seguro de YYYY-MM-DD (input type="date") em horário local
function parseYmdLocal(ymd: string) {
  const [y, m, d] = (ymd || "").split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12, 0, 0);
}

/**
 * ✅ Competência:
 * - TEXTO => "yyyy-MM"
 * - DATE  => "yyyy-MM-01"
 */
const COMPETENCIA_IS_DATE = false;

function monthKey(date: Date) {
  return COMPETENCIA_IS_DATE ? format(date, "yyyy-MM-01") : format(date, "yyyy-MM");
}

function ymd(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function intervalToMonths(value: string) {
  switch (value) {
    case "30":
      return 1;
    case "60":
      return 2;
    case "90":
      return 3;
    case "180":
      return 6;
    case "365":
      return 12;
    default:
      return 1;
  }
}

// ---------------------
// Tipos NocoDB
// ---------------------
type NocoRecord<T> = { id: any; fields: T };

type SetorFields = { SETORES: string; EMAIL: string };
type CategoriaFields = { CATEGORIA: string };
type EmpresaFields = { EMPRESA_FORNECEDOR: string };

// ✅ Incluí DATA_VENCIMENTO (pra título único)
type ContaFields = {
  NOME: string;
  "DESCRIÇÃO"?: string;
  VALOR: number;
  DIA_VENCIMENTO: number;
  DATA_VENCIMENTO?: string; // yyyy-MM-dd
};

type GeracaoFields = { COMPETENCIA: string };

type RecorrenciaFields = {
  INICIO_EM: string; // yyyy-MM-dd
  FIM_EM: string; // yyyy-MM-dd
  FREQUENCIA: string; // "30" | "60" | ...
};

// ---------------------
// Helpers NocoDB
// ---------------------
async function listLinkRecords<TFields>(
  tableId: string,
  linkFieldId: string,
  recordId: string
): Promise<Array<NocoRecord<TFields>>> {
  // @ts-ignore
  if (typeof nocodb.listLinkRecords === "function") {
    // @ts-ignore
    const res = await nocodb.listLinkRecords<TFields>(
      tableId,
      linkFieldId,
      recordId,
      { pageSize: 200 }
    );
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
  if (typeof nocodb.listRecords !== "function") {
    throw new Error("Seu nocodbClient não tem listRecords().");
  }

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

// ---------------------
// Component
// ---------------------
export const AddBillDialog = () => {
  const [open, setOpen] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  // ✅ Recorrente: dia do mês
  const [dueDay, setDueDay] = useState("");

  // ✅ Não recorrente: data única (yyyy-MM-dd)
  const [dueDate, setDueDate] = useState("");

  const [categoriaId, setCategoriaId] = useState<string>("");
  const [empresaId, setEmpresaId] = useState<string>("");

  const [categorias, setCategorias] = useState<Array<NocoRecord<CategoriaFields>>>([]);
  const [empresas, setEmpresas] = useState<Array<NocoRecord<EmpresaFields>>>([]);
  const [loadingLookups, setLoadingLookups] = useState(false);

  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState("30");
  const [recurrenceCount, setRecurrenceCount] = useState("1");

  const tables = useMemo(() => {
    return {
      SETORES: reqId("VITE_NOCODB_TABLE_SETORES", nocodbTables.SETORES),
      CATEGORIAS: reqId("VITE_NOCODB_TABLE_CATEGORIAS", nocodbTables.CATEGORIAS),
      EMPRESAS: reqId(
        "VITE_NOCODB_TABLE_EMPRESAS_FORNECEDORES",
        nocodbTables.EMPRESAS_FORNECEDORES
      ),
      CONTAS: reqId("VITE_NOCODB_TABLE_CONTAS", nocodbTables.CONTAS),
      RECORRENCIA: reqId("VITE_NOCODB_TABLE_RECORRENCIA", nocodbTables.RECORRENCIA),
      GERACOES: reqId(
        "VITE_NOCODB_TABLE_GERACOES_RECORRENCIA",
        nocodbTables.GERACOES_RECORRENCIA
      ),
    };
  }, []);

  const [linkIds, setLinkIds] = useState<null | {
    SETOR_CATEGORIAS: string;
    SETOR_EMPRESAS: string;

    CONTA_SETOR: string;
    CONTA_CATEGORIA: string;
    CONTA_EMPRESA: string;
    CONTA_GERACOES: string;

    RECORRENCIA_EMPRESA: string;
    RECORRENCIA_CONTA: string;
    RECORRENCIA_CATEGORIA: string;
    RECORRENCIA_GERACOES: string;

    GERACAO_RECORRENCIA: string;
  }>(null);

  useEffect(() => {
    if (!open) return;

    try {
      setLinkIds({
        SETOR_CATEGORIAS: reqId(
          "VITE_NOCODB_LINK_SETORES_CATEGORIAS",
          nocodbLinks.SETOR_CATEGORIAS
        ),
        SETOR_EMPRESAS: reqId(
          "VITE_NOCODB_LINK_SETORES_EMPRESAS_FORNECEDORES",
          nocodbLinks.SETOR_EMPRESAS
        ),

        CONTA_SETOR: reqId("VITE_NOCODB_LINK_CONTA_SETOR", nocodbLinks.CONTA_SETOR),
        CONTA_CATEGORIA: reqId(
          "VITE_NOCODB_LINK_CONTA_CATEGORIA",
          nocodbLinks.CONTA_CATEGORIA
        ),
        CONTA_EMPRESA: reqId(
          "VITE_NOCODB_LINK_CONTA_EMPRESA",
          nocodbLinks.CONTA_EMPRESA
        ),
        CONTA_GERACOES: reqId(
          "VITE_NOCODB_LINK_CONTA_GERACOES_RECORRENCIA",
          nocodbLinks.CONTA_GERACOES_RECORRENCIA
        ),

        RECORRENCIA_EMPRESA: reqId(
          "VITE_NOCODB_LINK_RECORRENCIA_EMPRESA",
          nocodbLinks.RECORRENCIA_EMPRESA
        ),
        RECORRENCIA_CONTA: reqId(
          "VITE_NOCODB_LINK_RECORRENCIA_CONTA",
          nocodbLinks.RECORRENCIA_CONTA
        ),
        RECORRENCIA_CATEGORIA: reqId(
          "VITE_NOCODB_LINK_RECORRENCIA_CATEGORIA",
          nocodbLinks.RECORRENCIA_CATEGORIA
        ),
        RECORRENCIA_GERACOES: reqId(
          "VITE_NOCODB_LINK_RECORRENCIA_GERACOES",
          nocodbLinks.RECORRENCIA_GERACOES
        ),

        GERACAO_RECORRENCIA: reqId(
          "VITE_NOCODB_LINK_GERACAO_RECORRENCIA",
          nocodbLinks.GERACAO_RECORRENCIA
        ),
      });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Config NocoDB incompleta");
      setOpen(false);
    }
  }, [open]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setAmount("");
    setDueDay("");
    setDueDate("");
    setCategoriaId("");
    setEmpresaId("");
    setIsRecurring(false);
    setRecurrenceInterval("30");
    setRecurrenceCount("1");
  };

  useEffect(() => {
    if (!open || !linkIds) return;

    const run = async () => {
      try {
        setLoadingLookups(true);

        const setorId = await resolveLoggedSetorId({ SETORES: tables.SETORES });

        const [cats, emps] = await Promise.all([
          listLinkRecords<CategoriaFields>(tables.SETORES, linkIds.SETOR_CATEGORIAS, setorId),
          listLinkRecords<EmpresaFields>(tables.SETORES, linkIds.SETOR_EMPRESAS, setorId),
        ]);

        setCategorias(cats);
        setEmpresas(emps);

        setCategoriaId((curr) => (curr ? curr : cats?.[0]?.id != null ? String(cats[0].id) : ""));
        setEmpresaId((curr) => (curr ? curr : emps?.[0]?.id != null ? String(emps[0].id) : ""));
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || "Falha ao carregar categorias/empresas do setor");
      } finally {
        setLoadingLookups(false);
      }
    };

    run();
  }, [open, linkIds, tables.SETORES]);

  const empresasOptions = useMemo(
    () => empresas.map((r) => ({ id: String(r.id), label: r.fields?.EMPRESA_FORNECEDOR ?? "" })),
    [empresas]
  );

  const categoriasOptions = useMemo(
    () => categorias.map((r) => ({ id: String(r.id), label: r.fields?.CATEGORIA ?? "" })),
    [categorias]
  );

  // ✅ Se alternar recorrência, limpa o campo “do outro modo”
  useEffect(() => {
    if (isRecurring) {
      setDueDate("");
    } else {
      setDueDay("");
    }
  }, [isRecurring]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanName = name.trim();
    const cleanDesc = description.trim();
    const value = Number(amount);

    if (!cleanName || !amount) return toast.error("Preencha todos os campos obrigatórios");
    if (!categoriaId) return toast.error("Selecione uma categoria");
    if (!empresaId) return toast.error("Selecione uma empresa/fornecedor");
    if (!Number.isFinite(value) || value <= 0) return toast.error("Valor inválido");

    // ✅ validação de vencimento por modo
    if (isRecurring) {
      const day = Number(dueDay);
      if (!dueDay) return toast.error("Informe o dia de vencimento (1–31)");
      if (!Number.isFinite(day) || day < 1 || day > 31) return toast.error("Dia deve ser entre 1 e 31");
    } else {
      if (!dueDate) return toast.error("Selecione a data única de vencimento");
      const parsed = parseYmdLocal(dueDate);
      if (!parsed) return toast.error("Data de vencimento inválida");
    }

    try {
      if (!linkIds) return toast.error("Config de links do NocoDB não carregou.");

      const setorId = await resolveLoggedSetorId({ SETORES: tables.SETORES });

      // ✅ aqui é o coração da mudança
      const today = startOfDay(new Date());

      let first: Date;
      let dayOfMonth: number;
      let dataVencimentoToSave: string | undefined;

      if (!isRecurring) {
        const dt = parseYmdLocal(dueDate)!;
        first = dt; // ✅ exatamente a data escolhida
        dayOfMonth = dt.getDate();
        dataVencimentoToSave = ymd(dt);
      } else {
        const day = Number(dueDay);
        dayOfMonth = day;

        let next = safeDateForDay(today.getFullYear(), today.getMonth(), day);
        if (isBefore(next, today) || next.getTime() === today.getTime()) {
          next = safeDateForDay(today.getFullYear(), today.getMonth() + 1, day);
        }
        first = next;
        dataVencimentoToSave = ymd(first); // opcional, mas ajuda em listagem/ordenar
      }

      // regra de recorrência
      const count = isRecurring ? Math.max(1, Number(recurrenceCount) || 1) : 1;
      const stepMonths = isRecurring ? intervalToMonths(recurrenceInterval) : 1;
      const freq = isRecurring ? recurrenceInterval : "30";

      // 1) cria conta
      const createdConta = await nocodb.createRecords<ContaFields>(tables.CONTAS, [
        {
          NOME: cleanName,
          "DESCRIÇÃO": cleanDesc || undefined,
          VALOR: value,
          DIA_VENCIMENTO: dayOfMonth,
          DATA_VENCIMENTO: dataVencimentoToSave,
        },
      ]);

      const contaId = createdConta.records?.[0]?.id;
      if (!contaId) throw new Error("Falha ao criar CONTA no NocoDB");

      // 2) linka conta -> setor/categoria/empresa
      await Promise.all([
        nocodb.linkRecords(tables.CONTAS, linkIds.CONTA_SETOR, String(contaId), [String(setorId)]),
        nocodb.linkRecords(tables.CONTAS, linkIds.CONTA_CATEGORIA, String(contaId), [String(categoriaId)]),
        nocodb.linkRecords(tables.CONTAS, linkIds.CONTA_EMPRESA, String(contaId), [String(empresaId)]),
      ]);

      // 3) gera competências (baseadas na data first)
      const competencias: string[] = [];
      for (let i = 0; i < count; i++) {
        const dt = addMonths(first, i * stepMonths);
        competencias.push(monthKey(dt));
      }

      // 4) cria gerações
      const geracaoIds: string[] = [];
      for (const c of competencias) {
        const createdOne = await nocodb.createRecords<GeracaoFields>(tables.GERACOES, [{ COMPETENCIA: c }]);
        const id = createdOne.records?.[0]?.id;
        if (id != null) geracaoIds.push(String(id));
      }

      if (!geracaoIds.length) throw new Error("Falha ao criar GERACOES_RECORRENCIA no NocoDB");

      // 5) linka conta -> gerações
      await nocodb.linkRecords(tables.CONTAS, linkIds.CONTA_GERACOES, String(contaId), geracaoIds);

      // 6) cria recorrência sempre (como você já fazia)
      const inicio = ymd(first);
      const fim = isRecurring ? ymd(addMonths(first, (count - 1) * stepMonths)) : inicio;

      const createdRec = await nocodb.createRecords<RecorrenciaFields>(tables.RECORRENCIA, [
        { INICIO_EM: inicio, FIM_EM: fim, FREQUENCIA: freq },
      ]);

      const recorrenciaId = createdRec.records?.[0]?.id ? String(createdRec.records[0].id) : "";
      if (!recorrenciaId) throw new Error("Falha ao criar RECORRENCIA no NocoDB");

      await Promise.all([
        nocodb.linkRecords(tables.RECORRENCIA, linkIds.RECORRENCIA_EMPRESA, recorrenciaId, [String(empresaId)]),
        nocodb.linkRecords(tables.RECORRENCIA, linkIds.RECORRENCIA_CONTA, recorrenciaId, [String(contaId)]),
        nocodb.linkRecords(tables.RECORRENCIA, linkIds.RECORRENCIA_CATEGORIA, recorrenciaId, [String(categoriaId)]),
        nocodb.linkRecords(tables.RECORRENCIA, linkIds.RECORRENCIA_GERACOES, recorrenciaId, geracaoIds),
      ]);

      await Promise.all(
        geracaoIds.map((gid) =>
          nocodb.linkRecords(tables.GERACOES, linkIds.GERACAO_RECORRENCIA, gid, [recorrenciaId])
        )
      );

      toast.success(
        isRecurring
          ? `Conta recorrente criada ✅ (${count} competências)`
          : `Conta única criada ✅ (venc. em ${dueDate})`
      );

      setOpen(false);
      resetForm();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Erro ao salvar no NocoDB");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90 glow-primary">
          <Plus className="h-4 w-4 mr-2" />
          Nova Conta
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[520px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>Cadastrar Nova Conta</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Conta *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-background/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-background/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor (R$) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-background/50"
              />
            </div>

            {/* ✅ Vencimento: muda conforme recorrência */}
            <div className="space-y-2">
              <Label htmlFor="venc">
                {isRecurring ? "Dia de Vencimento (todo mês) *" : "Data de Vencimento (única) *"}
              </Label>

              {isRecurring ? (
                <Input
                  id="venc"
                  type="number"
                  min="1"
                  max="31"
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                  className="bg-background/50"
                  placeholder="Ex: 15"
                />
              ) : (
                <Input
                  id="venc"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="bg-background/50"
                />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Empresa / Fornecedor *</Label>
            <Select value={empresaId} onValueChange={(v) => setEmpresaId(String(v))} disabled={loadingLookups}>
              <SelectTrigger className="bg-background/50">
                <SelectValue placeholder={loadingLookups ? "Carregando..." : "Selecione"} />
              </SelectTrigger>
              <SelectContent>
                {empresasOptions.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.label}
                  </SelectItem>
                ))}
                {!empresasOptions.length && (
                  <SelectItem value="__none" disabled>
                    Nenhuma empresa vinculada ao setor
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Categoria *</Label>
            <Select value={categoriaId} onValueChange={(v) => setCategoriaId(String(v))} disabled={loadingLookups}>
              <SelectTrigger className="bg-background/50">
                <SelectValue placeholder={loadingLookups ? "Carregando..." : "Selecione"} />
              </SelectTrigger>
              <SelectContent>
                {categoriasOptions.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.label}
                  </SelectItem>
                ))}
                {!categoriasOptions.length && (
                  <SelectItem value="__none" disabled>
                    Nenhuma categoria vinculada ao setor
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="border border-border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="recurring" className="font-medium">
                Conta Recorrente
              </Label>
              <Switch id="recurring" checked={isRecurring} onCheckedChange={setIsRecurring} />
            </div>

            {isRecurring && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="space-y-2">
                  <Label>Intervalo</Label>
                  <Select value={recurrenceInterval} onValueChange={setRecurrenceInterval}>
                    <SelectTrigger className="bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">Mensal</SelectItem>
                      <SelectItem value="60">Bimestral</SelectItem>
                      <SelectItem value="90">Trimestral</SelectItem>
                      <SelectItem value="180">Semestral</SelectItem>
                      <SelectItem value="365">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Select value={recurrenceCount} onValueChange={setRecurrenceCount}>
                    <SelectTrigger className="bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} {n === 1 ? "parcela" : "parcelas"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={loadingLookups}>
              Cadastrar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
