import { useEffect, useState } from 'react';
import { Plus, Eye, Edit2, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable, type Column } from '@/components/common/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { getStatusColor, formatDate } from '@/lib/utils';
import { getStudents, deleteStudent, addStudent, updateStudent } from './studentService';
import { StudentForm } from './StudentForm';
import type { StudentFormInput } from './studentValidation';
import type { Student } from '@/types';
import { useAuth } from '@/features/auth/AuthContext';
import { toast } from 'sonner';

export default function StudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [classFilter, setClassFilter] = useState('');
  
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
                // Ensure feeEntries from the student record are passed to the form
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
    </div>
  );
}
