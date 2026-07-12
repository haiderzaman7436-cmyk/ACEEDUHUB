// ============================================================================
// ACE Educational Hub — Dashboard Data Service (Firestore-Driven)
// ============================================================================

import { collection, getDocs, limit, query, orderBy, getCountFromServer, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ActivityLog } from '@/types';

export interface DashboardData {
  kpis: {
    totalStudents: { value: number; trend: number; isPositive: boolean };
    totalTeachers: { value: number; trend: number; isPositive: boolean };
    monthlyRevenue: { value: number; trend: number; isPositive: boolean };
    boardRegistrations: { value: number; trend: number; isPositive: boolean };
  };
  enrollmentChart: { month: string; students: number }[];
  attendanceChart: { day: string; present: number; absent: number }[];
  revenueChart: { name: string; value: number }[];
  recentActivities: ActivityLog[];
}

export async function fetchDashboardData(): Promise<DashboardData> {
  try {
    // 1. Get real counts from Firestore
    const studentsColl = collection(db, 'students');
    const teachersColl = collection(db, 'teachers');
    const feesColl = collection(db, 'fees');
    const gradeRegsColl = collection(db, 'gradeRegistrations');

    // Aggregate counts
    const [studentsSnap, teachersSnap, gradeRegsSnap] = await Promise.all([
      getCountFromServer(studentsColl),
      getCountFromServer(query(teachersColl, where('status', '==', 'active'))),
      getCountFromServer(gradeRegsColl),
    ]);

    const totalStudents = studentsSnap.data().count;
    const activeTeachers = teachersSnap.data().count;
    const boardRegs = gradeRegsSnap.data().count;

    // Calculate real monthly revenue by summing all paid fee amounts
    const feesSnap = await getDocs(feesColl);
    let totalRevenue = 0;
    const revenueMap: Record<string, number> = {
      'Tuition': 0,
      'Admission': 0,
      'Exam Fees': 0,
      'Registration': 0,
      'Other': 0,
    };

    feesSnap.forEach((doc) => {
      const data = doc.data();
      const paid = data.paidAmount || 0;
      totalRevenue += paid;

      const type = data.feeType || 'other';
      if (type === 'tuition') revenueMap['Tuition'] += paid;
      else if (type === 'admission') revenueMap['Admission'] += paid;
      else if (type === 'exam') revenueMap['Exam Fees'] += paid;
      else if (type === 'registration') revenueMap['Registration'] += paid;
      else revenueMap['Other'] += paid;
    });

    const revenueChart = Object.entries(revenueMap).map(([name, value]) => ({
      name,
      value,
    }));

    // Build student enrollment trend from student admission dates
    // Default months baseline
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthIdx = new Date().getMonth();
    const activeMonths = months.slice(0, currentMonthIdx + 1);

    const enrollmentCounts: Record<string, number> = {};
    activeMonths.forEach((m) => {
      enrollmentCounts[m] = 0;
    });

    const studentDocs = await getDocs(studentsColl);
    studentDocs.forEach((doc) => {
      const data = doc.data();
      const admDateStr = data.admissionDate; // YYYY-MM-DD
      if (admDateStr) {
        const date = new Date(admDateStr);
        const mName = months[date.getMonth()];
        if (enrollmentCounts[mName] !== undefined) {
          enrollmentCounts[mName] += 1;
        }
      }
    });

    // Cumulative sum
    let cumulative = 0;
    const enrollmentChart = activeMonths.map((m) => {
      cumulative += enrollmentCounts[m];
      return {
        month: m,
        students: cumulative || totalStudents, // fallback to totalStudents if all same month
      };
    });

    // 2. Fetch real activities
    const logsQuery = query(
      collection(db, 'activityLogs'),
      orderBy('timestamp', 'desc'),
      limit(5)
    );
    const logsSnap = await getDocs(logsQuery);
    const recentActivities: ActivityLog[] = [];
    logsSnap.forEach((doc) => {
      const data = doc.data();
      recentActivities.push({
        id: doc.id,
        userId: data.userId || 'system',
        userName: data.userName || 'System User',
        action: data.action || 'Performed action',
        module: data.module || 'Dashboard',
        details: data.details || '',
        timestamp: data.timestamp?.toDate() || new Date(),
      });
    });

    // Mock weekly attendance data (realistic values)
    const attendanceChart = [
      { day: 'Mon', present: Math.round(totalStudents * 0.95) || 95, absent: Math.round(totalStudents * 0.05) || 5 },
      { day: 'Tue', present: Math.round(totalStudents * 0.93) || 93, absent: Math.round(totalStudents * 0.07) || 7 },
      { day: 'Wed', present: Math.round(totalStudents * 0.96) || 96, absent: Math.round(totalStudents * 0.04) || 4 },
      { day: 'Thu', present: Math.round(totalStudents * 0.94) || 94, absent: Math.round(totalStudents * 0.06) || 6 },
      { day: 'Fri', present: Math.round(totalStudents * 0.91) || 91, absent: Math.round(totalStudents * 0.09) || 9 },
    ];

    return {
      kpis: {
        totalStudents: { value: totalStudents, trend: totalStudents > 0 ? 100 : 0, isPositive: true },
        totalTeachers: { value: activeTeachers, trend: activeTeachers > 0 ? 100 : 0, isPositive: true },
        monthlyRevenue: { value: totalRevenue, trend: totalRevenue > 0 ? 100 : 0, isPositive: true },
        boardRegistrations: { value: boardRegs, trend: boardRegs > 0 ? 100 : 0, isPositive: true },
      },
      enrollmentChart,
      attendanceChart,
      revenueChart,
      recentActivities,
    };
  } catch (error) {
    console.error('Firestore dashboard fetch error:', error);

    // Return a zeroed-out structure so the UI renders gracefully
    return {
      kpis: {
        totalStudents: { value: 0, trend: 0, isPositive: true },
        totalTeachers: { value: 0, trend: 0, isPositive: true },
        monthlyRevenue: { value: 0, trend: 0, isPositive: true },
        boardRegistrations: { value: 0, trend: 0, isPositive: true },
      },
      enrollmentChart: [
        { month: 'Jan', students: 0 },
        { month: 'Feb', students: 0 },
        { month: 'Mar', students: 0 },
        { month: 'Apr', students: 0 },
        { month: 'May', students: 0 },
        { month: 'Jun', students: 0 },
      ],
      attendanceChart: [
        { day: 'Mon', present: 0, absent: 0 },
        { day: 'Tue', present: 0, absent: 0 },
        { day: 'Wed', present: 0, absent: 0 },
        { day: 'Thu', present: 0, absent: 0 },
        { day: 'Fri', present: 0, absent: 0 },
      ],
      revenueChart: [
        { name: 'Tuition', value: 0 },
        { name: 'Admission', value: 0 },
        { name: 'Exam Fees', value: 0 },
        { name: 'Registration', value: 0 },
        { name: 'Other', value: 0 },
      ],
      recentActivities: [],
    };
  }
}

