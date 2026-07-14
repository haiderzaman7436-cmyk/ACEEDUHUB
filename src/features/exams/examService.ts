// ============================================================================
// ACE Educational Hub — Exam Service (Firestore)
// Digital marks entry, result compilation, and analytics
// ============================================================================

import {
  collection, doc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ExamTermResult, ExamSession } from '@/types';

function toDate(val: unknown): Date {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (val && typeof (val as Timestamp).toDate === 'function') return (val as Timestamp).toDate();
  return new Date(val as string);
}

// ── Grade computation ─────────────────────────────────────────────────────────

export function computeGrade(percentage: number): string {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  return 'F';
}

// ── Exam Sessions ─────────────────────────────────────────────────────────────

export async function createExamSession(
  data: Omit<ExamSession, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<ExamSession> {
  const newId = 'esess-' + Math.random().toString(36).substring(2, 9);
  const now = new Date();
  const session: ExamSession = { ...data, id: newId, createdAt: now, updatedAt: now };
  await setDoc(doc(db, 'examSessions', newId), {
    ...session,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return session;
}

export async function getExamSessions(classId?: string): Promise<ExamSession[]> {
  let q;
  if (classId) {
    q = query(collection(db, 'examSessions'), where('classId', '==', classId));
  } else {
    q = query(collection(db, 'examSessions'), orderBy('createdAt', 'desc'));
  }
  const snap = await getDocs(q);
  const results = snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      ...data,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    };
  }) as ExamSession[];

  if (classId) {
    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  return results;
}

export async function updateExamSessionStatus(id: string, status: ExamSession['status']): Promise<void> {
  await updateDoc(doc(db, 'examSessions', id), { status, updatedAt: serverTimestamp() });
}

// ── Exam Results ──────────────────────────────────────────────────────────────

export async function saveExamResult(
  result: Omit<ExamTermResult, 'id' | 'createdAt' | 'updatedAt'>,
  creatorId: string,
): Promise<ExamTermResult> {
  // Check if result already exists for this student+term+academicYear
  const existingQ = query(
    collection(db, 'examResults'),
    where('studentId', '==', result.studentId),
    where('term', '==', result.term),
    where('academicYear', '==', result.academicYear),
    where('classId', '==', result.classId),
  );
  const existingSnap = await getDocs(existingQ);

  const newId = existingSnap.empty
    ? 'res-' + Math.random().toString(36).substring(2, 9)
    : existingSnap.docs[0].id;

  const now = new Date();
  const fullResult: ExamTermResult = {
    ...result,
    id: newId,
    createdBy: creatorId,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, 'examResults', newId), {
    ...fullResult,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return fullResult;
}

export async function bulkSaveExamResults(
  results: Omit<ExamTermResult, 'id' | 'createdAt' | 'updatedAt'>[],
  creatorId: string,
): Promise<{ saved: number }> {
  let saved = 0;
  // Save in batches
  for (const result of results) {
    await saveExamResult(result, creatorId);
    saved++;
  }
  return { saved };
}

export async function getExamResults(
  classId: string,
  term: string,
  academicYear: string,
): Promise<ExamTermResult[]> {
  const q = query(
    collection(db, 'examResults'),
    where('classId', '==', classId),
    where('term', '==', term),
    where('academicYear', '==', academicYear),
  );
  const snap = await getDocs(q);
  const results = snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      ...data,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    };
  }) as ExamTermResult[];

  // Sort by percentage descending (rank order)
  return results.sort((a, b) => b.percentage - a.percentage);
}

export async function getStudentResults(studentId: string): Promise<ExamTermResult[]> {
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
  return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function deleteExamResult(id: string): Promise<void> {
  await deleteDoc(doc(db, 'examResults', id));
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export function computeClassAnalytics(results: ExamTermResult[]): {
  classAverage: number;
  passRate: number;
  topScorer: ExamTermResult | null;
  passCount: number;
  failCount: number;
} {
  if (results.length === 0) {
    return { classAverage: 0, passRate: 0, topScorer: null, passCount: 0, failCount: 0 };
  }
  const passCount = results.filter((r) => r.status === 'pass').length;
  const failCount = results.length - passCount;
  const classAverage = Math.round(
    results.reduce((s, r) => s + r.percentage, 0) / results.length,
  );
  const passRate = Math.round((passCount / results.length) * 100);
  const topScorer = results.reduce((best, r) => (r.percentage > best.percentage ? r : best), results[0]);
  return { classAverage, passRate, topScorer, passCount, failCount };
}
