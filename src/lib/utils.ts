// ============================================================================
// ACE Educational Hub — Utility Functions
// ============================================================================

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO, isValid } from 'date-fns';
import { DATE_FORMAT, DATE_TIME_FORMAT } from './constants';

// ── Shadcn UI cn() helper ───────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Date Formatting ─────────────────────────────────────────────────────────

export function formatDate(date: Date | string | undefined | null): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isValid(d) ? format(d, DATE_FORMAT) : '—';
}

export function formatDateTime(date: Date | string | undefined | null): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isValid(d) ? format(d, DATE_TIME_FORMAT) : '—';
}

// ── Currency Formatting ─────────────────────────────────────────────────────

export function formatCurrency(amount: number, currency = 'PKR'): string {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ── Number Formatting ───────────────────────────────────────────────────────

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

// ── String Helpers ──────────────────────────────────────────────────────────

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

// ── ID Generation ───────────────────────────────────────────────────────────

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function generateInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${year}${month}-${random}`;
}

export function generateReceiptNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `RCP-${year}${month}-${random}`;
}

// ── Grade Calculation ───────────────────────────────────────────────────────

export function calculateGrade(percentage: number): string {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  return 'F';
}

// ── Color Helpers ───────────────────────────────────────────────────────────

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    inactive: 'bg-gray-500/15 text-gray-700 dark:text-gray-400',
    graduated: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
    transferred: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    suspended: 'bg-red-500/15 text-red-700 dark:text-red-400',
    on_leave: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    terminated: 'bg-red-500/15 text-red-700 dark:text-red-400',
    pending: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    paid: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    partial: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
    overdue: 'bg-red-500/15 text-red-700 dark:text-red-400',
    draft: 'bg-gray-500/15 text-gray-700 dark:text-gray-400',
    sent: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
    cancelled: 'bg-red-500/15 text-red-700 dark:text-red-400',
    applied: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
    under_review: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    approved: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    rejected: 'bg-red-500/15 text-red-700 dark:text-red-400',
    admitted: 'bg-violet-500/15 text-violet-700 dark:text-violet-400',
    present: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    absent: 'bg-red-500/15 text-red-700 dark:text-red-400',
    late: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    excused: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  };
  return colors[status] || 'bg-gray-500/15 text-gray-700 dark:text-gray-400';
}

// ── File Helpers ────────────────────────────────────────────────────────────

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// ── Debounce ────────────────────────────────────────────────────────────────

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), wait);
  };
}
