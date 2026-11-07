// ============================================================================
// ACE Educational Hub — Academy Payment Modal
// Records payments for Academy students (settle pending invoices or record new payments)
// ============================================================================

import { useState, useEffect, useMemo } from 'react';
import { X, Loader2, CreditCard, CheckCircle2, Banknote, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { payInvoice, recordAcademyFeePayment, getFeesByStudent } from '@/features/fees/feeService';
import { useAuth } from '@/features/auth/AuthContext';
import { toast } from 'sonner';
import type { Student, Invoice, Fee } from '@/types';

export interface AcademyPaymentReceiptData {
  invoice: Invoice;
  student: Student;
  fees: Fee[];
}

export interface AcademyPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (receiptData?: AcademyPaymentReceiptData) => void;
  students: Student[];
  invoices: Invoice[];
  initialStudent?: Student | null;
  initialInvoice?: Invoice | null;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const STANDARD_FEE_DESCRIPTIONS = [
  'Monthly Tuition Fee',
  'Academy Admission Fee',
  'Test Session Fee',
  'Exam Preparation Fee',
  'Books & Notes Material',
  'Academy Registration Fee',
  'Special Coaching Fee',
  'Other / Custom',
];

export function AcademyPaymentModal({
  isOpen,
  onClose,
  onSuccess,
  students,
  invoices,
  initialStudent,
  initialInvoice,
}: AcademyPaymentModalProps) {
  const { user } = useAuth();

  // Selected Student
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  
  // Payment Mode: 'existing_invoice' | 'new_payment'
  const [paymentMode, setPaymentMode] = useState<'existing_invoice' | 'new_payment'>('existing_invoice');
  
  // Existing invoice target
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  
  // New payment form fields
  const currentMonthName = useMemo(() => {
    return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, []);
  const [newMonth, setNewMonth] = useState<string>(currentMonthName);
  const [feeDescriptionType, setFeeDescriptionType] = useState<string>('Monthly Tuition Fee');
  const [customDescription, setCustomDescription] = useState<string>('');
  const [newFeeTotal, setNewFeeTotal] = useState<number>(3000);
  
  // Payment Details
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<'cash' | 'bank_transfer' | 'cheque' | 'online'>('cash');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sync initial student and invoice on open
  useEffect(() => {
    if (isOpen) {
      if (initialInvoice) {
        setSelectedStudentId(initialInvoice.studentId);
        setSelectedInvoiceId(initialInvoice.id);
        setPaymentMode('existing_invoice');
        const due = initialInvoice.grandTotal - (initialInvoice.paidAmount || 0);
        setPayAmount(due > 0 ? due : initialInvoice.grandTotal);
      } else if (initialStudent) {
        setSelectedStudentId(initialStudent.id);
      } else if (students.length > 0 && !selectedStudentId) {
        setSelectedStudentId(students[0].id);
      }
    }
  }, [isOpen, initialStudent, initialInvoice, students]);

  // Current selected student object
  const currentStudent = useMemo(() => {
    return students.find((s) => s.id === selectedStudentId) || null;
  }, [students, selectedStudentId]);

  // Pending / unpaid invoices for current student
  const studentPendingInvoices = useMemo(() => {
    if (!selectedStudentId) return [];
    return invoices.filter(
      (inv) =>
        inv.studentId === selectedStudentId &&
        inv.status !== 'paid' &&
        inv.status !== 'cancelled'
    );
  }, [invoices, selectedStudentId]);

  // Total outstanding due for current student
  const totalOutstandingDue = useMemo(() => {
    return studentPendingInvoices.reduce((sum, inv) => {
      const balance = inv.grandTotal - (inv.paidAmount || 0);
      return sum + Math.max(0, balance);
    }, 0);
  }, [studentPendingInvoices]);

  // When student or invoices change, update defaults
  useEffect(() => {
    if (!isOpen) return;

    if (studentPendingInvoices.length > 0) {
      // Default to existing invoice mode
      setPaymentMode('existing_invoice');
      
      // Select the first pending invoice if none selected or invalid
      const targetInv =
        studentPendingInvoices.find((i) => i.id === selectedInvoiceId) ||
        studentPendingInvoices[0];
      
      setSelectedInvoiceId(targetInv.id);
      const due = targetInv.grandTotal - (targetInv.paidAmount || 0);
      setPayAmount(due > 0 ? due : targetInv.grandTotal);
    } else {
      // No pending invoices, switch to new payment mode
      setPaymentMode('new_payment');
      
      // Try to determine default fee amount from student's feeEntries if available
      let defaultAmt = 3000;
      if (currentStudent?.feeEntries && currentStudent.feeEntries.length > 0) {
        defaultAmt = currentStudent.feeEntries[0].amount || 3000;
      }
      setNewFeeTotal(defaultAmt);
      setPayAmount(defaultAmt);
    }
  }, [selectedStudentId, studentPendingInvoices.length]);

  // When selected invoice changes in existing mode
  const handleSelectInvoice = (invId: string) => {
    setSelectedInvoiceId(invId);
    const target = studentPendingInvoices.find((i) => i.id === invId);
    if (target) {
      const due = target.grandTotal - (target.paidAmount || 0);
      setPayAmount(due > 0 ? due : target.grandTotal);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStudent || payAmount <= 0) {
      toast.error('Please enter a valid payment amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const collectorId = user?.uid || 'admin';
      const collectorName = user?.displayName || user?.email || 'Staff';

      let resultingInvoice: Invoice | null = null;

      if (paymentMode === 'existing_invoice' && selectedInvoiceId) {
        // Pay against existing pending invoice
        const targetInv = studentPendingInvoices.find((i) => i.id === selectedInvoiceId);
        if (!targetInv) throw new Error('Selected invoice not found');

        resultingInvoice = await payInvoice(selectedInvoiceId, {
          amount: payAmount,
          method: payMethod,
          collectorId,
          collectorName,
        });

        toast.success(`Payment of ${formatCurrency(payAmount)} recorded for Invoice #${targetInv.invoiceNumber}`);
      } else {
        // Record new fee payment
        const finalDescription =
          feeDescriptionType === 'Other / Custom' && customDescription.trim()
            ? customDescription.trim()
            : feeDescriptionType;

        const res = await recordAcademyFeePayment({
          student: currentStudent,
          amount: payAmount,
          month: newMonth,
          description: `${finalDescription} — ${newMonth}`,
          paymentMethod: payMethod,
          collectorId,
          collectorName,
          notes: notes.trim() || undefined,
        });

        resultingInvoice = res.invoice;
        toast.success(`Academy payment of ${formatCurrency(payAmount)} recorded for ${currentStudent.firstName} ${currentStudent.lastName}`);
      }

      // Fetch fees to pass along for receipt printing
      let studentFees: Fee[] = [];
      try {
        studentFees = await getFeesByStudent(currentStudent.id);
      } catch (err) {
        console.warn('Could not load student fees for receipt', err);
      }

      if (resultingInvoice) {
        onSuccess({
          invoice: resultingInvoice,
          student: currentStudent,
          fees: studentFees,
        });
      } else {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      console.error('Payment record error:', err);
      toast.error(err.message || 'Failed to record payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <Card className="relative w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden bg-white shadow-2xl border-slate-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-violet-600 to-indigo-700 text-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <CreditCard className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">Record Academy Payment</h2>
              <p className="text-xs text-violet-100 opacity-90">Collect fee and issue instant payment record</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4 text-white" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* 1. Student Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Select Academy Student
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer shadow-sm"
              required
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName} — {s.className} ({s.admissionNumber})
                </option>
              ))}
            </select>
          </div>

          {/* Student Status Summary Card */}
          {currentStudent && (
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/80 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-violet-100 text-violet-700 font-bold flex items-center justify-center text-sm shrink-0">
                  {currentStudent.firstName.charAt(0)}{currentStudent.lastName ? currentStudent.lastName.charAt(0) : ''}
                </div>
                <div>
                  <div className="font-bold text-slate-800 text-sm">
                    {currentStudent.firstName} {currentStudent.lastName}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>{currentStudent.className} — Sec {currentStudent.section}</span>
                    <span>•</span>
                    <span className="font-medium text-slate-600">{currentStudent.admissionNumber}</span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-[11px] text-slate-500 font-medium">Outstanding Balance</div>
                <div className={`text-base font-bold ${totalOutstandingDue > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {formatCurrency(totalOutstandingDue)}
                </div>
              </div>
            </div>
          )}

          {/* 2. Payment Type Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Payment Option
              </label>
              {studentPendingInvoices.length > 0 && (
                <span className="text-xs text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                  {studentPendingInvoices.length} Pending Invoice{studentPendingInvoices.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMode('existing_invoice')}
                disabled={studentPendingInvoices.length === 0}
                className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  paymentMode === 'existing_invoice'
                    ? 'border-violet-600 bg-violet-50 text-violet-700 shadow-sm'
                    : studentPendingInvoices.length === 0
                    ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Banknote className="h-4 w-4" />
                <span>Pay Unpaid Invoice</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode('new_payment')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  paymentMode === 'new_payment'
                    ? 'border-violet-600 bg-violet-50 text-violet-700 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Calendar className="h-4 w-4" />
                <span>Record New Monthly Fee</span>
              </button>
            </div>
          </div>

          {/* Mode 1: Settle Existing Invoice */}
          {paymentMode === 'existing_invoice' && studentPendingInvoices.length > 0 && (
            <div className="space-y-3 bg-violet-50/50 p-4 rounded-xl border border-violet-100">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Select Invoice to Settle</label>
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => handleSelectInvoice(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500 shadow-sm"
                >
                  {studentPendingInvoices.map((inv) => {
                    const balance = inv.grandTotal - (inv.paidAmount || 0);
                    return (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} — {inv.month || 'Current Month'} (Due: {formatCurrency(balance)})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Invoice Breakdown */}
              {(() => {
                const inv = studentPendingInvoices.find((i) => i.id === selectedInvoiceId);
                if (!inv) return null;
                const balance = inv.grandTotal - (inv.paidAmount || 0);
                return (
                  <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span>Billed Amount:</span>
                      <span className="font-semibold text-slate-800">{formatCurrency(inv.grandTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Already Collected:</span>
                      <span className="font-semibold text-emerald-600">{formatCurrency(inv.paidAmount || 0)}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-100 pt-1.5 font-bold text-sm">
                      <span className="text-slate-700">Remaining Balance Due:</span>
                      <span className="text-red-600">{formatCurrency(balance)}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Mode 2: Record New Monthly / Advance Fee */}
          {paymentMode === 'new_payment' && (
            <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Billing Month</label>
                  <select
                    value={newMonth.split(' ')[0]}
                    onChange={(e) => {
                      const year = newMonth.split(' ')[1] || new Date().getFullYear();
                      setNewMonth(`${e.target.value} ${year}`);
                    }}
                    className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500 shadow-sm"
                  >
                    {MONTHS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Year</label>
                  <Input
                    type="number"
                    value={newMonth.split(' ')[1] || new Date().getFullYear()}
                    onChange={(e) => {
                      const m = newMonth.split(' ')[0] || 'January';
                      setNewMonth(`${m} ${e.target.value}`);
                    }}
                    className="bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Fee Category / Description</label>
                <select
                  value={feeDescriptionType}
                  onChange={(e) => setFeeDescriptionType(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500 shadow-sm"
                >
                  {STANDARD_FEE_DESCRIPTIONS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {feeDescriptionType === 'Other / Custom' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Custom Title</label>
                  <Input
                    placeholder="e.g. Workshop, Lab Material..."
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    required
                    className="bg-white"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Total Fee Amount (PKR)</label>
                <Input
                  type="number"
                  min={1}
                  value={newFeeTotal}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setNewFeeTotal(v);
                    setPayAmount(v);
                  }}
                  required
                  className="bg-white font-semibold"
                />
              </div>
            </div>
          )}

          {/* 3. Payment Details */}
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Payment Amount Received (PKR) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min={1}
                  value={payAmount || ''}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  required
                  className="text-base font-bold text-emerald-700 border-emerald-300 focus:ring-emerald-500 h-11"
                  placeholder="e.g. 5000"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500 shadow-sm"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="online">Online / EasyPaisa / JazzCash</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Notes / Remarks (Optional)</label>
              <Input
                placeholder="e.g. Paid in full by father, bank reference..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end items-center gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl px-4"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || payAmount <= 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-5 font-semibold gap-2 shadow-md shadow-emerald-600/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Confirm & Record Payment
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

