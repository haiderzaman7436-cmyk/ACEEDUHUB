// ============================================================================
// ACE Educational Hub — Fee Service (Firestore)
// ============================================================================

import {
  collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, deleteField,
  query, where, orderBy, Timestamp, serverTimestamp, writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Fee, Invoice, FeeTemplate, Student } from '@/types';
import { generateReceiptNumber } from '@/lib/utils';
import { getNextInvoiceNumber, reserveInvoiceNumbers } from '@/lib/counterService';

// ── Active / Billable Student Guard ──────────────────────────────────────────

export const NON_BILLABLE_STUDENT_STATUSES = new Set([
  'inactive',
  'struck_off',
  'struck off',
  'struckoff',
  'left',
  'discarded',
  'graduated',
  'transferred',
  'suspended',
  'deleted',
]);

/**
 * Strictly determines whether a student is currently active and eligible for
 * monthly fee/invoice generation. Excludes struck-off, inactive, suspended,
 * transferred, graduated, left, and discarded students.
 */
export function isBillableActiveStudent(student: (Partial<Student> & Record<string, any>) | null | undefined): boolean {
  if (!student) return false;
  if (student.isDeleted === true || student.deletedAt || student.struckOffAt || student.discarded === true) {
    return false;
  }
  const normalized = String(student.status || '').trim().toLowerCase();
  if (NON_BILLABLE_STUDENT_STATUSES.has(normalized)) return false;
  return normalized === 'active';
}

const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

function isMonthCurrentOrFuture(monthLabel?: string, dueDate?: string): boolean {
  const now = new Date();
  const currentMonthIndex = now.getFullYear() * 12 + now.getMonth();

  if (monthLabel) {
    const parts = monthLabel.trim().toLowerCase().split(/\s+/);
    if (parts.length >= 2) {
      const mIdx = MONTH_NAMES.indexOf(parts[0]);
      const yr = parseInt(parts[1], 10);
      if (mIdx !== -1 && !isNaN(yr)) {
        return yr * 12 + mIdx >= currentMonthIndex;
      }
    }
  }

  if (dueDate) {
    const d = new Date(dueDate);
    if (!isNaN(d.getTime())) {
      return d.getFullYear() * 12 + d.getMonth() >= currentMonthIndex;
    }
  }

  return true;
}

/**
 * Removes unpaid (paidAmount === 0) invoices and linked unpaid fees for a student
 * who has been struck off, marked inactive/left, or deleted/discarded.
 * Paid and partially paid historical records are always preserved intact.
 */
export async function removeUnpaidInvoicesForStudent(
  studentId: string,
  onlyCurrentAndFutureMonths = false,
): Promise<{ removedInvoices: number; removedFees: number }> {
  let removedInvoices = 0;
  let removedFees = 0;
  const deletedFeeIds = new Set<string>();

  try {
    const invSnap = await getDocs(query(collection(db, 'invoices'), where('studentId', '==', studentId)));
    for (const d of invSnap.docs) {
      const inv = d.data();
      const paid = Number(inv.paidAmount || 0);
      if (paid > 0 || inv.status === 'paid') continue;
      if (onlyCurrentAndFutureMonths && !isMonthCurrentOrFuture(inv.month, inv.dueDate)) continue;

      try {
        await deleteDoc(doc(db, 'invoices', d.id));
        removedInvoices++;
      } catch (err) {
        console.warn('removeUnpaidInvoicesForStudent: failed to delete invoice', d.id, err);
      }

      if (Array.isArray(inv.feeIds)) {
        for (const feeId of inv.feeIds) {
          try {
            const feeSnap = await getDoc(doc(db, 'fees', feeId));
            if (feeSnap.exists() && Number(feeSnap.data().paidAmount || 0) <= 0 && feeSnap.data().status !== 'paid') {
              await deleteDoc(doc(db, 'fees', feeId));
              deletedFeeIds.add(feeId);
              removedFees++;
            }
          } catch {}
        }
      }
    }

    const feesSnap = await getDocs(query(collection(db, 'fees'), where('studentId', '==', studentId)));
    for (const d of feesSnap.docs) {
      if (deletedFeeIds.has(d.id)) continue;
      const fee = d.data();
      const paid = Number(fee.paidAmount || 0);
      if (paid > 0 || fee.status === 'paid') continue;
      if (onlyCurrentAndFutureMonths && !isMonthCurrentOrFuture(fee.month, fee.dueDate)) continue;

      try {
        await deleteDoc(doc(db, 'fees', d.id));
        removedFees++;
      } catch (err) {
        console.warn('removeUnpaidInvoicesForStudent: failed to delete fee', d.id, err);
      }
    }
  } catch (err) {
    console.warn('removeUnpaidInvoicesForStudent error:', err);
  }

  return { removedInvoices, removedFees };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function parseFeeStatus(data: any): string {
  let status = data.status || 'pending';
  if (status !== 'paid' && data.dueDate) {
    const due = new Date(data.dueDate);
    const now = new Date();
    due.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    if (now > due) {
      status = 'overdue';
    }
  }
  return status;
}

export function parseInvoiceStatus(data: any): string {
  let status = data.status || 'sent';
  if (status !== 'paid' && status !== 'cancelled' && data.dueDate) {
    const due = new Date(data.dueDate);
    const now = new Date();
    due.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    if (now > due) {
      status = 'overdue';
    }
  }
  return status;
}

function toDate(val: unknown): Date {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (val && typeof (val as Timestamp).toDate === 'function') return (val as Timestamp).toDate();
  return new Date(val as string);
}

function getMonthDueDate(dueDayOfMonth = 10, monthLabel?: string): string {
  if (monthLabel) {
    const parts = monthLabel.split(' ');
    if (parts.length === 2) {
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const mIdx = monthNames.findIndex(m => m.toLowerCase() === parts[0].toLowerCase());
      const yr = parseInt(parts[1], 10);
      if (mIdx !== -1 && !isNaN(yr)) {
        const due = new Date(yr, mIdx, Math.min(28, dueDayOfMonth));
        return due.toISOString().split('T')[0];
      }
    }
  }
  const now = new Date();
  const due = new Date(now.getFullYear(), now.getMonth(), dueDayOfMonth);
  if (now.getDate() > dueDayOfMonth) {
    due.setMonth(due.getMonth() + 1);
  }
  return due.toISOString().split('T')[0];
}

function getMonthLabel(): string {
  return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// ── Fee Templates ─────────────────────────────────────────────────────────────

export async function getFeeTemplates(): Promise<FeeTemplate[]> {
  const snap = await getDocs(collection(db, 'feeTemplates'));
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: toDate(d.data().createdAt),
    updatedAt: toDate(d.data().updatedAt),
  })) as FeeTemplate[];
}

export async function getFeeTemplateForClass(className: string): Promise<FeeTemplate[]> {
  const q = query(
    collection(db, 'feeTemplates'),
    where('className', '==', className),
    where('isActive', '==', true),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: toDate(d.data().createdAt),
    updatedAt: toDate(d.data().updatedAt),
  })) as FeeTemplate[];
}

