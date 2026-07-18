// ============================================================================
// ACE Educational Hub — Expenses Page
// ============================================================================

import { useEffect, useState } from 'react';
import {
  TrendingDown, Plus, Edit2, Trash2, X, Loader2,
  DollarSign, Calendar, Tag, RefreshCw, CheckCircle2,
  History, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/common/DataTable';
import {
  getExpenses, addExpense, updateExpense, deleteExpense,
  getExpenseSummary, type ExpenseSummary,
} from './expenseService';
import type { Expense, ExpenseCategory, ExpensePaymentMethod } from '@/types';
import { useAuth } from '@/features/auth/AuthContext';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/utils';

// ── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: { value: ExpenseCategory; label: string; color: string; bg: string }[] = [
  { value: 'salary', label: 'Salary', color: 'text-indigo-700', bg: 'bg-indigo-100' },
  { value: 'utilities', label: 'Utilities', color: 'text-amber-700', bg: 'bg-amber-100' },
  { value: 'maintenance', label: 'Maintenance', color: 'text-orange-700', bg: 'bg-orange-100' },
  { value: 'stationery', label: 'Stationery', color: 'text-blue-700', bg: 'bg-blue-100' },
  { value: 'events', label: 'Events', color: 'text-purple-700', bg: 'bg-purple-100' },
  { value: 'rent', label: 'Rent', color: 'text-red-700', bg: 'bg-red-100' },
  { value: 'transport', label: 'Transport', color: 'text-teal-700', bg: 'bg-teal-100' },
  { value: 'miscellaneous', label: 'Miscellaneous', color: 'text-slate-700', bg: 'bg-slate-100' },
];

const PAYMENT_METHODS: { value: ExpensePaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'online', label: 'Online' },
];

const CAT_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.value, c]));

// ── Empty Form ───────────────────────────────────────────────────────────────

function emptyForm(): Omit<Expense, 'id' | 'month' | 'createdAt' | 'updatedAt' | 'createdBy'> {
  return {
    date: new Date().toISOString().split('T')[0],
    category: 'miscellaneous',
    description: '',
    amount: 0,
    paymentMethod: 'cash',
    vendorRecipient: '',
    referenceNumber: '',
    approvedBy: '',
    notes: '',
  };
}

// ── Category Badge ────────────────────────────────────────────────────────────

