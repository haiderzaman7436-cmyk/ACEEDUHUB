// ============================================================================
// ACE Educational Hub — Academy Students Page
// Separate module for Academy category students with Fee Analysis
// ============================================================================

import { useEffect, useState, useMemo } from 'react';
import {
  Plus, Edit2, Trash2, Loader2,
  Building2, BookOpen, X, Receipt, Target, AlertCircle, Banknote, CalendarDays, ChevronDown,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable, type Column } from '@/components/common/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { StudentForm } from '@/features/students/StudentForm';
import { getStatusColor, formatDate, formatCurrency } from '@/lib/utils';
import { getStudents, deleteStudent, addStudent, updateStudent } from '@/features/students/studentService';
import { getInvoices } from '@/features/fees/feeService';
import type { StudentFormInput } from '@/features/students/studentValidation';
import type { Student, Invoice } from '@/types';
import { useAuth } from '@/features/auth/AuthContext';
import { toast } from 'sonner';

function getCurrentMonthLabel(): string {
  return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Generate years from 2020 to 2050
const YEARS = Array.from({ length: 31 }, (_, i) => 2020 + i);

export default function AcademyStudentsPage() {
  const { user, hasRole } = useAuth();
  
  // Data States
  const [students, setStudents] = useState<Student[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('Enroll Academy Student');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Delete Dialog
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Analysis Filter State
  const currentMonthLabel = useMemo(() => getCurrentMonthLabel(), []);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthLabel);

  // Split selectedMonth for UI
  const [monthPart, yearPart] = selectedMonth ? selectedMonth.split(' ') : getCurrentMonthLabel().split(' ');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allStudents, allInvoices] = await Promise.all([
        getStudents(),
        getInvoices(),
      ]);
      setStudents(allStudents.filter((s) => s.category === 'academy'));
      setInvoices(allInvoices.filter((inv) => inv.category === 'academy'));
    } catch (err) {
      toast.error('Failed to load academy data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEnrollClick = () => {
    setSelectedStudent(null);
    setFormTitle('Enroll New Academy Student');
    setIsFormOpen(true);
  };

  const handleEditClick = (student: Student) => {
    setSelectedStudent(student);
    setFormTitle(`Modify Profile: ${student.firstName} ${student.lastName}`);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setSelectedStudentId(id);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedStudentId || !user) return;
    setIsDeleting(true);
    try {
      await deleteStudent(selectedStudentId, user.uid || 'admin');
      toast.success('Student record deleted successfully.');
      loadData();
    } catch {
      toast.error('Failed to delete student record.');
    } finally {
      setIsDeleting(false);
      setIsDeleteOpen(false);
      setSelectedStudentId(null);
    }
  };

  const handleFormSubmit = async (data: StudentFormInput) => {
    if (!user) return;
    try {
      if (selectedStudent) {
        await updateStudent(selectedStudent.id, { ...data, category: 'academy' } as Partial<Student>, user.uid || 'admin');
        toast.success('Academy student profile updated.');
      } else {
        await addStudent({ ...data, category: 'academy' } as any, user.uid || 'admin');
        toast.success('Academy student enrolled successfully.');
      }
      setIsFormOpen(false);
      loadData();
    } catch {
      toast.error('Operation failed. Please try again.');
    }
  };

  // --- Students Stats ---
  const activeCount = students.filter((s) => s.status === 'active').length;
  const inactiveCount = students.filter((s) => s.status !== 'active').length;

  // --- Financial Analysis ---
  const monthInvoices = invoices.filter((inv) => {
    let mStr = (inv.month || '').toLowerCase();
    if (!mStr && inv.createdAt) {
      mStr = new Date(inv.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toLowerCase();
    }
    return mStr.includes(monthPart.toLowerCase()) && mStr.includes(yearPart.toString());
  });
  const totalBilled = monthInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  const totalCollected = monthInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
  const totalDue = totalBilled - totalCollected;
  const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

  const paidCount = monthInvoices.filter((inv) => inv.status === 'paid').length;
  const overdueCount = monthInvoices.filter((inv) => inv.status === 'overdue').length;
  const pendingCount = monthInvoices.filter((inv) => inv.status !== 'paid' && inv.status !== 'overdue' && inv.status !== 'cancelled').length;

  const studentColumns: Column<Student>[] = [
    {
      key: 'firstName',
      header: 'Student',
      sortable: true,
      cell: (item) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700 font-bold text-sm">
            {item.firstName.charAt(0)}
          </div>
          <div>
            <div className="font-semibold text-slate-800 text-sm">
              {item.firstName} {item.lastName}
            </div>
            <div className="text-[11px] text-slate-400">
              {item.admissionNumber}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'className',
      header: 'Class / Section',
      sortable: true,
      cell: (item) => (
        <div>
          <div className="text-sm font-semibold text-slate-700">{item.className}</div>
          <div className="text-[11px] text-slate-400">Section {item.section}</div>
        </div>
      ),
    },
    {
      key: 'gender',
      header: 'Gender',
      cell: (item) => (
        <Badge className={`text-xs font-semibold ${item.gender === 'male' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'}`}>
          {item.gender === 'male' ? '♂ Male' : '♀ Female'}
        </Badge>
      ),
    },
    {
      key: 'admissionDate',
      header: 'Joined',
      cell: (item) => (
        <span className="text-xs text-slate-600">{formatDate(item.admissionDate)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (item) => (
        <Badge className={`text-xs font-semibold ${getStatusColor(item.status)}`}>
          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (item) => (
        <div className="flex items-center gap-1.5 justify-end">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"
            onClick={() => handleEditClick(item)}
            title="Edit Student"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
            onClick={() => handleDeleteClick(item.id)}
            title="Delete Student"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const transactionColumns: Column<Invoice>[] = [
    {
      key: 'invoiceNumber',
      header: 'Invoice No',
      cell: (item) => <span className="font-semibold text-blue-600 text-sm">{item.invoiceNumber}</span>,
    },
    {
      key: 'studentName',
      header: 'Student',
      cell: (item) => (
        <div>
          <div className="font-semibold text-slate-800 text-sm">{item.studentName}</div>
          <div className="text-[11px] text-slate-400">{item.className} — Sec {item.section}</div>
        </div>
      ),
    },
    {
      key: 'grandTotal',
      header: 'Billed',
      cell: (item) => <span className="font-semibold">{formatCurrency(item.grandTotal)}</span>,
    },
    {
      key: 'paidAmount',
      header: 'Collected',
      cell: (item) => <span className="text-emerald-600 font-semibold">{formatCurrency(item.paidAmount || 0)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (item) => {
        if (item.status === 'paid') return <Badge className="bg-emerald-100 text-emerald-700">Paid</Badge>;
        if (item.status === 'overdue') return <Badge className="bg-red-100 text-red-700">Overdue</Badge>;
        return <Badge className="bg-amber-100 text-amber-700">Pending</Badge>;
      },
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Academy Student"
        description="This will permanently remove the student record. This action cannot be undone."
        confirmLabel="Delete"
        isDestructive
        isLoading={isDeleting}
      />

      <StudentForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={selectedStudent ? {
          firstName: selectedStudent.firstName,
          lastName: selectedStudent.lastName,
          dateOfBirth: selectedStudent.dateOfBirth,
          gender: selectedStudent.gender,
          admissionNumber: selectedStudent.admissionNumber,
          admissionDate: selectedStudent.admissionDate,
          classId: selectedStudent.classId,
          className: selectedStudent.className,
          section: selectedStudent.section,
          address: selectedStudent.address,
          status: selectedStudent.status,
          guardians: selectedStudent.guardians,
          documents: selectedStudent.documents,
          feeEntries: selectedStudent.feeEntries || [],
          category: 'academy',
        } as any : null}
        title={formTitle}
      />

      <PageHeader
        title="Academy Dashboard"
        description="Manage academy students and track monthly financial analysis."
        action={{
          label: 'Enroll Student',
          onClick: handleEnrollClick,
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      <Tabs defaultValue="students" className="space-y-6">
        <TabsList className="bg-slate-100/50 p-1 border border-slate-200/60 rounded-xl">
          <TabsTrigger value="students" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-violet-700 data-[state=active]:shadow-sm px-4 py-2">
            Academy Roster
          </TabsTrigger>
          {hasRole(['admin', 'manager']) && (
            <TabsTrigger value="analysis" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-violet-700 data-[state=active]:shadow-sm px-4 py-2">
              Fees & Analysis
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="students" className="space-y-6 focus:outline-none">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="border border-slate-200 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                  <BookOpen className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Total Academy Students</div>
                  <div className="text-lg font-bold text-slate-800">{students.length}</div>
                </div>
              </div>
            </Card>
            <Card className="border border-slate-200 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Active Students</div>
                  <div className="text-lg font-bold text-emerald-700">{activeCount}</div>
                </div>
              </div>
            </Card>
            <Card className="border border-slate-200 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                  <X className="h-5 w-5 text-slate-500" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Inactive</div>
                  <div className="text-lg font-bold text-slate-600">{inactiveCount}</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Table */}
          <Card className="border border-slate-200 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                  <span className="text-sm text-slate-500">Loading academy students...</span>
                </div>
              </div>
            ) : students.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
                <div className="h-16 w-16 rounded-2xl bg-violet-50 flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-violet-400" />
                </div>
                <div>
                  <p className="font-semibold text-slate-700">No Academy Students</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Enroll academy students by clicking "Enroll Student" above.
                  </p>
                </div>
                <Button onClick={handleEnrollClick} className="mt-2 bg-violet-600 hover:bg-violet-700 text-white gap-2">
                  <Plus className="h-4 w-4" /> Enroll First Academy Student
                </Button>
              </div>
            ) : (
              <DataTable
                data={students}
                columns={studentColumns}
                searchField="firstName"
                searchPlaceholder="Search academy students..."
              />
            )}
          </Card>
        </TabsContent>

        {hasRole(['admin', 'manager']) && (
        <TabsContent value="analysis" className="space-y-6 focus:outline-none">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Financial Analysis</h3>
              <p className="text-sm text-slate-500">Track fee collections and due amounts for Academy students.</p>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <select
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500 appearance-none cursor-pointer pr-10"
                  value={monthPart}
                  onChange={(e) => setSelectedMonth(`${e.target.value} ${yearPart}`)}
                >
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-violet-500 pointer-events-none" />
              </div>
              <div className="relative">
                <select
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500 appearance-none cursor-pointer pr-10"
                  value={yearPart}
                  onChange={(e) => setSelectedMonth(`${monthPart} ${e.target.value}`)}
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-violet-500 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Analysis Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border border-slate-200 p-5 shadow-sm bg-gradient-to-br from-white to-slate-50">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <Receipt className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold text-slate-600">Total Billed</h3>
              </div>
              <p className="text-2xl font-bold text-slate-800">{formatCurrency(totalBilled)}</p>
            </Card>

            <Card className="border border-slate-200 p-5 shadow-sm bg-gradient-to-br from-white to-emerald-50/30">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <Banknote className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold text-slate-600">Collected</h3>
              </div>
              <p className="text-2xl font-bold text-emerald-700">{formatCurrency(totalCollected)}</p>
            </Card>

            <Card className="border border-slate-200 p-5 shadow-sm bg-gradient-to-br from-white to-red-50/30">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-red-100 text-red-700 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold text-slate-600">Total Due</h3>
              </div>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalDue)}</p>
            </Card>

            <Card className="border border-slate-200 p-5 shadow-sm bg-gradient-to-br from-violet-600 to-violet-800 text-white">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 text-white rounded-lg">
                  <Target className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold text-violet-100">Collection Rate</h3>
              </div>
              <p className="text-2xl font-bold text-white">{collectionRate}%</p>
              <div className="mt-3 h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full transition-all duration-500" style={{ width: `${collectionRate}%` }} />
              </div>
            </Card>
          </div>

          {/* Breakdown & Recent Transactions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="border border-slate-200 shadow-sm p-6 lg:col-span-1">
              <h3 className="font-bold text-slate-800 mb-6">Status Breakdown</h3>
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-slate-600">Paid</span>
                    <span className="font-bold text-slate-800">{paidCount}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(paidCount / Math.max(1, monthInvoices.length)) * 100}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-slate-600">Pending</span>
                    <span className="font-bold text-slate-800">{pendingCount}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(pendingCount / Math.max(1, monthInvoices.length)) * 100}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-slate-600">Overdue</span>
                    <span className="font-bold text-slate-800">{overdueCount}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: `${(overdueCount / Math.max(1, monthInvoices.length)) * 100}%` }} />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="border border-slate-200 shadow-sm lg:col-span-2 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-slate-500" />
                <h3 className="font-bold text-slate-800 text-sm">Recent Academy Transactions</h3>
              </div>
              <div className="p-0">
                {monthInvoices.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-sm">
                    No transactions found for {selectedMonth}
                  </div>
                ) : (
                  <DataTable
                    data={monthInvoices}
                    columns={transactionColumns}
                    searchField="studentName"
                    searchPlaceholder="Search student name..."
                  />
                )}
              </div>
            </Card>
          </div>
        </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
