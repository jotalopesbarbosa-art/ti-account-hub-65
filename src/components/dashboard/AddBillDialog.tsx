import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { Bill } from '@/types/bill';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';

interface AddBillDialogProps {
  onAdd: (bill: Omit<Bill, 'id' | 'isProtocoled' | 'createdAt'>, recurrence?: { intervalDays: number; count: number }) => void;
}

export const AddBillDialog = ({ onAdd }: AddBillDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [category, setCategory] = useState<Bill['category']>('internet');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState('30');
  const [recurrenceCount, setRecurrenceCount] = useState('1');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !amount || !dueDay) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const day = parseInt(dueDay);
    if (day < 1 || day > 31) {
      toast.error('Dia de vencimento deve ser entre 1 e 31');
      return;
    }

    // Calculate first due date (next occurrence of this day)
    const today = new Date();
    let firstDueDate = new Date(today.getFullYear(), today.getMonth(), day);
    if (firstDueDate <= today) {
      firstDueDate = new Date(today.getFullYear(), today.getMonth() + 1, day);
    }

    const recurrence = isRecurring 
      ? { intervalDays: parseInt(recurrenceInterval), count: parseInt(recurrenceCount) }
      : undefined;

    onAdd({
      name: name.trim(),
      description: description.trim(),
      amount: parseFloat(amount),
      dueDate: firstDueDate.toISOString().split('T')[0],
      category,
    }, recurrence);

    const message = isRecurring 
      ? `${parseInt(recurrenceCount)} contas cadastradas com sucesso!`
      : 'Conta cadastrada com sucesso!';
    toast.success(message);
    setOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setAmount('');
    setDueDay('');
    setCategory('internet');
    setIsRecurring(false);
    setRecurrenceInterval('30');
    setRecurrenceCount('1');
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
            <Select value={category} onValueChange={(v) => setCategory(v as Bill['category'])}>
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

          {/* Recurrence Section */}
          <div className="border border-border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="recurring" className="font-medium">Conta Recorrente</Label>
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
                  <Select value={recurrenceInterval} onValueChange={setRecurrenceInterval}>
                    <SelectTrigger className="bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 dias (Mensal)</SelectItem>
                      <SelectItem value="60">60 dias (Bimestral)</SelectItem>
                      <SelectItem value="90">90 dias (Trimestral)</SelectItem>
                      <SelectItem value="180">180 dias (Semestral)</SelectItem>
                      <SelectItem value="365">365 dias (Anual)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recurrenceCount">Quantidade</Label>
                  <Select value={recurrenceCount} onValueChange={setRecurrenceCount}>
                    <SelectTrigger className="bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                        <SelectItem key={n} value={n.toString()}>
                          {n} {n === 1 ? 'parcela' : 'parcelas'}
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
            <Button type="submit" className="bg-primary hover:bg-primary/90">
              Cadastrar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
