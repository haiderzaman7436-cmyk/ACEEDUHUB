// ============================================================================
// ACE Educational Hub — Application Constants
// ============================================================================

import type { UserRole } from '@/types';

// ── Application Info ────────────────────────────────────────────────────────

export const APP_NAME = 'ACE Educational Hub';
export const APP_SHORT_NAME = 'ACE EDU';
export const APP_VERSION = '1.0.0';
export const APP_DESCRIPTION = 'A modern school management system for educational institutions';

// ── Role Definitions ────────────────────────────────────────────────────────

export const ROLES = {
  ADMIN: 'admin' as UserRole,
  MANAGER: 'manager' as UserRole,
  DATA_OPERATOR: 'data_operator' as UserRole,
} as const;

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  manager: 'Manager',
  data_operator: 'Data Operator',
};

// ── Navigation Configuration ────────────────────────────────────────────────

export interface NavItem {
  title: string;
  href: string;
  icon: string;
  roles: UserRole[];
  badge?: string;
  children?: NavItem[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: 'LayoutDashboard',
    roles: ['admin', 'manager', 'data_operator'],
  },
  {
    title: 'School Students',
    href: '/students',
    icon: 'GraduationCap',
    roles: ['admin', 'manager', 'data_operator'],
  },
  {
    title: 'Academy Students',
    href: '/academy-students',
    icon: 'Building2',
    roles: ['admin', 'manager', 'data_operator'],
  },
  {
    title: 'Teachers',
    href: '/teachers',
    icon: 'Users',
    roles: ['admin', 'manager', 'data_operator'],
  },

  {
    title: 'Fees',
    href: '/fees',
    icon: 'DollarSign',
    roles: ['admin', 'manager', 'data_operator'],
  },
  {
    title: 'Invoices',
    href: '/invoices',
    icon: 'Receipt',
    roles: ['admin', 'manager', 'data_operator'],
  },
  {
    title: 'Inventory',
    href: '/inventory',
    icon: 'Package',
    roles: ['admin', 'manager', 'data_operator'],
    children: [
      { title: 'Overview', href: '/inventory', icon: 'BarChart3', roles: ['admin', 'manager'] },
      { title: 'Stationery', href: '/inventory/stationery', icon: 'Pencil', roles: ['admin', 'manager', 'data_operator'] },
      { title: 'Uniforms', href: '/inventory/uniforms', icon: 'Shirt', roles: ['admin', 'manager', 'data_operator'] },
      { title: 'Books', href: '/inventory/books', icon: 'BookCopy', roles: ['admin', 'manager', 'data_operator'] },
    ],
  },
  {
    title: 'Registrations',
    href: '/registrations',
    icon: 'UserPlus',
    roles: ['admin', 'manager', 'data_operator'],
  },
  {
    title: 'Exams',
    href: '/exams',
    icon: 'ClipboardCheck',
    roles: ['admin', 'manager', 'data_operator'],
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: 'BarChart3',
    roles: ['admin', 'manager'],
  },
  {
    title: 'Finance & Ledger',
    href: '/finance',
    icon: 'Building2',
    roles: ['admin', 'manager'],
  },
  {
    title: 'Expenses',
    href: '/expenses',
    icon: 'TrendingDown',
    roles: ['admin', 'manager', 'data_operator'],
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: 'Settings',
    roles: ['admin'],
    children: [
      { title: 'School Profile', href: '/settings/profile', icon: 'Building2', roles: ['admin'] },
      { title: 'User Management', href: '/settings/users', icon: 'UserCog', roles: ['admin'] },
      { title: 'Academic Year', href: '/settings/academic-year', icon: 'Calendar', roles: ['admin'] },
      { title: 'Activity Logs', href: '/settings/activity-logs', icon: 'ScrollText', roles: ['admin'] },
    ],
  },
];

// ── Status Options ──────────────────────────────────────────────────────────

export const STUDENT_STATUS_OPTIONS = [
  { value: 'active', label: 'Active', color: 'bg-emerald-500' },
  { value: 'inactive', label: 'Inactive', color: 'bg-gray-500' },
  { value: 'graduated', label: 'Graduated', color: 'bg-blue-500' },
  { value: 'transferred', label: 'Transferred', color: 'bg-amber-500' },
  { value: 'suspended', label: 'Suspended', color: 'bg-red-500' },
] as const;

export const TEACHER_STATUS_OPTIONS = [
  { value: 'active', label: 'Active', color: 'bg-emerald-500' },
  { value: 'inactive', label: 'Inactive', color: 'bg-gray-500' },
  { value: 'on_leave', label: 'On Leave', color: 'bg-amber-500' },
  { value: 'terminated', label: 'Terminated', color: 'bg-red-500' },
] as const;

export const FEE_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'bg-amber-500' },
  { value: 'paid', label: 'Paid', color: 'bg-emerald-500' },
  { value: 'partial', label: 'Partial', color: 'bg-blue-500' },
  { value: 'overdue', label: 'Overdue', color: 'bg-red-500' },
] as const;

export const INVOICE_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-500' },
  { value: 'sent', label: 'Sent', color: 'bg-blue-500' },
  { value: 'paid', label: 'Paid', color: 'bg-emerald-500' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500' },
  { value: 'overdue', label: 'Overdue', color: 'bg-amber-500' },
] as const;

export const REGISTRATION_STATUS_OPTIONS = [
  { value: 'applied', label: 'Applied', color: 'bg-blue-500' },
  { value: 'under_review', label: 'Under Review', color: 'bg-amber-500' },
  { value: 'approved', label: 'Approved', color: 'bg-emerald-500' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-500' },
  { value: 'admitted', label: 'Admitted', color: 'bg-violet-500' },
] as const;


// ── Common Options ──────────────────────────────────────────────────────────

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
] as const;

export const BLOOD_GROUP_OPTIONS = [
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-',
] as const;

export const FEE_TYPE_OPTIONS = [
  { value: 'tuition', label: 'Tuition Fee' },
  { value: 'admission', label: 'Admission Fee' },
  { value: 'exam', label: 'Exam Fee' },
  { value: 'transport', label: 'Transport Fee' },
  { value: 'lab', label: 'Lab Fee' },
  { value: 'library', label: 'Library Fee' },
  { value: 'sports', label: 'Sports Fee' },
  { value: 'other', label: 'Other' },
] as const;

export const PAYMENT_METHOD_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'online', label: 'Online Payment' },
  { value: 'other', label: 'Other' },
] as const;


export const DOCUMENT_TYPE_OPTIONS = [
  { value: 'birth_certificate', label: 'Birth Certificate' },
  { value: 'transfer_certificate', label: 'Transfer Certificate' },
  { value: 'report_card', label: 'Report Card' },
  { value: 'medical', label: 'Medical Record' },
  { value: 'photo', label: 'Photograph' },
  { value: 'other', label: 'Other' },
] as const;

export const GUARDIAN_RELATION_OPTIONS = [
  { value: 'father', label: 'Father' },
  { value: 'mother', label: 'Mother' },
  { value: 'guardian', label: 'Guardian' },
  { value: 'other', label: 'Other' },
] as const;

// ── Pagination ──────────────────────────────────────────────────────────────

export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// ── Date Formats ────────────────────────────────────────────────────────────

export const DATE_FORMAT = 'MMM dd, yyyy';
export const DATE_TIME_FORMAT = 'MMM dd, yyyy hh:mm a';
export const INPUT_DATE_FORMAT = 'yyyy-MM-dd';
