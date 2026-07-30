import { useEffect, useState } from 'react';
import { Landmark, ArrowUpRight, TrendingUp, TrendingDown, DollarSign, Loader2, Calendar } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getInvoices } from '@/features/fees/feeService';
import { getSalaryPayments } from '@/features/teachers/salaryService';
import type { Invoice, SalaryPayment } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip,
  ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function FinancePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [salaries, setSalaries] = useState<SalaryPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter stats
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const loadData = async () => {
    setIsLoading(true);
    try {
      const invs = await getInvoices();
      const sals = await getSalaryPayments();
      setInvoices(invs);
      setSalaries(sals);
    } catch {
      toast.error('Failed to load finance transactions.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter transactions for calculations
  const monthlyInvoices = invoices.filter((inv) => {
    const d = new Date(inv.createdAt);
    const monthMatch = d.getMonth() === MONTHS.indexOf(selectedMonth);
    const yearMatch = d.getFullYear() === selectedYear;
    return monthMatch && yearMatch;
  });

  const monthlySalaries = salaries.filter((sal) => {
    return sal.month === selectedMonth && sal.year === selectedYear;
  });

  // Calculations
  const totalRevenue = monthlyInvoices.reduce((acc, curr) => acc + (curr.paidAmount || 0), 0);
  const totalDeductions = monthlySalaries.reduce((acc, curr) => acc + curr.netSalary, 0);
  const netBalance = totalRevenue - totalDeductions;

  // Chart data: past 6 months
  const getChartData = () => {
    const data = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mLabel = MONTHS[d.getMonth()];
      const yLabel = d.getFullYear();
      const mShort = mLabel.substring(0, 3) + ' ' + yLabel;

      const filteredInvs = invoices.filter((inv) => {
        const invD = new Date(inv.createdAt);
        return invD.getMonth() === d.getMonth() && invD.getFullYear() === d.getFullYear();
      });

      const filteredSals = salaries.filter((sal) => {
        return sal.month === mLabel && sal.year === yLabel;
      });

      const rev = filteredInvs.reduce((acc, curr) => acc + (curr.paidAmount || 0), 0);
      const ded = filteredSals.reduce((acc, curr) => acc + curr.netSalary, 0);

      data.push({
        name: mShort,
        Revenue: rev,
        Salaries: ded,
        Net: rev - ded,
      });
    }
    return data;
  };

  const chartData = getChartData();

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Finance & Monthly Ledger"
        description="Track school income from fees, deductions from staff salary disbursements, and monthly net margins."
        action={{
          label: 'Refresh Ledger',
          onClick: loadData,
          icon: <Loader2 className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />,
        }}
      />

      {/* Month/Year Filter Selection bar */}
      <Card className="border border-slate-200 shadow-sm bg-slate-50/50">
        <CardContent className="p-4 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-blue-600 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-slate-800 font-sans">Statement Window</h3>
              <p className="text-[11px] text-slate-400 font-medium">Select month & academic year for profit/loss statement.</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {MONTHS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <input
              type="number"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="h-9 w-24 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
            />
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary Cards */}
      <div className="grid gap-6 sm:grid-cols-3">
        {/* Total Fee Revenue */}
        <Card className="border border-slate-200/80 shadow-xs relative overflow-hidden bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fee Collections (Revenue)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">{formatCurrency(totalRevenue)}</div>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-emerald-600 font-medium">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Realized cash payments for {selectedMonth}</span>
            </div>
            <div className="absolute right-4 bottom-4 h-12 w-12 rounded-xl bg-blue-50/50 flex items-center justify-center text-blue-600">
              <DollarSign className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Salary Deductions */}
        <Card className="border border-slate-200/80 shadow-xs relative overflow-hidden bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">Salaries Paid (Deductions)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-red-600">{formatCurrency(totalDeductions)}</div>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-red-500 font-medium">
              <TrendingDown className="h-3.5 w-3.5" />
              <span>Staff disbursements in {selectedMonth}</span>
            </div>
            <div className="absolute right-4 bottom-4 h-12 w-12 rounded-xl bg-red-50/50 flex items-center justify-center text-red-500">
              <Landmark className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Net Profit Balance */}
        <Card className="border border-slate-200/80 shadow-xs relative overflow-hidden bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">Net Balance (Surplus/Deficit)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-black ${netBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatCurrency(netBalance)}
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px] font-medium text-slate-500">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>Net business performance this month</span>
            </div>
            <div className={`absolute right-4 bottom-4 h-12 w-12 rounded-xl flex items-center justify-center ${netBalance >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              <TrendingUp className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 6-Month Trends Chart */}
      <Card className="border border-slate-200 shadow-sm bg-white">
        <CardHeader>
          <CardTitle className="text-sm font-bold text-slate-800">Financial Growth Trend (Last 6 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <RechartTooltip formatter={(val: any) => ['PKR ' + Number(val || 0).toLocaleString(), '']} />
                <Legend iconType="circle" />
                <ReferenceLine y={0} stroke="#cbd5e1" />
                <Bar dataKey="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="Salaries" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Monthly Breakdown Ledger Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue: Paid Invoices */}
        <Card className="border border-slate-200 shadow-sm overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-4">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-blue-600">Month's Realized Income Ledger</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {monthlyInvoices.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">No fee payments received in this month.</div>
            ) : (
              <div className="overflow-x-auto text-[11px]">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="p-3">Inv Number</th>
                      <th className="p-3">Student</th>
                      <th className="p-3">Class</th>
                      <th className="p-3 text-right">Paid Amount</th>
                      <th className="p-3">Method</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {monthlyInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/20">
                        <td className="p-3 font-bold text-blue-600">{inv.invoiceNumber}</td>
                        <td className="p-3 font-semibold text-slate-700">{inv.studentName}</td>
                        <td className="p-3 text-slate-500">{inv.className}</td>
                        <td className="p-3 text-right font-bold text-emerald-600">{formatCurrency(inv.paidAmount || 0)}</td>
                        <td className="p-3 text-slate-400 capitalize">Cash/Online</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deductions: Salaries Paid */}
        <Card className="border border-slate-200 shadow-sm overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-4">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-red-500">Month's Disbursements Ledger</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {monthlySalaries.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">No salary payments disubursed in this month.</div>
            ) : (
              <div className="overflow-x-auto text-[11px]">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="p-3">Receipt No</th>
                      <th className="p-3">Teacher Name</th>
                      <th className="p-3 text-right">Basic Salary</th>
                      <th className="p-3 text-right font-bold">Net Disbursed</th>
                      <th className="p-3">Method</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {monthlySalaries.map((sal) => (
                      <tr key={sal.id} className="hover:bg-slate-50/20">
                        <td className="p-3 font-bold text-red-500">{sal.receiptNumber}</td>
                        <td className="p-3 font-semibold text-slate-700">{sal.teacherName}</td>
                        <td className="p-3 text-right text-slate-500">{formatCurrency(sal.basicSalary)}</td>
                        <td className="p-3 text-right font-bold text-slate-900">{formatCurrency(sal.netSalary)}</td>
                        <td className="p-3 text-slate-400 capitalize">{sal.paymentMethod.replace('_', ' ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
