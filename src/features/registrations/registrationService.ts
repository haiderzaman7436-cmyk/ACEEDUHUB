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
      orderBy('createdAt', 'desc'),
    );
  } else {
    q = query(collection(db, 'gradeRegistrations'), orderBy('createdAt', 'desc'));
  }
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
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

export async function sendAdmission(
  registrationId: string,
  sentById: string,
): Promise<void> {
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
  const updates = registrationIds.map((id) =>
    updateDoc(doc(db, 'gradeRegistrations', id), {
      status: 'admission_sent' as GradeRegistrationStatus,
      admissionSentAt: serverTimestamp(),
      admissionSentBy: sentById,
      updatedAt: serverTimestamp(),
    }).catch((err) => {
      console.warn(`bulkSendAdmission error for id ${id}:`, err);
    }),
  );
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
