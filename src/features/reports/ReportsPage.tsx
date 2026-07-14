import { useEffect, useState } from 'react';
import {
  BarChart3, TrendingUp, GraduationCap, DollarSign,
  ClipboardCheck, Download, FileText, Users,
  ArrowUpRight, BookOpen, Printer, Search,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { formatCurrency, formatNumber } from '@/lib/utils';
import { getStudents } from '@/features/students/studentService';
import { getTeachers } from '@/features/teachers/teacherService';
import { getFees } from '@/features/fees/feeService';
import { getExamResultsByStudent } from './examResultService';
import { ResultCard } from './ResultCard';
import { FullReportCard } from './FullReportCard';
import { toast } from 'sonner';
import type { Student, ExamTermResult, FullReportCard as FullReportCardType } from '@/types';
import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell, Tooltip as RechartTooltip,
  XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend,
} from 'recharts';


// ── Color Palette ─────────────────────────────────────────────────────────────

const COLORS = {
  indigo:  '#6366f1',
  emerald: '#10b981',
  amber:   '#f59e0b',
  blue:    '#3b82f6',
  rose:    '#f43f5e',
  violet:  '#8b5cf6',
};
const PIE_COLORS = [COLORS.indigo, COLORS.emerald, COLORS.amber, COLORS.blue, COLORS.rose];

// ── Static month labels ───────────────────────────────────────────────────────

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ── Report Data type ──────────────────────────────────────────────────────────

