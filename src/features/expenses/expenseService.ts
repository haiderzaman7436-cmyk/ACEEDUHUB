// ============================================================================
// ACE Educational Hub — Expense Service (Firestore)
// Fixed: removed orderBy to avoid missing index error on empty collection
// ============================================================================

import {
  collection, doc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Expense } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDate(val: unknown): Date {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (val && typeof (val as Timestamp).toDate === 'function') return (val as Timestamp).toDate();
  return new Date(val as string);
}

function getMonthLabel(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function getExpenses(): Promise<Expense[]> {
  // Simple collection fetch — no orderBy to avoid missing Firestore index
  const snap = await getDocs(collection(db, 'expenses'));
  const items = snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: toDate(d.data().createdAt),
    updatedAt: toDate(d.data().updatedAt),
  })) as Expense[];
  // Sort client-side by date descending
  return items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

export async function getExpensesByMonth(monthLabel: string): Promise<Expense[]> {
  const q = query(
    collection(db, 'expenses'),
    where('month', '==', monthLabel),
  );
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: toDate(d.data().createdAt),
    updatedAt: toDate(d.data().updatedAt),
  })) as Expense[];
  return items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

export async function addExpense(
  data: Omit<Expense, 'id' | 'month' | 'createdAt' | 'updatedAt'>,
  creatorId: string,
): Promise<Expense> {
  const newId = 'exp-' + Math.random().toString(36).substring(2, 9);
  const now = new Date();
  const expense: Expense = {
    ...data,
    id: newId,
    month: getMonthLabel(data.date),
    createdAt: now,
    updatedAt: now,
    createdBy: creatorId,
  };

  await setDoc(doc(db, 'expenses', newId), {
    ...expense,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return expense;
}

export async function updateExpense(
  id: string,
  data: Partial<Expense>,
): Promise<void> {
  await updateDoc(doc(db, 'expenses', id), {
    ...data,
    ...(data.date ? { month: getMonthLabel(data.date) } : {}),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteExpense(id: string): Promise<void> {
  await deleteDoc(doc(db, 'expenses', id));
}

// ── Summary helpers ───────────────────────────────────────────────────────────

export interface ExpenseSummary {
  totalThisMonth: number;
  totalThisYear: number;
  byCategory: { category: string; total: number }[];
}

export async function getExpenseSummary(): Promise<ExpenseSummary> {
  const all = await getExpenses();
  const now = new Date();
  const thisMonth = getMonthLabel();
  const thisYear = now.getFullYear();

  const totalThisMonth = all
    .filter((e) => e.month === thisMonth)
    .reduce((s, e) => s + (e.amount || 0), 0);

  const totalThisYear = all
    .filter((e) => {
      try { return new Date(e.date).getFullYear() === thisYear; } catch { return false; }
    })
    .reduce((s, e) => s + (e.amount || 0), 0);

  // Group by category
  const catMap: Record<string, number> = {};
  all.forEach((e) => {
    catMap[e.category] = (catMap[e.category] || 0) + (e.amount || 0);
  });
  const byCategory = Object.entries(catMap)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  return { totalThisMonth, totalThisYear, byCategory };
}
