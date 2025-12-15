import { useState, useEffect } from 'react';
import { Bill, getBillStatus } from '@/types/bill';

const STORAGE_KEY = 'it-bills-dashboard';

const initialBills: Bill[] = [
  {
    id: '1',
    name: 'Vivo Fibra',
    description: 'Link de internet 500MB matriz',
    amount: 450.00,
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    category: 'internet',
    isProtocoled: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Microsoft 365',
    description: 'Licenças corporativas - 50 usuários',
    amount: 2500.00,
    dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    category: 'software',
    isProtocoled: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Claro Móvel',
    description: 'Plano corporativo 20 linhas',
    amount: 890.00,
    dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    category: 'telefone',
    isProtocoled: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: '4',
    name: 'AWS',
    description: 'Serviços cloud - servidores',
    amount: 3200.00,
    dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    category: 'software',
    isProtocoled: true,
    protocoledAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
];

export const useBills = () => {
  const [bills, setBills] = useState<Bill[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : initialBills;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bills));
  }, [bills]);

  const addBill = (
    bill: Omit<Bill, 'id' | 'isProtocoled' | 'createdAt'>,
    recurrence?: { intervalDays: number; count: number }
  ) => {
    const newBills: Bill[] = [];

    if (recurrence && recurrence.count > 1) {
      const baseDate = new Date(bill.dueDate);
      
      for (let i = 0; i < recurrence.count; i++) {
        const dueDate = new Date(baseDate);
        dueDate.setDate(dueDate.getDate() + (i * recurrence.intervalDays));
        
        newBills.push({
          ...bill,
          id: crypto.randomUUID(),
          dueDate: dueDate.toISOString().split('T')[0],
          isProtocoled: false,
          createdAt: new Date().toISOString(),
        });
      }
    } else {
      newBills.push({
        ...bill,
        id: crypto.randomUUID(),
        isProtocoled: false,
        createdAt: new Date().toISOString(),
      });
    }
    
    setBills((prev) => [...prev, ...newBills]);
  };

  const protocolBill = (id: string) => {
    setBills((prev) =>
      prev.map((bill) =>
        bill.id === id
          ? { ...bill, isProtocoled: true, protocoledAt: new Date().toISOString() }
          : bill
      )
    );
  };

  const deleteBill = (id: string) => {
    setBills((prev) => prev.filter((bill) => bill.id !== id));
  };

  const stats = {
    total: bills.length,
    pending: bills.filter((b) => !b.isProtocoled && getBillStatus(b) === 'pending').length,
    dueSoon: bills.filter((b) => !b.isProtocoled && getBillStatus(b) === 'due-soon').length,
    overdue: bills.filter((b) => !b.isProtocoled && getBillStatus(b) === 'overdue').length,
    protocoled: bills.filter((b) => b.isProtocoled).length,
    totalAmount: bills.filter((b) => !b.isProtocoled).reduce((acc, b) => acc + b.amount, 0),
  };

  return { bills, addBill, protocolBill, deleteBill, stats };
};
