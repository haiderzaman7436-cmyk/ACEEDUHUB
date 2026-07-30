import { useEffect, useState } from 'react';
import { Plus, Eye, Edit2, Trash2, ArrowRightCircle, Loader2, X, GraduationCap } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable, type Column } from '@/components/common/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { getStatusColor, formatDate } from '@/lib/utils';
import { getStudents, deleteStudent, addStudent, updateStudent, promoteStudents } from './studentService';
import { StudentForm } from './StudentForm';
import type { StudentFormInput } from './studentValidation';
import type { Student } from '@/types';
import { useAuth } from '@/features/auth/AuthContext';
import { toast } from 'sonner';

export default function StudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [classFilter, setClassFilter] = useState('');
  
  // Class Promotion state
  const [isPromoteOpen, setIsPromoteOpen] = useState(false);
  const [promoteFrom, setPromoteFrom] = useState('');
  const [promoteTo, setPromoteTo] = useState('');
  const [promoteToSection, setPromoteToSection] = useState('A');
  const [promoteYear, setPromoteYear] = useState(`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`);
  const [promoteNotes, setPromoteNotes] = useState('');
  const [isPromoting, setIsPromoting] = useState(false);
  const [promotePreviewCount, setPromotePreviewCount] = useState<number | null>(null);
  
  // Drawer / Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('Enroll Student');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Dialog / Delete States
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadStudents = () => {
    getStudents()
      .then((data) => setStudents(data));
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const handleEnrollClick = () => {
    setSelectedStudent(null);
    setFormTitle('Enroll New Student');
    setIsFormOpen(true);
  };

  const handleEditClick = (student: Student) => {
    setSelectedStudent(student);
    setFormTitle(`Modify Profile: ${student.firstName} ${student.lastName}`);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: StudentFormInput) => {
    if (!user) return;
    try {
      const formattedGuardians = data.guardians.map(g => ({
        ...g,
        id: g.id || 'g-' + Math.random().toString(36).substring(2, 9),
      }));
      const formattedData = {
        ...data,
        guardians: formattedGuardians,
      };

      if (selectedStudent) {
        // Edit Mode
        await updateStudent(selectedStudent.id, formattedData as any, user.uid || 'admin');
        toast.success('Student profile updated successfully.');
      } else {
        // Add Mode
        await addStudent(formattedData as any, user.uid || 'admin');
        toast.success('Student enrolled successfully.');
      }
      setIsFormOpen(false);
      loadStudents();
    } catch (err) {
      toast.error('An error occurred while saving the student record.');
    }
  };

  const handleDeleteClick = (id: string) => {
    setSelectedStudentId(id);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedStudentId || !user) return;
    setIsDeleting(true);
    try {
      await deleteStudent(selectedStudentId, user.uid || 'admin');
      toast.success('Student record deleted successfully.');
      loadStudents();
    } catch (err) {
      toast.error('Failed to delete student.');
    } finally {
      setIsDeleting(false);
      setIsDeleteOpen(false);
      setSelectedStudentId(null);
    }
  };

  // Class Promotion Handlers
  const handlePromotePreview = () => {
    if (!promoteFrom) return;
    const count = students.filter(
      (s) => s.className.toLowerCase() === promoteFrom.toLowerCase() && s.status === 'active'
    ).length;
    setPromotePreviewCount(count);
  };

  const handlePromoteConfirm = async () => {
    if (!promoteFrom || !promoteTo || !user) return;
    if (promoteFrom === promoteTo) {
      toast.error('Source and destination class must be different.');
      return;
    }
    setIsPromoting(true);
    try {
      const { promotedCount } = await promoteStudents(
        promoteFrom,
        promoteTo,
        promoteToSection,
        user.uid || 'admin',
        user.displayName || 'Admin',
        promoteYear,
        promoteNotes,
      );
      if (promotedCount === 0) {
        toast.warning(`No active students found in ${promoteFrom}.`);
      } else {
        toast.success(`✅ ${promotedCount} students promoted from ${promoteFrom} → ${promoteTo}!`);
      }
      setIsPromoteOpen(false);
      setPromotePreviewCount(null);
      loadStudents();
    } catch {
      toast.error('Promotion failed. Please try again.');
    } finally {
      setIsPromoting(false);
    }
  };

  // Filter Data by Class
  const filteredStudents = students.filter((s) => {
    if (!classFilter) return true;
    return s.className.toLowerCase() === classFilter.toLowerCase();
  });

  // Extract unique classes for filter list
  const uniqueClasses = Array.from(new Set(students.map((s) => s.className)));

  // Define Columns
  const columns: Column<Student>[] = [
    {
      key: 'name',
      header: 'Student Name',
      sortable: true,
      cell: (item) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600 font-semibold">
            {item.firstName[0]}{item.lastName[0]}
          </div>
          <div>
            <div className="text-sm font-semibold text-[hsl(var(--foreground))]">
              {item.firstName} {item.lastName}
            </div>
            <div className="text-xs text-[hsl(var(--muted-foreground))]">
              Roll No: {item.rollNumber || 'N/A'}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'admissionNumber',
      header: 'Admission ID',
      sortable: true,
    },
    {
      key: 'className',
      header: 'Class / Sec',
      sortable: true,
      cell: (item) => (
        <span className="text-sm">
          {item.className} - <span className="font-semibold text-[hsl(var(--muted-foreground))]">{item.section}</span>
        </span>
      ),
    },
    {
      key: 'guardian',
      header: 'Primary Guardian',
      cell: (item) => {
        const primary = item.guardians[0];
        return primary ? (
          <div>
            <div className="text-xs font-semibold text-[hsl(var(--foreground))]">{primary.name}</div>
            <div className="text-[10px] text-[hsl(var(--muted-foreground))]">{primary.phone}</div>
          </div>
        ) : (
          <span className="text-xs text-[hsl(var(--muted-foreground))]">—</span>
        );
      },
    },
    {
      key: 'admissionDate',
      header: 'Admitted On',
      sortable: true,
      cell: (item) => formatDate(item.admissionDate),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (item) => (
        <Badge variant="outline" className={getStatusColor(item.status)}>
          {item.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8.5 w-8.5 text-[hsl(var(--muted-foreground))] hover:text-indigo-600 rounded-lg"
            title="View Profile"
            onClick={() => toast.info(`Profile View: ${item.firstName} ${item.lastName}`)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8.5 w-8.5 text-[hsl(var(--muted-foreground))] hover:text-blue-600 rounded-lg"
            title="Edit Record"
            onClick={() => handleEditClick(item)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8.5 w-8.5 text-[hsl(var(--muted-foreground))] hover:text-red-500 rounded-lg"
            title="Delete Record"
            onClick={() => handleDeleteClick(item.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Directory"
        description="Search, view, register, and modify active students."
        action={{
          label: 'Enroll Student',
          onClick: handleEnrollClick,
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      {/* Promote Students Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => setIsPromoteOpen(true)}
          className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md"
        >
          <ArrowRightCircle className="h-4 w-4" />
          Promote Students
        </Button>
      </div>

      {/* Class filter dropdown toolbar */}
      <DataTable
        data={filteredStudents}
        columns={columns}
        searchField="firstName"
        searchPlaceholder="Search students by name..."
        filterComponent={
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="h-10 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2 transition-all duration-200"
          >
            <option value="">All Classes</option>
            {uniqueClasses.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>
        }
      />

      {/* Slide-over Registration Form */}
      <StudentForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={
          selectedStudent
            ? {
                ...selectedStudent,
                feeEntries: selectedStudent.feeEntries ?? [],
                documents: selectedStudent.documents ?? [],
              } as any
            : null
        }
        title={formTitle}
      />

      {/* Delete Safety Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Student Record?"
        description="This action is permanent and cannot be undone. All linked guardian mappings, attendance files, and invoices will remain intact but disconnected."
        confirmLabel="Delete Record"
        isDestructive
        isLoading={isDeleting}
      />

      {/* ── Class Promotion Modal ──────────────────────────────────────── */}
      {isPromoteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsPromoteOpen(false)} />
          <Card className="relative w-full max-w-lg z-10 animate-scale-in shadow-2xl border-indigo-200">
            <div className="p-5 border-b border-indigo-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-800 text-base">One-Click Class Promotion</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Move all active students from one class to another</p>
                </div>
              </div>
              <button onClick={() => setIsPromoteOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* From Class */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">From Class (Source) *</label>
                <select
                  value={promoteFrom}
                  onChange={(e) => { setPromoteFrom(e.target.value); setPromotePreviewCount(null); }}
                  className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select source class...</option>
                  {uniqueClasses.map((cls) => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              {/* To Class */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">To Class (Destination) *</label>
                  <Input
                    value={promoteTo}
                    onChange={(e) => setPromoteTo(e.target.value)}
                    placeholder="e.g. Class 2"
                    className="border-slate-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">To Section</label>
                  <Input
                    value={promoteToSection}
                    onChange={(e) => setPromoteToSection(e.target.value)}
                    placeholder="e.g. A"
                    className="border-slate-200"
                  />
                </div>
              </div>

              {/* Academic Year */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Academic Year</label>
                <Input
                  value={promoteYear}
                  onChange={(e) => setPromoteYear(e.target.value)}
                  placeholder="e.g. 2026-2027"
                  className="border-slate-200"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Notes (optional)</label>
                <Input
                  value={promoteNotes}
                  onChange={(e) => setPromoteNotes(e.target.value)}
                  placeholder="e.g. End of session promotion"
                  className="border-slate-200"
                />
              </div>

              {/* Preview */}
              {promoteFrom && (
                <button
                  type="button"
                  onClick={handlePromotePreview}
                  className="text-xs text-indigo-600 underline font-semibold hover:text-indigo-800"
                >
                  Preview: How many students will be promoted?
                </button>
              )}
              {promotePreviewCount !== null && (
                <div className={`rounded-xl p-3 text-sm font-semibold border ${
                  promotePreviewCount > 0
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : 'bg-amber-50 border-amber-200 text-amber-700'
                }`}>
                  {promotePreviewCount > 0
                    ? `✅ ${promotePreviewCount} active students will be promoted from "${promoteFrom}" → "${promoteTo || '...'}"`
                    : `⚠️ No active students found in "${promoteFrom}"`
                  }
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setIsPromoteOpen(false)} disabled={isPromoting}>
                  Cancel
                </Button>
                <Button
                  onClick={handlePromoteConfirm}
                  disabled={isPromoting || !promoteFrom || !promoteTo}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                >
                  {isPromoting
                    ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Promoting...</>
                    : <><ArrowRightCircle className="h-4 w-4 mr-1.5" /> Promote Now</>
                  }
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
