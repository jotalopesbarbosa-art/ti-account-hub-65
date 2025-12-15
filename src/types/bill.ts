export interface Bill {
  id: string;
  name: string;
  description: string;
  amount: number;
  dueDate: string;
  category: 'internet' | 'telefone' | 'software' | 'hardware' | 'outros';
  isProtocoled: boolean;
  protocoledAt?: string;
  createdAt: string;
}

export type BillStatus = 'pending' | 'due-soon' | 'overdue' | 'protocoled';

export const getCategoryLabel = (category: Bill['category']): string => {
  const labels: Record<Bill['category'], string> = {
    internet: 'Internet',
    telefone: 'Telefone',
    software: 'Software',
    hardware: 'Hardware',
    outros: 'Outros',
  };
  return labels[category];
};

export const getBillStatus = (bill: Bill): BillStatus => {
  if (bill.isProtocoled) return 'protocoled';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dueDate = new Date(bill.dueDate);
  dueDate.setHours(0, 0, 0, 0);
  
  const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 3) return 'due-soon';
  return 'pending';
};