export async function saveFeeTemplate(
  template: Omit<FeeTemplate, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<FeeTemplate> {
  const newId = 'ft-' + Math.random().toString(36).substring(2, 9);
  const now = new Date();
  const newTemplate: FeeTemplate = { ...template, id: newId, createdAt: now, updatedAt: now };

  await setDoc(doc(db, 'feeTemplates', newId), {
    ...newTemplate,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return newTemplate;
}

export async function updateFeeTemplate(id: string, data: Partial<FeeTemplate>): Promise<void> {
  await updateDoc(doc(db, 'feeTemplates', id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// ── Bulk Monthly Fee Generation ─────────────────────────────────────────────

export function getDefaultTuitionForClass(className = ''): number {
  const c = className.toLowerCase();
  if (c.includes('10') || c.includes('9') || c.includes('matric')) return 2500;
  if (c.includes('8') || c.includes('7') || c.includes('6')) return 2000;
  return 1500;
}

/**
 * Computes a student's monthly fee consistently with invoice generation:
 * 1) Active class fee templates + student custom fee entries
 * 2) Latest invoice amount (if available and no templates/custom entries)
 * 3) Default tuition fallback by class
 */
export function computeStudentMonthlyFee(
  student: Student,
  feeTemplates: FeeTemplate[] = [],
  latestInvoice?: Invoice | null,
): number {
  const activeClassTemplates = feeTemplates.filter(
    (t) => t.className === student.className && t.isActive !== false,
  );
  const customEntries = student.feeEntries || [];

  if (activeClassTemplates.length > 0 || customEntries.length > 0) {
    const templateSum = activeClassTemplates.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const customSum = customEntries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    return templateSum + customSum;
  }

  if (latestInvoice && Number(latestInvoice.grandTotal) > 0) {
    return Number(latestInvoice.grandTotal);
  }

  return getDefaultTuitionForClass(student.className);
}

export async function generateMonthlyFeesForAll(targetMonth?: string): Promise<{ success: number; skipped: number; missingTemplates: number; cleanedInactive?: number }> {
  const monthLabel = targetMonth || getMonthLabel();
  const studentsSnap = await getDocs(collection(db, 'students'));
  const allStudents = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Student));
  const students = allStudents.filter((s) => isBillableActiveStudent(s));
  const activeStudentIds = new Set(students.map((s) => s.id));

  // PRE-FETCH: Get ALL existing fees and invoices for the target month to prevent any duplicate generation
  const [existingFeesSnap, existingInvoices] = await Promise.all([
    getDocs(query(collection(db, 'fees'), where('month', '==', monthLabel))),
    getInvoicesByMonth(monthLabel)
  ]);

  // Remove any unpaid invoices in this target month belonging to struck-off, inactive, or deleted students
  let cleanedInactive = 0;
  for (const inv of existingInvoices) {
    const paid = Number(inv.paidAmount || 0);
    if (!activeStudentIds.has(inv.studentId) && paid <= 0 && inv.status !== 'paid') {
      try {
        await deleteDoc(doc(db, 'invoices', inv.id));
        cleanedInactive++;
        if (inv.feeIds && inv.feeIds.length > 0) {
          for (const fId of inv.feeIds) {
            try {
              const fSnap = await getDoc(doc(db, 'fees', fId));
              if (fSnap.exists() && Number(fSnap.data().paidAmount || 0) <= 0 && fSnap.data().status !== 'paid') {
                await deleteDoc(doc(db, 'fees', fId));
              }
            } catch {}
          }
        }
      } catch (err) {
        console.warn('generateMonthlyFeesForAll: failed to clean inactive student invoice', inv.id, err);
      }
    }
  }

  if (students.length === 0) return { success: 0, skipped: 0, missingTemplates: 0, cleanedInactive };

  const billedStudentIds = new Set<string>();
  existingFeesSnap.docs.forEach(d => {
    if (activeStudentIds.has(d.data().studentId)) {
      billedStudentIds.add(d.data().studentId);
    }
  });
  existingInvoices.forEach(inv => {
    if (activeStudentIds.has(inv.studentId)) {
      billedStudentIds.add(inv.studentId);
    }
  });

  // PRE-FETCH: Get ALL fee templates and map by className
  const templatesSnap = await getDocs(collection(db, 'feeTemplates'));
  const templatesByClass: Record<string, any[]> = {};
  templatesSnap.docs.forEach(d => {
    const data = d.data();
    if (!templatesByClass[data.className]) templatesByClass[data.className] = [];
    templatesByClass[data.className].push(data);
  });

  interface StudentBillGroup {
    student: Student;
    items: Array<{
      id: string;
      description: string;
      quantity: number;
      unitPrice: number;
      total: number;
      feeType: string;
      dueDate: string;
    }>;
    totalAmount: number;
    primaryDueDate: string;
    primaryFeeType: string;
    primaryDescription: string;
  }

  const pendingStudentBills: StudentBillGroup[] = [];
  let skipCount = 0;
  let missingTemplatesCount = 0;

  for (const student of students) {
    if (billedStudentIds.has(student.id)) {
      skipCount++;
      continue;
    }

    const classTemplates = templatesByClass[student.className] || [];
    const studentTemplates = student.feeEntries || [];
    
    const items: StudentBillGroup['items'] = [];
    let total = 0;
    let dueDate = getMonthDueDate(10, monthLabel);
    let primaryFeeType = 'tuition';
    let primaryDesc = `Monthly Tuition Fee — ${monthLabel}`;

    if (classTemplates.length > 0 || studentTemplates.length > 0) {
      let idx = 1;
      for (const template of classTemplates) {
        const itemDue = getMonthDueDate(template.dueDayOfMonth || 10, monthLabel);
        dueDate = itemDue;
        primaryFeeType = template.feeType;
        primaryDesc = `${template.description} — ${monthLabel}`;
        items.push({
          id: `item-${idx++}`,
          description: `${template.description} — ${monthLabel}`,
          quantity: 1,
          unitPrice: template.amount,
          total: template.amount,
          feeType: template.feeType,
          dueDate: itemDue,
        });
        total += template.amount;
      }
      for (const entry of studentTemplates) {
        let day = 10;
        if (entry.dueDate) {
          const d = new Date(entry.dueDate);
          if (!isNaN(d.getDate())) day = d.getDate();
        }
        const itemDue = getMonthDueDate(day, monthLabel);
        items.push({
          id: `item-${idx++}`,
          description: `${entry.description} — ${monthLabel}`,
          quantity: 1,
          unitPrice: entry.amount,
          total: entry.amount,
          feeType: 'other',
          dueDate: itemDue,
        });
        total += entry.amount;
      }
    } else {
      // Default tuition fallback so no active student is skipped
      const defaultAmt = getDefaultTuitionForClass(student.className);
      items.push({
        id: 'item-1',
        description: `Monthly Tuition Fee — ${monthLabel}`,
        quantity: 1,
        unitPrice: defaultAmt,
        total: defaultAmt,
        feeType: 'tuition',
        dueDate,
      });
      total = defaultAmt;
    }

    if (items.length > 0) {
      pendingStudentBills.push({
        student,
        items,
        totalAmount: total,
        primaryDueDate: dueDate,
        primaryFeeType,
        primaryDescription: primaryDesc,
      });
    }
  }

  if (pendingStudentBills.length === 0) {
    return { success: 0, skipped: skipCount, missingTemplates: missingTemplatesCount, cleanedInactive };
  }

  // Reserve exactly 1 invoice number per student in a single super-fast transaction
  const reservedNumbers = await reserveInvoiceNumbers(pendingStudentBills.length);
  
  let currentBatch = writeBatch(db);
  let batchCount = 0;
  
  const commitBatchIfNeeded = async () => {
    if (batchCount >= 450) { // Max 500 writes per batch
      await currentBatch.commit();
      currentBatch = writeBatch(db);
      batchCount = 0;
    }
  };

  const successfulStudentIds = new Set<string>();

  for (let i = 0; i < pendingStudentBills.length; i++) {
    const bill = pendingStudentBills[i];
    const { student, items, totalAmount, primaryDueDate, primaryFeeType, primaryDescription } = bill;
    const invNumber = reservedNumbers[i];
    const feeId = 'fee-' + Math.random().toString(36).substring(2, 9);
    const invId = 'inv-' + Math.random().toString(36).substring(2, 9);

    const newFee: any = {
      id: feeId,
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      className: student.className,
      section: student.section,
      feeType: primaryFeeType,
      description: primaryDescription,
      amount: totalAmount,
      dueDate: primaryDueDate,
      paidAmount: 0,
      status: 'pending',
      month: monthLabel,
      invoiceId: invId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const newInvoice: any = {
      id: invId,
      invoiceNumber: invNumber,
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      className: student.className,
      section: student.section,
      items: items.map(it => ({
        id: it.id,
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        total: it.total,
      })),
      subtotal: totalAmount,
      discount: 0,
      discountType: 'fixed',
      tax: 0,
      grandTotal: totalAmount,
      paidAmount: 0,
      status: 'sent',
      dueDate: primaryDueDate,
      month: monthLabel,
      category: student.category || 'school',
      feeIds: [feeId],
      notes: `Due by ${primaryDueDate ? new Date(primaryDueDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' }) : 'the due date'}.`,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    currentBatch.set(doc(db, 'fees', feeId), newFee);
    currentBatch.set(doc(db, 'invoices', invId), newInvoice);
    batchCount += 2;
    successfulStudentIds.add(student.id);

    await commitBatchIfNeeded();
  }

  if (batchCount > 0) {
    await currentBatch.commit();
  }

  return { 
    success: successfulStudentIds.size, 
    skipped: skipCount, 
    missingTemplates: missingTemplatesCount,
    cleanedInactive,
  };
}

// ── Auto-assign fees when a student is enrolled ──────────────────────────────

export async function assignFeesForNewStudent(student: Student): Promise<void> {
  if (!isBillableActiveStudent(student)) return;
  const templates = await getFeeTemplateForClass(student.className);
  if (templates.length === 0) return;

  const monthLabel = getMonthLabel();

  for (const template of templates) {
    const dueDate = getMonthDueDate(template.dueDayOfMonth || 10);
    const feeId = 'fee-' + Math.random().toString(36).substring(2, 9);
    const now = new Date();

    const newFee: Fee = {
      id: feeId,
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      className: student.className,
      section: student.section,
      feeType: template.feeType,
      description: `${template.description} — ${monthLabel}`,
      amount: template.amount,
      dueDate,
      paidAmount: 0,
      status: 'pending',
      month: monthLabel,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await setDoc(doc(db, 'fees', feeId), {
        ...newFee,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Auto fee setDoc Firestore error:', err);
    }

    // Create auto-invoice
    await createAutoInvoice(student, newFee);
  }
}

// ── Owner-defined custom fees from the Student Form ──────────────────────────

export async function assignCustomFeesForStudent(student: Student): Promise<void> {
  if (!isBillableActiveStudent(student)) return;
  const entries = student.feeEntries;
  if (!entries || entries.length === 0) return;

  const now = new Date();

  for (const entry of entries) {
    const feeId = 'fee-' + Math.random().toString(36).substring(2, 9);

    const newFee: Fee = {
      id: feeId,
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      className: student.className,
      section: student.section,
      feeType: 'other',
      description: entry.description,
      amount: entry.amount,
      dueDate: entry.dueDate,
      paidAmount: 0,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    // Persist fee to Firestore
    try {
      await setDoc(doc(db, 'fees', feeId), {
        ...newFee,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('assignCustomFeesForStudent fee setDoc error:', err);
    }

    // Create invoice for this fee entry
    await createCustomInvoice(student, newFee);
  }
}

async function createCustomInvoice(student: Student, fee: Fee): Promise<void> {
  const invId = 'inv-' + Math.random().toString(36).substring(2, 9);
  const invNumber = await getNextInvoiceNumber();
  const now = new Date();

  const invoice: Invoice = {
    id: invId,
    invoiceNumber: invNumber,
    studentId: student.id,
    studentName: `${student.firstName} ${student.lastName}`,
    className: student.className,
    section: student.section,
    items: [
      {
        id: 'item-1',
        description: fee.description || 'Fee',
        quantity: 1,
        unitPrice: fee.amount,
        total: fee.amount,
      },
    ],
    subtotal: fee.amount,
    discount: 0,
    discountType: 'fixed',
    tax: 0,
    grandTotal: fee.amount,
    paidAmount: 0,
    status: 'sent',
    dueDate: fee.dueDate,
    month: fee.month,
    category: student.category || 'school',
    feeIds: [fee.id],
    notes: `Due by ${fee.dueDate
        ? new Date(fee.dueDate).toLocaleDateString('en-PK', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
        : 'the due date'
      }.`,
    createdAt: now,
    updatedAt: now,
    createdBy: 'system',
  };

  // Link invoice id back to fee
  try {
    await updateDoc(doc(db, 'fees', fee.id), { invoiceId: invId });
  } catch { }

  // Persist invoice to Firestore
  try {
    await setDoc(doc(db, 'invoices', invId), {
      ...invoice,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('createCustomInvoice setDoc error:', err);
  }
}

async function createAutoInvoice(student: Student, fee: Fee): Promise<void> {
  const invId = 'inv-' + Math.random().toString(36).substring(2, 9);
  const invNumber = await getNextInvoiceNumber();
  const now = new Date();

  const invoice: Invoice = {
    id: invId,
    invoiceNumber: invNumber,
    studentId: student.id,
    studentName: `${student.firstName} ${student.lastName}`,
    className: student.className,
    section: student.section,
    items: [{
      id: 'item-1',
      description: fee.description || fee.feeType,
      quantity: 1,
      unitPrice: fee.amount,
      total: fee.amount,
    }],
    subtotal: fee.amount,
    discount: 0,
    discountType: 'fixed',
    tax: 0,
    grandTotal: fee.amount,
    paidAmount: 0,
    status: 'sent',
    dueDate: fee.dueDate,
    month: fee.month,
    category: student.category || 'school',
    feeIds: [fee.id],
    notes: `Please clear dues before the ${fee.dueDate ? new Date(fee.dueDate).getDate() + 'th' : '10th'} of every month.`,
    createdAt: now,
    updatedAt: now,
    createdBy: 'system',
  };

  try {
    await updateDoc(doc(db, 'fees', fee.id), { invoiceId: invId });
  } catch { }

  try {
    await setDoc(doc(db, 'invoices', invId), {
      ...invoice,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('createAutoInvoice setDoc Firestore error:', err);
  }
}

// ── Fees CRUD ─────────────────────────────────────────────────────────────────

export async function getFees(): Promise<Fee[]> {
  const q = query(collection(db, 'fees'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    status: parseFeeStatus(d.data()),
    paidAmount: d.data().paidAmount || 0,
    createdAt: toDate(d.data().createdAt),
    updatedAt: toDate(d.data().updatedAt),
  })) as Fee[];
}

export async function getFeesByMonth(monthLabel: string): Promise<Fee[]> {
  const snap = await getDocs(collection(db, 'fees'));
  const lowerLabel = monthLabel.toLowerCase().trim();
  const parts = lowerLabel.split(' ');
  const targetMonth = parts[0] || '';
  const targetYear = parts[1] || '';

  const all = snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    status: parseFeeStatus(d.data()),
    paidAmount: d.data().paidAmount || 0,
    createdAt: toDate(d.data().createdAt),
    updatedAt: toDate(d.data().updatedAt),
  })) as Fee[];

  const results = all.filter((fee) => {
    // 1. Match month field strictly
    const feeMonth = (fee.month || '').toLowerCase().trim();
    if (feeMonth) {
      if (feeMonth === lowerLabel) return true;
      if (targetMonth && targetYear && feeMonth.includes(targetMonth) && feeMonth.includes(targetYear)) return true;
      if (targetMonth && !targetYear && feeMonth.includes(targetMonth)) return true;
      return false;
    }

    // 2. Fallback to dueDate ONLY IF month is absent
    if (fee.dueDate) {
      const d = new Date(fee.dueDate);
      if (!isNaN(d.getTime())) {
        const dMonth = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toLowerCase();
        if (targetMonth && targetYear && dMonth.includes(targetMonth) && dMonth.includes(targetYear)) return true;
        if (targetMonth && !targetYear && dMonth.includes(targetMonth)) return true;
      }
    }

    // 3. Fallback to createdAt ONLY IF month is absent
    if (fee.createdAt) {
      const c = new Date(fee.createdAt);
      if (!isNaN(c.getTime())) {
        const cMonth = c.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toLowerCase();
        if (targetMonth && targetYear && cMonth.includes(targetMonth) && cMonth.includes(targetYear)) return true;
        if (targetMonth && !targetYear && cMonth.includes(targetMonth)) return true;
      }
    }

    return false;
  });

  return results.sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));
}



export async function getFeesByStudent(studentId: string): Promise<Fee[]> {
  const q = query(
    collection(db, 'fees'),
    where('studentId', '==', studentId),
  );
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    status: parseFeeStatus(d.data()),
    paidAmount: d.data().paidAmount || 0,
    createdAt: toDate(d.data().createdAt),
    updatedAt: toDate(d.data().updatedAt),
  })) as Fee[];
  // Sort client-side by createdAt descending
  return items.sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));
}

export async function addFee(feeData: Omit<Fee, 'id' | 'createdAt' | 'updatedAt'>): Promise<Fee> {
  // Prevent adding fees/invoices for struck-off, inactive, or deleted students
  const studentCheckSnap = await getDoc(doc(db, 'students', feeData.studentId));
  if (!studentCheckSnap.exists() || !isBillableActiveStudent({ id: studentCheckSnap.id, ...studentCheckSnap.data() })) {
    throw new Error('Cannot create a fee or invoice for a struck-off, inactive, or deleted student.');
  }

  const newId = 'fee-' + Math.random().toString(36).substring(2, 9);
  const now = new Date();
  const newFee: Fee = { ...feeData, id: newId, createdAt: now, updatedAt: now };

  await setDoc(doc(db, 'fees', newId), {
    ...newFee,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Automatically create invoice
  const invId = 'inv-' + Math.random().toString(36).substring(2, 9);
  const invNumber = await getNextInvoiceNumber();

  const invoice: Invoice = {
    id: invId,
    invoiceNumber: invNumber,
    studentId: newFee.studentId,
    studentName: newFee.studentName,
    className: newFee.className,
    section: newFee.section,
    items: [{
      id: 'item-1',
      description: newFee.description || newFee.feeType,
      quantity: 1,
      unitPrice: newFee.amount,
      total: newFee.amount,
    }],
    subtotal: newFee.amount,
    discount: 0,
    discountType: 'fixed',
    tax: 0,
    grandTotal: newFee.amount,
    paidAmount: 0,
    status: 'sent',
    dueDate: newFee.dueDate,
    month: newFee.month,
    category: 'school', // default, updated below
    feeIds: [newFee.id],
    notes: 'Manually added fee.',
    createdAt: now,
    updatedAt: now,
    createdBy: 'system',
  };

  try {
    const studentSnap = await getDoc(doc(db, 'students', newFee.studentId));
    if (studentSnap.exists()) {
      const stud = studentSnap.data();
      invoice.studentName = `${stud.firstName} ${stud.lastName}`;
      invoice.category = stud.category || 'school';
    }
    
    await setDoc(doc(db, 'invoices', invId), {
      ...invoice,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await updateDoc(doc(db, 'fees', newId), { invoiceId: invId });
  } catch (err) {
    console.warn('addFee auto-invoice generation error', err);
  }

  newFee.invoiceId = invId;
  return newFee;
}

export async function updateFee(id: string, updates: Partial<Fee>): Promise<void> {
  await updateDoc(doc(db, 'fees', id), {
    ...updates,
    updatedAt: serverTimestamp(),
  });

  // If amount or description changes, update the linked invoice
  const feeSnap = await getDoc(doc(db, 'fees', id));
  if (feeSnap.exists() && feeSnap.data().invoiceId) {
    const invId = feeSnap.data().invoiceId;
    const invSnap = await getDoc(doc(db, 'invoices', invId));
    if (invSnap.exists()) {
      const invData = invSnap.data() as Invoice;
      if (invData.items && invData.items.length === 1) {
        invData.items[0].description = updates.description || invData.items[0].description;
        invData.items[0].unitPrice = updates.amount || invData.items[0].unitPrice;
        invData.items[0].total = updates.amount || invData.items[0].total;
        
        await updateDoc(doc(db, 'invoices', invId), {
          items: invData.items,
          subtotal: updates.amount || invData.subtotal,
          grandTotal: updates.amount || invData.grandTotal,
          dueDate: updates.dueDate || invData.dueDate,
          updatedAt: serverTimestamp(),
        });
      }
    }
  }
}

export async function deleteFee(id: string): Promise<void> {
  const feeSnap = await getDoc(doc(db, 'fees', id));
  if (feeSnap.exists() && feeSnap.data().invoiceId) {
    try {
      await deleteDoc(doc(db, 'invoices', feeSnap.data().invoiceId));
    } catch(e) {
      console.warn("Failed to delete linked invoice", e);
    }
  }
  await deleteDoc(doc(db, 'fees', id));
}

export async function recordPayment(
  feeId: string,
  paymentData: {
    amount: number;
    method: 'cash' | 'bank_transfer' | 'cheque' | 'online';
    collectorId: string;
    collectorName: string;
  },
): Promise<Fee> {
  const now = new Date();
  const receipt = generateReceiptNumber();

  const feeSnap = await getDoc(doc(db, 'fees', feeId));
  if (!feeSnap.exists()) throw new Error('Fee record not found.');

  const existing = { id: feeSnap.id, ...feeSnap.data() } as Fee;

  const currentBalance = existing.amount - (existing.paidAmount || 0);
  const amountToApplyToCurrent = Math.min(paymentData.amount, currentBalance);

  const newPaidAmount = (existing.paidAmount || 0) + amountToApplyToCurrent;
  const isFullyPaid = newPaidAmount >= existing.amount;

  const updated: Partial<Fee> = {
    paidAmount: newPaidAmount,
    status: isFullyPaid ? 'paid' : 'partial',
    paidDate: now.toISOString().split('T')[0],
    paymentMethod: paymentData.method,
    receiptNumber: receipt,
    collectedBy: paymentData.collectorId,
    collectedByName: paymentData.collectorName,
    updatedAt: now,
  };

  await updateDoc(doc(db, 'fees', feeId), {
    ...updated,
    updatedAt: serverTimestamp(),
  });

  // Update linked invoice
  if (existing.invoiceId) {
    try {
      await updateDoc(doc(db, 'invoices', existing.invoiceId), {
        paidAmount: newPaidAmount,
        status: isFullyPaid ? 'paid' : 'partial',
        ...(isFullyPaid ? { paidAt: serverTimestamp() } : {}),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('recordPayment linked invoice Firestore error:', err);
    }
  }

  // Note: Monthly isolation — payment stays strictly with this fee and its linked invoice.
  return { ...existing, ...updated } as Fee;
}

// ── Invoices CRUD ────────────────────────────────────────────────────────────

export async function getInvoices(): Promise<Invoice[]> {
  const snap = await getDocs(collection(db, 'invoices'));
  const items = snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    status: parseInvoiceStatus(d.data()),
    paidAmount: d.data().paidAmount || 0,
    createdAt: toDate(d.data().createdAt),
    updatedAt: toDate(d.data().updatedAt),
    paidAt: d.data().paidAt ? toDate(d.data().paidAt) : undefined,
  })) as Invoice[];
  return items.sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));
}

export async function getInvoicesByMonth(monthLabel: string): Promise<Invoice[]> {
  const all = await getInvoices();
  const lowerLabel = monthLabel.toLowerCase().trim();
  const parts = lowerLabel.split(' ');
  const targetMonth = parts[0] || '';
  const targetYear = parts[1] || '';

  return all.filter((inv) => {
    // 1. Direct match on month field — STRICT ISOLATION
    const invMonth = (inv.month || '').toLowerCase().trim();
    if (invMonth) {
      if (invMonth === lowerLabel) return true;
      if (targetMonth && targetYear && invMonth.includes(targetMonth) && invMonth.includes(targetYear)) return true;
      if (targetMonth && !targetYear && invMonth.includes(targetMonth)) return true;
      // If invoice has a month explicitly set, it belongs strictly to that month and not others!
      return false;
    }

    // 2. Fallback to dueDate ONLY IF month is absent
    if (inv.dueDate) {
      const d = new Date(inv.dueDate);
      if (!isNaN(d.getTime())) {
        const dMonth = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toLowerCase();
        if (targetMonth && targetYear && dMonth.includes(targetMonth) && dMonth.includes(targetYear)) return true;
        if (targetMonth && !targetYear && dMonth.includes(targetMonth)) return true;
      }
    }

    // 3. Fallback to createdAt ONLY IF month is absent
    if (inv.createdAt) {
      const c = new Date(inv.createdAt);
      if (!isNaN(c.getTime())) {
        const cMonth = c.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toLowerCase();
        if (targetMonth && targetYear && cMonth.includes(targetMonth) && cMonth.includes(targetYear)) return true;
        if (targetMonth && !targetYear && cMonth.includes(targetMonth)) return true;
      }
    }

    return false;
  });
}

export async function getInvoicesByStudent(studentId: string): Promise<Invoice[]> {
  const q = query(
    collection(db, 'invoices'),
    where('studentId', '==', studentId),
  );
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    status: parseInvoiceStatus(d.data()),
    paidAmount: d.data().paidAmount || 0,
    createdAt: toDate(d.data().createdAt),
    updatedAt: toDate(d.data().updatedAt),
    paidAt: d.data().paidAt ? toDate(d.data().paidAt) : undefined,
  })) as Invoice[];
  return items.sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));
}

