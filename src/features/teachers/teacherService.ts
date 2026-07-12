// ============================================================================
// ACE Educational Hub — Teacher Service (Firestore)
// ============================================================================

import {
  collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Teacher } from '@/types';

// ── CRUD Methods ────────────────────────────────────────────────────────────

export async function getTeachers(): Promise<Teacher[]> {
  const querySnapshot = await getDocs(collection(db, 'teachers'));
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  })) as Teacher[];
}

export async function getTeacherById(id: string): Promise<Teacher | null> {
  const docRef = doc(db, 'teachers', id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return {
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt?.toDate() || new Date(),
    updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
  } as Teacher;
}

export async function addTeacher(
  teacherData: Omit<Teacher, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>,
  creatorId: string,
): Promise<Teacher> {
  const newId = 'teach-' + Math.random().toString(36).substring(2, 9);
  const now = new Date();

  const newTeacher: Teacher = {
    ...teacherData,
    id: newId,
    createdAt: now,
    updatedAt: now,
    createdBy: creatorId,
  };

  await setDoc(doc(db, 'teachers', newId), {
    ...newTeacher,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await logActivity(creatorId, 'Registered new staff', `Teacher ${newTeacher.firstName} ${newTeacher.lastName} registered.`);
  return newTeacher;
}

export async function updateTeacher(
  id: string,
  teacherData: Partial<Teacher>,
  updaterId: string,
): Promise<Teacher> {
  await updateDoc(doc(db, 'teachers', id), {
    ...teacherData,
    updatedAt: serverTimestamp(),
  });

  await logActivity(updaterId, 'Updated staff profile', `Staff record ID ${id} was modified.`);

  const updated = await getTeacherById(id);
  return updated!;
}

export async function deleteTeacher(id: string, deleterId: string): Promise<void> {
  await deleteDoc(doc(db, 'teachers', id));
  await logActivity(deleterId, 'Deleted staff record', `Staff record ID ${id} was removed.`);
}

// ── Activity Log Helper ──────────────────────────────────────────────────────

async function logActivity(userId: string, action: string, details: string) {
  const logId = 'log-' + Math.random().toString(36).substring(2, 9);
  const log = {
    id: logId,
    userId,
    userName: userId === 'admin' ? 'Haider Raza' : 'Manager User',
    action,
    module: 'Teachers',
    details,
    timestamp: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'activityLogs', logId), log);
  } catch {
    // Suppress warnings — activity log is non-critical
  }
}
