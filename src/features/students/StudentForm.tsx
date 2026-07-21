import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Plus, Trash2, Loader2, Save, Receipt } from 'lucide-react';
import { studentSchema, type StudentFormInput } from './studentValidation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEffect } from 'react';

interface StudentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: StudentFormInput) => Promise<void>;
  initialData?: StudentFormInput | null;
  title: string;
}

// ── Class list split by category ─────────────────────────────────────────────
const SCHOOL_CLASSES = [
  { id: 'nursery', label: 'Nursery' },
  { id: 'prep', label: 'Prep' },
  { id: 'c1', label: 'Grade 1' },
  { id: 'c2', label: 'Grade 2' },
  { id: 'c3', label: 'Grade 3' },
  { id: 'c4', label: 'Grade 4' },
  { id: 'c5', label: 'Grade 5' },
  { id: 'c6', label: 'Grade 6' },
  { id: 'c7', label: 'Grade 7' },
  { id: 'c8', label: 'Grade 8' },
  { id: 'c9', label: 'Grade 9' },
  { id: 'c10', label: 'Grade 10' },
] as const;

const ACADEMY_CLASSES = [
  { id: 'nursery', label: 'Nursery' },
  { id: 'prep', label: 'Prep' },
  { id: 'c1', label: 'Grade 1' },
  { id: 'c2', label: 'Grade 2' },
  { id: 'c3', label: 'Grade 3' },
  { id: 'c4', label: 'Grade 4' },
  { id: 'c5', label: 'Grade 5' },
  { id: 'c6', label: 'Grade 6' },
  { id: 'c7', label: 'Grade 7' },
  { id: 'c8', label: 'Grade 8' },
  { id: 'c9', label: 'Grade 9' },
  { id: 'c10 ', label: 'Grade 10' },
] as const;

const CLASS_OPTIONS = [...SCHOOL_CLASSES, ...ACADEMY_CLASSES];

const CLASS_MAP: Record<string, string> = Object.fromEntries(
  CLASS_OPTIONS.map((c) => [c.id, c.label])
);

const EMPTY_DEFAULTS: StudentFormInput = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  gender: 'male',
  bloodGroup: '',
  admissionNumber: '',
  admissionDate: new Date().toISOString().split('T')[0],
  classId: 'nursery',
  className: 'Nursery',
  category: 'school' as const,
  section: 'A',
  rollNumber: '',
  address: '',
  phone: '',
  status: 'active',
  guardians: [
    {
      name: '',
      relation: 'father',
      phone: '',
      occupation: '',
      isEmergencyContact: true,
    },
  ],
  feeEntries: [],
  documents: [],
  notes: '',
};

const selectCls =
  'flex h-10 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]';

