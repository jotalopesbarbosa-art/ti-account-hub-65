import { useMemo } from "react";
import { useBills } from "@/hooks/useBills";
import { getBillStatus, getCategoryLabel, Bill } from "@/types/bill";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  PieChart as PieChartIcon,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

import { cn } from "@/lib/utils";



function parseYmdLocal(input: string) {
  const s = (input || "").trim();

  // aceita "YYYY-MM-DD" e também "YYYY-MM-DDTHH:mm:ssZ"
  const ymd = s.length >= 10 ? s.slice(0, 10) : s;

  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return new Date(NaN);

  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);

  return new Date(y, mo - 1, d, 12, 0, 0); // 12:00 evita treta de fuso/DST
}

function getLastMonths(count: number, baseDate: Date) {
  const months: { key: string; name: string; paid: number; pending: number }[] = [];

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth() - i, 1, 12);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({
      key,
      name: d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
      paid: 0,
      pending: 0,
    });
  }

  return months;
}



type ActionCardProps = {
  title: string;
  subtitle: string;
  value: string | number;
  hint?: string;
  icon: React.ElementType;
  iconClassName?: string;
  iconWrapClassName?: string;
  accentTextClassName?: string;
  to: string;
  disabled?: boolean;
};

function ActionCard({
  title,
  subtitle,
  value,
  hint,
  icon: Icon,
  iconClassName,
  iconWrapClassName,
  accentTextClassName,
  to,
  disabled,
}: ActionCardProps) {
  const navigate = useNavigate();

  const onGo = () => {
    if (disabled) return;
    navigate(to);
  };

  return (
    <Card
      role="link"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled ? "true" : "false"}
      onClick={onGo}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onGo();
        }
      }}
      className={cn(
        "group relative overflow-hidden border-border/50 bg-card",
        "transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        disabled && "opacity-60 pointer-events-none"
      )}
    >
      {/* Glow sutil */}
      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className={cn("p-2.5 rounded-xl", iconWrapClassName)}>
              <Icon className={cn("h-5 w-5", iconClassName)} />
            </div>

            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">{subtitle}</p>
              <p className="text-2xl font-bold tracking-tight">{value}</p>
              {hint ? (
                <p className={cn("text-xs mt-1", accentTextClassName ?? "text-muted-foreground")}>
                  {hint}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="hidden sm:inline text-xs">{title}</span>
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}




const Analytics = () => {
  const { bills, stats } = useBills();

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Data for status pie chart
  const statusData = useMemo(() => {
    return [
      { name: "Pendentes", value: stats.pending, color: "hsl(217, 91%, 50%)" },
      { name: "Vence em breve", value: stats.dueSoon, color: "hsl(38, 92%, 50%)" },
      { name: "Vencidas", value: stats.overdue, color: "hsl(0, 84%, 60%)" },
      { name: "Protocoladas", value: stats.protocoled, color: "hsl(142, 76%, 36%)" },
    ].filter((d) => d.value > 0);
  }, [stats]);

  // Data for category chart
  const categoryData = useMemo(() => {
    return bills.reduce((acc, bill) => {
      const cat = getCategoryLabel(bill.category);
      const existing = acc.find((a) => a.name === cat);
      if (existing) {
        existing.total += bill.amount;
        if (!bill.isProtocoled) existing.pending += bill.amount;
      } else {
        acc.push({
          name: cat,
          total: bill.amount,
          pending: bill.isProtocoled ? 0 : bill.amount,
        });
      }
      return acc;
    }, [] as { name: string; total: number; pending: number }[]);
  }, [bills]);

const monthlyData = useMemo(() => {
  // 1) pega todos os meses válidos existentes nas contas
  const monthKeys = Array.from(
    new Set(
      bills
        .map((b) => parseYmdLocal(b.dueDate))
        .filter((d) => !Number.isNaN(d.getTime()))
        .map((d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
    )
  ).sort(); // ordena crescente

  // 2) escolhe os últimos 12 meses COM DADOS (ajuste pra 6 se quiser)
  const lastKeys = monthKeys.slice(-12);

  // 3) monta a estrutura do gráfico
  const months = lastKeys.map((key) => {
    const [y, m] = key.split("-").map(Number);
    const d = new Date(y, m - 1, 1, 12);
    return {
      key,
      name: d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
      paid: 0,
      pending: 0,
    };
  });

  // 4) agrega os valores
  for (const bill of bills) {
    const date = parseYmdLocal(bill.dueDate);
    if (Number.isNaN(date.getTime())) continue;

    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const month = months.find((m) => m.key === key);
    if (!month) continue;

    if (bill.isProtocoled) month.paid += bill.amount;
    else month.pending += bill.amount;
  }

  return months;
}, [bills]);



const today = new Date();
const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0);
const thirtyDaysLater = new Date(todayMid.getTime() + 30 * 24 * 60 * 60 * 1000);

const upcomingBills = useMemo(() => {
  return bills
    .filter((b) => {
      if (b.isProtocoled) return false;
      const due = parseYmdLocal(b.dueDate);
      return due >= todayMid && due <= thirtyDaysLater;
    })
    .sort((a, b) => parseYmdLocal(a.dueDate).getTime() - parseYmdLocal(b.dueDate).getTime());
}, [bills, todayMid, thirtyDaysLater]);

const overdueBills = useMemo(() => {
  return bills
    .filter((b) => {
      if (b.isProtocoled) return false;
      const due = parseYmdLocal(b.dueDate);
      return due < todayMid;
    })
    .sort((a, b) => parseYmdLocal(a.dueDate).getTime() - parseYmdLocal(b.dueDate).getTime());
}, [bills, todayMid]);



  const overdueAmount = useMemo(
    () => overdueBills.reduce((sum, b) => sum + b.amount, 0),
    [overdueBills]
  );

  const upcomingAmount = useMemo(
    () => upcomingBills.reduce((sum, b) => sum + b.amount, 0),
    [upcomingBills]
  );

  const protocoledAmount = useMemo(
    () => bills.filter((b) => b.isProtocoled).reduce((sum, b) => sum + b.amount, 0),
    [bills]
  );




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

            <div className="ml-auto hidden sm:flex items-center gap-2">
              <Link to="/">
                <Button variant="outline" className="gap-2">
                  Ver contas
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Summary Cards (clicáveis) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ActionCard
            title="Abrir"
            subtitle="Contas Atrasadas"
            value={stats.overdue}
            hint={formatCurrency(overdueAmount)}
            icon={AlertTriangle}
            iconWrapClassName="bg-destructive/10"
            iconClassName="text-destructive"
            accentTextClassName="text-destructive"
            to="/?status=overdue"
            disabled={stats.overdue === 0}
          />

          <ActionCard
            title="Abrir"
            subtitle="Vence em Breve"
            value={stats.dueSoon}
            hint="Próximos 3 dias"
            icon={Clock}
            iconWrapClassName="bg-warning/10"
            iconClassName="text-warning"
            accentTextClassName="text-warning"
            to="/?status=dueSoon"
            disabled={stats.dueSoon === 0}
          />

          <ActionCard
            title="Abrir"
            subtitle="A Pagar (30 dias)"
            value={upcomingBills.length}
            hint={formatCurrency(upcomingAmount)}
            icon={Calendar}
            iconWrapClassName="bg-primary/10"
            iconClassName="text-primary"
            accentTextClassName="text-primary"
            to="/?range=30d&status=pending"
            disabled={upcomingBills.length === 0}
          />

          <ActionCard
            title="Abrir"
            subtitle="Protocoladas"
            value={stats.protocoled}
            hint={formatCurrency(protocoledAmount)}
            icon={CheckCircle2}
            iconWrapClassName="bg-success/10"
            iconClassName="text-success"
            accentTextClassName="text-success"
            to="/?status=protocoled"
            disabled={stats.protocoled === 0}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Pie Chart */}
            <Card className="bg-card border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <PieChartIcon className="h-5 w-5 text-primary" />
                  Distribuição por Status
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                {statusData.length > 0 ? (
                  <>
                    {/* chart (sem label pra não cortar) */}
                    <div className="h-[220px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={92}
                            paddingAngle={2}
                            dataKey="value"
                            labelLine={false}
                            isAnimationActive={false}
                          >
                            {statusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>

                          <Tooltip formatter={(value) => [value, "Contas"]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* legenda (não corta nunca) */}
                    <div className="grid grid-cols-2 gap-2">
                      {statusData.map((d) => (
                        <div
                          key={d.name}
                          className="flex items-center justify-between gap-2 rounded-lg border border-border/40 bg-background/40 px-2.5 py-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: d.color }}
                            />
                            <span className="text-xs text-muted-foreground truncate">
                              {d.name}
                            </span>
                          </div>
                          <span className="text-xs font-semibold tabular-nums">
                            {d.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-[260px] flex items-center justify-center text-muted-foreground">
                    Nenhuma conta cadastrada
                  </div>
                )}
              </CardContent>
            </Card>


          {/* Category Bar Chart */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-5 w-5 text-primary" />
                Gastos por Categoria
              </CardTitle>
            </CardHeader>
            <CardContent>
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={categoryData}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(v) => `R$${(Number(v) / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "10px",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="pending" name="Pendente" fill="hsl(217, 91%, 50%)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="total" name="Total" fill="hsl(var(--muted-foreground))" radius={[6, 6, 0, 0]} opacity={0.28} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[260px] flex items-center justify-center text-muted-foreground">
                  Nenhuma conta cadastrada
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Monthly Timeline (LINHA com points) */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5 text-primary" />
              Timeline de Pagamentos
            </CardTitle>
          </CardHeader>

          <CardContent>
            {monthlyData.length > 0 ? (
              <div className="h-[310px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={monthlyData}
                    margin={{ top: 10, right: 12, bottom: 6, left: 6 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} />

                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      tickMargin={8}
                    />

                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(v) => `R$${(Number(v) / 1000).toFixed(0)}k`}
                      width={44}
                    />

                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "10px",
                      }}
                    />

                    <Legend />

                    <Line
                      type="monotone"
                      dataKey="paid"
                      name="Protocolado"
                      stroke="hsl(142, 76%, 36%)"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />

                    <Line
                      type="monotone"
                      dataKey="pending"
                      name="Pendente"
                      stroke="hsl(217, 91%, 50%)"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[310px] flex items-center justify-center text-muted-foreground">
                Nenhuma conta cadastrada
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lists Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Overdue Bills List */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-destructive text-base">
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
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-primary text-base">
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
  const dueDate = parseYmdLocal(bill.dueDate);


  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30 hover:border-border/60 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{bill.name}</p>
        <p className="text-xs text-muted-foreground">
          {dueDate.toLocaleDateString("pt-BR")} • {getCategoryLabel(bill.category)}
        </p>
      </div>
      <div className="text-right pl-3">
        <p className={cn("font-semibold", status === "overdue" && "text-destructive")}>
          {bill.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </p>
      </div>
    </div>
  );
};

export default Analytics;
