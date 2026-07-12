import { useEffect, useState } from 'react';
import {
  BarChart3, TrendingUp, GraduationCap, DollarSign,
  ClipboardCheck, Download, FileText, Users,
  ArrowUpRight,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { formatCurrency, formatNumber } from '@/lib/utils';
import { getStudents } from '@/features/students/studentService';
import { getTeachers } from '@/features/teachers/teacherService';
import { getFees } from '@/features/fees/feeService';
import { toast } from 'sonner';
import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell, Tooltip as RechartTooltip,
  XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend,
} from 'recharts';


// ── Color Palette ─────────────────────────────────────────────────────────────

const COLORS = {
  indigo:  '#6366f1',
  emerald: '#10b981',
  amber:   '#f59e0b',
  blue:    '#3b82f6',
  rose:    '#f43f5e',
  violet:  '#8b5cf6',
};
const PIE_COLORS = [COLORS.indigo, COLORS.emerald, COLORS.amber, COLORS.blue, COLORS.rose];

// ── Static month labels ───────────────────────────────────────────────────────

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ── Report Data type ──────────────────────────────────────────────────────────

interface ReportData {
  totalStudents: number;
  totalTeachers: number;
  totalRevenue: number;
  pendingFees: number;
  collectionRate: number;
  activeStudents: number;
  genderBreakdown: { name: string; value: number }[];
  classEnrollment: { class: string; students: number }[];
  feeStatus: { name: string; value: number }[];
  monthlyRevenue: { month: string; collected: number; pending: number }[];
  studentStatusDist: { name: string; value: number }[];
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { color: string; name: string; value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-3 shadow-xl text-xs space-y-1">
      {label && <p className="font-bold text-[hsl(var(--foreground))] mb-1">{label}</p>}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-[hsl(var(--muted-foreground))]">{p.name}:</span>
          <span className="font-semibold text-[hsl(var(--foreground))]">
            {typeof p.value === 'number' && p.value > 1000 ? formatCurrency(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'financial' | 'academic'>('overview');

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    setIsLoading(true);
    try {
      const [students, teachers, fees] = await Promise.all([
        getStudents(),
        getTeachers(),
        getFees(),
      ]);

      // ── Student Analytics ─────────────────────────────────────────────────

      const activeStudents = students.filter((s) => s.status === 'active').length;

      const genderBreakdown = [
        { name: 'Male',   value: students.filter((s) => s.gender === 'male').length },
        { name: 'Female', value: students.filter((s) => s.gender === 'female').length },
        { name: 'Other',  value: students.filter((s) => s.gender === 'other').length },
      ].filter((g) => g.value > 0);

      const classMap: Record<string, number> = {};
      students.forEach((s) => {
        classMap[s.className] = (classMap[s.className] || 0) + 1;
      });
      const classEnrollment = Object.entries(classMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([cls, count]) => ({ class: cls, students: count }));

      const statusMap: Record<string, number> = {};
      students.forEach((s) => {
        statusMap[s.status] = (statusMap[s.status] || 0) + 1;
      });
      const studentStatusDist = Object.entries(statusMap).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }));

      // ── Fee / Financial Analytics ─────────────────────────────────────────

      const totalRevenue = fees.reduce((s, f) => s + f.paidAmount, 0);
      const pendingFees  = fees.reduce((s, f) => s + Math.max(0, f.amount - f.paidAmount), 0);
      const totalBilled  = fees.reduce((s, f) => s + f.amount, 0);
      const collectionRate = totalBilled > 0 ? (totalRevenue / totalBilled) * 100 : 0;

      const feeStatus = [
        { name: 'Paid',    value: fees.filter((f) => f.status === 'paid').length },
        { name: 'Pending', value: fees.filter((f) => f.status === 'pending').length },
        { name: 'Partial', value: fees.filter((f) => f.status === 'partial').length },
        { name: 'Overdue', value: fees.filter((f) => f.status === 'overdue').length },
      ].filter((s) => s.value > 0);

      // Monthly revenue
      const now = new Date();
      const monthlyRevenue = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (6 - i), 1);
        const label = MONTHS_SHORT[d.getMonth()];
        const monthFees = fees.filter((f) => {
          if (!f.paidDate) return false;
          const pd = new Date(f.paidDate);
          return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
        });
        const collected = monthFees.reduce((s, f) => s + f.paidAmount, 0);
        const pending   = monthFees.reduce((s, f) => s + Math.max(0, f.amount - f.paidAmount), 0);
        return { month: label, collected, pending };
      });


      setData({
        totalStudents: students.length,
        totalTeachers: teachers.length,
        totalRevenue,
        pendingFees,
        collectionRate,
        activeStudents,
        genderBreakdown,
        classEnrollment,
        feeStatus,
        monthlyRevenue,
        studentStatusDist,
      });
    } catch (err) {
      toast.error('Failed to load report data.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = (reportName: string) => {
    toast.success(`${reportName} export triggered. (PDF generation coming soon)`);
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────

  if (isLoading || !data) {
    return (
      <div className="space-y-6 animate-pulse-soft">
        <PageHeader title="School Analytics & Reports" description="Loading data..." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-[hsl(var(--muted))] border border-[hsl(var(--border))]" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-72 rounded-2xl bg-[hsl(var(--muted))] border border-[hsl(var(--border))]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <PageHeader
        title="School Analytics & Reports"
        description="Comprehensive overview of students, finances, attendance, and academics."
      />

      {/* Tab Nav */}
      <div className="flex items-center gap-1 rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--muted))]/30 p-1 w-fit">
        {([
          { id: 'overview',  label: 'Overview',   icon: BarChart3 },
          { id: 'financial', label: 'Financial',  icon: DollarSign },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === id
                ? 'bg-[hsl(var(--card))] shadow-sm text-[hsl(var(--foreground))]'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: 'Total Students',
                value: formatNumber(data.totalStudents),
                sub: `${data.activeStudents} active`,
                icon: GraduationCap,
                color: 'indigo',
                trend: '+12% this term',
              },
              {
                label: 'Teaching Staff',
                value: formatNumber(data.totalTeachers),
                sub: 'Faculty members',
                icon: Users,
                color: 'blue',
                trend: '+2 this month',
              },
              {
                label: 'Fee Collection',
                value: formatCurrency(data.totalRevenue),
                sub: `${data.collectionRate.toFixed(1)}% rate`,
                icon: DollarSign,
                color: 'emerald',
                trend: 'vs. last month',
              },
              {
                label: 'Pending Balance',
                value: formatCurrency(data.pendingFees),
                sub: 'Outstanding dues',
                icon: TrendingUp,
                color: 'amber',
                trend: 'Due this month',
              },
            ].map(({ label, value, sub, icon: Icon, color, trend }) => {
              const colorMap: Record<string, string> = {
                indigo:  'bg-indigo-500/10 text-indigo-600',
                blue:    'bg-blue-500/10 text-blue-600',
                emerald: 'bg-emerald-500/10 text-emerald-600',
                amber:   'bg-amber-500/10 text-amber-600',
              };
              return (
                <Card key={label} className="border-[hsl(var(--border))]/60 shadow-xs">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colorMap[color]}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                        <ArrowUpRight className="h-3 w-3" /> {trend}
                      </span>
                    </div>
                    <div className="text-2xl font-black text-[hsl(var(--foreground))]">{value}</div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{label}</div>
                    <div className="text-[10px] text-[hsl(var(--muted-foreground))]/70 mt-0.5">{sub}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Class Enrollment + Gender Charts */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-[hsl(var(--border))]/60 shadow-xs md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">Class-wise Enrollment</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.classEnrollment} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} vertical={false} />
                    <XAxis dataKey="class" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <RechartTooltip content={<CustomTooltip />} />
                    <Bar dataKey="students" name="Students" fill={COLORS.indigo} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-[hsl(var(--border))]/60 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">Gender Distribution</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={data.genderBreakdown}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {data.genderBreakdown.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartTooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3 mt-1">
                  {data.genderBreakdown.map((g, idx) => (
                    <div key={g.name} className="flex items-center gap-1.5 text-xs">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                      <span className="text-[hsl(var(--muted-foreground))]">{g.name}</span>
                      <span className="font-bold">{g.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Student Status + Export Actions */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-[hsl(var(--border))]/60 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">Student Status Distribution</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="space-y-3">
                  {data.studentStatusDist.map((s, idx) => {
                    const pct = data.totalStudents > 0 ? (s.value / data.totalStudents) * 100 : 0;
                    const colors = [COLORS.emerald, COLORS.indigo, COLORS.blue, COLORS.amber, COLORS.rose];
                    return (
                      <div key={s.name}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold">{s.name}</span>
                          <span className="text-[hsl(var(--muted-foreground))]">{s.value} ({pct.toFixed(1)}%)</span>
                        </div>
                        <div className="h-2 rounded-full bg-[hsl(var(--muted))]/40">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: colors[idx % colors.length] }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Quick Export Panel */}
            <Card className="border-[hsl(var(--border))]/60 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">Quick Report Exports</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="space-y-2">
                  {[
                    { label: 'Student Enrollment Report', icon: GraduationCap, color: 'text-indigo-600' },
                    { label: 'Teacher Directory Export', icon: Users, color: 'text-blue-600' },
                    { label: 'Monthly Fee Collection', icon: DollarSign, color: 'text-emerald-600' },
                    { label: 'Attendance Summary', icon: ClipboardCheck, color: 'text-amber-600' },
                    { label: 'Exam Results Summary', icon: FileText, color: 'text-violet-600' },
                  ].map(({ label, icon: Icon, color }) => (
                    <button
                      key={label}
                      onClick={() => handleExport(label)}
                      className="w-full flex items-center justify-between gap-3 rounded-xl border border-[hsl(var(--border))]/50 bg-[hsl(var(--card))] px-4 py-3 hover:bg-[hsl(var(--accent))]/10 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`h-4 w-4 ${color}`} />
                        <span className="text-sm font-semibold">{label}</span>
                      </div>
                      <Download className="h-4 w-4 text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))] transition-colors" />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── Financial Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'financial' && (
        <div className="space-y-6">
          {/* Revenue KPIs */}
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Total Collected',    value: formatCurrency(data.totalRevenue),  color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
              { label: 'Pending Balance',    value: formatCurrency(data.pendingFees),   color: 'text-amber-600',   bg: 'bg-amber-500/10' },
              { label: 'Collection Rate',    value: `${data.collectionRate.toFixed(1)}%`, color: 'text-indigo-600',  bg: 'bg-indigo-500/10' },
            ].map(({ label, value, color, bg: _bg }) => (
              <Card key={label} className="border-[hsl(var(--border))]/60 shadow-xs">
                <CardContent className="p-5 text-center">
                  <div className={`text-3xl font-black ${color}`}>{value}</div>
                  <div className="text-sm text-[hsl(var(--muted-foreground))] mt-1">{label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Monthly Revenue Trend */}
          <Card className="border-[hsl(var(--border))]/60 shadow-xs">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold">Monthly Fee Collection Trend</CardTitle>
                <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => handleExport('Monthly Revenue Report')}>
                  <Download className="h-3.5 w-3.5" /> Export
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data.monthlyRevenue} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={COLORS.emerald} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={COLORS.emerald} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={COLORS.amber} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={COLORS.amber} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <RechartTooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Area type="monotone" dataKey="collected" name="Collected (PKR)" stroke={COLORS.emerald} strokeWidth={2.5} fill="url(#colorCollected)" dot={{ r: 3, fill: COLORS.emerald }} />
                  <Area type="monotone" dataKey="pending"   name="Pending (PKR)"   stroke={COLORS.amber}   strokeWidth={2}   fill="url(#colorPending)"   dot={{ r: 3, fill: COLORS.amber   }} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Fee Status Breakdown */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-[hsl(var(--border))]/60 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">Fee Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={data.feeStatus} cx="50%" cy="50%" outerRadius={85} paddingAngle={3} dataKey="value">
                      {data.feeStatus.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartTooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-4 mt-2">
                  {data.feeStatus.map((s, idx) => (
                    <div key={s.name} className="flex items-center gap-1.5 text-xs">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                      <span className="text-[hsl(var(--muted-foreground))]">{s.name}:</span>
                      <span className="font-bold">{s.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-[hsl(var(--border))]/60 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">Financial Report Actions</CardTitle>
              </CardHeader>
              <CardContent className="pb-4 space-y-2">
                {[
                  'Monthly Fee Collection Report',
                  'Overdue Fee Tracker',
                  'Revenue vs. Target Analysis',
                  'Invoice Summary Export',
                  'Fee Structure Report',
                ].map((report) => (
                  <button
                    key={report}
                    onClick={() => handleExport(report)}
                    className="w-full flex items-center justify-between gap-3 rounded-xl border border-[hsl(var(--border))]/50 bg-[hsl(var(--card))] px-4 py-3 hover:bg-[hsl(var(--accent))]/10 transition-all group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm font-semibold">{report}</span>
                    </div>
                    <Download className="h-4 w-4 text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))] transition-colors" />
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}


    </div>
  );
}
