// ============================================================================
// ACE Educational Hub — Exam Result Service (Firestore)
// ============================================================================

import {
  collection, doc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ExamTermResult, FullReportCard } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDate(val: unknown): Date {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (val && typeof (val as Timestamp).toDate === 'function') return (val as Timestamp).toDate();
  return new Date(val as string);
}

export function calcGrade(percentage: number): string {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  return 'F';
}

// ── ExamTermResult CRUD ───────────────────────────────────────────────────────

export async function getExamResultsByStudent(studentId: string): Promise<ExamTermResult[]> {
  const q = query(
    collection(db, 'examResults'),
    where('studentId', '==', studentId),
  );
  const snap = await getDocs(q);
  const results = snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: toDate(d.data().createdAt),
    updatedAt: toDate(d.data().updatedAt),
  })) as ExamTermResult[];
  return results.sort((a, b) => {
    const valA = a.examDateFrom ? new Date(a.examDateFrom).getTime() : 0;
    const valB = b.examDateFrom ? new Date(b.examDateFrom).getTime() : 0;
    return valA - valB; // asc
  });
}

export async function getExamResultsByClass(
  classId: string,
  term?: string,
): Promise<ExamTermResult[]> {
  const constraints = [where('classId', '==', classId)] as Parameters<typeof query>[1][];
  if (term) constraints.push(where('term', '==', term));
  const q = query(collection(db, 'examResults'), ...constraints);
  const snap = await getDocs(q);
  const results = snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: toDate(d.data().createdAt),
    updatedAt: toDate(d.data().updatedAt),
  })) as ExamTermResult[];
  return results.sort((a, b) => {
    const valA = a.examDateFrom ? new Date(a.examDateFrom).getTime() : 0;
    const valB = b.examDateFrom ? new Date(b.examDateFrom).getTime() : 0;
    return valB - valA; // desc
  });
}

export async function saveExamTermResult(
  data: Omit<ExamTermResult, 'id' | 'createdAt' | 'updatedAt'>,
  creatorId: string,
): Promise<ExamTermResult> {
  // Check if a result already exists for this student + term + year
  const q = query(
    collection(db, 'examResults'),
    where('studentId', '==', data.studentId),
    where('term', '==', data.term),
    where('academicYear', '==', data.academicYear),
  );
  const existing = await getDocs(q);

  if (!existing.empty) {
    // Update existing
    const docRef = existing.docs[0];
    await updateDoc(doc(db, 'examResults', docRef.id), {
      ...data,
      updatedAt: serverTimestamp(),
    });
    return { id: docRef.id, ...data, createdAt: toDate(docRef.data().createdAt), updatedAt: new Date() };
  }

  // Create new
  const newId = 'exam-' + Math.random().toString(36).substring(2, 9);
  const now = new Date();
  const result: ExamTermResult = {
    ...data,
    id: newId,
    createdAt: now,
    updatedAt: now,
    createdBy: creatorId,
  };

  await setDoc(doc(db, 'examResults', newId), {
    ...result,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return result;
}

export async function deleteExamResult(id: string): Promise<void> {
  await deleteDoc(doc(db, 'examResults', id));
}

// ── Full Report Card ─────────────────────────────────────────────────────────

export async function getFullReportCard(reportCardId: string): Promise<FullReportCard | null> {
  const q = query(collection(db, 'reportCards'), where('id', '==', reportCardId));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return {
    id: d.id,
    ...d.data(),
    createdAt: toDate(d.data().createdAt),
    updatedAt: toDate(d.data().updatedAt),
  } as FullReportCard;
}

export async function getFullReportCardByStudent(
  studentId: string,
  academicYear: string,
): Promise<FullReportCard | null> {
  const q = query(
    collection(db, 'reportCards'),
    where('studentId', '==', studentId),
    where('academicYear', '==', academicYear),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return {
    id: d.id,
    ...d.data(),
    createdAt: toDate(d.data().createdAt),
    updatedAt: toDate(d.data().updatedAt),
  } as FullReportCard;
}

export async function saveFullReportCard(
  data: Omit<FullReportCard, 'id' | 'createdAt' | 'updatedAt'>,
  creatorId: string,
): Promise<FullReportCard> {
  const q = query(
    collection(db, 'reportCards'),
    where('studentId', '==', data.studentId),
    where('academicYear', '==', data.academicYear),
  );
  const existing = await getDocs(q);

  if (!existing.empty) {
    const docRef = existing.docs[0];
    await updateDoc(doc(db, 'reportCards', docRef.id), {
      ...data,
      updatedAt: serverTimestamp(),
    });
    return {
      id: docRef.id,
      ...data,
      createdAt: toDate(docRef.data().createdAt),
      updatedAt: new Date(),
      createdBy: creatorId,
    };
  }

  const newId = 'rc-' + Math.random().toString(36).substring(2, 9);
  const now = new Date();
  const card: FullReportCard = {
    ...data,
    id: newId,
    createdAt: now,
    updatedAt: now,
    createdBy: creatorId,
  };

  await setDoc(doc(db, 'reportCards', newId), {
    ...card,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return card;
}
