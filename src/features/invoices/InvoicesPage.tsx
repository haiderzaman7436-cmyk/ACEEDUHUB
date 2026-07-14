import { useEffect, useState, useCallback } from 'react';
import {
  Eye, X, CreditCard, Loader2, CheckCircle2, RefreshCw,
  Landmark, Receipt, Banknote, CalendarDays,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  getInvoices, payInvoice, generateMonthlyFeesForAll,
} from '@/features/fees/feeService';
import { getStudentById } from '@/features/students/studentService';
import type { Invoice, Student } from '@/types';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/utils';
import { APP_NAME } from '@/lib/constants';
import { useAuth } from '@/features/auth/AuthContext';
import { BankInvoicePrint } from '@/features/fees/BankInvoicePrint';

function getCurrentMonthLabel(): string {
  return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'paid':
      return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs font-semibold">Paid</Badge>;
    case 'overdue':
      return <Badge className="bg-red-100 text-red-700 border-red-200 text-xs font-semibold">Overdue</Badge>;
    case 'cancelled':
      return <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-xs font-semibold">Cancelled</Badge>;
    default:
      return <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs font-semibold">Unpaid</Badge>;
  }
}

export default function InvoicesPage() {
  const { user, hasRole } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Challan print states
  const [challanInvoice, setChallanInvoice] = useState<Invoice | null>(null);
  const [challanStudent, setChallanStudent] = useState<Student | null>(null);
  const [isLoadingChallan, setIsLoadingChallan] = useState(false);

  // Pay modal
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [payInvTarget, setPayInvTarget] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState<'cash' | 'bank_transfer' | 'cheque' | 'online'>('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [classFilter, setClassFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showAllMonths, setShowAllMonths] = useState(false);
  const currentMonth = getCurrentMonthLabel();

  const loadInvoices = useCallback(() => {
    setIsLoading(true);
    getInvoices()
      .then((data) => setInvoices(data))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => { loadInvoices(); }, [loadInvoices]);

  const handlePreviewClick = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setIsPreviewOpen(true);
  };

  const handleChallanClick = async (inv: Invoice) => {
    setIsLoadingChallan(true);
    try {
      const student = await getStudentById(inv.studentId);
      if (!student) { toast.error('Student data not found.'); return; }
      setChallanInvoice(inv);
      setChallanStudent(student);
    } catch {
      toast.error('Failed to load challan data.');
    } finally {
      setIsLoadingChallan(false);
    }
  };

  const handlePayClick = (inv: Invoice) => {
    setPayInvTarget(inv);
    setPayAmount(inv.grandTotal - (inv.paidAmount || 0));
    setIsPayOpen(true);
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payInvTarget || payAmount <= 0 || !user) return;
    setIsSubmitting(true);
    try {
      await payInvoice(payInvTarget.id, {
        amount: payAmount,
        method: payMethod,
        collectorId: user.uid || 'admin',
        collectorName: user.displayName || 'Admin',
      });
      toast.success(`Payment of ${formatCurrency(payAmount)} recorded for ${payInvTarget.invoiceNumber}`);
      setIsPayOpen(false);
      loadInvoices();
    } catch {
      toast.error('Payment failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateMonthlyFees = async () => {
    setIsSubmitting(true);
    try {
      const result = await generateMonthlyFeesForAll();
      if (result.success === 0 && result.skipped === 0) {
        toast.info('No active students found to generate fees for.');
      } else {
        toast.success(`Monthly fees generated: ${result.success} new, ${result.skipped} skipped/already billed.`);
        loadInvoices();
      }
    } catch {
      toast.error('Failed to generate monthly fees.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter logic — default: current month only
  const filteredInvoices = invoices.filter((inv) => {
    const matchesMonth = showAllMonths || (inv.month === currentMonth);
    const matchesClass = !classFilter || inv.className.toLowerCase() === classFilter.toLowerCase();
    const matchesCategory = !categoryFilter || (inv.category || 'school').toLowerCase() === categoryFilter.toLowerCase();
    return matchesMonth && matchesClass && matchesCategory;
  });

  // Summary for current view
  const totalBill = filteredInvoices.reduce((s, i) => s + i.grandTotal, 0);
  const totalPaid = filteredInvoices.reduce((s, i) => s + (i.paidAmount || 0), 0);
  const totalRemaining = totalBill - totalPaid;
  const paidCount = filteredInvoices.filter((i) => i.status === 'paid').length;
  const unpaidCount = filteredInvoices.filter((i) => i.status !== 'paid' && i.status !== 'cancelled').length;

  const uniqueClasses = Array.from(new Set(invoices.map((inv) => inv.className))).filter(Boolean);

  const columns: Column<Invoice>[] = [
    {
      key: 'invoiceNumber',
      header: 'Invoice No',
      sortable: true,
      cell: (item) => (
        <span className="font-bold text-blue-600 text-sm">{item.invoiceNumber}</span>
      ),
    },
    {
      key: 'studentName',
      header: 'Student',
      sortable: true,
      cell: (item) => (
        <div>
          <div className="font-semibold text-slate-800 text-sm">{item.studentName}</div>
          <div className="text-[11px] text-slate-400">
            {item.className} — Sec {item.section}
            <span className="ml-1.5 px-1 py-0.25 bg-slate-100 text-slate-600 text-[9px] rounded font-medium capitalize">
              {item.category || 'school'}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'grandTotal',
      header: 'Total Bill',
      sortable: true,
      cell: (item) => <span className="font-semibold text-slate-800">{formatCurrency(item.grandTotal)}</span>,
    },
    {
      key: 'paidAmount',
      header: 'Paid',
      cell: (item) => (
        <span className={(item.paidAmount || 0) > 0 ? 'text-emerald-600 font-semibold' : 'text-slate-400'}>
          {formatCurrency(item.paidAmount || 0)}
        </span>
      ),
    },
    {
      key: 'remaining',
      header: 'Remaining',
      cell: (item) => {
        const rem = item.grandTotal - (item.paidAmount || 0);
        return (
          <span className={rem > 0 ? 'text-red-600 font-bold' : 'text-emerald-600 font-semibold'}>
            {rem > 0 ? formatCurrency(rem) : '—'}
          </span>
        );
      },
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      cell: (item) => <span className="text-sm text-slate-600">{formatDate(item.dueDate)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (item) => getStatusBadge(item.status),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (item) => (
        <div className="flex gap-1.5 justify-end flex-wrap">
          {/* View Details */}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50"
            onClick={() => handlePreviewClick(item)}
            title="View Invoice Details"
          >
            <Eye className="h-4 w-4" />
          </Button>

          {/* Bank Challan 3-copy — ONLY print option */}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
            onClick={() => handleChallanClick(item)}
            title="Print Bank Challan (3 Copies)"
            disabled={isLoadingChallan}
          >
            {isLoadingChallan ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
          </Button>

          {/* Pay */}
          {item.status !== 'paid' && item.status !== 'cancelled' && (
            <Button
              size="sm"
              onClick={() => handlePayClick(item)}
              className="h-8 gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white"
            >
              <CreditCard className="h-3.5 w-3.5" />
              Pay
            </Button>
          )}
          {item.status === 'paid' && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold px-2 py-1 bg-emerald-50 rounded-lg">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Paid
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Bank Challan Modal */}
      {challanInvoice && challanStudent && (
        <BankInvoicePrint
          invoice={challanInvoice}
          student={challanStudent}
          onClose={() => { setChallanInvoice(null); setChallanStudent(null); }}
        />
      )}

      <PageHeader
        title="Invoices & Billing"
        description="View fee invoices, track payment status, and print bank challans."
        action={{
          label: 'Refresh',
          onClick: loadInvoices,
          icon: <RefreshCw className="h-4 w-4" />,
        }}
      />

      {/* Pay Invoice Modal */}
      {isPayOpen && payInvTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsPayOpen(false)} />
          <Card className="relative w-full max-w-md z-10 animate-scale-in shadow-2xl border-slate-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-800 text-base">Pay Invoice</h2>
                <p className="text-xs text-slate-400 mt-0.5">{payInvTarget.invoiceNumber}</p>
              </div>
              <button onClick={() => setIsPayOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handlePaySubmit} className="p-6 space-y-4">
              <div className="bg-blue-50 rounded-xl p-4 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Student:</span>
                  <span className="font-semibold text-slate-800">{payInvTarget.studentName}</span>
                </div>
                {payInvTarget.month && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Month:</span>
                    <span className="font-semibold text-blue-700">{payInvTarget.month}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice Total:</span>
                  <span className="font-semibold">{formatCurrency(payInvTarget.grandTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Already Paid:</span>
                  <span className="text-emerald-600 font-semibold">{formatCurrency(payInvTarget.paidAmount || 0)}</span>
                </div>
                <div className="flex justify-between border-t border-blue-100 pt-1 mt-1">
                  <span className="font-semibold text-slate-700">Balance Due:</span>
                  <span className="font-bold text-red-600">{formatCurrency(payInvTarget.grandTotal - (payInvTarget.paidAmount || 0))}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Payment Amount (PKR)</label>
                <Input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  max={payInvTarget.grandTotal - (payInvTarget.paidAmount || 0)}
                  required
                  className="border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPayMethod(e.target.value as any)}
                  className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="online">Online Payment</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setIsPayOpen(false)} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Payment'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Invoice Preview Modal */}
      {isPreviewOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsPreviewOpen(false)} />
          <Card className="relative w-full max-w-2xl max-h-[90vh] flex flex-col z-10 animate-scale-in overflow-hidden shadow-2xl">
            {/* Toolbar */}
            <div className="flex items-center justify-between bg-slate-50 border-b border-slate-200 p-5">
              <div>
                <h2 className="font-bold text-slate-800 text-base">Invoice Details</h2>
                <p className="text-xs text-slate-400">{selectedInvoice.invoiceNumber}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => { setIsPreviewOpen(false); handleChallanClick(selectedInvoice); }}
                  className="h-8 gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <Banknote className="h-3.5 w-3.5" />
                  Print 3-Copy Challan
                </Button>
                <button onClick={() => setIsPreviewOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Invoice Content Area */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-white text-slate-800">
              {/* Header */}
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0">
                      <Landmark className="h-5 w-5" />
                    </div>
                    <h2 className="text-2xl font-black text-blue-700 tracking-tight">{APP_NAME}</h2>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    DHA Phase 6 Campus, Karachi, Pakistan<br />
                    Phone: 03001234567 | info@ace.edu.pk | Category: <span className="font-bold uppercase text-blue-600">{selectedInvoice.category || 'school'}</span>
                  </p>
                </div>
                <div className="text-right">
                  <div className="inline-block bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider mb-2">OFFICIAL INVOICE</div>
                  <p className="text-sm font-extrabold text-blue-700">{selectedInvoice.invoiceNumber}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Status: <span className="font-bold uppercase text-emerald-600">{selectedInvoice.status}</span>
                  </p>
                </div>
              </div>

              <hr className="border-slate-200" />

              {/* Bill to */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <h4 className="font-bold text-slate-400 uppercase text-[10px] tracking-wider mb-1">Bill To</h4>
                  <p className="font-bold text-base text-slate-900">{selectedInvoice.studentName}</p>
                  <p className="text-slate-600 mt-0.5">Class: <span className="font-semibold">{selectedInvoice.className}</span> — Sec {selectedInvoice.section}</p>
                  {selectedInvoice.month && <p className="text-slate-600">Billing Period: {selectedInvoice.month}</p>}
                </div>
                <div className="text-right">
                  <h4 className="font-bold text-slate-400 uppercase text-[10px] tracking-wider mb-1">Invoice Details</h4>
                  <p className="text-slate-600">Issued: <span className="font-semibold">{new Date(selectedInvoice.createdAt).toLocaleDateString()}</span></p>
                  <p className="text-slate-600 mt-0.5">Due: <span className="font-semibold text-red-600">{formatDate(selectedInvoice.dueDate)}</span></p>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3 font-bold text-slate-500 uppercase text-[9px] tracking-wider">Fee Description</th>
                      <th className="px-4 py-3 text-center font-bold text-slate-500 uppercase text-[9px] tracking-wider">Qty</th>
                      <th className="px-4 py-3 text-right font-bold text-slate-500 uppercase text-[9px] tracking-wider">Unit Price</th>
                      <th className="px-4 py-3 text-right font-bold text-slate-500 uppercase text-[9px] tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {selectedInvoice.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 font-semibold text-slate-700">{item.description}</td>
                        <td className="px-4 py-3 text-center text-slate-600">{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2 text-xs border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                  <div className="flex justify-between text-slate-600 font-medium">
                    <span>Subtotal</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(selectedInvoice.subtotal)}</span>
                  </div>
                  {selectedInvoice.discount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Discount</span>
                      <span>− {formatCurrency(selectedInvoice.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Amount Paid</span>
                    <span className="font-semibold">− {formatCurrency(selectedInvoice.paidAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-sm text-slate-950">
                    <span>Balance Due</span>
                    <span className="text-blue-700">{formatCurrency(selectedInvoice.grandTotal - (selectedInvoice.paidAmount || 0))}</span>
                  </div>
                </div>
              </div>

              {/* Footer note */}
              <div className="text-center text-[9px] text-slate-400 border-t border-dashed border-slate-200 pt-4">
                <p className="font-semibold text-slate-500">★ {APP_NAME.toUpperCase()} — DIGITAL RECORD SYSTEM ★</p>
                <p>Computer-generated invoice. Use "Print 3-Copy Challan" to print the official bank deposit slip.</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filter / Summary Toolbar */}
      <Card className="border border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            {/* Left: title + month indicator */}
            <div className="flex items-center gap-3">
              <Receipt className="h-5 w-5 text-blue-600 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-slate-800">Invoice Registry</h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  {showAllMonths ? 'Showing all months' : `Showing: ${currentMonth}`}
                  {' · '}{filteredInvoices.length} invoices
                </p>
              </div>
            </div>

            {/* Summary numbers */}
            {hasRole(['admin', 'manager']) && (
              <div className="hidden md:flex gap-6 text-xs">
                <div className="text-center">
                  <div className="font-bold text-slate-800">{formatCurrency(totalBill)}</div>
                  <div className="text-slate-400">Total Billed</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-emerald-700">{formatCurrency(totalPaid)}</div>
                  <div className="text-slate-400">Collected</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-red-600">{formatCurrency(totalRemaining)}</div>
                  <div className="text-slate-400">Outstanding</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-slate-700">{paidCount} / {paidCount + unpaidCount}</div>
                  <div className="text-slate-400">Paid Invoices</div>
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="flex flex-wrap gap-2.5 items-center">
              {/* Month toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAllMonths(!showAllMonths)}
                className={`h-9 gap-1.5 text-xs font-semibold rounded-xl ${showAllMonths ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-700'}`}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                {showAllMonths ? 'Current Month Only' : 'Show All Months'}
              </Button>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="">All Categories</option>
                <option value="school">School</option>
                <option value="academy">Academy</option>
              </select>

              {/* Class Filter */}
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="">All Classes</option>
                {uniqueClasses.map((cls) => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>

              {/* Generate Monthly Fees */}
              <Button
                onClick={handleGenerateMonthlyFees}
                disabled={isSubmitting}
                className="h-9 gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Landmark className="h-4 w-4" />}
                Generate Monthly Fees
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="text-sm text-slate-500">Loading invoices...</span>
              </div>
            </div>
          ) : (
            <DataTable
              data={filteredInvoices}
              columns={columns}
              searchField="studentName"
              searchPlaceholder="Search invoices by student name..."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
