// ============================================================================
// ACE Educational Hub — Inventory Service (Firestore)
// ============================================================================

import {
  collection, doc, getDocs, setDoc, updateDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { StationeryItem, UniformItem, BookItem } from '@/types';

// ── Stationery CRUD ──────────────────────────────────────────────────────────

export async function getStationery(): Promise<StationeryItem[]> {
  const snap = await getDocs(collection(db, 'stationery'));
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: d.data().createdAt?.toDate() || new Date(),
    updatedAt: d.data().updatedAt?.toDate() || new Date(),
    lastRestocked: d.data().lastRestocked?.toDate(),
  })) as StationeryItem[];
}

export async function addStationery(
  data: Omit<StationeryItem, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<StationeryItem> {
  const newId = 'stat-' + Math.random().toString(36).substring(2, 9);
  const now = new Date();
  const item: StationeryItem = { ...data, id: newId, createdAt: now, updatedAt: now };
  await setDoc(doc(db, 'stationery', newId), {
    ...item,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return item;
}

export async function updateStationery(
  id: string,
  data: Partial<Omit<StationeryItem, 'id' | 'createdAt'>>,
): Promise<void> {
  await updateDoc(doc(db, 'stationery', id), {
    ...data,
    updatedAt: serverTimestamp(),
  } as Record<string, unknown>);
}

export async function deleteStationery(id: string): Promise<void> {
  await deleteDoc(doc(db, 'stationery', id));
}

// ── Uniforms CRUD ────────────────────────────────────────────────────────────

export async function getUniforms(): Promise<UniformItem[]> {
  const snap = await getDocs(collection(db, 'uniforms'));
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: d.data().createdAt?.toDate() || new Date(),
    updatedAt: d.data().updatedAt?.toDate() || new Date(),
  })) as UniformItem[];
}

export async function addUniform(
  data: Omit<UniformItem, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<UniformItem> {
  const newId = 'uni-' + Math.random().toString(36).substring(2, 9);
  const now = new Date();
  const item: UniformItem = { ...data, id: newId, createdAt: now, updatedAt: now };
  await setDoc(doc(db, 'uniforms', newId), {
    ...item,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return item;
}

export async function updateUniform(
  id: string,
  data: Partial<Omit<UniformItem, 'id' | 'createdAt'>>,
): Promise<void> {
  await updateDoc(doc(db, 'uniforms', id), {
    ...data,
    updatedAt: serverTimestamp(),
  } as Record<string, unknown>);
}

export async function deleteUniform(id: string): Promise<void> {
  await deleteDoc(doc(db, 'uniforms', id));
}

// ── Books CRUD ───────────────────────────────────────────────────────────────

export async function getBooks(): Promise<BookItem[]> {
  const snap = await getDocs(collection(db, 'books'));
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: d.data().createdAt?.toDate() || new Date(),
    updatedAt: d.data().updatedAt?.toDate() || new Date(),
  })) as BookItem[];
}

export async function addBook(
  data: Omit<BookItem, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<BookItem> {
  const newId = 'book-' + Math.random().toString(36).substring(2, 9);
  const now = new Date();
  const item: BookItem = { ...data, id: newId, createdAt: now, updatedAt: now };
  await setDoc(doc(db, 'books', newId), {
    ...item,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return item;
}

export async function updateBook(
  id: string,
  data: Partial<Omit<BookItem, 'id' | 'createdAt'>>,
): Promise<void> {
  await updateDoc(doc(db, 'books', id), {
    ...data,
    updatedAt: serverTimestamp(),
  } as Record<string, unknown>);
}

export async function deleteBook(id: string): Promise<void> {
  await deleteDoc(doc(db, 'books', id));
}
