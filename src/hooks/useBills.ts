import { useEffect, useState } from "react";
import { Bill, getBillStatus } from "@/types/bill";
import { generateId } from "@/lib/id";
import { addMonths, format, parseISO } from "date-fns";

const STORAGE_KEY = "it-bills-dashboard";

// ✅ evita ISO/fuso: salva YYYY-MM-DD no fuso local
function ymdLocal(date: Date) {
  return format(date, "yyyy-MM-dd");
}

// ✅ clamp do dia no mês (31 em fev -> 28/29)
function safeDateForDay(year: number, monthIndex0: number, day: number) {
  const lastDay = new Date(year, monthIndex0 + 1, 0).getDate();
  const d = Math.min(day, lastDay);
  return new Date(year, monthIndex0, d, 12, 0, 0); // 12:00 reduz treta de fuso/DST
}

// ✅ helper: hoje + N dias, mas formatando local (sem ISO)
function todayPlusDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return ymdLocal(d);
}

const initialBills: Bill[] = [
  {
    id: "1",
    name: "Vivo Fibra",
    description: "Link de internet 500MB matriz",
    amount: 450.0,
    dueDate: todayPlusDays(2),
    category: "internet",
    isProtocoled: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    name: "Microsoft 365",
    description: "Licenças corporativas - 50 usuários",
    amount: 2500.0,
    dueDate: todayPlusDays(-3),
    category: "software",
    isProtocoled: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "3",
    name: "Claro Móvel",
    description: "Plano corporativo 20 linhas",
    amount: 890.0,
    dueDate: todayPlusDays(10),
    category: "telefone",
    isProtocoled: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "4",
    name: "AWS",
    description: "Serviços cloud - servidores",
    amount: 3200.0,
    dueDate: todayPlusDays(-1),
    category: "software",
    isProtocoled: true,
    protocoledAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    invoiceNumber: "123456",
    boletoNumber: "34191...",
  },
];

export type ProtocolPayload = {
  invoiceNumber?: string;
  boletoNumber?: string;
};

// ✅ aceita invoice/boleto já no cadastro também (sem any)
type AddBillInput = Omit<Bill, "id" | "isProtocoled" | "createdAt" | "protocoledAt"> & {
  invoiceNumber?: string;
  boletoNumber?: string;
};

export const useBills = () => {
  const [bills, setBills] = useState<Bill[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : initialBills;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bills));
  }, [bills]);

  const addBill = (
    bill: AddBillInput,
    recurrence?: { intervalMonths: number; count: number }
  ) => {
    const newBills: Bill[] = [];
    const nowIso = new Date().toISOString();

    // base dueDate vem como "yyyy-MM-dd"
    const base = parseISO(bill.dueDate);
    const baseDay = base.getDate();

    const count = recurrence?.count && recurrence.count > 0 ? recurrence.count : 1;
    const intervalMonths =
      recurrence?.intervalMonths && recurrence.intervalMonths > 0
        ? recurrence.intervalMonths
        : 1;

    const inv = bill.invoiceNumber?.trim() || undefined;
    const bol = bill.boletoNumber?.trim() || undefined;

    for (let i = 0; i < count; i++) {
      let due = base;

      if (i > 0) {
        const shifted = addMonths(base, i * intervalMonths);
        due = safeDateForDay(shifted.getFullYear(), shifted.getMonth(), baseDay);
      } else {
        due = safeDateForDay(base.getFullYear(), base.getMonth(), baseDay);
      }

      newBills.push({
        ...bill,
        id: generateId(),
        dueDate: ymdLocal(due),
        isProtocoled: false,
        createdAt: nowIso,
        protocoledAt: undefined,

        // ✅ salva se vier no form
        invoiceNumber: inv,
        boletoNumber: bol,
      });
    }

    setBills((prev) => [...prev, ...newBills]);
  };

  // ✅ protocolar com NF + Boleto (sem apagar se vier vazio)
  const protocolBill = (id: string, payload?: ProtocolPayload) => {
    const nf = payload?.invoiceNumber?.trim() || undefined;
    const bol = payload?.boletoNumber?.trim() || undefined;

    setBills((prev) =>
      prev.map((bill) => {
        if (bill.id !== id) return bill;

        return {
          ...bill,
          isProtocoled: true,
          protocoledAt: new Date().toISOString(),

          // ✅ se o usuário preencheu, sobrescreve
          // ✅ se não preencheu, mantém o que já existia
          invoiceNumber: nf ?? bill.invoiceNumber,
          boletoNumber: bol ?? bill.boletoNumber,
        };
      })
    );
  };

  const deleteBill = (id: string) => {
    setBills((prev) => prev.filter((bill) => bill.id !== id));
  };

  const stats = {
    total: bills.length,
    pending: bills.filter((b) => !b.isProtocoled && getBillStatus(b) === "pending").length,
    dueSoon: bills.filter((b) => !b.isProtocoled && getBillStatus(b) === "due-soon").length,
    overdue: bills.filter((b) => !b.isProtocoled && getBillStatus(b) === "overdue").length,
    protocoled: bills.filter((b) => b.isProtocoled).length,
    totalAmount: bills
      .filter((b) => !b.isProtocoled)
      .reduce((acc, b) => acc + b.amount, 0),
  };

  return { bills, addBill, protocolBill, deleteBill, stats };
};
