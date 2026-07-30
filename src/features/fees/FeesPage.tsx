import { useEffect, useState, useCallback } from 'react';
import {
  CreditCard, X, Loader2, AlertCircle, CheckCircle2, Clock,
  RefreshCw, ChevronDown, Users, TrendingUp, CalendarDays, History,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  getFees, getAvailableFeeMonths,
  recordPayment, getFeesByStudent,
} from './feeService';
import type { Fee } from '@/types';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/AuthContext';
import { formatCurrency, formatDate } from '@/lib/utils';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Generate years from 2020 to 2050
const YEARS = Array.from({ length: 31 }, (_, i) => 2020 + i);

function getCurrentMonthLabel(): string {
  return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'paid':
      return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 font-semibold text-xs">✓ Paid</Badge>;
    case 'partial':
      return <Badge className="bg-blue-100 text-blue-700 border-blue-200 font-semibold text-xs">◑ Partial</Badge>;
    case 'overdue':
      return <Badge className="bg-red-100 text-red-700 border-red-200 font-semibold text-xs">⚠ Overdue</Badge>;
    default:
      return <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-semibold text-xs">⏳ Pending</Badge>;
  }
}

export default function FeesPage() {
  const { user, hasRole } = useAuth();
  const [fees, setFees] = useState<Fee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthLabel());
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [showAllMonths, setShowAllMonths] = useState(false);

  // Pay Fee modal
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [selectedFee, setSelectedFee] = useState<Fee | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'cheque' | 'online'>('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Student History modal
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyFee, setHistoryFee] = useState<Fee | null>(null);
  const [historyRecords, setHistoryRecords] = useState<Fee[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Split selectedMonth into parts for UI
  const [monthPart, yearPart] = selectedMonth ? selectedMonth.split(' ') : getCurrentMonthLabel().split(' ');

  const loadFees = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getFees();
      setFees(data);
      getAvailableFeeMonths().then(setAvailableMonths).catch(() => {});
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadFees(); }, [loadFees]);

  const handlePayClick = (fee: Fee) => {
    setSelectedFee(fee);
    setPaymentAmount(fee.amount - fee.paidAmount);
    setIsPayOpen(true);
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFee || paymentAmount <= 0 || !user) return;
    setIsSubmitting(true);
    try {
      await recordPayment(selectedFee.id, {
        amount: paymentAmount,
        method: paymentMethod,
        collectorId: user.uid || 'admin',
        collectorName: user.displayName || 'Admin',
      });
      toast.success(`Payment of ${formatCurrency(paymentAmount)} recorded successfully.`);
      setIsPayOpen(false);
      loadFees();
    } catch {
      toast.error('Failed to record payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewHistory = async (fee: Fee) => {
    setHistoryFee(fee);
    setIsHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const records = await getFeesByStudent(fee.studentId);
      setHistoryRecords(records);
    } catch {
      toast.error('Failed to load payment history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const filteredFees = fees.filter((f) => {
    const statusMatch = !statusFilter || f.status === statusFilter;
    if (showAllMonths) return statusMatch;
    
    let mStr = (f.month || '').toLowerCase();
    if (!mStr && f.createdAt) {
      mStr = new Date(f.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toLowerCase();
    }
    const matchesMonth = mStr.includes(monthPart.toLowerCase()) && mStr.includes(yearPart.toString());
    
    return statusMatch && matchesMonth;
  });

  // Summary stats
  const totalStudents = new Set(filteredFees.map((f) => f.studentId)).size;
  const totalAmount = filteredFees.reduce((s, f) => s + f.amount, 0);
  const totalPaid = filteredFees.reduce((s, f) => s + f.paidAmount, 0);
  const totalPending = totalAmount - totalPaid;
  const paidStudents = filteredFees.filter((f) => f.status === 'paid').length;
  const overdueCount = filteredFees.filter((f) => f.status === 'overdue').length;
  const pendingCount = filteredFees.filter((f) => f.status === 'pending' || f.status === 'partial').length;
  const collectionRate = totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0;

  const columns: Column<Fee>[] = [
    {
      key: 'studentName',
      header: 'Student',
      sortable: true,
      cell: (item) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
            {item.studentName.charAt(0)}
          </div>
          <div>
            <div className="font-semibold text-slate-800 text-sm">{item.studentName}</div>
            <div className="text-[11px] text-slate-500">{item.className} — Sec {item.section}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Fee Description',
      cell: (item) => (
        <div>
          <div className="text-sm text-slate-700 font-medium">{item.description || item.feeType}</div>
          {item.month && <div className="text-[11px] text-slate-400">{item.month}</div>}
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Total Fee',
      sortable: true,
      cell: (item) => <span className="font-semibold text-slate-800">{formatCurrency(item.amount)}</span>,
    },
    {
      key: 'paidAmount',
      header: 'Paid',
      cell: (item) => (
        <span className={item.paidAmount > 0 ? 'text-emerald-600 font-semibold' : 'text-slate-400'}>
          {formatCurrency(item.paidAmount)}
        </span>
      ),
    },
    {
      key: 'remaining',
      header: 'Remaining',
      cell: (item) => {
        const remaining = item.amount - item.paidAmount;
        return (
          <span className={remaining > 0 ? 'text-red-600 font-bold' : 'text-emerald-600 font-semibold'}>
            {remaining > 0 ? formatCurrency(remaining) : '—'}
          </span>
        );
      },
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      sortable: true,
      cell: (item) => (
        <div className="text-sm text-slate-600">{formatDate(item.dueDate)}</div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (item) => getStatusBadge(item.status),
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      cell: (item) => (
        <div className="flex gap-1.5 justify-end items-center">
          {/* History Button */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleViewHistory(item)}
            className="h-8 gap-1 text-xs text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 px-2"
            title="View full payment history"
          >
            <History className="h-3.5 w-3.5" />
            History
          </Button>

          {item.status !== 'paid' && (
            <Button
              size="sm"
              onClick={() => handlePayClick(item)}
              className="h-8 gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white"
            >
              <CreditCard className="h-3.5 w-3.5" />
              Pay Fee
            </Button>
          )}
          {item.status === 'paid' && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold px-2 py-1 bg-emerald-50 rounded-lg">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Cleared
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Fee Ledger"
        description="Monthly fee collection — select any month from 2020 onwards to see complete student fee analysis."
        action={{
          label: 'Refresh',
          onClick: loadFees,
          icon: <RefreshCw className="h-4 w-4" />,
        }}
      />

      {/* Month Selector Bar */}
      <Card className="border border-blue-100 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                <CalendarDays className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-800">Select Month</div>
                <div className="text-[11px] text-slate-500">
                  {availableMonths.length > 0
                    ? `${availableMonths.length} months with data · History from 2020`
                    : 'Full history available from January 2020'}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2.5 items-center">
              <div className="flex gap-2">
                <div className="relative">
                  <select
                    value={monthPart}
                    onChange={(e) => {
                      setSelectedMonth(`${e.target.value} ${yearPart}`);
                      setShowAllMonths(false);
                    }}
                    className="h-10 pl-4 pr-10 rounded-xl border border-blue-200 bg-white text-sm font-semibold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer shadow-sm"
                  >
                    {MONTHS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500 pointer-events-none" />
                </div>
                <div className="relative">
                  <select
                    value={yearPart}
                    onChange={(e) => {
                      setSelectedMonth(`${monthPart} ${e.target.value}`);
                      setShowAllMonths(false);
                    }}
                    className="h-10 pl-4 pr-10 rounded-xl border border-blue-200 bg-white text-sm font-semibold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer shadow-sm"
                  >
                    {YEARS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500 pointer-events-none" />
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setShowAllMonths(!showAllMonths); }}
                className={`h-10 gap-1.5 text-xs font-semibold rounded-xl border-blue-200 ${showAllMonths ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-700'}`}
              >
                {showAllMonths ? '✓ Showing All' : 'Show All Months'}
              </Button>

              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-10 pl-4 pr-10 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer shadow-sm"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500 pointer-events-none" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Analysis Summary */}
      {hasRole(['admin', 'manager']) && (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-violet-600" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-slate-500 font-medium truncate">Total Students</div>
                <div className="text-lg font-bold text-slate-800">{totalStudents}</div>
                <div className="text-[10px] text-slate-400">{paidStudents} paid · {pendingCount} pending</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-slate-500 font-medium">Total Assigned</div>
                <div className="text-lg font-bold text-slate-800">{formatCurrency(totalAmount)}</div>
                <div className="text-[10px] text-slate-400">{filteredFees.length} fee records</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-slate-500 font-medium">Collected</div>
                <div className="text-lg font-bold text-emerald-700">{formatCurrency(totalPaid)}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="h-1.5 w-16 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${collectionRate}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-emerald-600 font-semibold">{collectionRate}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-slate-500 font-medium">Outstanding</div>
                <div className="text-lg font-bold text-red-700">{formatCurrency(totalPending)}</div>
                <div className="text-[10px] text-slate-400">{overdueCount} overdue records</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      )}

      {/* Status breakdown bar */}
      {filteredFees.length > 0 && hasRole(['admin', 'manager']) && (
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-bold text-slate-600 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                Fee Collection Progress — {showAllMonths ? 'All Time' : selectedMonth}
              </div>
              <div className="text-xs text-slate-500 font-semibold">
                {formatCurrency(totalPaid)} of {formatCurrency(totalAmount)}
              </div>
            </div>
            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-emerald-500 rounded-l-full transition-all duration-700"
                style={{ width: `${Math.round((filteredFees.filter(f => f.status === 'paid').length / filteredFees.length) * 100)}%` }}
                title="Paid"
              />
              <div
                className="h-full bg-blue-400 transition-all duration-700"
                style={{ width: `${Math.round((filteredFees.filter(f => f.status === 'partial').length / filteredFees.length) * 100)}%` }}
                title="Partial"
              />
              <div
                className="h-full bg-red-400 transition-all duration-700"
                style={{ width: `${Math.round((filteredFees.filter(f => f.status === 'overdue').length / filteredFees.length) * 100)}%` }}
                title="Overdue"
              />
              <div
                className="h-full bg-amber-300 rounded-r-full transition-all duration-700"
                style={{ width: `${Math.round((filteredFees.filter(f => f.status === 'pending').length / filteredFees.length) * 100)}%` }}
                title="Pending"
              />
            </div>
            <div className="flex gap-4 mt-2">
              {[
                { label: 'Paid', color: 'bg-emerald-500', count: filteredFees.filter(f => f.status === 'paid').length },
                { label: 'Partial', color: 'bg-blue-400', count: filteredFees.filter(f => f.status === 'partial').length },
                { label: 'Overdue', color: 'bg-red-400', count: filteredFees.filter(f => f.status === 'overdue').length },
                { label: 'Pending', color: 'bg-amber-300', count: filteredFees.filter(f => f.status === 'pending').length },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                  <div className={`h-2 w-2 rounded-full ${item.color}`} />
                  <span>{item.label}: <strong>{item.count}</strong></span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pay Fee Modal */}
      {isPayOpen && selectedFee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsPayOpen(false)} />
          <Card className="relative w-full max-w-md z-10 animate-scale-in shadow-2xl border-slate-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-800 text-base">Collect Fee Payment</h2>
                <p className="text-xs text-slate-500 mt-0.5">Record payment for this fee record</p>
              </div>
              <button onClick={() => setIsPayOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handlePaySubmit} className="p-6 space-y-4">
              {/* Student info summary */}
              <div className="bg-blue-50 rounded-xl p-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Student:</span>
                  <span className="font-semibold text-slate-800">{selectedFee.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Fee:</span>
                  <span className="font-medium text-slate-700">{selectedFee.description || selectedFee.feeType}</span>
                </div>
                {selectedFee.month && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Month:</span>
                    <span className="font-medium text-blue-700">{selectedFee.month}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Amount:</span>
                  <span className="font-semibold">{formatCurrency(selectedFee.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Already Paid:</span>
                  <span className="font-semibold text-emerald-600">{formatCurrency(selectedFee.paidAmount)}</span>
                </div>
                <div className="flex justify-between border-t border-blue-100 pt-1 mt-1">
                  <span className="text-slate-600 font-semibold">Remaining Balance:</span>
                  <span className="font-bold text-red-600">{formatCurrency(selectedFee.amount - selectedFee.paidAmount)}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Payment Amount (PKR)</label>
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  max={selectedFee.amount - selectedFee.paidAmount}
                  required
                  className="border-slate-200"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                  className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="online">Online Payment</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setIsPayOpen(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Payment'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ── Student Payment History Modal ──────────────────────────────────── */}
      {isHistoryOpen && historyFee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsHistoryOpen(false)} />
          <Card className="relative w-full max-w-2xl z-10 animate-scale-in shadow-2xl border-slate-200 max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm shrink-0">
                  {historyFee.studentName.charAt(0)}
                </div>
                <div>
                  <h2 className="font-bold text-slate-800 text-base">Fee Payment History</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {historyFee.studentName} — {historyFee.className} Sec {historyFee.section}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsHistoryOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {historyLoading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                    <span className="text-sm text-slate-500">Loading fee history...</span>
                  </div>
                </div>
              ) : historyRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center gap-3">
                  <Clock className="h-10 w-10 text-slate-300" />
                  <p className="text-slate-500 font-semibold">No fee records found</p>
                  <p className="text-xs text-slate-400">No fee history available for this student.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Summary bar */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      {
                        label: 'Total Billed',
                        value: formatCurrency(historyRecords.reduce((s, r) => s + r.amount, 0)),
                        color: 'text-slate-800',
                        bg: 'bg-slate-50',
                      },
                      {
                        label: 'Total Paid',
                        value: formatCurrency(historyRecords.reduce((s, r) => s + r.paidAmount, 0)),
                        color: 'text-emerald-700',
                        bg: 'bg-emerald-50',
                      },
                      {
                        label: 'Outstanding',
                        value: formatCurrency(
                          historyRecords.reduce((s, r) => s + (r.amount - r.paidAmount), 0),
                        ),
                        color: 'text-red-600',
                        bg: 'bg-red-50',
                      },
                    ].map((stat) => (
                      <div key={stat.label} className={`${stat.bg} rounded-xl p-3 text-center`}>
                        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{stat.label}</div>
                        <div className={`text-base font-bold mt-0.5 ${stat.color}`}>{stat.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Fee record rows */}
                  {historyRecords.map((rec) => {
                    const remaining = rec.amount - rec.paidAmount;
                    return (
                      <div
                        key={rec.id}
                        className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <div className="shrink-0">{getStatusBadge(rec.status)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-slate-800 truncate">
                            {rec.description || rec.feeType}
                          </div>
                          <div className="flex gap-2 text-[11px] text-slate-400 mt-0.5">
                            {rec.month && <span>{rec.month}</span>}
                            {rec.dueDate && <span>· Due: {formatDate(rec.dueDate)}</span>}
                            {rec.paidDate && <span>· Paid: {formatDate(rec.paidDate)}</span>}
                            {rec.paymentMethod && (
                              <span className="capitalize">· {rec.paymentMethod.replace('_', ' ')}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold text-slate-800">{formatCurrency(rec.amount)}</div>
                          <div className="text-[11px] text-emerald-600 font-semibold">
                            Paid: {formatCurrency(rec.paidAmount)}
                          </div>
                          {remaining > 0 && (
                            <div className="text-[11px] text-red-500 font-semibold">
                              Due: {formatCurrency(remaining)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 shrink-0 flex justify-end">
              <Button
                onClick={() => setIsHistoryOpen(false)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Main Table */}
      <Card className="border border-slate-200 shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="text-sm text-slate-500">Loading fee records for {showAllMonths ? 'all months' : selectedMonth}...</span>
              </div>
            </div>
          ) : filteredFees.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
              <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                <Clock className="h-8 w-8 text-slate-400" />
              </div>
              <div>
                <p className="font-semibold text-slate-700">No Fee Records</p>
                <p className="text-sm text-slate-400 mt-1">
                  No fees found for {showAllMonths ? 'any month' : selectedMonth}.
                  {!showAllMonths && ' Try generating monthly fees or selecting a different month.'}
                </p>
              </div>
            </div>
          ) : (
            <DataTable
              data={filteredFees}
              columns={columns}
              searchField="studentName"
              searchPlaceholder="Search by student name..."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
