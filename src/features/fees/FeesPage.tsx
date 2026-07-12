import { useEffect, useState } from 'react';
import { CreditCard, X, Loader2, AlertCircle, CheckCircle2, Clock, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getFees, recordPayment } from './feeService';
import type { Fee } from '@/types';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/AuthContext';
import { formatCurrency, formatDate } from '@/lib/utils';

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
  const { user } = useAuth();
  const [fees, setFees] = useState<Fee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Pay Fee modal
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [selectedFee, setSelectedFee] = useState<Fee | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'cheque' | 'online'>('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadFees = () => {
    setIsLoading(true);
    getFees()
      .then((data) => setFees(data))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { loadFees(); }, []);

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

  const filteredFees = fees.filter((f) => !statusFilter || f.status === statusFilter);

  // Summary stats
  const totalAmount = fees.reduce((s, f) => s + f.amount, 0);
  const totalPaid = fees.reduce((s, f) => s + f.paidAmount, 0);
  const totalPending = totalAmount - totalPaid;
  const overdueCount = fees.filter((f) => f.status === 'overdue').length;

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
        <div className="flex gap-2 justify-end">
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
        description="View and collect monthly fees, track payment status and remaining balances."
        action={{
          label: 'Refresh',
          onClick: loadFees,
          icon: <RefreshCw className="h-4 w-4" />,
        }}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">Total Assigned</div>
                <div className="text-lg font-bold text-slate-800">{formatCurrency(totalAmount)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">Total Collected</div>
                <div className="text-lg font-bold text-emerald-700">{formatCurrency(totalPaid)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">Pending Amount</div>
                <div className="text-lg font-bold text-amber-700">{formatCurrency(totalPending)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">Overdue Records</div>
                <div className="text-lg font-bold text-red-700">{overdueCount}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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

      {/* Main Table */}
      <Card className="border border-slate-200 shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="text-sm text-slate-500">Loading fee records...</span>
              </div>
            </div>
          ) : (
            <DataTable
              data={filteredFees}
              columns={columns}
              searchField="studentName"
              searchPlaceholder="Search by student name..."
              filterComponent={
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
