import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Plus, Trash2, Loader2, Save } from 'lucide-react';
import { teacherSchema, type TeacherFormInput } from './teacherValidation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEffect } from 'react';

interface TeacherFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TeacherFormInput) => Promise<void>;
  initialData?: TeacherFormInput | null;
  title: string;
}

export function TeacherForm({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  title,
}: TeacherFormProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TeacherFormInput>({
    resolver: zodResolver(teacherSchema) as any,
    defaultValues: {
      firstName: '',
      lastName: '',
      employeeId: '',
      dateOfBirth: '',
      gender: 'male',
      qualification: '',
      specialization: '',
      experience: 1,
      phone: '',
      email: '',
      address: '',
      joiningDate: new Date().toISOString().split('T')[0],
      salary: 50000,
      status: 'active',
      assignedClasses: [],
      notes: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'assignedClasses',
  });

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      reset(initialData);
    } else {
      reset({
        firstName: '',
        lastName: '',
        employeeId: '',
        dateOfBirth: '',
        gender: 'male',
        qualification: '',
        specialization: '',
        experience: 1,
        phone: '',
        email: '',
        address: '',
        joiningDate: new Date().toISOString().split('T')[0],
        salary: 50000,
        status: 'active',
        assignedClasses: [],
        notes: '',
      });
    }
  }, [initialData, reset, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer box */}
      <div className="relative w-full max-w-2xl h-full bg-[hsl(var(--card))] border-l border-[hsl(var(--border))] shadow-2xl flex flex-col animate-slide-in-right">
        {/* Head */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-[hsl(var(--border))] shrink-0 bg-[hsl(var(--muted))]/20">
          <h3 className="text-base font-bold text-[hsl(var(--foreground))]">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit(onSubmit as any)} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Basic Info */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Personal Information
            </h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[hsl(var(--foreground))]">First Name</label>
                <Input {...register('firstName')} placeholder="Kamil" />
                {errors.firstName && (
                  <p className="text-[10px] text-red-500 font-medium">{errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Last Name</label>
                <Input {...register('lastName')} placeholder="Khan" />
                {errors.lastName && (
                  <p className="text-[10px] text-red-500 font-medium">{errors.lastName.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Employee ID</label>
                <Input {...register('employeeId')} placeholder="EMP-2024-023" />
                {errors.employeeId && (
                  <p className="text-[10px] text-red-500 font-medium">{errors.employeeId.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Date of Birth</label>
                <Input type="date" {...register('dateOfBirth')} />
                {errors.dateOfBirth && (
                  <p className="text-[10px] text-red-500 font-medium">{errors.dateOfBirth.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Gender</label>
                <select
                  {...register('gender')}
                  className="flex h-10 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Status</label>
                <select
                  {...register('status')}
                  className="flex h-10 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="on_leave">On Leave</option>
                  <option value="terminated">Terminated</option>
                </select>
              </div>
            </div>
          </div>

          <hr className="border-[hsl(var(--border))]/50" />

          {/* Section 2: Credentials */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Qualifications & Credentials
            </h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Qualification Degree</label>
                <Input {...register('qualification')} placeholder="M.Sc. Mathematics" />
                {errors.qualification && (
                  <p className="text-[10px] text-red-500 font-medium">{errors.qualification.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Specialization Topic</label>
                <Input {...register('specialization')} placeholder="Algebraic Geometry" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Experience (Years)</label>
                <Input type="number" {...register('experience', { valueAsNumber: true })} placeholder="5" />
                {errors.experience && (
                  <p className="text-[10px] text-red-500 font-medium">{errors.experience.message}</p>
                )}
              </div>
            </div>
          </div>

          <hr className="border-[hsl(var(--border))]/50" />

          {/* Section 3: Contact & Financials */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Contact & Address & Salary
            </h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Residential Address</label>
                <Input {...register('address')} placeholder="Clifton, Block 5, Karachi" />
                {errors.address && (
                  <p className="text-[10px] text-red-500 font-medium">{errors.address.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Phone Number</label>
                <Input {...register('phone')} placeholder="03219876543" />
                {errors.phone && (
                  <p className="text-[10px] text-red-500 font-medium">{errors.phone.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Contact Email</label>
                <Input type="email" {...register('email')} placeholder="kamil@school.com" />
                {errors.email && (
                  <p className="text-[10px] text-red-500 font-medium">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Joining Date</label>
                <Input type="date" {...register('joiningDate')} />
                {errors.joiningDate && (
                  <p className="text-[10px] text-red-500 font-medium">{errors.joiningDate.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Salary (PKR)</label>
                <Input type="number" {...register('salary', { valueAsNumber: true })} />
                {errors.salary && (
                  <p className="text-[10px] text-red-500 font-medium">{errors.salary.message}</p>
                )}
              </div>
            </div>
          </div>

          <hr className="border-[hsl(var(--border))]/50" />

          {/* Section 4: Course allocations */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Class Assignments
              </h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    classId: 'c1',
                    className: 'Grade 5',
                    section: 'A',
                    subjectName: 'Mathematics',
                  })
                }
                className="h-8 gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Assign Course
              </Button>
            </div>

            {fields.map((field, idx) => (
              <div
                key={field.id}
                className="p-4 border border-[hsl(var(--border))] rounded-2xl bg-[hsl(var(--muted))]/10 space-y-4 animate-scale-in relative"
              >
                <div className="absolute right-4 top-4">
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Class Level</label>
                    <select
                      {...register(`assignedClasses.${idx}.className`)}
                      className="flex h-10 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                    >
                      <option value="Grade 5">Grade 5</option>
                      <option value="Grade 6">Grade 6</option>
                      <option value="Grade 7">Grade 7</option>
                      <option value="Grade 8">Grade 8</option>
                      <option value="Grade 9">Grade 9</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Section</label>
                    <Input {...register(`assignedClasses.${idx}.section`)} placeholder="A" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Subject Course</label>
                    <Input {...register(`assignedClasses.${idx}.subjectName`)} placeholder="Mathematics" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-[hsl(var(--border))] shrink-0 bg-[hsl(var(--card))]">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Record
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
export default TeacherForm;
