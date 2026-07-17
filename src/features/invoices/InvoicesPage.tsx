import { useEffect, useState, useCallback } from 'react';
import {
  Eye, X, CreditCard, Loader2, CheckCircle2, RefreshCw,
  Landmark, Receipt, Banknote, CalendarDays, Printer,
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
import logoImg from '@/assets/logo.jpeg';

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

  const handlePrintInvoice = (inv: Invoice) => {
    const w = window.open('', '_blank', 'width=850,height=1100');
    if (!w) return;
    const logoUrl = window.location.origin + '/logo.jpeg';
    const itemRows = inv.items.map((item, i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#f8faff'}">
        <td style="padding:8px 12px;border:1px solid #e2e8f0">${item.description}</td>
        <td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:center">${item.quantity}</td>
        <td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:right">Rs ${item.unitPrice.toLocaleString()}</td>
        <td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:right;font-weight:700">Rs ${item.total.toLocaleString()}</td>
      </tr>`).join('');
    const balance = inv.grandTotal - (inv.paidAmount || 0);
    w.document.write(`
      <html>
        <head>
          <title>Invoice ${inv.invoiceNumber} — ${inv.studentName}</title>
          <style>
            * { margin:0; padding:0; box-sizing:border-box; }
            body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; padding: 28px; }
            .header { display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #1d4ed8; padding-bottom:16px; margin-bottom:16px; }
            .logo-block { display:flex; align-items:center; gap:12px; }
            .logo-img { width:64px; height:64px; border-radius:50%; object-fit:cover; border:2px solid #1d4ed8; }
            .school-name { font-size:20px; font-weight:900; color:#1e3a8a; }
            .school-sub { font-size:10px; color:#64748b; margin-top:2px; }
            .badge { background:#1d4ed8; color:white; padding:4px 14px; border-radius:6px; font-size:11px; font-weight:700; letter-spacing:1px; }
            .inv-no { font-size:15px; font-weight:900; color:#1e3a8a; margin-top:4px; }
            .inv-status { font-size:11px; color:#64748b; margin-top:2px; }
            .inv-status span { font-weight:700; color:#059669; text-transform:uppercase; }
            .bill-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px; }
            .bill-box h4 { font-size:9px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px; }
            .bill-box .name { font-size:15px; font-weight:900; color:#0f172a; }
            .bill-box .sub { font-size:11px; color:#475569; margin-top:2px; }
            .bill-box-right { text-align:right; }
            table { width:100%; border-collapse:collapse; margin-bottom:14px; }
            thead tr { background:#e0e7ff; }
            th { padding:8px 12px; border:1px solid #c7d2fe; font-size:9.5px; font-weight:700; color:#1e3a8a; text-transform:uppercase; }
            .totals { display:flex; justify-content:flex-end; margin-bottom:20px; }
            .totals-box { width:240px; border:1px solid #e2e8f0; border-radius:8px; padding:12px; }
            .totals-row { display:flex; justify-content:space-between; font-size:11.5px; padding:3px 0; color:#475569; }
            .totals-row.bold { font-size:13px; font-weight:800; color:#0f172a; border-top:1px solid #e2e8f0; padding-top:8px; margin-top:6px; }
            .totals-row.bold span:last-child { color:#1d4ed8; }
            .footer { text-align:center; font-size:9px; color:#94a3b8; border-top:1px dashed #e2e8f0; padding-top:12px; }
            .footer strong { color:#64748b; display:block; margin-bottom:2px; }
            @media print { body { padding:16px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-block">
              <img src="${logoUrl}" alt="Logo" class="logo-img" />
              <div>
                <div class="school-name">${APP_NAME}</div>
                <div class="school-sub">Gondlanwala road, Galla Shazi Hospital wala</div>
                <div class="school-sub">info@ace.edu.pk</div>
              </div>
            </div>
            <div style="text-align:right">
              <div class="badge">OFFICIAL INVOICE</div>
              <div class="inv-no">${inv.invoiceNumber}</div>
              <div class="inv-status">Status: <span>${inv.status}</span></div>
            </div>
          </div>
          <div class="bill-grid">
            <div class="bill-box">
              <h4>Bill To</h4>
              <div class="name">${inv.studentName}</div>
              <div class="sub">Class: ${inv.className} — Sec ${inv.section}</div>
              ${inv.month ? `<div class="sub">Billing Period: ${inv.month}</div>` : ''}
            </div>
            <div class="bill-box bill-box-right">
              <h4>Invoice Details</h4>
              <div class="sub">Issued: <strong>${new Date(inv.createdAt).toLocaleDateString()}</strong></div>
              <div class="sub" style="color:#dc2626">Due: <strong>${formatDate(inv.dueDate)}</strong></div>
            </div>
          </div>
          <table>
            <thead><tr>
              <th style="text-align:left">Fee Description</th>
              <th style="text-align:center">Qty</th>
              <th style="text-align:right">Unit Price</th>
              <th style="text-align:right">Total</th>
            </tr></thead>
            <tbody>${itemRows}</tbody>
          </table>
          <div class="totals">
            <div class="totals-box">
              <div class="totals-row"><span>Subtotal</span><span>Rs ${inv.subtotal.toLocaleString()}</span></div>
              ${inv.discount > 0 ? `<div class="totals-row" style="color:#059669"><span>Discount</span><span>− Rs ${inv.discount.toLocaleString()}</span></div>` : ''}
              ${(inv.paidAmount || 0) > 0 ? `<div class="totals-row" style="color:#059669"><span>Amount Paid</span><span>− Rs ${(inv.paidAmount || 0).toLocaleString()}</span></div>` : ''}
              <div class="totals-row bold"><span>Balance Due</span><span>Rs ${balance.toLocaleString()}</span></div>
            </div>
          </div>
          <div class="footer">
            <strong>★ ${APP_NAME.toUpperCase()} — DIGITAL RECORD SYSTEM ★</strong>
            Computer-generated invoice. This is an official document.
          </div>
        </body>
      </html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 400);
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

          {/* Fee Challan 3-copy */}
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs text-indigo-700 border-indigo-300 hover:bg-indigo-600 hover:text-white font-semibold"
            onClick={() => handleChallanClick(item)}
            title="Print Fee Challan (Student / Accounts / Office)"
            disabled={isLoadingChallan}
          >
            {isLoadingChallan ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Banknote className="h-3.5 w-3.5" />}
            Challan
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
        <>
          {/* Fixed full-screen backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsPreviewOpen(false)}
          />
          {/* Fixed modal card — toolbar never scrolls, body scrolls independently */}
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden animate-scale-in bg-white">
              {/* Toolbar — flex-shrink-0 so it NEVER scrolls away */}
              <div className="flex-shrink-0 flex items-center justify-between bg-blue-800 px-5 py-3 rounded-t-2xl">
                <div>
                  <h2 className="font-bold text-white text-base">Invoice Details</h2>
                  <p className="text-xs text-blue-200">{selectedInvoice.invoiceNumber}</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap justify-end">
                  <Button
                    size="sm"
                    onClick={() => handlePrintInvoice(selectedInvoice)}
                    className="h-9 px-4 gap-1.5 text-sm bg-amber-400 hover:bg-amber-500 text-slate-900 font-extrabold shadow-lg rounded-lg"
                  >
                    <Printer className="h-4 w-4" />
                    Print Invoice
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => { setIsPreviewOpen(false); handleChallanClick(selectedInvoice); }}
                    className="h-9 px-4 gap-1.5 text-sm bg-white text-blue-800 font-extrabold hover:bg-blue-50 shadow-lg rounded-lg"
                  >
                    <Banknote className="h-4 w-4" />
                    Print Challan
                  </Button>
                  <button onClick={() => setIsPreviewOpen(false)} className="ml-1 text-white/60 hover:text-white transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable invoice body */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-white text-slate-800">
              {/* Header */}
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="h-14 w-14 rounded-full overflow-hidden border-2 border-blue-200 shadow-md shrink-0">
                      <img src={logoImg} alt="ACE Logo" className="h-full w-full object-cover" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-blue-700 tracking-tight">{APP_NAME}</h2>
                      <p className="text-[11px] text-slate-500 font-medium">The School of Science &amp; Arts</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    Gondlanwala road, Galla DR Shazia wala<br />
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
                <p>Computer-generated invoice. Use the print buttons above to print.</p>
              </div>

            </div>{/* end scrollable body */}
            </div>{/* end modal card */}
          </div>{/* end fixed wrapper */}
        </>
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
