import { z } from 'zod';

export const guardianSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  relation: z.enum(['father', 'mother', 'guardian', 'other']),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  occupation: z.string().optional(),
  address: z.string().optional(),
  isEmergencyContact: z.boolean().default(false),
});

export const feeEntrySchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  dueDate: z.string().min(1, 'Due date is required'),
});

export const studentSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['male', 'female', 'other']),
  bloodGroup: z.string().optional(),
  admissionNumber: z.string().min(3, 'Admission number is required'),
  admissionDate: z.string().min(1, 'Admission date is required'),
  classId: z.string().min(1, 'Please select a class'),
  className: z.string().min(1, 'Class name is required'),
  category: z.enum(['school', 'academy']).default('school'),
  section: z.string().min(1, 'Section is required'),
  rollNumber: z.string().optional(),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  photoURL: z.string().optional(),
  guardians: z.array(guardianSchema).min(1, 'At least one guardian is required'),
  documents: z.array(z.any()).default([]),
  feeEntries: z.array(feeEntrySchema).default([]),
  notes: z.string().optional(),
  status: z.enum(['active', 'inactive', 'graduated', 'transferred', 'suspended']).default('active'),
});

export type StudentFormInput = z.infer<typeof studentSchema>;
export type FeeEntryInput = z.infer<typeof feeEntrySchema>;
