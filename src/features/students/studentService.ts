// ============================================================================
// ACE Educational Hub — Student Service (Firestore)
// ============================================================================

import {
  collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp, Timestamp, where, writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Student } from '@/types';
import { assignFeesForNewStudent, assignCustomFeesForStudent } from '@/features/fees/feeService';

function toDate(val: unknown): Date {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (val && typeof (val as Timestamp).toDate === 'function') return (val as Timestamp).toDate();
  return new Date(val as string);
}

// ── CRUD Methods ─────────────────────────────────────────────────────────────

export async function getStudents(): Promise<Student[]> {
  const q = query(collection(db, 'students'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: toDate(d.data().createdAt),
    updatedAt: toDate(d.data().updatedAt),
  })) as Student[];
}

export async function getStudentById(id: string): Promise<Student | null> {
  const snap = await getDoc(doc(db, 'students', id));
  if (!snap.exists()) return null;
  return {
    id: snap.id,
    ...snap.data(),
    createdAt: toDate(snap.data().createdAt),
    updatedAt: toDate(snap.data().updatedAt),
  } as Student;
}

export async function addStudent(
  studentData: Omit<Student, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>,
  creatorId: string,
): Promise<Student> {
  const newId = 'stud-' + Math.random().toString(36).substring(2, 9);
  const now = new Date();

  const newStudent: Student = {
    ...studentData,
    id: newId,
    createdAt: now,
    updatedAt: now,
    createdBy: creatorId,
  };

  await setDoc(doc(db, 'students', newId), {
    ...newStudent,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await logActivity(creatorId, 'Enrolled new student', `${newStudent.firstName} ${newStudent.lastName} admitted to ${newStudent.className}`);

  // Auto-assign monthly fees from fee templates (if any templates are configured)
  try {
    await assignFeesForNewStudent(newStudent);
  } catch (err) {
    console.warn('Auto fee assignment failed (no template configured?):', err);
  }

  // Owner-defined custom fees entered directly on the student form
  try {
    await assignCustomFeesForStudent(newStudent);
  } catch (err) {
    console.warn('Custom fee assignment failed:', err);
  }

  return newStudent;
}

export async function updateStudent(
  id: string,
  studentData: Partial<Student>,
  updaterId: string,
): Promise<Student> {
  await updateDoc(doc(db, 'students', id), {
    ...studentData,
    updatedAt: serverTimestamp(),
  });

  await logActivity(updaterId, 'Updated student record', `Student profile ${id} was modified.`);

  const updated = await getStudentById(id);
  const finalStudent = updated || { ...studentData, id, updatedAt: new Date() } as Student;

  return finalStudent;
}

export async function deleteStudent(id: string, deleterId: string): Promise<void> {
  await deleteDoc(doc(db, 'students', id));
  await logActivity(deleterId, 'Deleted student record', `Student profile ${id} was removed.`);
}

// ── Class Promotion ────────────────────────────────────────────────────────

export async function promoteStudents(
  fromClassName: string,
  toClassName: string,
  toSection: string,
  promoterId: string,
  promoterName: string,
  academicYear: string,
  notes?: string,
): Promise<{ promotedCount: number }> {
  // Fetch all active students in the source class
  const q = query(
    collection(db, 'students'),
    where('className', '==', fromClassName),
    where('status', '==', 'active'),
  );
  const snap = await getDocs(q);
  const students = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Student[];

  if (students.length === 0) return { promotedCount: 0 };

  // Batch update all students
  const batch = writeBatch(db);
  const studentIds: string[] = [];

  students.forEach((s) => {
    const ref = doc(db, 'students', s.id);
    batch.update(ref, {
      className: toClassName,
      section: toSection,
      updatedAt: serverTimestamp(),
    });
    studentIds.push(s.id);
  });

  // Save promotion log
  const logId = 'promo-' + Math.random().toString(36).substring(2, 9);
  const logRef = doc(db, 'promotionLogs', logId);
  batch.set(logRef, {
    id: logId,
    fromClass: fromClassName,
    toClass: toClassName,
    fromSection: students[0]?.section || '',
    toSection,
    studentIds,
    studentCount: students.length,
    promotedBy: promoterId,
    promotedByName: promoterName,
    academicYear,
    notes: notes || '',
    promotedAt: serverTimestamp(),
  });

  await batch.commit();

  // Activity log
  await logActivity(
    promoterId,
    'Class Promotion',
    `Promoted ${students.length} students from ${fromClassName} to ${toClassName} for ${academicYear}`,
  );

  return { promotedCount: students.length };
}

// ── Activity Log Helper ───────────────────────────────────────────────────────

async function logActivity(userId: string, action: string, details: string) {
  const logId = 'log-' + Math.random().toString(36).substring(2, 9);
  const log = {
    id: logId,
    userId,
    userName: 'System',
    action,
    module: 'Students',
    details,
    timestamp: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'activityLogs', logId), log);
  } catch {
    // non-critical
  }
}
