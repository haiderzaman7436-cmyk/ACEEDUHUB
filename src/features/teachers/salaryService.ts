// ============================================================================
// ACE Educational Hub — Salary Service (Firestore)
// ============================================================================

import { collection, doc, getDocs, setDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { SalaryPayment } from '@/types';

export async function getSalaryPayments(): Promise<SalaryPayment[]> {
  const q = query(collection(db, 'salaryPayments'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    paidAt: d.data().paidAt?.toDate() || new Date(),
    createdAt: d.data().createdAt?.toDate() || new Date(),
    updatedAt: d.data().updatedAt?.toDate() || new Date(),
  })) as SalaryPayment[];
}

export async function getSalaryPaymentsByTeacher(teacherId: string): Promise<SalaryPayment[]> {
  const all = await getSalaryPayments();
  return all.filter((p) => p.teacherId === teacherId);
}

export async function recordSalaryPayment(
  paymentData: Omit<SalaryPayment, 'id' | 'createdAt' | 'updatedAt' | 'receiptNumber' | 'paidAt' | 'paidBy' | 'paidByName'>,
  paidByUserId: string,
  paidByUserName: string,
): Promise<SalaryPayment> {
  const now = new Date();
  const paymentId = 'pay-' + Math.random().toString(36).substring(2, 9);

  // Custom salary receipt number
  const receiptNo = 'SAL-' + now.getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);

  const newPayment: SalaryPayment = {
    ...paymentData,
    id: paymentId,
    receiptNumber: receiptNo,
    paidBy: paidByUserId,
    paidByName: paidByUserName,
    paidAt: now,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, 'salaryPayments', paymentId), {
    ...newPayment,
    paidAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Log activity
  await logActivity(
    paidByUserId,
    'Paid Staff Salary',
    `Salary of ${formatCurrency(newPayment.netSalary)} paid to ${newPayment.teacherName} for ${newPayment.monthLabel}`,
  );

  return newPayment;
}

// ── Activity Log Helper ──────────────────────────────────────────────────────

async function logActivity(userId: string, action: string, details: string) {
  const logId = 'log-' + Math.random().toString(36).substring(2, 9);
  const log = {
    id: logId,
    userId,
    userName: 'Authorized User',
    action,
    module: 'Finance',
    details,
    timestamp: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'activityLogs', logId), log);
  } catch {
    // non-critical
  }
}

function formatCurrency(amount: number) {
  return 'PKR ' + amount.toLocaleString('en-PK');
}
