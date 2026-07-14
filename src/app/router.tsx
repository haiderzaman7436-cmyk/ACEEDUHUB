import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { LoginPage } from '@/features/auth/LoginPage';
import { UnauthorizedPage } from '@/features/auth/UnauthorizedPage';

// Lazy load feature pages
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));
const StudentsPage = lazy(() => import('@/features/students/StudentsPage'));
const AcademyStudentsPage = lazy(() => import('@/features/academy/AcademyStudentsPage'));
const TeachersPage = lazy(() => import('@/features/teachers/TeachersPage'));

const FeesPage = lazy(() => import('@/features/fees/FeesPage'));
const InvoicesPage = lazy(() => import('@/features/invoices/InvoicesPage'));

const InventoryDashboardPage = lazy(() => import('@/features/inventory/InventoryDashboardPage'));
const StationeryPage = lazy(() => import('@/features/inventory/StationeryPage'));
const UniformsPage = lazy(() => import('@/features/inventory/UniformsPage'));
const BooksPage = lazy(() => import('@/features/inventory/BooksPage'));

const RegistrationsPage = lazy(() => import('@/features/registrations/RegistrationsPage'));
const ExamsPage = lazy(() => import('@/features/exams/ExamsPage'));
const ReportsPage = lazy(() => import('@/features/reports/ReportsPage'));
const FinancePage = lazy(() => import('@/features/finance/FinancePage'));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'));
const ExpensesPage = lazy(() => import('@/features/expenses/ExpensesPage'));

// Loader placeholder
const Loader = () => (
  <div className="flex h-[400px] w-full items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[hsl(var(--primary))] border-t-transparent" />
      <span className="text-xs text-[hsl(var(--muted-foreground))]">Loading module...</span>
    </div>
  </div>
);

export const router = createBrowserRouter([
  // Public Login Route
  {
    path: '/login',
    element: <LoginPage />,
  },
  
  // Unauthorized Route
  {
    path: '/unauthorized',
    element: <UnauthorizedPage />,
  },

  // Protected Admin/Manager App Routes
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: (
          <Suspense fallback={<Loader />}>
            <DashboardPage />
          </Suspense>
        ),
      },
      // School Students
      {
        path: 'students',
        element: (
          <Suspense fallback={<Loader />}>
            <StudentsPage />
          </Suspense>
        ),
      },
      // Academy Students — Separate module
      {
        path: 'academy-students',
        element: (
          <Suspense fallback={<Loader />}>
            <AcademyStudentsPage />
          </Suspense>
        ),
      },
      {
        path: 'teachers',
        element: (
          <Suspense fallback={<Loader />}>
            <TeachersPage />
          </Suspense>
        ),
      },

      // Fees
      {
        path: 'fees',
        element: (
          <Suspense fallback={<Loader />}>
            <FeesPage />
          </Suspense>
        ),
      },
      // Invoices
      {
        path: 'invoices',
        element: (
          <Suspense fallback={<Loader />}>
            <InvoicesPage />
          </Suspense>
        ),
      },

      // Inventory — Dashboard overview
      {
        path: 'inventory',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'manager']}>
            <Suspense fallback={<Loader />}>
              <InventoryDashboardPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      // Inventory sub-routes
      {
        path: 'inventory/stationery',
        element: (
          <Suspense fallback={<Loader />}>
            <StationeryPage />
          </Suspense>
        ),
      },
      {
        path: 'inventory/uniforms',
        element: (
          <Suspense fallback={<Loader />}>
            <UniformsPage />
          </Suspense>
        ),
      },
      {
        path: 'inventory/books',
        element: (
          <Suspense fallback={<Loader />}>
            <BooksPage />
          </Suspense>
        ),
      },

      // Registrations
      {
        path: 'registrations',
        element: (
          <Suspense fallback={<Loader />}>
            <RegistrationsPage />
          </Suspense>
        ),
      },

      // Exams — NEW
      {
        path: 'exams',
        element: (
          <Suspense fallback={<Loader />}>
            <ExamsPage />
          </Suspense>
        ),
      },

      {
        path: 'reports',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'manager']}>
            <Suspense fallback={<Loader />}>
              <ReportsPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'finance',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'manager']}>
            <Suspense fallback={<Loader />}>
              <FinancePage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'expenses',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'manager', 'data_operator']}>
            <Suspense fallback={<Loader />}>
              <ExpensesPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      // Admin-only Settings routes
      {
        path: 'settings/*',
        element: (
          <ProtectedRoute allowedRoles={['admin']}>
            <Suspense fallback={<Loader />}>
              <SettingsPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
    ],
  },
  
  // Wildcard redirect
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);
export default router;
