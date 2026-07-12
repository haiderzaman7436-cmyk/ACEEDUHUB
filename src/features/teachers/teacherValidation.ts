import { z } from 'zod';

export const classAssignmentSchema = z.object({
  classId: z.string().min(1, 'Class is required'),
  className: z.string().min(1, 'Class name is required'),
  section: z.string().min(1, 'Section is required'),
  subjectName: z.string().min(1, 'Subject name is required'),
});

export const teacherSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  employeeId: z.string().min(3, 'Employee ID is required'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['male', 'female', 'other']),
  qualification: z.string().min(2, 'Qualification is required'),
  specialization: z.string().optional(),
  experience: z.number().min(0, 'Experience must be a positive number'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  email: z.string().email('Invalid email address'),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  photoURL: z.string().optional(),
  assignedClasses: z.array(classAssignmentSchema).default([]),
  joiningDate: z.string().min(1, 'Joining date is required'),
  salary: z.number().min(0, 'Salary must be a positive number'),
  status: z.enum(['active', 'inactive', 'on_leave', 'terminated']).default('active'),
  notes: z.string().optional(),
});

export type TeacherFormInput = z.infer<typeof teacherSchema>;
