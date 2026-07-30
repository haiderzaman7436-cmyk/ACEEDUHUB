// ============================================================================
// ACE Educational Hub — Grade Registration Service (Firestore)
// ============================================================================

import {
  collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { GradeRegistration, GradeRegistrationStatus } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDate(val: unknown): Date {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (val && typeof (val as Timestamp).toDate === 'function') return (val as Timestamp).toDate();
  return new Date(val as string);
}

// ── Grade Registration CRUD ───────────────────────────────────────────────────

export async function getGradeRegistrations(gradeLevel?: 9 | 10): Promise<GradeRegistration[]> {
  let q;
  if (gradeLevel) {
    q = query(
      collection(db, 'gradeRegistrations'),
      where('gradeLevel', '==', gradeLevel),
    );
  } else {
    q = query(collection(db, 'gradeRegistrations'), orderBy('createdAt', 'desc'));
  }
  const snap = await getDocs(q);
  const results = snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    return {
      id: d.id,
      ...data,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
      admissionSentAt: data.admissionSentAt ? toDate(data.admissionSentAt) : undefined,
      registeredAt: data.registeredAt ? toDate(data.registeredAt) : undefined,
    } as GradeRegistration;
  });

  if (gradeLevel) {
    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  return results;
}

export async function createGradeRegistration(
  data: Omit<GradeRegistration, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<GradeRegistration> {
  const newId = 'greg-' + Math.random().toString(36).substring(2, 9);
  const now = new Date();
  const newReg: GradeRegistration = {
    ...data,
    id: newId,
    status: 'pending',
    paidAmount: 0,
    remainingAmount: data.totalFee,
    feeStatus: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, 'gradeRegistrations', newId), {
    ...newReg,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return newReg;
}

import { generateInvoiceNumber } from '@/lib/utils';
import type { Invoice } from '@/types';

async function generateAdmissionInvoice(reg: GradeRegistration): Promise<void> {
  if (reg.totalFee <= 0) return;
  const invId = 'inv-' + Math.random().toString(36).substring(2, 9);
  const now = new Date();
  
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 10); // due in 10 days

  const invoice: Invoice = {
    id: invId,
    invoiceNumber: generateInvoiceNumber(),
    studentId: reg.studentId,
    studentName: reg.studentName,
    className: reg.className || `Grade ${reg.gradeLevel}`,
    section: reg.section || 'A',
    items: [
      {
        id: 'item-reg',
        description: `Registration Fee (Grade ${reg.gradeLevel})`,
        quantity: 1,
        unitPrice: reg.registrationFee,
        total: reg.registrationFee,
      },
      {
        id: 'item-exam',
        description: `Admission Fee (Grade ${reg.gradeLevel})`,
        quantity: 1,
        unitPrice: reg.examFee,
        total: reg.examFee,
      }
    ],
    subtotal: reg.totalFee,
    discount: 0,
    discountType: 'fixed',
    tax: 0,
    grandTotal: reg.totalFee,
    paidAmount: reg.paidAmount || 0,
    status: reg.paidAmount >= reg.totalFee ? 'paid' : 'sent',
    dueDate: dueDate.toISOString().split('T')[0],
    category: 'school',
    feeIds: [], // Not linked to an individual fee record
    notes: `Admission & Registration charges for Grade ${reg.gradeLevel}`,
    createdAt: now,
    updatedAt: now,
    createdBy: 'system',
  };

  await setDoc(doc(db, 'invoices', invId), {
    ...invoice,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function sendAdmission(
  registrationId: string,
  sentById: string,
): Promise<void> {
  const snap = await getDoc(doc(db, 'gradeRegistrations', registrationId));
  if (snap.exists()) {
    const reg = { id: snap.id, ...snap.data() } as GradeRegistration;
    await generateAdmissionInvoice(reg);
  }

  await updateDoc(doc(db, 'gradeRegistrations', registrationId), {
    status: 'admission_sent' as GradeRegistrationStatus,
    admissionSentAt: serverTimestamp(),
    admissionSentBy: sentById,
    updatedAt: serverTimestamp(),
  });
}

export async function bulkSendAdmission(
  registrationIds: string[],
  sentById: string,
): Promise<void> {
  const updates = registrationIds.map(async (id) => {
    try {
      const snap = await getDoc(doc(db, 'gradeRegistrations', id));
      if (snap.exists()) {
        const reg = { id: snap.id, ...snap.data() } as GradeRegistration;
        await generateAdmissionInvoice(reg);
      }
      
      await updateDoc(doc(db, 'gradeRegistrations', id), {
        status: 'admission_sent' as GradeRegistrationStatus,
        admissionSentAt: serverTimestamp(),
        admissionSentBy: sentById,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn(`bulkSendAdmission error for id ${id}:`, err);
    }
  });
  await Promise.all(updates);
}

export async function markGradeRegistrationFeePaid(
  registrationId: string,
  paidAmount: number,
): Promise<void> {
  const snap = await getDoc(doc(db, 'gradeRegistrations', registrationId));
  if (!snap.exists()) return;
  const reg = { id: snap.id, ...snap.data() } as GradeRegistration;

  const newPaid = (reg.paidAmount || 0) + paidAmount;
  const remaining = reg.totalFee - newPaid;
  const isFullPaid = newPaid >= reg.totalFee;

  await updateDoc(doc(db, 'gradeRegistrations', registrationId), {
    paidAmount: newPaid,
    remainingAmount: Math.max(0, remaining),
    feeStatus: isFullPaid ? 'paid' : 'partial',
    status: isFullPaid ? 'fees_paid' : 'admission_sent',
    updatedAt: serverTimestamp(),
  });
}

export async function updateGradeRegistrationStatus(
  id: string,
  status: GradeRegistrationStatus,
  remarks?: string,
): Promise<void> {
  await updateDoc(doc(db, 'gradeRegistrations', id), {
    status,
    ...(remarks ? { remarks } : {}),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteGradeRegistration(id: string): Promise<void> {
  await deleteDoc(doc(db, 'gradeRegistrations', id));
}

// ── Fee Structure for Grade Registrations ────────────────────────────────────

export async function getGradeFeeStructure(gradeLevel: 9 | 10): Promise<{
  registrationFee: number;
  examFee: number;
} | null> {
  const snap = await getDocs(
    query(collection(db, 'gradeFeeStructures'), where('gradeLevel', '==', gradeLevel)),
  );
  if (!snap.empty) {
    return snap.docs[0].data() as { registrationFee: number; examFee: number };
  }
  return null;
}

export async function saveGradeFeeStructure(
  gradeLevel: 9 | 10,
  fees: { registrationFee: number; examFee: number },
): Promise<void> {
  const docId = `grade${gradeLevel}`;
  await setDoc(doc(db, 'gradeFeeStructures', docId), {
    ...fees,
    gradeLevel,
    updatedAt: serverTimestamp(),
  });
}
