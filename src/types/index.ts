// ============================================================================
// ACE Educational Hub — Global TypeScript Types
// ============================================================================

// ── Roles & Auth ────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'manager';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL?: string;
  phone?: string;
  isActive: boolean;
  createdAt: Date;
  lastLoginAt: Date;
}

// ── Students ────────────────────────────────────────────────────────────────

export interface Guardian {
  id: string;
  name: string;
  relation: 'father' | 'mother' | 'guardian' | 'other';
  phone: string;
  email?: string;
  occupation?: string;
  address?: string;
  isEmergencyContact: boolean;
}

export interface StudentDocument {
  id: string;
  name: string;
  type: 'birth_certificate' | 'transfer_certificate' | 'report_card' | 'medical' | 'photo' | 'other';
  url: string;
  uploadedAt: Date;
  uploadedBy: string;
}

export type StudentStatus = 'active' | 'inactive' | 'graduated' | 'transferred' | 'suspended';

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  bloodGroup?: string;
  admissionNumber: string;
  admissionDate: string;
  classId: string;
  className: string;
  section: string;
  rollNumber?: string;
  address: string;
  phone?: string;
  email?: string;
  photoURL?: string;
  guardians: Guardian[];
  documents: StudentDocument[];
  feeEntries?: FeeEntry[];   // owner-defined custom fees set on the student form
  category?: 'school' | 'academy'; // institution category
  status: StudentStatus;
  previousSchool?: string;
  nationality?: string;
  religion?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// ── Teachers ────────────────────────────────────────────────────────────────

export type TeacherStatus = 'active' | 'inactive' | 'on_leave' | 'terminated';

export interface ClassAssignment {
  classId: string;
  className: string;
  section: string;
  subjectName: string;
}

export interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  qualification: string;
  specialization?: string;
  experience: number;
  phone: string;
  email: string;
  address: string;
  photoURL?: string;
  assignedClasses: ClassAssignment[];
  joiningDate: string;
  salary: number;
  status: TeacherStatus;
  emergencyContact?: string;
  bloodGroup?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// ── Academics ───────────────────────────────────────────────────────────────

export interface Subject {
  id: string;
  name: string;
  code: string;
}