interface ReportData {
  totalStudents: number;
  totalTeachers: number;
  totalRevenue: number;
  pendingFees: number;
  collectionRate: number;
  activeStudents: number;
  genderBreakdown: { name: string; value: number }[];
  classEnrollment: { class: string; students: number }[];
  feeStatus: { name: string; value: number }[];
  monthlyRevenue: { month: string; collected: number; pending: number }[];
  studentStatusDist: { name: string; value: number }[];
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { color: string; name: string; value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-3 shadow-xl text-xs space-y-1">
      {label && <p className="font-bold text-[hsl(var(--foreground))] mb-1">{label}</p>}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-[hsl(var(--muted-foreground))]">{p.name}:</span>
          <span className="font-semibold text-[hsl(var(--foreground))]">
            {typeof p.value === 'number' && p.value > 1000 ? formatCurrency(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'financial' | 'report_cards'>('overview');

  // Report Cards tab state
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [termResults, setTermResults] = useState<ExamTermResult[]>([]);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [showResultCard, setShowResultCard] = useState(false);
  const [selectedStudentData, setSelectedStudentData] = useState<Student | null>(null);
  // Full report card (if stored)
  const [reportCardData, setReportCardData] = useState<FullReportCardType | null>(null);
  const [showFullCard, setShowFullCard] = useState(false);

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    setIsLoading(true);
    try {
      const [students, teachers, fees] = await Promise.all([
        getStudents(),
        getTeachers(),
        getFees(),
      ]);
      setAllStudents(students);

      // ── Student Analytics ─────────────────────────────────────────────────

      const activeStudents = students.filter((s) => s.status === 'active').length;

      const genderBreakdown = [
        { name: 'Male',   value: students.filter((s) => s.gender === 'male').length },
        { name: 'Female', value: students.filter((s) => s.gender === 'female').length },
        { name: 'Other',  value: students.filter((s) => s.gender === 'other').length },
      ].filter((g) => g.value > 0);

      const classMap: Record<string, number> = {};
      students.forEach((s) => {
        classMap[s.className] = (classMap[s.className] || 0) + 1;
      });
      const classEnrollment = Object.entries(classMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([cls, count]) => ({ class: cls, students: count }));

      const statusMap: Record<string, number> = {};
      students.forEach((s) => {
        statusMap[s.status] = (statusMap[s.status] || 0) + 1;
      });
      const studentStatusDist = Object.entries(statusMap).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }));

      // ── Fee / Financial Analytics ─────────────────────────────────────────

      const totalRevenue = fees.reduce((s, f) => s + f.paidAmount, 0);
      const pendingFees  = fees.reduce((s, f) => s + Math.max(0, f.amount - f.paidAmount), 0);
      const totalBilled  = fees.reduce((s, f) => s + f.amount, 0);
      const collectionRate = totalBilled > 0 ? (totalRevenue / totalBilled) * 100 : 0;

      const feeStatus = [
        { name: 'Paid',    value: fees.filter((f) => f.status === 'paid').length },
        { name: 'Pending', value: fees.filter((f) => f.status === 'pending').length },
        { name: 'Partial', value: fees.filter((f) => f.status === 'partial').length },
        { name: 'Overdue', value: fees.filter((f) => f.status === 'overdue').length },
      ].filter((s) => s.value > 0);

      // Monthly revenue
      const now = new Date();
      const monthlyRevenue = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (6 - i), 1);
        const label = MONTHS_SHORT[d.getMonth()];
        const monthFees = fees.filter((f) => {
          if (!f.paidDate) return false;
          const pd = new Date(f.paidDate);
          return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
        });
        const collected = monthFees.reduce((s, f) => s + f.paidAmount, 0);
        const pending   = monthFees.reduce((s, f) => s + Math.max(0, f.amount - f.paidAmount), 0);
        return { month: label, collected, pending };
      });


      setData({
        totalStudents: students.length,
        totalTeachers: teachers.length,
        totalRevenue,
        pendingFees,
        collectionRate,
        activeStudents,
        genderBreakdown,
        classEnrollment,
        feeStatus,
        monthlyRevenue,
        studentStatusDist,
      });
    } catch (err) {
      toast.error('Failed to load report data.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Class filter for report cards tab
  const [classFilter, setClassFilter] = useState('');

  // Subjects per class — used to build sample report cards
  const getSubjectsForClass = (className: string): string[] => {
    const lower = className.toLowerCase();
    if (lower.includes('9') || lower.includes('matric') || lower.includes('secondary')) {
      return ['Urdu', 'English', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Pak Studies', 'Islamiat', 'Computer'];
    }
    if (lower.includes('8') || lower.includes('7') || lower.includes('6')) {
      return ['Urdu', 'English', 'Mathematics', 'Science', 'Social Studies', 'Islamiat', 'Computer'];
    }
    if (lower.includes('5') || lower.includes('4') || lower.includes('3')) {
      return ['Urdu', 'English', 'Mathematics', 'General Science', 'Social Studies', 'Islamiat'];
    }
    return ['Urdu', 'English', 'Mathematics', 'General Knowledge', 'Islamiat', 'Drawing'];
  };

  // Load exam results for selected student (with sample fallback)
  const handleStudentSelect = async (studentId: string) => {
    setSelectedStudentId(studentId);
    if (!studentId) { setTermResults([]); setSelectedStudentData(null); setReportCardData(null); return; }
    const student = allStudents.find((s) => s.id === studentId) || null;
    setSelectedStudentData(student);
    setIsLoadingResults(true);
    try {
      const results = await getExamResultsByStudent(studentId);
      setTermResults(results);
    } catch {
      // Non-critical — fall back to sample
      setTermResults([]);
    } finally {
      setIsLoadingResults(false);
    }
  };

  const handleBulkPrintClass = () => {
    if (!classFilter) return;
    const studentsToPrint = allStudents.filter(s => s.className === classFilter);
    if (studentsToPrint.length === 0) return;

    const w = window.open('', '_blank', 'width=800,height=1100');
    if (!w) return;
    
    let htmlContent = '';
    
    studentsToPrint.forEach((student, index) => {
      const rc = buildSampleReportCard(student, []);
      const termResults = rc.termResults;
      
      const termHTML = termResults.map((term) => {
        const isSampleTerm = term.totalObtainedMarks === 0;
        const rowsHTML = term.subjects.map((sub, idx) => `
          <tr style="background: ${idx % 2 === 0 ? '#fff' : '#f0fdf4'}">
            <td style="padding: 5px 8px; border: 1px solid #d1d5db; text-align: center;">${idx + 1}</td>
            <td style="padding: 5px 8px; border: 1px solid #d1d5db;">${sub.subjectName}</td>
            <td style="padding: 5px 8px; border: 1px solid #d1d5db; text-align: center; font-weight: 600;">${sub.maxMarks}</td>
            <td style="padding: 5px 8px; border: 1px solid #d1d5db; text-align: center;">
              ${isSampleTerm ? '<div style="border-bottom: 1px solid #94a3b8; width: 30px; margin: 4px auto 0;"></div>' : sub.obtainedMarks}
            </td>
          </tr>
        `).join('');

        return `
          <div>
            <div style="font-size: 11.5px; font-weight: 800; color: #1e3a8a; background: #e0f2fe; padding: 5px 10px; border-radius: 4px; margin: 12px 0 6px; text-align: center;">
              SUBJECT-WISE STATEMENT OF MARKS — ${term.term === '1st_term' ? '1st Term Exam' : term.term === '2nd_term' ? '2nd Term Exam' : term.term}
              ${isSampleTerm ? ' [TEMPLATE]' : ''}
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 4px;">
              <thead>
                <tr style="background: #d1fae5;">
                  <th style="padding: 6px 8px; border: 1px solid #6ee7b7; font-size: 10px; font-weight: 700; color: #065f46; text-align: left; width: 40px;">Sr.</th>
                  <th style="padding: 6px 8px; border: 1px solid #6ee7b7; font-size: 10px; font-weight: 700; color: #065f46; text-align: left;">SUBJECTS</th>
                  <th style="padding: 6px 8px; border: 1px solid #6ee7b7; font-size: 10px; font-weight: 700; color: #065f46; text-align: center;">Max Marks</th>
                  <th style="padding: 6px 8px; border: 1px solid #6ee7b7; font-size: 10px; font-weight: 700; color: #065f46; text-align: center;">Obtained</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHTML}
                <tr style="background: #d1fae5;">
                  <td colspan="2" style="padding: 6px 8px; border: 1px solid #6ee7b7; font-weight: 800; color: #065f46; text-align: right;">TOTAL</td>
                  <td style="padding: 6px 8px; border: 1px solid #6ee7b7; font-weight: 800; text-align: center; color: #065f46;">${term.totalMaxMarks}</td>
                  <td style="padding: 6px 8px; border: 1px solid #6ee7b7; font-weight: 800; text-align: center;">
                    ${isSampleTerm ? '<div style="border-bottom: 1px solid #94a3b8; width: 40px; margin: 4px auto 0;"></div>' : term.totalObtainedMarks}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        `;
      }).join('');

      htmlContent += `
        <div style="page-break-after: ${index === studentsToPrint.length - 1 ? 'auto' : 'always'};">
          <div style="text-align: center; margin-bottom: 12px;">
            <div style="font-size: 22px; font-weight: 900; color: #1e3a8a;">ACE Educational Hub</div>
            <div style="font-size: 10px; color: #64748b;">+923460204447 | Pakistan</div>
            <div style="font-size: 18px; font-weight: 700; color: #16a34a; margin-top: 8px; letter-spacing: 2px;">RESULT CARD</div>
          </div>
          <div style="border-top: 2px solid #16a34a; margin-bottom: 12px;"></div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; font-size: 11px; margin-bottom: 14px;">
            <div style="border-bottom: 1px dotted #e2e8f0; padding-bottom: 3px;"><span style="color: #64748b; font-size: 9.5px; font-weight: 600;">Student Name: </span><span style="font-weight: 700; color: #1e3a8a; font-size: 11.5px;">${student.firstName} ${student.lastName}</span></div>
            <div style="border-bottom: 1px dotted #e2e8f0; padding-bottom: 3px;"><span style="color: #64748b; font-size: 9.5px; font-weight: 600;">Class / Section: </span><span style="font-weight: 700; color: #1e3a8a; font-size: 11.5px;">${student.className} — ${student.section}</span></div>
            <div style="border-bottom: 1px dotted #e2e8f0; padding-bottom: 3px;"><span style="color: #64748b; font-size: 9.5px; font-weight: 600;">Father Name: </span><span style="font-weight: 700; color: #1e3a8a; font-size: 11.5px;">${student.guardians?.[0]?.name || 'N/A'}</span></div>
            <div style="border-bottom: 1px dotted #e2e8f0; padding-bottom: 3px;"><span style="color: #64748b; font-size: 9.5px; font-weight: 600;">Admission No: </span><span style="font-weight: 700; color: #1e3a8a; font-size: 11.5px;">${student.admissionNumber}</span></div>
          </div>
          ${termHTML}
          <div style="display: flex; justify-content: space-between; margin-top: 32px; border-top: 1px dashed #94a3b8; padding-top: 12px; font-size: 11px;">
            <div>
              <div>Prepared By: <span style="font-weight: 700; color: #1e3a8a; border-bottom: 1px solid #1e3a8a;">ACE Hub</span></div>
              <div style="margin-top: 8px;">Checked By: <span style="border-bottom: 1px solid #94a3b8; display: inline-block; width: 120px;"></span></div>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: 700; color: #1e3a8a;">Controller Of Examination</div>
              <div style="color: #64748b;">ACE Hub</div>
            </div>
          </div>
        </div>
      `;
    });

    w.document.write(`
      <html>
        <head>
          <title>Bulk Print Class ${classFilter}</title>
          <style>
            * { margin:0; padding:0; box-sizing:border-box; }
            body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; padding: 24px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>${htmlContent}</body>
      </html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 500);
  };

  // Build sample FullReportCard for a student using class-based subjects and max marks only
  const buildSampleReportCard = (student: Student, existingTermResults: ExamTermResult[]): FullReportCardType => {
    const subjects = getSubjectsForClass(student.className);
    const maxPerSubject = 100;

    // If real results exist use them; otherwise build blank sample with max marks only
    const buildSampleTerm = (term: ExamTermResult['term']): ExamTermResult => ({
      id: `sample-${term}`,
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      admissionNumber: student.admissionNumber,
      classId: student.classId,
      className: student.className,
      section: student.section,
      academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
      term,
      examDateFrom: '',
      examDateTo: '',
      subjects: subjects.map((s) => ({ subjectName: s, maxMarks: maxPerSubject, obtainedMarks: 0 })),
      totalMaxMarks: subjects.length * maxPerSubject,
      totalObtainedMarks: 0,
      percentage: 0,
      grade: '—',
      status: 'pass' as const,
      remarks: 'Exam not yet held',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
    });

    const terms = existingTermResults.length > 0 ? existingTermResults : [
      buildSampleTerm('1st_term'),
      buildSampleTerm('2nd_term'),
      buildSampleTerm('final'),
    ];

    return {
      id: 'preview',
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      admissionNumber: student.admissionNumber,
      classId: student.classId,
      className: student.className,
      section: student.section,
      academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
      dateOfBirth: student.dateOfBirth,
      gender: student.gender,
      admissionDate: student.admissionDate,
      attendance: 0,
      totalLeaves: 0,
      totalAbsents: 0,
      termResults: terms,
      classTests: subjects.map((s) => ({ subjectName: s, totalTests: 0, totalMarks: 0, obtainedMarks: 0, average: 0 })),
      affectiveDomains: [
        { behaviour: 'Attentiveness', rating: 0 },
        { behaviour: 'Honesty', rating: 0 },
        { behaviour: 'Neatness', rating: 0 },
        { behaviour: 'Perseverance', rating: 0 },
        { behaviour: 'Politeness', rating: 0 },
        { behaviour: 'Punctuality', rating: 0 },
        { behaviour: 'Reliability', rating: 0 },
        { behaviour: 'Self-Control', rating: 0 },
        { behaviour: 'Cooperation', rating: 0 },
      ],
      psychomotorDomains: [
        { skill: 'Content Writing', rating: 0 },
        { skill: 'Creativity', rating: 0 },
        { skill: 'Religious Norms', rating: 0 },
        { skill: 'Indoor Games', rating: 0 },
        { skill: 'Outdoor Games', rating: 0 },
        { skill: 'Exercise', rating: 0 },
        { skill: 'Confidence', rating: 0 },
      ],
      teacherComments: '',
      classStrength: allStudents.filter((s) => s.className === student.className).length,
      classAverage: 0,
      classMaxAverage: 0,
      classMinAverage: 0,
      studentPosition: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
    };
  };

  const handleExport = (reportName: string) => {
    toast.success(`${reportName} export triggered. (PDF generation coming soon)`);
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────

  if (isLoading || !data) {
    return (
      <div className="space-y-6 animate-pulse-soft">
        <PageHeader title="School Analytics & Reports" description="Loading data..." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-[hsl(var(--muted))] border border-[hsl(var(--border))]" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-72 rounded-2xl bg-[hsl(var(--muted))] border border-[hsl(var(--border))]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <PageHeader
        title="School Analytics & Reports"
        description="Comprehensive overview of students, finances, attendance, and academics."
      />

        {/* Tab Nav */}
      <div className="flex items-center gap-1 rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--muted))]/30 p-1 w-fit">
        {([
          { id: 'overview',      label: 'Overview',      icon: BarChart3 },
          { id: 'financial',     label: 'Financial',     icon: DollarSign },
          { id: 'report_cards',  label: 'Report Cards',  icon: BookOpen },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === id
                ? 'bg-[hsl(var(--card))] shadow-sm text-[hsl(var(--foreground))]'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: 'Total Students',
                value: formatNumber(data.totalStudents),
                sub: `${data.activeStudents} active`,
                icon: GraduationCap,
                color: 'indigo',
                trend: '+12% this term',
              },
              {
                label: 'Teaching Staff',
                value: formatNumber(data.totalTeachers),
                sub: 'Faculty members',
                icon: Users,
                color: 'blue',
                trend: '+2 this month',
              },
              {
                label: 'Fee Collection',
                value: formatCurrency(data.totalRevenue),
                sub: `${data.collectionRate.toFixed(1)}% rate`,
                icon: DollarSign,
                color: 'emerald',
                trend: 'vs. last month',
              },
              {
                label: 'Pending Balance',
                value: formatCurrency(data.pendingFees),
                sub: 'Outstanding dues',
                icon: TrendingUp,
                color: 'amber',
                trend: 'Due this month',
              },
            ].map(({ label, value, sub, icon: Icon, color, trend }) => {
              const colorMap: Record<string, string> = {
                indigo:  'bg-indigo-500/10 text-indigo-600',
                blue:    'bg-blue-500/10 text-blue-600',
                emerald: 'bg-emerald-500/10 text-emerald-600',
                amber:   'bg-amber-500/10 text-amber-600',
              };
              return (
                <Card key={label} className="border-[hsl(var(--border))]/60 shadow-xs">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colorMap[color]}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                        <ArrowUpRight className="h-3 w-3" /> {trend}
                      </span>
                    </div>
                    <div className="text-2xl font-black text-[hsl(var(--foreground))]">{value}</div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{label}</div>
                    <div className="text-[10px] text-[hsl(var(--muted-foreground))]/70 mt-0.5">{sub}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Class Enrollment + Gender Charts */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-[hsl(var(--border))]/60 shadow-xs md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">Class-wise Enrollment</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.classEnrollment} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} vertical={false} />
                    <XAxis dataKey="class" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <RechartTooltip content={<CustomTooltip />} />
                    <Bar dataKey="students" name="Students" fill={COLORS.indigo} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-[hsl(var(--border))]/60 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">Gender Distribution</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={data.genderBreakdown}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {data.genderBreakdown.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartTooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3 mt-1">
                  {data.genderBreakdown.map((g, idx) => (
                    <div key={g.name} className="flex items-center gap-1.5 text-xs">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                      <span className="text-[hsl(var(--muted-foreground))]">{g.name}</span>
                      <span className="font-bold">{g.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Student Status + Export Actions */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-[hsl(var(--border))]/60 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">Student Status Distribution</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="space-y-3">
                  {data.studentStatusDist.map((s, idx) => {
                    const pct = data.totalStudents > 0 ? (s.value / data.totalStudents) * 100 : 0;
                    const colors = [COLORS.emerald, COLORS.indigo, COLORS.blue, COLORS.amber, COLORS.rose];
                    return (
                      <div key={s.name}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold">{s.name}</span>
                          <span className="text-[hsl(var(--muted-foreground))]">{s.value} ({pct.toFixed(1)}%)</span>
                        </div>
                        <div className="h-2 rounded-full bg-[hsl(var(--muted))]/40">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: colors[idx % colors.length] }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Quick Export Panel */}
            <Card className="border-[hsl(var(--border))]/60 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">Quick Report Exports</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="space-y-2">
                  {[
                    { label: 'Student Enrollment Report', icon: GraduationCap, color: 'text-indigo-600' },
                    { label: 'Teacher Directory Export', icon: Users, color: 'text-blue-600' },
                    { label: 'Monthly Fee Collection', icon: DollarSign, color: 'text-emerald-600' },
                    { label: 'Attendance Summary', icon: ClipboardCheck, color: 'text-amber-600' },
                    { label: 'Exam Results Summary', icon: FileText, color: 'text-violet-600' },
                  ].map(({ label, icon: Icon, color }) => (
                    <button
                      key={label}
                      onClick={() => handleExport(label)}
                      className="w-full flex items-center justify-between gap-3 rounded-xl border border-[hsl(var(--border))]/50 bg-[hsl(var(--card))] px-4 py-3 hover:bg-[hsl(var(--accent))]/10 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`h-4 w-4 ${color}`} />
                        <span className="text-sm font-semibold">{label}</span>
                      </div>
                      <Download className="h-4 w-4 text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))] transition-colors" />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── Financial Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'financial' && (
        <div className="space-y-6">
          {/* Revenue KPIs */}
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Total Collected',    value: formatCurrency(data.totalRevenue),  color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
              { label: 'Pending Balance',    value: formatCurrency(data.pendingFees),   color: 'text-amber-600',   bg: 'bg-amber-500/10' },
              { label: 'Collection Rate',    value: `${data.collectionRate.toFixed(1)}%`, color: 'text-indigo-600',  bg: 'bg-indigo-500/10' },
            ].map(({ label, value, color, bg: _bg }) => (
              <Card key={label} className="border-[hsl(var(--border))]/60 shadow-xs">
                <CardContent className="p-5 text-center">
                  <div className={`text-3xl font-black ${color}`}>{value}</div>
                  <div className="text-sm text-[hsl(var(--muted-foreground))] mt-1">{label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Monthly Revenue Trend */}
          <Card className="border-[hsl(var(--border))]/60 shadow-xs">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold">Monthly Fee Collection Trend</CardTitle>
                <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => handleExport('Monthly Revenue Report')}>
                  <Download className="h-3.5 w-3.5" /> Export
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data.monthlyRevenue} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={COLORS.emerald} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={COLORS.emerald} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={COLORS.amber} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={COLORS.amber} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <RechartTooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Area type="monotone" dataKey="collected" name="Collected (PKR)" stroke={COLORS.emerald} strokeWidth={2.5} fill="url(#colorCollected)" dot={{ r: 3, fill: COLORS.emerald }} />
                  <Area type="monotone" dataKey="pending"   name="Pending (PKR)"   stroke={COLORS.amber}   strokeWidth={2}   fill="url(#colorPending)"   dot={{ r: 3, fill: COLORS.amber   }} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Fee Status Breakdown */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-[hsl(var(--border))]/60 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">Fee Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={data.feeStatus} cx="50%" cy="50%" outerRadius={85} paddingAngle={3} dataKey="value">
                      {data.feeStatus.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartTooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-4 mt-2">
                  {data.feeStatus.map((s, idx) => (
                    <div key={s.name} className="flex items-center gap-1.5 text-xs">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                      <span className="text-[hsl(var(--muted-foreground))]">{s.name}:</span>
                      <span className="font-bold">{s.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-[hsl(var(--border))]/60 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">Financial Report Actions</CardTitle>
              </CardHeader>
              <CardContent className="pb-4 space-y-2">
                {[
                  'Monthly Fee Collection Report',
                  'Overdue Fee Tracker',
                  'Revenue vs. Target Analysis',
                  'Invoice Summary Export',
                  'Fee Structure Report',
                ].map((report) => (
                  <button
                    key={report}
                    onClick={() => handleExport(report)}
                    className="w-full flex items-center justify-between gap-3 rounded-xl border border-[hsl(var(--border))]/50 bg-[hsl(var(--card))] px-4 py-3 hover:bg-[hsl(var(--accent))]/10 transition-all group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm font-semibold">{report}</span>
                    </div>
                    <Download className="h-4 w-4 text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))] transition-colors" />
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── Report Cards Tab ──────────────────────────────────────────────── */}
      {activeTab === 'report_cards' && (
        <div className="space-y-5">
          {/* Header info */}
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 flex items-start gap-3">
            <BookOpen className="h-5 w-5 text-indigo-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-indigo-800">Class-Based Report Cards</p>
              <p className="text-xs text-indigo-600 mt-0.5">
                Select a class and student to generate a printable report card. Where exams have not yet been held,
                the card will show <strong>maximum marks only</strong> as a template — ready to fill in after results.
              </p>
            </div>
          </div>

          <Card className="border-[hsl(var(--border))]/60 shadow-xs">
            <CardContent className="p-5 space-y-4">
              {/* Filters row */}
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                  <input
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    placeholder="Search by student name or ID..."
                    className="flex h-10 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <select
                  value={classFilter}
                  onChange={(e) => { setClassFilter(e.target.value); setSelectedStudentId(''); setSelectedStudentData(null); setTermResults([]); }}
                  className="h-10 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400 min-w-[160px]"
                >
                  <option value="">All Classes</option>
                  {Array.from(new Set(allStudents.map((s) => s.className))).sort().map((cls) => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>

                {classFilter && (
                  <Button
                    onClick={handleBulkPrintClass}
                    className="h-10 gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <Printer className="h-4 w-4" />
                    Bulk Print {classFilter}
                  </Button>
                )}
              </div>

              {/* Two-panel layout: student list + detail */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Student list */}
                <div>
                  <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] mb-2">
                    {classFilter ? `Students in ${classFilter}` : 'All Students'} ({
                      allStudents.filter((s) => {
                        const q = searchQ.toLowerCase();
                        const matchClass = !classFilter || s.className === classFilter;
                        const matchQ = !q || `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) || s.admissionNumber.toLowerCase().includes(q);
                        return matchClass && matchQ;
                      }).length
                    })
                  </p>
                  <div className="max-h-80 overflow-y-auto space-y-1 rounded-xl border border-[hsl(var(--border))]/60 p-2 bg-[hsl(var(--muted))]/20">
                    {allStudents
                      .filter((s) => {
                        const q = searchQ.toLowerCase();
                        const matchClass = !classFilter || s.className === classFilter;
                        const matchQ = !q || `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) || s.admissionNumber.toLowerCase().includes(q);
                        return matchClass && matchQ;
                      })
                      .map((s) => (
                        <button
                          key={s.id}
                          onClick={() => handleStudentSelect(s.id)}
                          className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all ${
                            selectedStudentId === s.id
                              ? 'bg-indigo-600 text-white'
                              : 'hover:bg-[hsl(var(--accent))]/10'
                          }`}
                        >
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold text-xs ${
                            selectedStudentId === s.id ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'
                          }`}>
                            {s.firstName[0]}{s.lastName[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-semibold truncate ${selectedStudentId === s.id ? 'text-white' : ''}`}>
                              {s.firstName} {s.lastName}
                            </div>
                            <div className={`text-xs truncate ${selectedStudentId === s.id ? 'text-indigo-100' : 'text-[hsl(var(--muted-foreground))]'}`}>
                              {s.className} — {s.section} · {s.admissionNumber}
                            </div>
                          </div>
                        </button>
                      ))}
                    {allStudents.filter((s) => !classFilter || s.className === classFilter).length === 0 && (
                      <p className="text-center text-sm text-[hsl(var(--muted-foreground))] py-6">
                        {classFilter ? `No students in ${classFilter}` : 'No students found.'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Student detail + print buttons */}
                <div>
                  {selectedStudentData ? (
                    <div className="rounded-xl border border-[hsl(var(--border))]/60 p-4 space-y-4 h-full">
                      {/* Student summary */}
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-lg">
                          {selectedStudentData.firstName[0]}{selectedStudentData.lastName[0]}
                        </div>
                        <div>
                          <h3 className="font-bold text-[hsl(var(--foreground))]">
                            {selectedStudentData.firstName} {selectedStudentData.lastName}
                          </h3>
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">
                            {selectedStudentData.className} — Section {selectedStudentData.section} · ID: {selectedStudentData.admissionNumber}
                          </p>
                        </div>
                      </div>

                      {/* Exam status */}
                      {isLoadingResults ? (
                        <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
                          Checking exam results...
                        </div>
                      ) : (
                        <div className={`rounded-lg px-3 py-2 text-xs font-semibold border ${
                          termResults.length > 0
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-amber-50 border-amber-200 text-amber-700'
                        }`}>
                          {termResults.length > 0
                            ? `✅ ${termResults.length} term result(s) found — using real data`
                            : `📋 No exam results yet — report card will show class subjects with max marks as template`
                          }
                        </div>
                      )}

                      {/* Subjects preview */}
                      <div>
                        <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] mb-1.5">
                          Subjects for {selectedStudentData.className}:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {getSubjectsForClass(selectedStudentData.className).map((sub) => (
                            <span key={sub} className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 text-[11px] font-medium">
                              {sub}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Print buttons */}
                      <div className="flex flex-col gap-2 pt-2 border-t border-[hsl(var(--border))]/60">
                        <Button
                          onClick={() => {
                            const rc = buildSampleReportCard(selectedStudentData, termResults);
                            setTermResults(rc.termResults);
                            setShowResultCard(true);
                          }}
                          disabled={isLoadingResults}
                          className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <Printer className="h-4 w-4" />
                          Print Result Card
                        </Button>
                        <Button
                          onClick={() => {
                            const rc = buildSampleReportCard(selectedStudentData, termResults);
                            setReportCardData(rc);
                            setShowFullCard(true);
                          }}
                          disabled={isLoadingResults}
                          className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                          <Printer className="h-4 w-4" />
                          Print Full Report Card
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border-2 border-dashed border-[hsl(var(--border))]/60 p-8 flex flex-col items-center justify-center gap-3 text-center h-full min-h-[280px]">
                      <BookOpen className="h-10 w-10 text-[hsl(var(--muted-foreground))]/40" />
                      <div>
                        <p className="text-sm font-semibold text-[hsl(var(--muted-foreground))]">No student selected</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]/70 mt-1">
                          Filter by class and click a student to generate their report card
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Result Card Modal */}
      {showResultCard && selectedStudentData && (
        <ResultCard
          student={selectedStudentData}
          termResults={termResults}
          onClose={() => setShowResultCard(false)}
        />
      )}

      {/* Full Report Card Modal */}
      {showFullCard && reportCardData && selectedStudentData && (
        <FullReportCard
          student={selectedStudentData}
          reportCard={reportCardData}
          onClose={() => setShowFullCard(false)}
        />
      )}

    </div>
  );
}
