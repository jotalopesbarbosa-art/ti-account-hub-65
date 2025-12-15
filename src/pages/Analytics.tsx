import { useBills } from '@/hooks/useBills';
import { getBillStatus, getCategoryLabel, Bill } from '@/types/bill';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  PieChart as PieChartIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

const Analytics = () => {
  const { bills, stats } = useBills();

  // Data for status pie chart
  const statusData = [
    { name: 'Pendentes', value: stats.pending, color: 'hsl(217, 91%, 50%)' },
    { name: 'Vence em breve', value: stats.dueSoon, color: 'hsl(38, 92%, 50%)' },
    { name: 'Vencidas', value: stats.overdue, color: 'hsl(0, 84%, 60%)' },
    { name: 'Protocoladas', value: stats.protocoled, color: 'hsl(142, 76%, 36%)' },
  ].filter(d => d.value > 0);

  // Data for category chart
  const categoryData = bills.reduce((acc, bill) => {
    const cat = getCategoryLabel(bill.category);
    const existing = acc.find(a => a.name === cat);
    if (existing) {
      existing.total += bill.amount;
      if (!bill.isProtocoled) existing.pending += bill.amount;
    } else {
      acc.push({ 
        name: cat, 
        total: bill.amount, 
        pending: bill.isProtocoled ? 0 : bill.amount 
      });
    }
    return acc;
  }, [] as { name: string; total: number; pending: number }[]);

  // Group bills by month for timeline
  const monthlyData = bills.reduce((acc, bill) => {
    const date = new Date(bill.dueDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthName = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    
    const existing = acc.find(a => a.key === monthKey);
    if (existing) {
      existing.total += bill.amount;
      if (bill.isProtocoled) existing.paid += bill.amount;
      else existing.pending += bill.amount;
    } else {
      acc.push({
        key: monthKey,
        name: monthName,
        total: bill.amount,
        paid: bill.isProtocoled ? bill.amount : 0,
        pending: bill.isProtocoled ? 0 : bill.amount,
      });
    }
    return acc;
  }, [] as { key: string; name: string; total: number; paid: number; pending: number }[])
  .sort((a, b) => a.key.localeCompare(b.key))
  .slice(-6);

  // Upcoming bills (next 30 days)
  const today = new Date();
  const thirtyDaysLater = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const upcomingBills = bills
    .filter(b => {
      if (b.isProtocoled) return false;
      const dueDate = new Date(b.dueDate);
      return dueDate >= today && dueDate <= thirtyDaysLater;
    })
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  // Overdue bills
  const overdueBills = bills
    .filter(b => !b.isProtocoled && getBillStatus(b) === 'overdue')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const formatCurrency = (value: number) => 
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2.5">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Dashboard Analítico</h1>
                <p className="text-sm text-muted-foreground">Visão geral das contas de T.I</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Contas Atrasadas</p>
                  <p className="text-2xl font-bold">{stats.overdue}</p>
                  <p className="text-xs text-destructive">
                    {formatCurrency(overdueBills.reduce((sum, b) => sum + b.amount, 0))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-warning/10">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vence em Breve</p>
                  <p className="text-2xl font-bold">{stats.dueSoon}</p>
                  <p className="text-xs text-warning">Próximos 3 dias</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">A Pagar (30 dias)</p>
                  <p className="text-2xl font-bold">{upcomingBills.length}</p>
                  <p className="text-xs text-primary">
                    {formatCurrency(upcomingBills.reduce((sum, b) => sum + b.amount, 0))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-success/10">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Protocoladas</p>
                  <p className="text-2xl font-bold">{stats.protocoled}</p>
                  <p className="text-xs text-success">
                    {formatCurrency(bills.filter(b => b.isProtocoled).reduce((sum, b) => sum + b.amount, 0))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Pie Chart */}
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-primary" />
                Distribuição por Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Contas']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  Nenhuma conta cadastrada
                </div>
              )}
            </CardContent>
          </Card>

          {/* Category Bar Chart */}
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Gastos por Categoria
              </CardTitle>
            </CardHeader>
            <CardContent>
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={categoryData}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis 
                      tick={{ fontSize: 12 }} 
                      tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="pending" name="Pendente" fill="hsl(217, 91%, 50%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="total" name="Total" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} opacity={0.3} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  Nenhuma conta cadastrada
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Monthly Timeline */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Timeline de Pagamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis 
                    tick={{ fontSize: 12 }} 
                    tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="paid" name="Protocolado" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="pending" name="Pendente" fill="hsl(217, 91%, 50%)" radius={[4, 4, 0, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhuma conta cadastrada
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lists Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Overdue Bills List */}
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Contas Atrasadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {overdueBills.length > 0 ? (
                <div className="space-y-3">
                  {overdueBills.map((bill) => (
                    <BillListItem key={bill.id} bill={bill} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-success" />
                  <p>Nenhuma conta atrasada!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Bills List */}
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Calendar className="h-5 w-5" />
                Próximos Vencimentos (30 dias)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingBills.length > 0 ? (
                <div className="space-y-3">
                  {upcomingBills.slice(0, 8).map((bill) => (
                    <BillListItem key={bill.id} bill={bill} />
                  ))}
                  {upcomingBills.length > 8 && (
                    <p className="text-sm text-muted-foreground text-center pt-2">
                      + {upcomingBills.length - 8} mais contas
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma conta nos próximos 30 dias</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

const BillListItem = ({ bill }: { bill: Bill }) => {
  const status = getBillStatus(bill);
  const dueDate = new Date(bill.dueDate);
  
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30">
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{bill.name}</p>
        <p className="text-xs text-muted-foreground">
          {dueDate.toLocaleDateString('pt-BR')} • {getCategoryLabel(bill.category)}
        </p>
      </div>
      <div className="text-right">
        <p className={`font-semibold ${status === 'overdue' ? 'text-destructive' : ''}`}>
          {bill.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </p>
      </div>
    </div>
  );
};

export default Analytics;