export interface ClassInfo {
  id: string;
  name: string;
  sections: string[];
  subjects: Subject[];
  classTeacherId?: string;
  classTeacherName?: string;
  maxStudents?: number;
  createdAt: Date;
  updatedAt: Date;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceRecord {
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
}

export interface Attendance {
  id: string;
  date: string;
  classId: string;
  className: string;
  section: string;
  records: AttendanceRecord[];
  markedBy: string;
  markedByName: string;
  markedAt: Date;
}

export type ExamType = 'midterm' | 'final' | 'quiz' | 'assignment' | 'practical';

export interface Exam {
  id: string;
  name: string;
  type: ExamType;
  classId: string;
  className: string;
  section: string;
  subjectName: string;
  date: string;
  totalMarks: number;
  passingMarks: number;
  createdBy: string;
  createdAt: Date;
}

export interface ExamResult {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  marksObtained: number;
  grade?: string;
  remarks?: string;
  isPassed: boolean;
}

// ── Fees ────────────────────────────────────────────────────────────────────

export type FeeStatus = 'pending' | 'paid' | 'partial' | 'overdue';
export type FeeType = 'tuition' | 'admission' | 'exam' | 'transport' | 'lab' | 'library' | 'sports' | 'registration' | 'other';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'cheque' | 'online' | 'other';

/** A custom fee line entered by the owner directly on the Student form */
export interface FeeEntry {
  id?: string;        // optional client-side id for form key
  description: string;
  amount: number;
  dueDate: string;    // YYYY-MM-DD
}

export interface Fee {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  section: string;
  feeType: FeeType;
  description?: string;
  amount: number;
  dueDate: string;
  paidAmount: number;
  paidDate?: string;
  status: FeeStatus;
  paymentMethod?: PaymentMethod;
  receiptNumber?: string;
  collectedBy?: string;
  collectedByName?: string;
  notes?: string;
  invoiceId?: string;
  month?: string; // e.g. "July 2026"
  createdAt: Date;
  updatedAt: Date;
}

// ── Fee Templates ────────────────────────────────────────────────────────────

export interface FeeTemplate {
  id: string;
  classId: string;
  className: string;
  feeType: FeeType;
  description: string;
  amount: number;
  frequency: 'monthly' | 'quarterly' | 'semester' | 'annual' | 'one_time';
  dueDayOfMonth?: number; // e.g. 10 = due on the 10th
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ── Invoices ────────────────────────────────────────────────────────────────

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'cancelled' | 'overdue';

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  studentId: string;
  studentName: string;
  className: string;
  section: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  discountType: 'percentage' | 'fixed';
  tax: number;
  grandTotal: number;
  paidAmount: number;
  status: InvoiceStatus;
  notes?: string;
  dueDate: string;
  paidAt?: Date;
  month?: string;
  category?: string;  // 'school' | 'academy' — inherited from student
  feeIds?: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// ── Teacher Salary Payments ──────────────────────────────────────────────────

export type SalaryPaymentMethod = 'cash' | 'bank_transfer' | 'cheque' | 'online';
export type SalaryStatus = 'paid' | 'partial' | 'pending';

export interface SalaryPayment {
  id: string;
  teacherId: string;
  teacherName: string;
  month: string;           // e.g. "July"
  year: number;            // e.g. 2026
  monthLabel: string;      // e.g. "July 2026"
  basicSalary: number;
  deductions: number;
  bonus: number;
  netSalary: number;       // basicSalary - deductions + bonus
  paymentMethod: SalaryPaymentMethod;
  receiptNumber: string;
  paidBy: string;          // user id
  paidByName: string;
  notes?: string;
  status: SalaryStatus;
  paidAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ── Inventory ───────────────────────────────────────────────────────────────

export type InventoryCategory = 'stationery' | 'uniforms' | 'books';

export interface StationeryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  supplier?: string;
  reorderLevel: number;
  lastRestocked?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UniformItem {
  id: string;
  name: string;
  size: string;
  gender: 'male' | 'female' | 'unisex';
  color?: string;
  quantity: number;
  unitPrice: number;
  supplier?: string;
  reorderLevel: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookItem {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  subject: string;
  className: string;
  publisher?: string;
  edition?: string;
  quantity: number;
  unitPrice: number;
  condition: 'new' | 'good' | 'fair' | 'poor';
  supplier?: string;
  reorderLevel: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Registrations (9th & 10th Grade Board Registration) ─────────────────────

export type GradeRegistrationStatus =
  | 'pending'
  | 'admission_sent'
  | 'registered'
  | 'fees_paid'
  | 'completed';

export interface GradeRegistration {
  id: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  rollNumber?: string;
  section: string;
  gradeLevel: 9 | 10; // Only 9th or 10th
  className: string; // "Grade 9" | "Grade 10"
  guardianName: string;
  guardianPhone: string;
  registrationFee: number;
  examFee: number;
  totalFee: number;
  paidAmount: number;
  remainingAmount: number;
  feeStatus: FeeStatus;
  status: GradeRegistrationStatus;
  admissionSentAt?: Date;
  admissionSentBy?: string;
  registeredAt?: Date;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// ── Notifications ───────────────────────────────────────────────────────────

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  module: string;
  isRead: boolean;
  userId?: string;
  createdAt: Date;
}

// ── Activity Logs ───────────────────────────────────────────────────────────

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  details: string;
  entityId?: string;
  entityType?: string;
  timestamp: Date;
}

// ── Settings ────────────────────────────────────────────────────────────────

export interface SchoolProfile {
  name: string;
  logo?: string;
  address: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  phone: string;
  email: string;
  website?: string;
  principalName?: string;
  establishedYear?: number;
}

export interface AcademicYear {
  id: string;
  year: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

// ── Navigation ──────────────────────────────────────────────────────────────

export interface NavItem {
  title: string;
  href: string;
  icon: string;
  roles: UserRole[];
  badge?: number;
  children?: NavItem[];
}

// ── Utility Types ───────────────────────────────────────────────────────────

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface SortState {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterState {
  field: string;
  operator: 'eq' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte';
  value: string | number | boolean;
}
