import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Mail, Phone, Banknote, History, X, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable, type Column } from '@/components/common/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { getStatusColor, formatCurrency } from '@/lib/utils';
import { getTeachers, deleteTeacher, addTeacher, updateTeacher } from './teacherService';
import { TeacherForm } from './TeacherForm';
import type { Teacher, SalaryPayment } from '@/types';
import { useAuth } from '@/features/auth/AuthContext';
import { toast } from 'sonner';
import { recordSalaryPayment, getSalaryPaymentsByTeacher } from './salaryService';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function TeachersPage() {
  const { user } = useAuth();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [statusFilter, setStatusFilter] = useState('');

  // Drawer / Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('Add Instructor');
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);

  // Dialog / Delete States
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Salary Payment Modal States
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [salaryTeacher, setSalaryTeacher] = useState<Teacher | null>(null);
  const [payMonth, setPayMonth] = useState(MONTHS[new Date().getMonth()]);
  const [payYear, setPayYear] = useState(new Date().getFullYear());
  const [payDeductions, setPayDeductions] = useState(0);
  const [payBonus, setPayBonus] = useState(0);
  const [payMethod, setPayMethod] = useState<'cash' | 'bank_transfer' | 'cheque' | 'online'>('cash');
  const [payNotes, setPayNotes] = useState('');
  const [isPayingSalary, setIsPayingSalary] = useState(false);

  // Salary History Modal States
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyTeacher, setHistoryTeacher] = useState<Teacher | null>(null);
  const [salaryHistory, setSalaryHistory] = useState<SalaryPayment[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const loadTeachers = () => {
    getTeachers()
      .then((data) => setTeachers(data));
  };

  useEffect(() => {
    loadTeachers();
  }, []);

  const handleAddClick = () => {
    setSelectedTeacher(null);
    setFormTitle('Add New Instructor');
    setIsFormOpen(true);
  };

  const handleEditClick = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setFormTitle(`Modify Profile: ${teacher.firstName} ${teacher.lastName}`);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: any) => {
    if (!user) return;
    try {
      if (selectedTeacher) {
        // Edit Mode
        await updateTeacher(selectedTeacher.id, data, user.uid || 'admin');
        toast.success('Instructor profile updated successfully.');
      } else {
        // Add Mode
        await addTeacher(data, user.uid || 'admin');
        toast.success('Instructor registered successfully.');
      }
      setIsFormOpen(false);
      loadTeachers();
    } catch (err) {
      toast.error('An error occurred while saving the instructor record.');
    }
  };

  const handleDeleteClick = (id: string) => {
    setSelectedTeacherId(id);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedTeacherId || !user) return;
    setIsDeleting(true);
    try {
      await deleteTeacher(selectedTeacherId, user.uid || 'admin');
      toast.success('Staff record deleted successfully.');
      loadTeachers();
    } catch (err) {
      toast.error('Failed to delete staff record.');
    } finally {
      setIsDeleting(false);
      setIsDeleteOpen(false);
      setSelectedTeacherId(null);
    }
  };

  // Salary actions
  const handlePaySalaryClick = (teacher: Teacher) => {
    setSalaryTeacher(teacher);
    setPayMonth(MONTHS[new Date().getMonth()]);
    setPayYear(new Date().getFullYear());
    setPayDeductions(0);
    setPayBonus(0);
    setPayMethod('cash');
    setPayNotes('');
    setIsSalaryModalOpen(true);
  };

  const handlePaySalarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salaryTeacher || !user) return;
    setIsPayingSalary(true);

    const basic = salaryTeacher.salary || 0;
    const net = basic - payDeductions + payBonus;

    try {
      await recordSalaryPayment({
        teacherId: salaryTeacher.id,
        teacherName: `${salaryTeacher.firstName} ${salaryTeacher.lastName}`,
        month: payMonth,
        year: payYear,
        monthLabel: `${payMonth} ${payYear}`,
        basicSalary: basic,
        deductions: payDeductions,
        bonus: payBonus,
        netSalary: net,
        paymentMethod: payMethod,
        notes: payNotes,
        status: 'paid'
      }, user.uid || 'admin', user.displayName || 'Authorized User');

      toast.success(`Salary of ${formatCurrency(net)} recorded for ${salaryTeacher.firstName}`);
      setIsSalaryModalOpen(false);
    } catch (err) {
      toast.error('Failed to record salary payment.');
    } finally {
      setIsPayingSalary(false);
    }
  };

  const handleViewHistoryClick = async (teacher: Teacher) => {
    setHistoryTeacher(teacher);
    setIsHistoryModalOpen(true);
    setIsLoadingHistory(true);
    try {
      const history = await getSalaryPaymentsByTeacher(teacher.id);
      setSalaryHistory(history);
    } catch {
      toast.error('Failed to load salary history.');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Filter Data by Status
  const filteredTeachers = teachers.filter((t) => {
    if (!statusFilter) return true;
    return t.status.toLowerCase() === statusFilter.toLowerCase();
  });

  // Define Columns
  const columns: Column<Teacher>[] = [
    {
      key: 'name',
      header: 'Instructor Name',
      sortable: true,
      cell: (item) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 font-semibold text-xs">
            {item.firstName[0]}{item.lastName[0]}
          </div>
          <div>
            <div className="text-sm font-semibold text-[hsl(var(--foreground))]">
              {item.firstName} {item.lastName}
            </div>
            <div className="text-xs text-[hsl(var(--muted-foreground))]">
              ID: {item.employeeId}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'qualification',
      header: 'Qualifications',
      sortable: true,
      cell: (item) => (
        <div>
          <div className="text-xs font-semibold text-[hsl(var(--foreground))]">{item.qualification}</div>
          {item.specialization && (
            <div className="text-[10px] text-[hsl(var(--muted-foreground))]">{item.specialization}</div>
          )}
        </div>
      ),
    },
    {
      key: 'contacts',
      header: 'Contact Details',
      cell: (item) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1 text-xs text-[hsl(var(--foreground))]">
            <Mail className="h-3.5 w-3.5 opacity-60 shrink-0" />
            <span className="truncate max-w-[120px]">{item.email}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-[hsl(var(--muted-foreground))]">
            <Phone className="h-3.5 w-3.5 opacity-60 shrink-0" />
            <span>{item.phone}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'assignedClasses',
      header: 'Class Assignments',
      cell: (item) => (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {item.assignedClasses && item.assignedClasses.length > 0 ? (
            item.assignedClasses.map((ac, idx) => (
              <Badge key={idx} variant="secondary" className="text-[9px] py-0 px-1.5 font-medium">
                {ac.className}-{ac.section} ({ac.subjectName})
              </Badge>
            ))
          ) : (
            <span className="text-xs text-[hsl(var(--muted-foreground))]">Unassigned</span>
          )}
        </div>
      ),
    },
    {
      key: 'salary',
      header: 'Basic Salary',
      sortable: true,
      cell: (item) => <span className="font-semibold">{formatCurrency(item.salary)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (item) => (
        <Badge variant="outline" className={getStatusColor(item.status)}>
          {item.status.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          {item.status === 'active' && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs px-2 rounded-xl shrink-0"
              title="Pay Salary"
              onClick={() => handlePaySalaryClick(item)}
            >
              <Banknote className="h-3.5 w-3.5" />
              Pay
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-[hsl(var(--muted-foreground))] hover:text-slate-700 hover:bg-slate-100 rounded-xl"
            title="Salary History"
            onClick={() => handleViewHistoryClick(item)}
          >
            <History className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-[hsl(var(--muted-foreground))] hover:text-blue-600 rounded-xl"
            title="Edit Details"
            onClick={() => handleEditClick(item)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-[hsl(var(--muted-foreground))] hover:text-red-500 rounded-xl"
            title="Delete Record"
            onClick={() => handleDeleteClick(item.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const basic = salaryTeacher?.salary || 0;
  const netSalary = basic - payDeductions + payBonus;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teacher Directory"
        description="Track instructor positions, courses taught, credentials, and salary details."
        action={{
          label: 'Add Instructor',
          onClick: handleAddClick,
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      <DataTable
        data={filteredTeachers}
        columns={columns}
        searchField="firstName"
        searchPlaceholder="Search instructors by name..."
        filterComponent={
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2 transition-all duration-200"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="on_leave">On Leave</option>
            <option value="terminated">Terminated</option>
          </select>
        }
      />

      {/* Pay Salary Modal */}
      {isSalaryModalOpen && salaryTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsSalaryModalOpen(false)} />
          <Card className="relative w-full max-w-md z-10 animate-scale-in shadow-2xl border-slate-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-800 text-base">Disburse Salary</h2>
                <p className="text-xs text-slate-400 mt-0.5">{salaryTeacher.firstName} {salaryTeacher.lastName} ({salaryTeacher.employeeId})</p>
              </div>
              <button onClick={() => setIsSalaryModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handlePaySalarySubmit} className="p-6 space-y-4">
              <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-xl p-4 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex justify-between">
                  <span>Basic Salary:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(basic)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Deductions:</span>
                  <span>− {formatCurrency(payDeductions)}</span>
                </div>
                <div className="flex justify-between text-emerald-600">
                  <span>Bonus:</span>
                  <span>+ {formatCurrency(payBonus)}</span>
                </div>
                <div className="flex justify-between border-t border-emerald-200 dark:border-emerald-800 pt-1.5 mt-1 text-sm font-bold text-slate-950 dark:text-white">
                  <span>Net Disbursed:</span>
                  <span className="text-emerald-700 dark:text-emerald-400">{formatCurrency(netSalary)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Salary Month</label>
                  <select
                    value={payMonth}
                    onChange={(e) => setPayMonth(e.target.value)}
                    className="flex h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {MONTHS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Salary Year</label>
                  <Input
                    type="number"
                    value={payYear}
                    onChange={(e) => setPayYear(Number(e.target.value))}
                    className="h-9 text-xs border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Deductions (PKR)</label>
                  <Input
                    type="number"
                    min={0}
                    value={payDeductions}
                    onChange={(e) => setPayDeductions(Number(e.target.value))}
                    className="h-9 text-xs border-slate-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Bonus Pay (PKR)</label>
                  <Input
                    type="number"
                    min={0}
                    value={payBonus}
                    onChange={(e) => setPayBonus(Number(e.target.value))}
                    className="h-9 text-xs border-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e: any) => setPayMethod(e.target.value)}
                  className="flex h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="online">Online Transfer</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Remarks / Notes</label>
                <Input
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. Performance bonus, late deduction..."
                  className="h-9 text-xs border-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsSalaryModalOpen(false)} disabled={isPayingSalary}>Cancel</Button>
                <Button type="submit" size="sm" disabled={isPayingSalary} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                  {isPayingSalary ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Payment'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Salary History Modal */}
      {isHistoryModalOpen && historyTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsHistoryModalOpen(false)} />
          <Card className="relative w-full max-w-2xl z-10 animate-scale-in shadow-2xl border-slate-200 overflow-hidden max-h-[85vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-800 text-base">Salary Disbursement Ledger</h2>
                <p className="text-xs text-slate-400 mt-0.5">{historyTeacher.firstName} {historyTeacher.lastName}</p>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {isLoadingHistory ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <span className="text-xs">Fetching payment history...</span>
                </div>
              ) : salaryHistory.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No salary payments disubursed yet for this instructor.
                </div>
              ) : (
                <div className="border border-slate-100 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="p-3 font-semibold text-slate-500 uppercase text-[9px]">Receipt No</th>
                        <th className="p-3 font-semibold text-slate-500 uppercase text-[9px]">Month</th>
                        <th className="p-3 text-right font-semibold text-slate-500 uppercase text-[9px]">Basic</th>
                        <th className="p-3 text-right font-semibold text-slate-500 uppercase text-[9px]">Deductions</th>
                        <th className="p-3 text-right font-semibold text-slate-500 uppercase text-[9px]">Bonus</th>
                        <th className="p-3 text-right font-semibold text-slate-500 uppercase text-[9px]">Net Paid</th>
                        <th className="p-3 font-semibold text-slate-500 uppercase text-[9px]">Method</th>
                        <th className="p-3 font-semibold text-slate-500 uppercase text-[9px]">Paid On</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {salaryHistory.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-bold text-blue-600">{p.receiptNumber}</td>
                          <td className="p-3 font-medium text-slate-800">{p.monthLabel}</td>
                          <td className="p-3 text-right text-slate-600">{formatCurrency(p.basicSalary)}</td>
                          <td className="p-3 text-right text-red-500">− {formatCurrency(p.deductions)}</td>
                          <td className="p-3 text-right text-emerald-600">+ {formatCurrency(p.bonus)}</td>
                          <td className="p-3 text-right font-bold text-slate-900">{formatCurrency(p.netSalary)}</td>
                          <td className="p-3 font-semibold text-slate-700 capitalize">{p.paymentMethod.replace('_', ' ')}</td>
                          <td className="p-3 text-slate-500">{new Date(p.paidAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setIsHistoryModalOpen(false)}>Close</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Slide-over Staff Form */}
      <TeacherForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={selectedTeacher}
        title={formTitle}
      />

      {/* Delete Staff Safety Dialog */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Staff Record?"
        description="This action is permanent. The instructor profile record will be deleted, and all assigned courses will be set to unassigned. Salary ledgers will not be altered."
        confirmLabel="Delete Record"
        isDestructive
        isLoading={isDeleting}
      />
    </div>
  );
}
