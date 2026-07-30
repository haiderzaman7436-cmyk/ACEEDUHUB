// ============================================================================
// ACE Educational Hub — Fee Service (Firestore)
// ============================================================================

import {
  collection, doc, getDocs, getDoc, setDoc, updateDoc,
  query, where, orderBy, Timestamp, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Fee, Invoice, FeeTemplate, Student } from '@/types';
import { generateInvoiceNumber, generateReceiptNumber } from '@/lib/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDate(val: unknown): Date {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (val && typeof (val as Timestamp).toDate === 'function') return (val as Timestamp).toDate();
  return new Date(val as string);
}

function getMonthDueDate(dueDayOfMonth = 10): string {
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

export async function generateMonthlyFeesForAll(): Promise<{ success: number; skipped: number }> {
  const monthLabel = getMonthLabel();
  const studentsSnap = await getDocs(query(collection(db, 'students'), where('status', '==', 'active')));
  const students = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Student));
  
  if (students.length === 0) return { success: 0, skipped: 0 };
  
  let successCount = 0;
  let skipCount = 0;

  for (const student of students) {
    // Check if this student already has a fee for this month (avoid duplicates)
    const existingFeesQ = query(
      collection(db, 'fees'), 
      where('studentId', '==', student.id),
      where('month', '==', monthLabel)
    );
    const existingSnap = await getDocs(existingFeesQ);
    if (!existingSnap.empty) {
      skipCount++;
      continue;
    }

    // Try assigning default template fees
    const templates = await getFeeTemplateForClass(student.className);
    if (templates.length > 0) {
      await assignFeesForNewStudent(student); // Re-uses the assignment logic
      successCount++;
    } else {
      skipCount++;
    }
  }

  return { success: successCount, skipped: skipCount };
}

// ── Auto-assign fees when a student is enrolled ──────────────────────────────

export async function assignFeesForNewStudent(student: Student): Promise<void> {
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
  const invNumber = generateInvoiceNumber();
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
    category: student.category || 'school',
    feeIds: [fee.id],
    notes: `Due by ${
      fee.dueDate
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
  } catch {}

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
  const invNumber = generateInvoiceNumber();
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
  } catch {}

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
    createdAt: toDate(d.data().createdAt),
    updatedAt: toDate(d.data().updatedAt),
  })) as Fee[];
}

export async function getFeesByMonth(monthLabel: string): Promise<Fee[]> {
  const q = query(
    collection(db, 'fees'),
    where('month', '==', monthLabel),
  );
  const snap = await getDocs(q);
  const results = snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: toDate(d.data().createdAt),
    updatedAt: toDate(d.data().updatedAt),
  })) as Fee[];
  return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getAvailableFeeMonths(): Promise<string[]> {
  // Fetch all fees and extract unique months (client-side distinct)
  const snap = await getDocs(collection(db, 'fees'));
  const months = new Set<string>();
  snap.docs.forEach((d) => {
    const m = d.data().month;
    if (m) months.add(m);
  });
  // Sort months chronologically
  return Array.from(months).sort((a, b) => {
    const dateA = new Date(a);
    const dateB = new Date(b);
    return dateB.getTime() - dateA.getTime();
  });
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
    createdAt: toDate(d.data().createdAt),
    updatedAt: toDate(d.data().updatedAt),
  })) as Fee[];
  // Sort client-side by createdAt descending
  return items.sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));
}

export async function addFee(feeData: Omit<Fee, 'id' | 'createdAt' | 'updatedAt'>): Promise<Fee> {
  const newId = 'fee-' + Math.random().toString(36).substring(2, 9);
  const now = new Date();
  const newFee: Fee = { ...feeData, id: newId, createdAt: now, updatedAt: now };

  await setDoc(doc(db, 'fees', newId), {
    ...newFee,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return newFee;
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

  const newPaidAmount = (existing.paidAmount || 0) + paymentData.amount;
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
        status: isFullyPaid ? 'paid' : 'sent',
        ...(isFullyPaid ? { paidAt: serverTimestamp() } : {}),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('recordPayment linked invoice Firestore error:', err);
    }
  }

  return { ...existing, ...updated } as Fee;
}

// ── Invoices CRUD ────────────────────────────────────────────────────────────

export async function getInvoices(): Promise<Invoice[]> {
  const q = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: toDate(d.data().createdAt),
    updatedAt: toDate(d.data().updatedAt),
    paidAt: d.data().paidAt ? toDate(d.data().paidAt) : undefined,
  })) as Invoice[];
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
    createdAt: toDate(d.data().createdAt),
    updatedAt: toDate(d.data().updatedAt),
    paidAt: d.data().paidAt ? toDate(d.data().paidAt) : undefined,
  })) as Invoice[];
  return items.sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));
}

export async function createInvoice(
  invoiceData: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt' | 'updatedAt'>,
  creatorId: string,
): Promise<Invoice> {
  const newId = 'inv-' + Math.random().toString(36).substring(2, 9);
  const number = generateInvoiceNumber();
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

  const newPaid = (inv.paidAmount || 0) + paymentData.amount;
  const isFullyPaid = newPaid >= inv.grandTotal;

  await updateDoc(doc(db, 'invoices', invoiceId), {
    paidAmount: newPaid,
    status: isFullyPaid ? 'paid' : 'sent',
    ...(isFullyPaid ? { paidAt: serverTimestamp() } : {}),
    updatedAt: serverTimestamp(),
  });

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

  return { ...inv, paidAmount: newPaid, status: isFullyPaid ? 'paid' : 'sent' };
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
