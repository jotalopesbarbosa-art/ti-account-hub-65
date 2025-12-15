import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Receipt, Barcode, CheckCircle2, X } from "lucide-react";

type ProtocolPayload = {
  invoiceNumber?: string;
  boletoNumber?: string;
};

interface ProtocolBillModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billName?: string;
  onConfirm: (payload?: ProtocolPayload) => void;
}

export function ProtocolBillModal({
  open,
  onOpenChange,
  billName,
  onConfirm,
}: ProtocolBillModalProps) {
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [boletoNumber, setBoletoNumber] = useState("");

  useEffect(() => {
    if (open) {
      setInvoiceNumber("");
      setBoletoNumber("");
    }
  }, [open]);

  const payload = useMemo<ProtocolPayload>(() => {
    const nf = invoiceNumber.trim();
    const bol = boletoNumber.trim();
    return {
      invoiceNumber: nf || undefined,
      boletoNumber: bol || undefined,
    };
  }, [invoiceNumber, boletoNumber]);

  const handleConfirm = () => {
    // tudo opcional → mas se ambos vazios, manda undefined mesmo
    const hasAny = !!(payload.invoiceNumber || payload.boletoNumber);
    onConfirm(hasAny ? payload : undefined);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            Protocolar conta
          </DialogTitle>
          <DialogDescription>
            {billName ? (
              <span>
                Você vai protocolar: <span className="font-medium text-foreground">{billName}</span>
              </span>
            ) : (
              "Preencha os dados se quiser. É opcional."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invoice" className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              Número da Nota Fiscal (opcional)
            </Label>
            <Input
              id="invoice"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="Ex: 123456"
              inputMode="numeric"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="boleto" className="flex items-center gap-2">
              <Barcode className="h-4 w-4 text-muted-foreground" />
              Número do Boleto (opcional)
            </Label>
            <Input
              id="boleto"
              value={boletoNumber}
              onChange={(e) => setBoletoNumber(e.target.value)}
              placeholder="Ex: 34191..."
              inputMode="numeric"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              className="bg-success text-success-foreground hover:bg-success/90"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Protocolar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