export function StudentForm({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  title,
}: StudentFormProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<StudentFormInput>({
    resolver: zodResolver(studentSchema) as any,
    defaultValues: EMPTY_DEFAULTS,
  });

  const {
    fields: guardianFields,
    append: appendGuardian,
    remove: removeGuardian,
  } = useFieldArray({ control, name: 'guardians' });

  const {
    fields: feeFields,
    append: appendFee,
    remove: removeFee,
  } = useFieldArray({ control, name: 'feeEntries' });

  // Reset form when initialData changes or modal opens/closes
  useEffect(() => {
    if (initialData) {
      reset({ ...EMPTY_DEFAULTS, ...initialData });
    } else {
      reset(EMPTY_DEFAULTS);
    }
  }, [initialData, reset, isOpen]);

  // Sync className + auto-select first class of category when category changes
  const watchClassId = watch('classId');
  const watchCategory = watch('category');

  useEffect(() => {
    if (watchClassId) {
      setValue('className', CLASS_MAP[watchClassId] || 'Nursery');
    }
  }, [watchClassId, setValue]);

  // When category changes, reset classId to first class of that category
  useEffect(() => {
    if (watchCategory === 'school') {
      setValue('classId', 'nursery');
      setValue('className', 'Nursery');
    } else if (watchCategory === 'academy') {
      setValue('classId', 'c6');
      setValue('className', 'Grade 6');
    }
  }, [watchCategory, setValue]);

  // Determine current class list based on category
  const activeClasses = watchCategory === 'academy' ? ACADEMY_CLASSES : SCHOOL_CLASSES;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer Box */}
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

          {/* ── Section 1: Personal Information ────────────────────────── */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Personal Information
            </h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[hsl(var(--foreground))]">First Name</label>
                <Input {...register('firstName')} placeholder="Muhammad" />
                {errors.firstName && (
                  <p className="text-[10px] text-red-500 font-medium">{errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Last Name</label>
                <Input {...register('lastName')} placeholder="Ali" />
                {errors.lastName && (
                  <p className="text-[10px] text-red-500 font-medium">{errors.lastName.message}</p>
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
                <select {...register('gender')} className={selectCls}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Status</label>
                <select {...register('status')} className={selectCls}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="graduated">Graduated</option>
                  <option value="transferred">Transferred</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>
          </div>

          <hr className="border-[hsl(var(--border))]/50" />

          {/* ── Section 2: Admission Details ───────────────────────────── */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Admission Details
            </h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Admission ID</label>
                <Input {...register('admissionNumber')} placeholder="ADM-2024-001" />
                {errors.admissionNumber && (
                  <p className="text-[10px] text-red-500 font-medium">{errors.admissionNumber.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Admission Date</label>
                <Input type="date" {...register('admissionDate')} />
                {errors.admissionDate && (
                  <p className="text-[10px] text-red-500 font-medium">{errors.admissionDate.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Category</label>
                <select {...register('category')} className={selectCls}>
                  <option value="school">School</option>
                  <option value="academy">Academy</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Class Level</label>
                <select {...register('classId')} className={selectCls}>
                  {activeClasses.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Section Division</label>
                <Input {...register('section')} placeholder="A" />
                {errors.section && (
                  <p className="text-[10px] text-red-500 font-medium">{errors.section.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Roll Number</label>
                <Input {...register('rollNumber')} placeholder="05" />
              </div>
            </div>
          </div>

          <hr className="border-[hsl(var(--border))]/50" />

          {/* ── Section 3: Address & Contact ───────────────────────────── */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Address & Contact Info
            </h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Residential Address</label>
                <Input {...register('address')} placeholder="Phase 6, DHA, Karachi" />
                {errors.address && (
                  <p className="text-[10px] text-red-500 font-medium">{errors.address.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Primary Phone</label>
                <Input {...register('phone')} placeholder="03001234567" />
              </div>
            </div>
          </div>

          <hr className="border-[hsl(var(--border))]/50" />

          {/* ── Section 4: Guardian Details ────────────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Guardian Details
              </h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  appendGuardian({
                    name: '',
                    relation: 'father',
                    phone: '',

                    occupation: '',
                    isEmergencyContact: false,
                  })
                }
                className="h-8 gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Guardian
              </Button>
            </div>

            {guardianFields.map((field, idx) => (
              <div
                key={field.id}
                className="p-4 border border-[hsl(var(--border))] rounded-2xl bg-[hsl(var(--muted))]/10 space-y-4 animate-scale-in relative"
              >
                <div className="absolute right-4 top-4">
                  {guardianFields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeGuardian(idx)}
                      className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Full Name</label>
                    <Input {...register(`guardians.${idx}.name`)} placeholder="Tariq Ali" />
                    {errors.guardians?.[idx]?.name && (
                      <p className="text-[10px] text-red-500 font-medium">
                        {errors.guardians[idx]?.name?.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Relation</label>
                    <select
                      {...register(`guardians.${idx}.relation`)}
                      className={selectCls}
                    >
                      <option value="father">Father</option>
                      <option value="mother">Mother</option>
                      <option value="guardian">Guardian</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Phone Number</label>
                    <Input {...register(`guardians.${idx}.phone`)} placeholder="03217654321" />
                    {errors.guardians?.[idx]?.phone && (
                      <p className="text-[10px] text-red-500 font-medium">
                        {errors.guardians[idx]?.phone?.message}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id={`emergency-${idx}`}
                      {...register(`guardians.${idx}.isEmergencyContact`)}
                      className="h-4 w-4 rounded border-[hsl(var(--border))] text-[hsl(var(--primary))] focus:ring-[hsl(var(--ring))]"
                    />
                    <label htmlFor={`emergency-${idx}`} className="text-xs font-semibold text-[hsl(var(--foreground))] cursor-pointer select-none">
                      Primary Emergency Contact
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <hr className="border-[hsl(var(--border))]/50" />

          {/* ── Section 5: Fees (Owner-controlled, Fully Custom) ────────── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Fees
                  <span className="ml-2 normal-case font-normal text-[hsl(var(--muted-foreground))] text-[10px]"></span>
                </h4>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  appendFee({
                    id: `fee-${Date.now()}`,
                    description: '',
                    amount: 0,
                    dueDate: '',
                  })
                }
                className="h-8 gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/20"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Fee
              </Button>
            </div>

            {/* Info note */}


            {feeFields.length === 0 && (
              <div className="text-center py-6 text-[hsl(var(--muted-foreground))] text-xs border border-dashed border-[hsl(var(--border))] rounded-2xl">
                No fees added — click <strong>Add Fee</strong> above to create a custom fee entry.
              </div>
            )}

            {feeFields.map((field, idx) => (
              <div
                key={field.id}
                className="p-4 border border-emerald-200 dark:border-emerald-800 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/10 animate-scale-in"
              >
                {/* Row header */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Fee #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFee(idx)}
                    className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                    title="Remove this fee"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {/* Description — full width on mobile, 1/3 on sm */}
                  <div className="space-y-1.5 sm:col-span-3">
                    <label className="text-xs font-semibold text-[hsl(var(--foreground))]">
                      Description <span className="text-red-400">*</span>
                    </label>
                    <Input
                      {...register(`feeEntries.${idx}.description`)}
                      placeholder="e.g. Monthly Tuition, Transport, Exam Fee..."
                    />
                    {errors.feeEntries?.[idx]?.description && (
                      <p className="text-[10px] text-red-500 font-medium">
                        {errors.feeEntries[idx]?.description?.message}
                      </p>
                    )}
                  </div>

                  {/* Amount */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[hsl(var(--foreground))]">
                      Amount (PKR) <span className="text-red-400">*</span>
                    </label>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      {...register(`feeEntries.${idx}.amount`)}
                      placeholder="5000"
                    />
                    {errors.feeEntries?.[idx]?.amount && (
                      <p className="text-[10px] text-red-500 font-medium">
                        {errors.feeEntries[idx]?.amount?.message}
                      </p>
                    )}
                  </div>

                  {/* Due Date */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-semibold text-[hsl(var(--foreground))]">
                      Due Date <span className="text-red-400">*</span>
                    </label>
                    <Input
                      type="date"
                      {...register(`feeEntries.${idx}.dueDate`)}
                    />
                    {errors.feeEntries?.[idx]?.dueDate && (
                      <p className="text-[10px] text-red-500 font-medium">
                        {errors.feeEntries[idx]?.dueDate?.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <hr className="border-[hsl(var(--border))]/50" />

          {/* ── Section 6: Notes ───────────────────────────────────────── */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Special Notes / Medical Disclaimers</label>
            <textarea
              {...register('notes')}
              rows={3}
              placeholder="Enter details about allergic items or previous transcript files..."
              className="flex w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] p-3 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
            />
          </div>

          {/* ── Action Toolbar ─────────────────────────────────────────── */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-[hsl(var(--border))] shrink-0 bg-[hsl(var(--card))]">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving
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
export default StudentForm;
