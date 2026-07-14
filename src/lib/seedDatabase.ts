import { doc, writeBatch, collection, getDocs, query, documentId, where } from 'firebase/firestore';
import { db } from './firebase';

const generateId = (prefix: string) => `${prefix}-${Math.random().toString(36).substring(2, 9)}`;

export async function seedDatabase(creatorId: string) {
  // First, optional: clear some existing collections if we want a fresh start.
  // For safety, we just append dummy data.

  const batch = writeBatch(db);
  let count = 0;

  const flushBatch = async () => {
    if (count > 0) {
      await batch.commit();
      count = 0;
    }
  };

  const add = (collectionName: string, id: string, data: any) => {
    batch.set(doc(db, collectionName, id), { ...data, createdAt: new Date(), updatedAt: new Date(), createdBy: creatorId });
    count++;
    if (count >= 400) flushBatch();
  };

  const classes = ['Grade 1', 'Grade 5', 'Grade 9', 'Grade 10'];
  const now = new Date().toISOString();

  // 1. Teachers
  const teacherIds = [];
  for (let i = 1; i <= 5; i++) {
    const id = generateId('tch');
    teacherIds.push(id);
    add('teachers', id, {
      firstName: `Teacher${i}`, lastName: 'Demo', employeeId: `EMP-${100+i}`,
      email: `teacher${i}@demo.com`, phone: '0300-0000000', gender: i % 2 === 0 ? 'female' : 'male',
      dateOfBirth: '1990-01-01', joinDate: '2023-01-01', qualification: 'Masters',
      designation: 'Senior Teacher', status: 'active', subjects: ['Math', 'Science'],
      address: 'Demo Address',
      salary: { basic: 50000, allowances: 5000, deductions: 0, netSalary: 55000 }
    });
  }

  // 2. Students (School & Academy)
  const studentIds = [];
  for (let i = 1; i <= 30; i++) {
    const isAcademy = i > 20;
    const cls = classes[i % classes.length];
    const id = generateId('stu');
    studentIds.push(id);
    add('students', id, {
      firstName: `Student${i}`, lastName: isAcademy ? 'Academy' : 'School',
      admissionNumber: `ADM-${2000+i}`, rollNumber: `${i}`,
      category: isAcademy ? 'academy' : 'school',
      className: cls, section: i % 2 === 0 ? 'A' : 'B',
      gender: i % 2 === 0 ? 'male' : 'female', dateOfBirth: '2010-01-01',
      admissionDate: '2024-01-01', status: 'active',
      guardians: [{ name: 'Parent Demo', relation: 'Father', phone: '0300-1111111' }],
      address: 'Demo Street',
      feeEntries: [{ type: 'Tuition Fee', amount: 5000, frequency: 'monthly', isRecurring: true }]
    });

    // 3. Registrations (for Grade 9 and 10)
    if (cls === 'Grade 9' || cls === 'Grade 10') {
      const regId = generateId('reg');
      add('gradeRegistrations', regId, {
        studentId: id, studentName: `Student${i} ${isAcademy ? 'Academy' : 'School'}`,
        admissionNumber: `ADM-${2000+i}`, section: i % 2 === 0 ? 'A' : 'B',
        gradeLevel: cls === 'Grade 9' ? 9 : 10, className: cls,
        guardianName: 'Parent Demo', guardianPhone: '0300-1111111',
        registrationFee: 2000, examFee: 3000, totalFee: 5000,
        paidAmount: i % 3 === 0 ? 5000 : 0, remainingAmount: i % 3 === 0 ? 0 : 5000,
        feeStatus: i % 3 === 0 ? 'paid' : 'pending',
        status: i % 3 === 0 ? 'registered' : 'pending'
      });
    }
  }

  // 4. Inventory
  const invItems = [
    { type: 'stationery', name: 'Notebooks', price: 100 },
    { type: 'stationery', name: 'Pencils', price: 20 },
    { type: 'uniforms', name: 'Summer Uniform M', price: 1500 },
    { type: 'books', name: 'Grade 5 Math', price: 500 }
  ];

  for (const item of invItems) {
    const invId = generateId('inv');
    add(item.type, invId, {
      name: item.name, category: item.type === 'books' ? 'Textbook' : 'General',
      purchasePrice: item.price * 0.8, unitPrice: item.price,
      quantity: 100, soldQuantity: 0, status: 'in_stock'
    });

    // Add some sales for this item
    const saleId = generateId('inv-sale');
    add('inventorySales', saleId, {
      itemId: invId, itemName: item.name, itemType: item.type,
      quantity: 5, unitPrice: item.price, totalAmount: 5 * item.price,
      buyerName: 'Demo Buyer', date: now.split('T')[0], month: 'July 2026'
    });
  }

  // 5. Fees & Invoices
  const months = ['June 2026', 'July 2026'];
  for (const month of months) {
    for (const stuId of studentIds.slice(0, 10)) { // 10 students get fees
      const feeId = generateId('fee');
      add('fees', feeId, {
        studentId: stuId, studentName: 'Demo Student',
        className: 'Grade 5', monthLabel: month, dueDate: '2026-07-10',
        items: [{ description: 'Tuition Fee', amount: 5000 }],
        totalAmount: 5000, paidAmount: month === 'June 2026' ? 5000 : 0,
        status: month === 'June 2026' ? 'paid' : 'pending',
        paymentHistory: []
      });

      const invId = generateId('invc');
      add('invoices', invId, {
        feeId, studentId: stuId, studentName: 'Demo Student',
        invoiceNumber: `INV-${Date.now()}-${Math.floor(Math.random()*100)}`,
        monthLabel: month, totalAmount: 5000, paidAmount: month === 'June 2026' ? 5000 : 0,
        status: month === 'June 2026' ? 'paid' : 'pending',
        issueDate: now, dueDate: '2026-07-10'
      });
    }
  }

  // 6. Exams
  const sessId = generateId('esess');
  add('examSessions', sessId, {
    classId: 'Grade 5', term: '1st_term', academicYear: '2025-2026',
    status: 'published', subjects: ['Math', 'Science', 'English']
  });

  for (const stuId of studentIds.slice(0, 5)) {
    const resId = generateId('res');
    add('examResults', resId, {
      studentId: stuId, studentName: 'Demo Student',
      admissionNumber: 'ADM-200X', classId: 'Grade 5', className: 'Grade 5',
      section: 'A', academicYear: '2025-2026', term: '1st_term',
      examDateFrom: '2026-06-01', examDateTo: '2026-06-10',
      subjects: [
        { subjectName: 'Math', maxMarks: 100, obtainedMarks: 85 },
        { subjectName: 'Science', maxMarks: 100, obtainedMarks: 78 },
        { subjectName: 'English', maxMarks: 100, obtainedMarks: 90 }
      ],
      totalMaxMarks: 300, totalObtainedMarks: 253,
      percentage: 84, grade: 'A', status: 'pass'
    });
  }

  await flushBatch();
}

export async function clearDummyData() {
  const batch = writeBatch(db);
  let count = 0;

  const flushBatch = async () => {
    if (count > 0) {
      await batch.commit();
      count = 0;
    }
  };

  const deleteDummies = async (collName: string, prefix: string) => {
    const q = query(
      collection(db, collName),
      where(documentId(), '>=', prefix),
      where(documentId(), '<', prefix + '\uf8ff')
    );
    const snap = await getDocs(q);
    snap.docs.forEach((d) => {
      batch.delete(d.ref);
      count++;
    });
    if (count >= 400) await flushBatch();
  };

  await deleteDummies('teachers', 'tch-');
  await deleteDummies('students', 'stu-');
  await deleteDummies('gradeRegistrations', 'reg-');
  await deleteDummies('stationery', 'inv-');
  await deleteDummies('uniforms', 'inv-');
  await deleteDummies('books', 'inv-');
  await deleteDummies('inventorySales', 'inv-sale-');
  await deleteDummies('fees', 'fee-');
  await deleteDummies('invoices', 'invc-');
  await deleteDummies('examSessions', 'esess-');
  await deleteDummies('examResults', 'res-');

  await flushBatch();
}
