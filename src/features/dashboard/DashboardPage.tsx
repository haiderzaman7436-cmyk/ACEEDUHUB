import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Users,
  DollarSign,
  TrendingUp,
  Activity,
  FileCheck,
  Award,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

import { formatCurrency, formatNumber } from '@/lib/utils';
import { fetchDashboardData, type DashboardData } from './dashboardService';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

import { useAuth } from '@/features/auth/AuthContext';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

export default function DashboardPage() {
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = () => {
    setIsLoading(true);
    fetchDashboardData()
      .then((res) => {
        setData(res);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  if (isLoading || !data) {
    return (
      <div className="space-y-6 animate-pulse-soft">
        <PageHeader title="Dashboard Overview" description="Monitoring school assets..." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-100 border border-slate-200" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="h-80 col-span-2 rounded-2xl bg-slate-100 border border-slate-200" />
          <div className="h-80 rounded-2xl bg-slate-100 border border-slate-200" />
        </div>
      </div>
    );
  }

  const { kpis, enrollmentChart, attendanceChart, revenueChart, recentActivities } = data;

  return (
    <div className="space-y-6 animate-fade-in gradient-mesh min-h-screen pb-10">
      <PageHeader
        title="Dashboard Overview"
        description="Monitor school activities, finances, and active records in real time."
      />

      {/* KPI Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Students"
          value={formatNumber(kpis.totalStudents.value)}
          icon={<GraduationCap className="h-5 w-5 text-blue-600" />}
          trend={{
            value: kpis.totalStudents.trend,
            isPositive: kpis.totalStudents.isPositive,
            label: 'active student profiles',
          }}
          variant="blue"
        />
        <StatCard
          title="Active Teachers"
          value={formatNumber(kpis.totalTeachers.value)}
          icon={<Users className="h-5 w-5 text-indigo-600" />}
          trend={{
            value: kpis.totalTeachers.trend,
            isPositive: kpis.totalTeachers.isPositive,
            label: 'active faculty staff',
          }}
          variant="indigo"
        />
        {hasRole(['admin', 'manager']) && (
          <StatCard
            title="Monthly Revenue"
            value={formatCurrency(kpis.monthlyRevenue.value)}
            icon={<DollarSign className="h-5 w-5 text-emerald-600" />}
            trend={{
              value: kpis.monthlyRevenue.trend,
              isPositive: kpis.monthlyRevenue.isPositive,
              label: 'total collected fees',
            }}
            variant="emerald"
          />
        )}
        <StatCard
          title="Board Registrations"
          value={formatNumber(kpis.boardRegistrations.value)}
          icon={<Award className="h-5 w-5 text-violet-600" />}
          trend={{
            value: kpis.boardRegistrations.trend,
            isPositive: kpis.boardRegistrations.isPositive,
            label: '9th & 10th grade students',
          }}
          variant="violet"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Enrollment Trend (Area Chart) */}
        <Card className="col-span-2 border-slate-200/80 shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-50">
            <div>
              <CardTitle className="text-base font-bold text-slate-800">Student Enrollment Trend</CardTitle>
              <p className="text-xs text-slate-500">Cumulative registration growth over time</p>
            </div>
            <TrendingUp className="h-4.5 w-4.5 text-blue-600" />
          </CardHeader>
          <CardContent className="h-72 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={enrollmentChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="enrollmentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#1e293b',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="students"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#enrollmentGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Fee Collection Breakdown (Pie Chart) - Admin/Manager only */}
        {hasRole(['admin', 'manager']) && (
          <Card className="border-slate-200/80 shadow-sm bg-white">
            <CardHeader className="pb-2 border-b border-slate-50">
              <CardTitle className="text-base font-bold text-slate-800">Fee Revenue Stream</CardTitle>
              <p className="text-xs text-slate-500">Breakdown by tuition type</p>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center h-72 pt-4">
              {kpis.monthlyRevenue.value === 0 ? (
                <div className="flex flex-col items-center justify-center text-center h-44">
                  <DollarSign className="h-10 w-10 text-slate-300 mb-2" />
                  <span className="text-xs text-slate-500 font-medium">No fee revenue collected yet</span>
                </div>
              ) : (
                <div className="relative w-full h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={revenueChart}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {revenueChart.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => formatCurrency(Number(value))}
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderColor: '#e2e8f0',
                          borderRadius: '12px',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xs text-slate-500 font-medium">Total Collected</span>
                    <span className="text-base font-bold text-slate-800">
                      {formatCurrency(revenueChart.reduce((sum, item) => sum + item.value, 0))}
                    </span>
                  </div>
                </div>
              )}

              {/* Legends */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 w-full mt-4 text-xs font-semibold">
                {revenueChart.slice(0, 4).map((item, idx) => (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[idx] }} />
                    <span className="text-slate-600 truncate">{item.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Grid: Activities and Attendance and Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Attendance Statistics (Bar Chart) */}
        <Card className="border-slate-200/80 shadow-sm bg-white">
          <CardHeader className="pb-2 border-b border-slate-50">
            <CardTitle className="text-base font-bold text-slate-800">Weekly Student Attendance</CardTitle>
            <p className="text-xs text-slate-500">Weekly present vs absent rate estimate</p>
          </CardHeader>
          <CardContent className="h-64 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="present" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Audit / Action Log Feed */}
        <Card className="border-slate-200/80 shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-50">
            <div>
              <CardTitle className="text-base font-bold text-slate-800">Audit Trails & Actions</CardTitle>
              <p className="text-xs text-slate-500">Latest system modifications logs</p>
            </div>
            <Activity className="h-4.5 w-4.5 text-slate-400" />
          </CardHeader>
          <CardContent className="space-y-4 max-h-64 overflow-y-auto pt-4">
            {recentActivities.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-12">
                <FileCheck className="h-8 w-8 text-slate-300 mb-2" />
                <span className="text-xs text-slate-500 font-medium">No actions logged yet</span>
              </div>
            ) : (
              recentActivities.map((log) => (
                <div key={log.id} className="flex gap-3 text-xs leading-normal">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 font-semibold">
                    <FileCheck className="h-3.5 w-3.5" />
                  </div>
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <p className="font-semibold text-slate-800">
                      {log.action} <span className="font-normal text-slate-500">by {log.userName}</span>
                    </p>
                    <p className="text-slate-600 truncate">{log.details}</p>
                    <span className="text-[10px] text-slate-400 block pt-0.5">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Shortcut Quick Panel */}
        <Card className="border-slate-200/80 shadow-sm bg-white">
          <CardHeader className="pb-2 border-b border-slate-50">
            <CardTitle className="text-base font-bold text-slate-800">Quick Execution Panel</CardTitle>
            <p className="text-xs text-slate-500">Quick shortcuts to school workflows</p>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 h-64 pt-4">
            <button
              onClick={() => navigate('/students')}
              className="flex flex-col items-center justify-center p-4 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 hover:scale-102 transition-all duration-200 group text-center cursor-pointer"
            >
              <GraduationCap className="h-6 w-6 text-blue-600 mb-2 group-hover:bounce-subtle" />
              <span className="text-xs font-bold text-slate-700">Student Directory</span>
            </button>
            <button
              onClick={() => navigate('/teachers')}
              className="flex flex-col items-center justify-center p-4 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 hover:scale-102 transition-all duration-200 group text-center cursor-pointer"
            >
              <Users className="h-6 w-6 text-indigo-600 mb-2" />
              <span className="text-xs font-bold text-slate-700">Staff Directory</span>
            </button>
            <button
              onClick={() => navigate('/registrations')}
              className="flex flex-col items-center justify-center p-4 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 hover:scale-102 transition-all duration-200 group text-center cursor-pointer"
            >
              <Award className="h-6 w-6 text-violet-600 mb-2" />
              <span className="text-xs font-bold text-slate-700">Board Reg.</span>
            </button>
            <button
              onClick={() => navigate('/fees')}
              className="flex flex-col items-center justify-center p-4 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 hover:scale-102 transition-all duration-200 group text-center cursor-pointer"
            >
              <DollarSign className="h-6 w-6 text-emerald-600 mb-2" />
              <span className="text-xs font-bold text-slate-700">Collect Fees</span>
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
