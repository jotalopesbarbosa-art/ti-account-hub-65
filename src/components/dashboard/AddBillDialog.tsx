import React, { useState } from "react";
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
import { Bill } from "@/types/bill";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { addMonths, format, isBefore, startOfDay } from "date-fns";

interface AddBillDialogProps {
  onAdd: (
    bill: Omit<Bill, "id" | "isProtocoled" | "createdAt">,
    recurrence?: { intervalMonths: number; count: number }
  ) => void;
}

// ✅ clamp do dia pro último dia do mês (evita 31 virar mês seguinte)
function safeDateForDay(year: number, monthIndex0: number, day: number) {
  const lastDay = new Date(year, monthIndex0 + 1, 0).getDate(); // 0 = último dia do mês anterior
  const d = Math.min(day, lastDay);
  return new Date(year, monthIndex0, d, 12, 0, 0); // 12:00 evita treta de fuso/DST
}

function ymdLocal(date: Date) {
  return format(date, "yyyy-MM-dd"); // ✅ sem toISOString()
}

function intervalToMonths(value: string) {
  // seus selects eram "30/60/90/180/365" mas isso é conceito mensal, não dia real
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

export const AddBillDialog = ({ onAdd }: AddBillDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [category, setCategory] = useState<Bill["category"]>("internet");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState("30");
  const [recurrenceCount, setRecurrenceCount] = useState("1");

  const resetForm = () => {
    setName("");
    setDescription("");
    setAmount("");
    setDueDay("");
    setCategory("internet");
    setIsRecurring(false);
    setRecurrenceInterval("30");
    setRecurrenceCount("1");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanName = name.trim();
    const cleanDesc = description.trim();
    const day = Number(dueDay);
    const value = Number(amount);

    if (!cleanName || !amount || !dueDay) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (!Number.isFinite(day) || day < 1 || day > 31) {
      toast.error("Dia de vencimento deve ser entre 1 e 31");
      return;
    }

    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Valor inválido");
      return;
    }

    // ✅ calcula primeiro vencimento: próxima ocorrência do dia no calendário
    const today = startOfDay(new Date());
    let first = safeDateForDay(today.getFullYear(), today.getMonth(), day);

    if (isBefore(first, today) || first.getTime() === today.getTime()) {
      first = safeDateForDay(today.getFullYear(), today.getMonth() + 1, day);
    }

    const recurrence = isRecurring
      ? {
          intervalMonths: intervalToMonths(recurrenceInterval),
          count: Math.max(1, Number(recurrenceCount) || 1),
        }
      : undefined;

    onAdd(
      {
        name: cleanName,
        description: cleanDesc,
        amount: value,
        dueDate: ymdLocal(first),
        category,
      },
      recurrence
    );

    toast.success(
      isRecurring
        ? `${recurrence!.count} contas cadastradas com sucesso!`
        : "Conta cadastrada com sucesso!"
    );

    setOpen(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90 glow-primary">
          <Plus className="h-4 w-4 mr-2" />
          Nova Conta
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px] bg-card border-border">
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
              placeholder="Ex: Vivo Fibra"
              className="bg-background/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Link de internet 500MB matriz"
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
                placeholder="0,00"
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDay">Dia de Vencimento *</Label>
              <Input
                id="dueDay"
                type="number"
                min="1"
                max="31"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                placeholder="Ex: 15"
                className="bg-background/50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as Bill["category"])}
            >
              <SelectTrigger className="bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="internet">Internet</SelectItem>
                <SelectItem value="telefone">Telefone</SelectItem>
                <SelectItem value="software">Software</SelectItem>
                <SelectItem value="hardware">Hardware</SelectItem>
                <SelectItem value="outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Recorrência */}
          <div className="border border-border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="recurring" className="font-medium">
                Conta Recorrente
              </Label>
              <Switch
                id="recurring"
                checked={isRecurring}
                onCheckedChange={setIsRecurring}
              />
            </div>

            {isRecurring && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="space-y-2">
                  <Label htmlFor="recurrenceInterval">Intervalo</Label>
                  <Select
                    value={recurrenceInterval}
                    onValueChange={setRecurrenceInterval}
                  >
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
                  <Label htmlFor="recurrenceCount">Quantidade</Label>
                  <Select
                    value={recurrenceCount}
                    onValueChange={setRecurrenceCount}
                  >
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
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90">
              Cadastrar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