function CatBadge({ cat }: { cat: ExpenseCategory }) {
  const c = CAT_MAP[cat];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${c?.bg || 'bg-slate-100'} ${c?.color || 'text-slate-700'}`}>
      {c?.label || cat}
    </span>
  );
}

// ── Month list helpers ────────────────────────────────────────────────────────

function getCurrentMonthLabel(): string {
  return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Generate years from 2020 to 2050
const YEARS = Array.from({ length: 31 }, (_, i) => 2020 + i);

const ALL_MONTHS_FLAT: string[] = [];
for (let y = 2050; y >= 2020; y--) {
  for (let m = 11; m >= 0; m--) {
    ALL_MONTHS_FLAT.push(`${MONTHS[m]} ${y}`);
  }
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ExpensesPage() {
  const { user, hasRole } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter state
  const [showHistoryMode, setShowHistoryMode] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState(''); // '' = all months

  // Split month filter for UI
  const [monthPart, yearPart] = (monthFilter || getCurrentMonthLabel()).split(' ');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [exp, sum] = await Promise.all([getExpenses(), getExpenseSummary()]);
      setExpenses(exp);
      setSummary(sum);
    } catch {
      toast.error('Failed to load expense data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const openAdd = () => {
    setEditingExpense(null);
    setForm(emptyForm());
    setIsFormOpen(true);
  };

  const openEdit = (exp: Expense) => {
    setEditingExpense(exp);
    setForm({
      date: exp.date,
      category: exp.category,
      description: exp.description,
      amount: exp.amount,
      paymentMethod: exp.paymentMethod,
      vendorRecipient: exp.vendorRecipient || '',
      referenceNumber: exp.referenceNumber || '',
      approvedBy: exp.approvedBy || '',
      notes: exp.notes || '',
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim() || form.amount <= 0) {
      toast.error('Please enter a description and valid amount.');
      return;
    }
    setIsSubmitting(true);
    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, form);
        toast.success('Expense updated successfully.');
      } else {
        await addExpense(
          { ...form, createdBy: user?.uid || 'admin' },
          user?.uid || 'admin',
        );
        toast.success('Expense added successfully.');
      }
      setIsFormOpen(false);
      loadData();
    } catch {
      toast.error('Failed to save expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteExpense(deleteTarget.id);
      toast.success('Expense deleted.');
      setDeleteTarget(null);
      loadData();
    } catch {
      toast.error('Failed to delete expense.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter logic — month filter uses full 2020-now list
  const filtered = expenses.filter((e) => {
    const matchCat = !categoryFilter || e.category === categoryFilter;
    const matchMonth = !monthFilter || e.month === monthFilter;
    return matchCat && matchMonth;
  });

  // History navigation helpers
  const currentMonthIdx = ALL_MONTHS_FLAT.indexOf(monthFilter || getCurrentMonthLabel());
  const canGoPrev = currentMonthIdx < ALL_MONTHS_FLAT.length - 1;
  const canGoNext = currentMonthIdx > 0;
  const navigateMonth = (dir: 'prev' | 'next') => {
    const idx = monthFilter ? ALL_MONTHS_FLAT.indexOf(monthFilter) : 0;
    const newIdx = dir === 'prev' ? idx + 1 : idx - 1;
    if (newIdx >= 0 && newIdx < ALL_MONTHS_FLAT.length) {
      setMonthFilter(ALL_MONTHS_FLAT[newIdx]);
    }
  };

  const columns: Column<Expense>[] = [
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      cell: (item) => <span className="text-sm font-semibold text-slate-700">{formatDate(item.date)}</span>,
    },
    {
      key: 'category',
      header: 'Category',
      sortable: true,
      cell: (item) => <CatBadge cat={item.category} />,
    },
    {
      key: 'description',
      header: 'Description',
      cell: (item) => (
        <div>
          <div className="font-semibold text-slate-800 text-sm">{item.description}</div>
          {item.vendorRecipient && <div className="text-[11px] text-slate-400">{item.vendorRecipient}</div>}
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      cell: (item) => <span className="font-bold text-red-600 text-sm">{formatCurrency(item.amount)}</span>,
    },
    {
      key: 'paymentMethod',
      header: 'Payment',
      cell: (item) => (
        <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-xs capitalize">
          {item.paymentMethod.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'referenceNumber',
      header: 'Ref #',
      cell: (item) => <span className="text-xs text-slate-500">{item.referenceNumber || '—'}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (item) => (
        <div className="flex gap-1.5 justify-end">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50"
            onClick={() => openEdit(item)}
            title="Edit"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50"
            onClick={() => setDeleteTarget(item)}
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Expense Management"
        description="Track and manage all school operational expenses."
        action={{
          label: 'Add Expense',
          onClick: openAdd,
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      {/* Summary KPI Cards */}
      {hasRole(['admin', 'manager']) && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: 'This Month',
              value: formatCurrency(summary?.totalThisMonth || 0),
              icon: Calendar,
              color: 'bg-red-500/10 text-red-600',
            },
            {
              label: 'This Year',
              value: formatCurrency(summary?.totalThisYear || 0),
              icon: TrendingDown,
              color: 'bg-amber-500/10 text-amber-600',
            },
            {
              label: 'Total Records',
              value: String(expenses.length),
              icon: Tag,
              color: 'bg-indigo-500/10 text-indigo-600',
            },
            {
              label: 'Categories Used',
              value: String(summary?.byCategory.length || 0),
              icon: DollarSign,
              color: 'bg-emerald-500/10 text-emerald-600',
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="border-[hsl(var(--border))]/60 shadow-xs">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color} shrink-0`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-[hsl(var(--foreground))]">{value}</div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{label}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Category breakdown mini-chart */}
      {hasRole(['admin', 'manager']) && summary && summary.byCategory.length > 0 && (
        <Card className="border-[hsl(var(--border))]/60 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="space-y-2.5">
              {summary.byCategory.map(({ category, total }) => {
                const max = summary.byCategory[0].total;
                const pct = max > 0 ? (total / max) * 100 : 0;
                const c = CAT_MAP[category as ExpenseCategory];
                return (
                  <div key={category}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold capitalize">{c?.label || category}</span>
                      <span className="text-[hsl(var(--muted-foreground))]">{formatCurrency(total)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[hsl(var(--muted))]/40">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: '#ef4444' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter toolbar */}
      <Card className="border border-slate-200 shadow-sm">
        <CardContent className="p-4 bg-slate-50/50">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingDown className="h-5 w-5 text-red-500 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-slate-800">Expense Ledger</h3>
                <p className="text-[11px] text-slate-400">
                  {monthFilter ? `Viewing: ${monthFilter}` : 'Showing all months'} · {filtered.length} records
                </p>
              </div>
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <Button size="sm" variant="outline" onClick={loadData} className="h-9 gap-1.5 text-xs">
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>

              {/* History mode toggle */}
              <Button
                size="sm"
                variant={showHistoryMode ? 'default' : 'outline'}
                onClick={() => { setShowHistoryMode(!showHistoryMode); if (showHistoryMode) setMonthFilter(''); }}
                className={`h-9 gap-1.5 text-xs font-semibold ${
                  showHistoryMode ? 'bg-indigo-600 text-white' : 'text-indigo-600 border-indigo-200'
                }`}
              >
                <History className="h-3.5 w-3.5" />
                History
              </Button>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>

              {/* Full month range selector */}
              <div className="flex gap-2">
                <div className="relative">
                  <select
                    value={monthPart}
                    onChange={(e) => {
                      setMonthFilter(`${e.target.value} ${yearPart}`);
                      setShowHistoryMode(false);
                    }}
                    className="h-9 rounded-xl border border-slate-200 bg-white pl-3 pr-8 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                  >
                    {MONTHS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▾</span>
                </div>
                <div className="relative">
                  <select
                    value={yearPart}
                    onChange={(e) => {
                      setMonthFilter(`${monthPart} ${e.target.value}`);
                      setShowHistoryMode(false);
                    }}
                    className="h-9 rounded-xl border border-slate-200 bg-white pl-3 pr-8 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                  >
                    {YEARS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▾</span>
                </div>
              </div>
            </div>
          </div>

          {/* History navigation arrows — only when a month is selected */}
          {showHistoryMode && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
              <Button
                size="sm"
                variant="outline"
                disabled={!canGoPrev}
                onClick={() => navigateMonth('prev')}
                className="h-8 gap-1.5 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Older
              </Button>
              <span className="text-xs font-bold text-slate-700">
                {monthFilter || 'All Months'}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={!canGoNext}
                onClick={() => navigateMonth('next')}
                className="h-8 gap-1.5 text-xs"
              >
                Newer <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-red-500" />
            </div>
          ) : (
            <DataTable
              data={filtered}
              columns={columns}
              searchField="description"
              searchPlaceholder="Search expenses by description..."
            />
          )}
        </CardContent>
      </Card>

      {/* ── Add/Edit Form Modal ──────────────────────────────────────────────── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsFormOpen(false)} />
          <Card className="relative w-full max-w-lg z-10 animate-scale-in shadow-2xl border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-800 text-base">
                  {editingExpense ? 'Edit Expense' : 'Add New Expense'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Fill in the expense details below.</p>
              </div>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Date *</label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                    className="border-slate-200"
                  />
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Category *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}
                    className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                    required
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Description *</label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Monthly electricity bill"
                  required
                  className="border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Amount */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Amount (PKR) *</label>
                  <Input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                    min={1}
                    required
                    className="border-slate-200"
                    placeholder="0"
                  />
                </div>

                {/* Payment Method */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Payment Method *</label>
                  <select
                    value={form.paymentMethod}
                    onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as ExpensePaymentMethod })}
                    className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Vendor/Recipient */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Vendor / Recipient</label>
                  <Input
                    value={form.vendorRecipient}
                    onChange={(e) => setForm({ ...form, vendorRecipient: e.target.value })}
                    placeholder="e.g. WAPDA, Ali & Sons..."
                    className="border-slate-200"
                  />
                </div>

                {/* Reference Number */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Reference / Cheque No.</label>
                  <Input
                    value={form.referenceNumber}
                    onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })}
                    placeholder="e.g. CHQ-0012345"
                    className="border-slate-200"
                  />
                </div>
              </div>

              {/* Approved By */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Approved By</label>
                <Input
                  value={form.approvedBy}
                  onChange={(e) => setForm({ ...form, approvedBy: e.target.value })}
                  placeholder="e.g. Principal Name"
                  className="border-slate-200"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  placeholder="Any additional notes..."
                  className="flex w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isSubmitting
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <><CheckCircle2 className="h-4 w-4 mr-1.5" />{editingExpense ? 'Update' : 'Add Expense'}</>
                  }
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ── Delete Confirm Modal ─────────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <Card className="relative w-full max-w-sm z-10 animate-scale-in shadow-2xl border-red-200">
            <div className="p-6 text-center space-y-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 mx-auto">
                <Trash2 className="h-7 w-7" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">Delete Expense?</h3>
                <p className="text-sm text-slate-500 mt-1">
                  <strong>{deleteTarget.description}</strong> — {formatCurrency(deleteTarget.amount)} will be permanently removed.
                </p>
              </div>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>Cancel</Button>
                <Button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