export async function getStudentArrears(studentId: string, beforeDate: Date): Promise<number> {
  const q = query(
    collection(db, 'invoices'),
    where('studentId', '==', studentId)
  );
  const snap = await getDocs(q);
  let totalArrears = 0;

  snap.docs.forEach(d => {
    const data = d.data();
    const createdAt = toDate(data.createdAt);
    if (createdAt < beforeDate) {
      const status = parseInvoiceStatus(data);
      if (status !== 'paid' && status !== 'cancelled') {
        const remaining = (data.grandTotal || 0) - (data.paidAmount || 0);
        if (remaining > 0) {
          totalArrears += remaining;
        }
      }
    }
  });

  return totalArrears;
}

export async function createInvoice(
  invoiceData: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt' | 'updatedAt'>,
  creatorId: string,
): Promise<Invoice> {
  const newId = 'inv-' + Math.random().toString(36).substring(2, 9);
  const number = await getNextInvoiceNumber();
  const now = new Date();
  const newInv: Invoice = {
    ...invoiceData,
    id: newId,
    invoiceNumber: number,
    createdAt: now,
    updatedAt: now,
    createdBy: creatorId,
    paidAmount: invoiceData.paidAmount ?? 0,
  };

  await setDoc(doc(db, 'invoices', newId), {
    ...newInv,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return newInv;
}

import { addSale } from '@/features/inventory/inventorySaleService';

export async function payInvoice(
  invoiceId: string,
  paymentData: {
    amount: number;
    method: 'cash' | 'bank_transfer' | 'cheque' | 'online';
    collectorId: string;
    collectorName: string;
  },
): Promise<Invoice> {
  const now = new Date();

  const snap = await getDoc(doc(db, 'invoices', invoiceId));
  if (!snap.exists()) throw new Error('Invoice not found.');
  const inv = { id: snap.id, ...snap.data() } as Invoice;

  const currentBalance = inv.grandTotal - (inv.paidAmount || 0);
  const amountToApplyToCurrent = Math.min(paymentData.amount, currentBalance);

  const newPaid = (inv.paidAmount || 0) + amountToApplyToCurrent;
  const isFullyPaid = newPaid >= inv.grandTotal;

  await updateDoc(doc(db, 'invoices', invoiceId), {
    paidAmount: newPaid,
    paymentMethod: paymentData.method,
    status: isFullyPaid ? 'paid' : 'partial',
    ...(isFullyPaid ? { paidAt: serverTimestamp() } : {}),
    updatedAt: serverTimestamp(),
  });

  // If fully paid, create inventory sales for any linked inventory items
  if (isFullyPaid) {
    for (const item of inv.items) {
      if (item.inventoryItemId && item.inventoryItemType) {
        try {
          await addSale(
            {
              itemId: item.inventoryItemId,
              itemType: item.inventoryItemType,
              itemName: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalAmount: item.total,
              month: inv.month || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
              saleDate: now.toISOString().split('T')[0],
              soldTo: inv.studentName,
              invoiceId: inv.id,
              status: 'completed',
              notes: `Auto-generated from Invoice #${inv.invoiceNumber}`,
              createdBy: paymentData.collectorId,
            },
            paymentData.collectorId
          );
        } catch (err) {
          console.warn('payInvoice: Failed to record inventory sale:', err);
        }
      }
    }
  }

  // Update linked fee records
  if (inv.feeIds && inv.feeIds.length > 0) {
    for (const feeId of inv.feeIds) {
      const receipt = generateReceiptNumber();
      try {
        await updateDoc(doc(db, 'fees', feeId), {
          paidAmount: newPaid,
          status: isFullyPaid ? 'paid' : 'partial',
          paidDate: now.toISOString().split('T')[0],
          paymentMethod: paymentData.method,
          receiptNumber: receipt,
          collectedBy: paymentData.collectorId,
          collectedByName: paymentData.collectorName,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('payInvoice linked fee update Firestore error:', err);
      }
    }
  }

  // Note: Monthly isolation — payment stays strictly with this specific invoice and its linked fees.
  return { ...inv, paidAmount: newPaid, paymentMethod: paymentData.method, status: isFullyPaid ? 'paid' : 'partial' };
}

/**
 * Helper to collect all fee document IDs linked to an invoice (both via feeIds array and invoiceId field).
 */
async function getLinkedFeeIdsForInvoice(invoiceId: string, invFeeIds?: string[]): Promise<string[]> {
  const idSet = new Set<string>(invFeeIds || []);
  try {
    const q = query(collection(db, 'fees'), where('invoiceId', '==', invoiceId));
    const snap = await getDocs(q);
    snap.docs.forEach((d) => idSet.add(d.id));
  } catch (err) {
    console.warn('getLinkedFeeIdsForInvoice query error:', err);
  }
  return Array.from(idSet);
}

/**
 * Edit an already-recorded payment on an invoice (adjust paid amount, payment method, or notes).
 * Setting paidAmount to 0 cleanly reverts the invoice back to unpaid.
 */
export async function updateInvoicePayment(
  invoiceId: string,
  paymentData: {
    paidAmount: number;
    method: 'cash' | 'bank_transfer' | 'cheque' | 'online';
    notes?: string;
    collectorId: string;
    collectorName: string;
  },
): Promise<Invoice> {
  const snap = await getDoc(doc(db, 'invoices', invoiceId));
  if (!snap.exists()) throw new Error('Invoice not found.');
  const inv = { id: snap.id, ...snap.data() } as Invoice;

  const clampedPaid = Math.max(0, Math.min(Number(paymentData.paidAmount) || 0, inv.grandTotal));

  if (clampedPaid <= 0) {
    return deleteInvoicePayment(invoiceId);
  }

  const now = new Date();
  const isFullyPaid = clampedPaid >= inv.grandTotal;
  const newStatus: Invoice['status'] = isFullyPaid ? 'paid' : 'partial';

  const invUpdate: Record<string, any> = {
    paidAmount: clampedPaid,
    paymentMethod: paymentData.method,
    status: newStatus,
    updatedAt: serverTimestamp(),
  };

  if (isFullyPaid) {
    if (!inv.paidAt) invUpdate.paidAt = serverTimestamp();
  } else {
    invUpdate.paidAt = deleteField();
  }

  if (paymentData.notes !== undefined) {
    invUpdate.notes = paymentData.notes;
  }

  await updateDoc(doc(db, 'invoices', invoiceId), invUpdate);

  // Sync linked fee records
  const linkedFeeIds = await getLinkedFeeIdsForInvoice(invoiceId, inv.feeIds);
  for (const feeId of linkedFeeIds) {
    try {
      const feeSnap = await getDoc(doc(db, 'fees', feeId));
      if (!feeSnap.exists()) continue;
      const feeData = feeSnap.data();
      const feeTotal = Number(feeData.amount || inv.grandTotal);
      const feeFullyPaid = clampedPaid >= feeTotal;
      await updateDoc(doc(db, 'fees', feeId), {
        paidAmount: Math.min(clampedPaid, feeTotal),
        status: feeFullyPaid ? 'paid' : 'partial',
        paidDate: feeData.paidDate || now.toISOString().split('T')[0],
        paymentMethod: paymentData.method,
        collectedBy: paymentData.collectorId,
        collectedByName: paymentData.collectorName,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('updateInvoicePayment linked fee sync error:', err);
    }
  }

  return {
    ...inv,
    paidAmount: clampedPaid,
    paymentMethod: paymentData.method,
    status: newStatus,
    ...(paymentData.notes !== undefined ? { notes: paymentData.notes } : {}),
  };
}

/**
 * Delete / revert a recorded payment on an invoice without deleting the invoice itself.
 * Resets paidAmount to 0 and restores unpaid status on both the invoice and its linked fees.
 */
export async function deleteInvoicePayment(invoiceId: string): Promise<Invoice> {
  const snap = await getDoc(doc(db, 'invoices', invoiceId));
  if (!snap.exists()) throw new Error('Invoice not found.');
  const inv = { id: snap.id, ...snap.data() } as Invoice;

  await updateDoc(doc(db, 'invoices', invoiceId), {
    paidAmount: 0,
    status: 'sent',
    paidAt: deleteField(),
    paymentMethod: deleteField(),
    updatedAt: serverTimestamp(),
  });

  // Reset all linked fee records back to pending/unpaid
  const linkedFeeIds = await getLinkedFeeIdsForInvoice(invoiceId, inv.feeIds);
  for (const feeId of linkedFeeIds) {
    try {
      const feeSnap = await getDoc(doc(db, 'fees', feeId));
      if (!feeSnap.exists()) continue;
      await updateDoc(doc(db, 'fees', feeId), {
        paidAmount: 0,
        status: 'pending',
        paidDate: deleteField(),
        paymentMethod: deleteField(),
        receiptNumber: deleteField(),
        collectedBy: deleteField(),
        collectedByName: deleteField(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('deleteInvoicePayment linked fee reset error:', err);
    }
  }

  const nextStatus = parseInvoiceStatus({ ...inv, status: 'sent', paidAmount: 0 }) as Invoice['status'];
  return {
    ...inv,
    paidAmount: 0,
    paymentMethod: undefined,
    paidAt: undefined,
    status: nextStatus,
  };
}

// ── Grade Registration Fees ───────────────────────────────────────────────────

export async function getGradeRegistrationFeeStructure(gradeLevel: 9 | 10): Promise<{
  registrationFee: number;
  examFee: number;
} | null> {
  const docSnap = await getDoc(doc(db, 'gradeFeStructures', `grade${gradeLevel}`));
  if (docSnap.exists()) {
    return docSnap.data() as { registrationFee: number; examFee: number };
  }
  return null;
}

export async function saveGradeRegistrationFeeStructure(
  gradeLevel: 9 | 10,
  fees: { registrationFee: number; examFee: number },
): Promise<void> {
  await setDoc(doc(db, 'gradeFeStructures', `grade${gradeLevel}`), {
    ...fees,
    gradeLevel,
    updatedAt: serverTimestamp(),
  });
}

export async function syncMissingInvoices(): Promise<{ success: number; errors: number }> {
  const feesSnap = await getDocs(collection(db, 'fees'));
  let successCount = 0;
  let errorCount = 0;

  for (const feeDoc of feesSnap.docs) {
    const fee = { id: feeDoc.id, ...feeDoc.data() } as any;
    
    let hasInvoice = false;
    if (fee.invoiceId) {
      try {
        const invSnap = await getDoc(doc(db, 'invoices', fee.invoiceId));
        if (invSnap.exists()) {
          hasInvoice = true;
          const invData = invSnap.data();
          if (!invData.month && fee.month) {
            await updateDoc(doc(db, 'invoices', fee.invoiceId), { month: fee.month });
          }
        }
      } catch (e) {
        console.warn('Error checking existing invoice for fee:', e);
      }
    } else {
      try {
        const q = query(collection(db, 'invoices'), where('feeIds', 'array-contains', fee.id));
        const invSnap2 = await getDocs(q);
        if (!invSnap2.empty) {
          hasInvoice = true;
          const invDoc = invSnap2.docs[0];
          await updateDoc(doc(db, 'fees', fee.id), { invoiceId: invDoc.id });
          const invData = invDoc.data();
          if (!invData.month && fee.month) {
            await updateDoc(doc(db, 'invoices', invDoc.id), { month: fee.month });
          }
        }
      } catch (e) {}
    }

    if (!hasInvoice) {
      try {
        // Guard against duplicate invoices: If student already has an invoice for this month, link to it instead!
        if (fee.studentId && fee.month) {
          const studentInvoices = await getInvoicesByStudent(fee.studentId);
          const feeMonthLower = (fee.month || '').toLowerCase().trim();
          const existingInv = studentInvoices.find(i => (i.month || '').toLowerCase().trim() === feeMonthLower);
          if (existingInv) {
            await updateDoc(doc(db, 'fees', fee.id), { invoiceId: existingInv.id });
            const currentFeeIds = existingInv.feeIds || [];
            if (!currentFeeIds.includes(fee.id)) {
              await updateDoc(doc(db, 'invoices', existingInv.id), {
                feeIds: [...currentFeeIds, fee.id],
                updatedAt: serverTimestamp(),
              });
            }
            continue;
          }
        }

        let category = 'school';
        try {
          const studentSnap = await getDoc(doc(db, 'students', fee.studentId));
          if (!studentSnap.exists() || !isBillableActiveStudent({ id: studentSnap.id, ...studentSnap.data() })) {
            // Never recreate invoices for struck-off, inactive, or deleted students
            continue;
          }
          category = studentSnap.data().category || 'school';
        } catch (e) {
          continue;
        }

        const invId = 'inv-' + Math.random().toString(36).substring(2, 9);
        const invNumber = await getNextInvoiceNumber();
        const now = new Date();

        const invoice = {
          id: invId,
          invoiceNumber: invNumber,
          studentId: fee.studentId,
          studentName: fee.studentName || 'Unknown',
          className: fee.className || 'Unknown',
          section: fee.section || 'A',
          items: [{
            id: 'item-1',
            description: fee.description || fee.feeType || 'Fee',
            quantity: 1,
            unitPrice: fee.amount,
            total: fee.amount,
          }],
          subtotal: fee.amount,
          discount: 0,
          discountType: 'fixed',
          tax: 0,
          grandTotal: fee.amount,
          paidAmount: fee.paidAmount || 0,
          status: (fee.paidAmount || 0) >= fee.amount ? 'paid' : 'sent',
          dueDate: fee.dueDate,
          month: fee.month,
          category: category,
          feeIds: [fee.id],
          notes: 'Auto-synced for missing invoice.',
          createdAt: fee.createdAt || now,
          updatedAt: now,
          createdBy: 'system',
        };

        await updateDoc(doc(db, 'fees', fee.id), { invoiceId: invId });
        await setDoc(doc(db, 'invoices', invId), {
          ...invoice,
          createdAt: fee.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        
        successCount++;
      } catch (e) {
        console.error('Failed to sync missing invoice for fee', fee.id, e);
        errorCount++;
      }
    }
  }
  
  return { success: successCount, errors: errorCount };
}

export async function deleteInvoice(id: string): Promise<void> {
  const invSnap = await getDoc(doc(db, 'invoices', id));
  if (invSnap.exists()) {
    const invData = invSnap.data() as Invoice;
    // Delete linked fees if any
    if (invData.feeIds && invData.feeIds.length > 0) {
      for (const feeId of invData.feeIds) {
        try {
          await deleteDoc(doc(db, 'fees', feeId));
        } catch(e) {
          console.warn("Failed to delete linked fee", e);
        }
      }
    }
  }
  await deleteDoc(doc(db, 'invoices', id));
}

export async function cleanupDuplicateFees(targetMonth?: string): Promise<{ deletedFees: number; deletedInvoices: number; syncedFees: number }> {
  // If targetMonth is provided or defaults to November 2026, run monthly invoice deduplication
  if (targetMonth) {
    const res = await cleanupDuplicateInvoicesForMonth(targetMonth);
    return {
      deletedFees: res.deletedFees,
      deletedInvoices: res.deletedInvoices,
      syncedFees: res.remainingInvoices,
    };
  }

  // 1. Fetch all fees
  const feesSnap = await getDocs(collection(db, 'fees'));
  const allFees = feesSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

  // 2. Group by studentId + month to deduplicate
  const groupedFees: Record<string, any[]> = {};
  for (const fee of allFees) {
    const mKey = (fee.month || 'unspecified').trim().toLowerCase();
    const key = `${fee.studentId}_${mKey}`; 
    if (!groupedFees[key]) groupedFees[key] = [];
    groupedFees[key].push(fee);
  }

  let deletedFees = 0;
  let deletedInvoices = 0;
  let syncedFees = 0;

  for (const key in groupedFees) {
    const group = groupedFees[key];
    if (group.length > 1) {
      group.sort((a, b) => {
        const aPaid = (a.status === 'paid' || a.status === 'partial') ? 1 : 0;
        const bPaid = (b.status === 'paid' || b.status === 'partial') ? 1 : 0;
        if (aPaid !== bPaid) return bPaid - aPaid;
        
        const aHasInv = a.invoiceId ? 1 : 0;
        const bHasInv = b.invoiceId ? 1 : 0;
        if (aHasInv !== bHasInv) return bHasInv - aHasInv;
        
        const aDate = a.updatedAt?.toDate ? a.updatedAt.toDate().getTime() : 0;
        const bDate = b.updatedAt?.toDate ? b.updatedAt.toDate().getTime() : 0;
        return bDate - aDate;
      });

      const bestFee = group[0];
      const duplicates = group.slice(1);

      for (const dup of duplicates) {
        await deleteDoc(doc(db, 'fees', dup.id));
        deletedFees++;

        if (dup.invoiceId && dup.invoiceId !== bestFee.invoiceId) {
          try {
            await deleteDoc(doc(db, 'invoices', dup.invoiceId));
            deletedInvoices++;
          } catch (e) {}
        }
      }
      
      if (bestFee.invoiceId) {
        try {
          const invSnap = await getDoc(doc(db, 'invoices', bestFee.invoiceId));
          if (invSnap.exists()) {
            const invData = invSnap.data();
            const correctMonth = invData.month || bestFee.month || 'November 2026';
            
            if (!invData.month) {
              await updateDoc(doc(db, 'invoices', bestFee.invoiceId), { month: correctMonth });
            }

            if (bestFee.paidAmount !== invData.paidAmount || bestFee.status !== invData.status || !bestFee.month) {
              await updateDoc(doc(db, 'fees', bestFee.id), {
                paidAmount: invData.paidAmount || 0,
                status: invData.status || 'pending',
                month: correctMonth
              });
              syncedFees++;
            }
          }
        } catch(e) {}
      }
    }
  }

  return { deletedFees, deletedInvoices, syncedFees };
}

export async function cleanupDuplicateInvoicesForMonth(monthLabel: string = 'November 2026'): Promise<{
  deletedInvoices: number;
  deletedFees: number;
  remainingInvoices: number;
  totalActiveStudents: number;
}> {
  const normTarget = monthLabel.trim();
  const lowerLabel = normTarget.toLowerCase();
  const parts = lowerLabel.split(' ');
  const targetMonthName = parts[0] || '';
  const targetYear = parts[1] || '';

  // 1. Fetch active students (strictly excluding struck-off/inactive/discarded students)
  const studentsSnap = await getDocs(collection(db, 'students'));
  const activeStudents = studentsSnap.docs
    .map(d => ({ id: d.id, ...d.data() } as Student))
    .filter(s => isBillableActiveStudent(s));
  const activeStudentMap = new Map<string, Student>();
  activeStudents.forEach(s => activeStudentMap.set(s.id, s));

  // 2. Fetch all invoices
  const allInvoices = await getInvoices();

  // 3. Filter invoices for target month
  const monthInvoices = allInvoices.filter(inv => {
    const invMonth = (inv.month || '').toLowerCase().trim();
    if (invMonth) {
      if (invMonth === lowerLabel) return true;
      if (targetMonthName && targetYear && invMonth.includes(targetMonthName) && invMonth.includes(targetYear)) return true;
      if (targetMonthName && !targetYear && invMonth.includes(targetMonthName)) return true;
      return false;
    }
    if (inv.dueDate) {
      const d = new Date(inv.dueDate);
      if (!isNaN(d.getTime())) {
        const dMonth = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toLowerCase();
        if (targetMonthName && targetYear && dMonth.includes(targetMonthName) && dMonth.includes(targetYear)) return true;
      }
    }
    if (inv.createdAt) {
      const c = new Date(inv.createdAt);
      if (!isNaN(c.getTime())) {
        const cMonth = c.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toLowerCase();
        if (targetMonthName && targetYear && cMonth.includes(targetMonthName) && cMonth.includes(targetYear)) return true;
      }
    }
    return false;
  });

  // 4. Group by studentId
  const invoicesByStudent = new Map<string, Invoice[]>();
  const orphanInvoices: Invoice[] = [];

  for (const inv of monthInvoices) {
    if (!inv.studentId || !activeStudentMap.has(inv.studentId)) {
      orphanInvoices.push(inv);
    } else {
      const list = invoicesByStudent.get(inv.studentId) || [];
      list.push(inv);
      invoicesByStudent.set(inv.studentId, list);
    }
  }

  let deletedInvoicesCount = 0;
  let deletedFeesCount = 0;
  const keptInvoices: Invoice[] = [];

  // 5. For each active student, keep 1 best invoice and delete duplicate invoices
  for (const [, studentInvs] of invoicesByStudent.entries()) {
    studentInvs.sort((a, b) => {
      const aPaid = a.status === 'paid' ? 2 : (a.paidAmount || 0) > 0 ? 1 : 0;
      const bPaid = b.status === 'paid' ? 2 : (b.paidAmount || 0) > 0 ? 1 : 0;
      if (aPaid !== bPaid) return bPaid - aPaid;

      const aItems = a.items?.length || 0;
      const bItems = b.items?.length || 0;
      if (aItems !== bItems) return bItems - aItems;

      const aDate = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bDate = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bDate - aDate;
    });

    const kept = studentInvs[0];
    const dups = studentInvs.slice(1);
    keptInvoices.push(kept);

    // Normalize kept invoice month
    if (kept.month !== normTarget) {
      try {
        await updateDoc(doc(db, 'invoices', kept.id), {
          month: normTarget,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('Failed to update invoice month:', err);
      }
    }

    // Delete duplicates
    for (const dup of dups) {
      try {
        await deleteDoc(doc(db, 'invoices', dup.id));
        deletedInvoicesCount++;
      } catch (err) {
        console.warn('Failed to delete duplicate invoice:', err);
      }

      if (dup.feeIds && dup.feeIds.length > 0) {
        for (const feeId of dup.feeIds) {
          try {
            await deleteDoc(doc(db, 'fees', feeId));
            deletedFeesCount++;
          } catch (e) {}
        }
      }
    }
  }

  // 6. Delete orphan/invalid invoices for this month
  for (const orphan of orphanInvoices) {
    try {
      await deleteDoc(doc(db, 'invoices', orphan.id));
      deletedInvoicesCount++;
      if (orphan.feeIds && orphan.feeIds.length > 0) {
        for (const fId of orphan.feeIds) {
          try {
            await deleteDoc(doc(db, 'fees', fId));
            deletedFeesCount++;
          } catch (e) {}
        }
      }
    } catch (e) {}
  }

  // 7. Cleanup duplicate fees in fees collection for this month
  const feesSnap = await getDocs(collection(db, 'fees'));
  const monthFees = feesSnap.docs
    .map(d => ({ id: d.id, ...d.data() } as any))
    .filter(f => {
      const m = (f.month || '').toLowerCase().trim();
      return m === lowerLabel || (targetMonthName && targetYear && m.includes(targetMonthName) && m.includes(targetYear));
    });

  const feesByStudent = new Map<string, any[]>();
  for (const f of monthFees) {
    const list = feesByStudent.get(f.studentId) || [];
    list.push(f);
    feesByStudent.set(f.studentId, list);
  }

  for (const [studentId, sFees] of feesByStudent.entries()) {
    if (sFees.length > 1) {
      const matchingKept = keptInvoices.find(k => k.studentId === studentId);
      const keptFeeId = matchingKept?.feeIds?.[0];

      sFees.sort((a, b) => {
        if (keptFeeId && a.id === keptFeeId) return -1;
        if (keptFeeId && b.id === keptFeeId) return 1;
        const aPaid = a.status === 'paid' ? 1 : 0;
        const bPaid = b.status === 'paid' ? 1 : 0;
        return bPaid - aPaid;
      });

      const dups = sFees.slice(1);
      for (const dFee of dups) {
        try {
          await deleteDoc(doc(db, 'fees', dFee.id));
          deletedFeesCount++;
        } catch (e) {}
      }
    }
  }

  // 8. If any active student is missing an invoice for this month, generate their single invoice
  const billedStudentIds = new Set(keptInvoices.map(k => k.studentId));
  const missingStudents = activeStudents.filter(s => !billedStudentIds.has(s.id));
  
  if (missingStudents.length > 0) {
    const reservedNumbers = await reserveInvoiceNumbers(missingStudents.length);
    for (let i = 0; i < missingStudents.length; i++) {
      const stud = missingStudents[i];
      const invNum = reservedNumbers[i];
      const feeId = 'fee-' + Math.random().toString(36).substring(2, 9);
      const invId = 'inv-' + Math.random().toString(36).substring(2, 9);
      const defaultAmt = getDefaultTuitionForClass(stud.className);
      const dueDate = getMonthDueDate(10, normTarget);

      const feeDoc = {
        id: feeId,
        studentId: stud.id,
        studentName: `${stud.firstName} ${stud.lastName}`,
        className: stud.className,
        section: stud.section,
        feeType: 'tuition',
        description: `Monthly Tuition Fee — ${normTarget}`,
        amount: defaultAmt,
        dueDate,
        paidAmount: 0,
        status: 'pending',
        month: normTarget,
        invoiceId: invId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const invDoc = {
        id: invId,
        invoiceNumber: invNum,
        studentId: stud.id,
        studentName: `${stud.firstName} ${stud.lastName}`,
        className: stud.className,
        section: stud.section,
        items: [{
          id: 'item-1',
          description: `Monthly Tuition Fee — ${normTarget}`,
          quantity: 1,
          unitPrice: defaultAmt,
          total: defaultAmt,
        }],
        subtotal: defaultAmt,
        discount: 0,
        discountType: 'fixed',
        tax: 0,
        grandTotal: defaultAmt,
        paidAmount: 0,
        status: 'sent',
        dueDate,
        month: normTarget,
        category: stud.category || 'school',
        feeIds: [feeId],
        notes: `Due by ${dueDate ? new Date(dueDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' }) : 'the due date'}.`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      try {
        await setDoc(doc(db, 'fees', feeId), feeDoc);
        await setDoc(doc(db, 'invoices', invId), invDoc);
      } catch (err) {
        console.warn('Failed to create missing invoice for student:', stud.id, err);
      }
    }
  }

  const finalInvoices = await getInvoicesByMonth(normTarget);

  return {
    deletedInvoices: deletedInvoicesCount,
    deletedFees: deletedFeesCount,
    remainingInvoices: finalInvoices.length,
    totalActiveStudents: activeStudents.length,
  };
}

export async function cleanupNovemberInvoices(): Promise<{
  deletedInvoices: number;
  deletedFees: number;
  remainingInvoices: number;
  totalActiveStudents: number;
}> {
  return cleanupDuplicateInvoicesForMonth('November 2026');
}

// ── Direct Academy Fee Payment ───────────────────────────────────────────────
export async function recordAcademyFeePayment(params: {
  student: Student;
  amount: number;
  month: string;
  feeType?: string;
  description: string;
  paymentMethod: 'cash' | 'bank_transfer' | 'cheque' | 'online';
  collectorId: string;
  collectorName: string;
  notes?: string;
  dueDate?: string;
}): Promise<{ invoice: Invoice; fee: Fee }> {
  const now = new Date();
  const invId = 'inv-' + Math.random().toString(36).substring(2, 9);
  const feeId = 'fee-' + Math.random().toString(36).substring(2, 9);
  const invNumber = await getNextInvoiceNumber();
  const receipt = generateReceiptNumber();

  const newFee: Fee = {
    id: feeId,
    studentId: params.student.id,
    studentName: `${params.student.firstName} ${params.student.lastName}`,
    className: params.student.className,
    section: params.student.section,
    feeType: 'tuition' as any,
    description: params.description,
    amount: params.amount,
    dueDate: params.dueDate || now.toISOString().split('T')[0],
    paidAmount: params.amount,
    paidDate: now.toISOString().split('T')[0],
    status: 'paid',
    paymentMethod: params.paymentMethod,
    receiptNumber: receipt,
    collectedBy: params.collectorId,
    collectedByName: params.collectorName,
    notes: params.notes,
    invoiceId: invId,
    month: params.month,
    createdAt: now,
    updatedAt: now,
  };

  const newInvoice: Invoice = {
    id: invId,
    invoiceNumber: invNumber,
    studentId: params.student.id,
    studentName: `${params.student.firstName} ${params.student.lastName}`,
    className: params.student.className,
    section: params.student.section,
    category: 'academy',
    items: [
      {
        id: 'item-1',
        description: params.description,
        quantity: 1,
        unitPrice: params.amount,
        total: params.amount,
      },
    ],
    subtotal: params.amount,
    discount: 0,
    discountType: 'fixed',
    tax: 0,
    grandTotal: params.amount,
    paidAmount: params.amount,
    status: 'paid',
    dueDate: params.dueDate || now.toISOString().split('T')[0],
    paidAt: now,
    month: params.month,
    feeIds: [feeId],
    notes: params.notes || 'Academy fee payment recorded.',
    createdAt: now,
    updatedAt: now,
    createdBy: params.collectorId,
  };

  await setDoc(doc(db, 'fees', feeId), {
    ...newFee,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await setDoc(doc(db, 'invoices', invId), {
    ...newInvoice,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { invoice: newInvoice, fee: newFee };
}
