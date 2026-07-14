// ============================================================================
// ACE Educational Hub — Inventory Sale Service (Firestore)
// Tracks: items sold, monthly revenue, remaining stock
// ============================================================================

import {
  collection, doc, getDocs, setDoc, query, where,
  orderBy, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { InventorySale } from '@/types';

function toDate(val: unknown): Date {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (val && typeof (val as Timestamp).toDate === 'function') return (val as Timestamp).toDate();
  return new Date(val as string);
}

function getCurrentMonthLabel(): string {
  return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// ── Create Sale ───────────────────────────────────────────────────────────────

export async function addSale(
  data: Omit<InventorySale, 'id' | 'createdAt' | 'updatedAt'>,
  creatorId: string,
): Promise<InventorySale> {
  const newId = 'sale-' + Math.random().toString(36).substring(2, 9);
  const now = new Date();
  const sale: InventorySale = {
    ...data,
    id: newId,
    createdBy: creatorId,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, 'inventorySales', newId), {
    ...sale,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return sale;
}

// ── Read All Sales ─────────────────────────────────────────────────────────────

export async function getAllSales(): Promise<InventorySale[]> {
  const q = query(collection(db, 'inventorySales'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: toDate(d.data().createdAt),
    updatedAt: toDate(d.data().updatedAt),
  })) as InventorySale[];
}

// ── Sales by Month ─────────────────────────────────────────────────────────────

export async function getSalesByMonth(month: string): Promise<InventorySale[]> {
  const q = query(
    collection(db, 'inventorySales'),
    where('month', '==', month),
  );
  const snap = await getDocs(q);
  const results = snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: toDate(d.data().createdAt),
    updatedAt: toDate(d.data().updatedAt),
  })) as InventorySale[];
  return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// ── Sales by Item ─────────────────────────────────────────────────────────────

export async function getSalesByItem(itemId: string): Promise<InventorySale[]> {
  const q = query(
    collection(db, 'inventorySales'),
    where('itemId', '==', itemId),
  );
  const snap = await getDocs(q);
  const results = snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: toDate(d.data().createdAt),
    updatedAt: toDate(d.data().updatedAt),
  })) as InventorySale[];
  return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// ── Sales by Item Type ────────────────────────────────────────────────────────

export async function getSalesByType(
  itemType: 'stationery' | 'uniforms' | 'books',
): Promise<InventorySale[]> {
  const q = query(
    collection(db, 'inventorySales'),
    where('itemType', '==', itemType),
  );
  const snap = await getDocs(q);
  const results = snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: toDate(d.data().createdAt),
    updatedAt: toDate(d.data().updatedAt),
  })) as InventorySale[];
  return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// ── Aggregate: Total sold quantity per item ───────────────────────────────────

export async function getSoldQuantityMap(): Promise<Record<string, number>> {
  const snap = await getDocs(collection(db, 'inventorySales'));
  const map: Record<string, number> = {};
  snap.docs.forEach((d) => {
    const { itemId, quantity } = d.data();
    if (itemId) {
      map[itemId] = (map[itemId] || 0) + (quantity || 0);
    }
  });
  return map;
}

// ── Monthly Revenue (total sale value in a month) ─────────────────────────────

export async function getMonthlyRevenue(month?: string): Promise<number> {
  const targetMonth = month || getCurrentMonthLabel();
  const sales = await getSalesByMonth(targetMonth);
  return sales.reduce((sum, s) => sum + s.totalAmount, 0);
}

// ── Available Sale Months ─────────────────────────────────────────────────────

export async function getAvailableSaleMonths(): Promise<string[]> {
  const snap = await getDocs(collection(db, 'inventorySales'));
  const months = new Set<string>();
  snap.docs.forEach((d) => {
    const m = d.data().month;
    if (m) months.add(m);
  });
  return Array.from(months).sort((a, b) => {
    return new Date(b).getTime() - new Date(a).getTime();
  });
}
