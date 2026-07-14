// ============================================================================
// ACE Educational Hub — Exams Module
// Digital marks entry, result compilation, and analytics
// ============================================================================

import { useEffect, useState, useCallback } from 'react';
import {
  BookOpen, PenLine, BarChart3, Users, Trophy,
  CheckCircle2, XCircle, Loader2, Save,
  RefreshCw, X, Printer, AlertTriangle, TrendingUp,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  getExamResults, saveExamResult, computeGrade, computeClassAnalytics,
} from './examService';
import { getStudents } from '@/features/students/studentService';
import type { ExamTermResult, SubjectMark, TermType } from '@/types';
import { useAuth } from '@/features/auth/AuthContext';
import { toast } from 'sonner';

type TabType = 'enter' | 'results' | 'analytics';

const TERMS: { value: TermType; label: string }[] = [
  { value: '1st_term', label: '1st Term' },
  { value: '2nd_term', label: '2nd Term' },
  { value: 'final', label: 'Final Exam' },
];

const DEFAULT_SUBJECTS = [
  'Urdu', 'English', 'Mathematics', 'Science', 'Social Studies', 'Islamiat',
];

function getCurrentAcademicYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return month >= 6 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

function getGradeColor(grade: string): string {
  const map: Record<string, string> = {
    'A+': 'bg-emerald-100 text-emerald-700',
    'A': 'bg-green-100 text-green-700',
    'B+': 'bg-blue-100 text-blue-700',
    'B': 'bg-blue-50 text-blue-600',
    'C': 'bg-amber-100 text-amber-700',
    'D': 'bg-orange-100 text-orange-700',
    'F': 'bg-red-100 text-red-700',
  };
  return map[grade] || 'bg-slate-100 text-slate-600';
}

interface StudentMarkRow {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  marks: Record<string, { obtained: number; max: number }>;
}

export default function ExamsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('enter');

  // Entry tab state
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedTerm, setSelectedTerm] = useState<TermType>('1st_term');
  const [academicYear, setAcademicYear] = useState(getCurrentAcademicYear());
  const [subjects, setSubjects] = useState<string[]>(DEFAULT_SUBJECTS);
  const [newSubject, setNewSubject] = useState('');
  const [maxMarksPerSubject, setMaxMarksPerSubject] = useState<Record<string, number>>({});
  const [markRows, setMarkRows] = useState<StudentMarkRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  // Results tab
  const [results, setResults] = useState<ExamTermResult[]>([]);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [resultsClass, setResultsClass] = useState('');
  const [resultsTerm, setResultsTerm] = useState<TermType>('1st_term');
  const [resultsYear, setResultsYear] = useState(getCurrentAcademicYear());
  const [searchQuery, setSearchQuery] = useState('');

  // Analytics
  const analytics = computeClassAnalytics(results);

  // Load students when class/section changes
  const loadClassStudents = useCallback(async () => {
    if (!selectedClass) return;
    setIsLoadingStudents(true);
    try {
      const allStudents = await getStudents();
      const classStudents = allStudents.filter(
        (s) => s.className === selectedClass
          && (selectedSection ? s.section === selectedSection : true)
          && s.status === 'active'
          && s.category !== 'academy',
      );

      // Build mark rows with default 0 marks
      const rows: StudentMarkRow[] = classStudents.map((s) => ({
        studentId: s.id,
        studentName: `${s.firstName} ${s.lastName}`,
        admissionNumber: s.admissionNumber,
        marks: subjects.reduce((acc, sub) => ({
          ...acc,
          [sub]: { obtained: 0, max: maxMarksPerSubject[sub] || 100 },
        }), {}),
      }));

      // Try to load existing results for pre-fill
      try {
        const existing = await getExamResults(
          classStudents[0]?.classId || selectedClass,
          selectedTerm,
          academicYear,
        );
        existing.forEach((res) => {
          const row = rows.find((r) => r.studentId === res.studentId);
          if (row) {
            res.subjects.forEach((sub) => {
              row.marks[sub.subjectName] = {
                obtained: sub.obtainedMarks,
                max: sub.maxMarks,
              };
            });
          }
        });
      } catch { /* no existing results */ }

      setMarkRows(rows);
    } catch {
      toast.error('Failed to load students.');
    } finally {
      setIsLoadingStudents(false);
    }
  }, [selectedClass, selectedSection, selectedTerm, academicYear, subjects, maxMarksPerSubject]);

  // Load unique classes on mount
  useEffect(() => {
    getStudents().then((all) => {
      const uniqueClasses = Array.from(new Set(all.filter(s => s.category !== 'academy').map((s) => s.className))).sort();
      setClasses(uniqueClasses);
      // Initialize max marks
      const defaults: Record<string, number> = {};
      DEFAULT_SUBJECTS.forEach((s) => (defaults[s] = 100));
      setMaxMarksPerSubject(defaults);
    });
  }, []);

  const loadResults = useCallback(async () => {
    if (!resultsClass) return;
    setIsLoadingResults(true);
    try {
      const data = await getExamResults(resultsClass, resultsTerm, resultsYear);
      setResults(data);
    } catch {
      toast.error('Failed to load results.');
    } finally {
      setIsLoadingResults(false);
    }
  }, [resultsClass, resultsTerm, resultsYear]);

  useEffect(() => { if (activeTab === 'results' || activeTab === 'analytics') { loadResults(); } }, [activeTab, loadResults]);

  const updateMark = (studentId: string, subject: string, obtained: number) => {
    setMarkRows((prev) =>
      prev.map((row) =>
        row.studentId === studentId
          ? { ...row, marks: { ...row.marks, [subject]: { ...row.marks[subject], obtained } } }
          : row,
      ),
    );
  };

  const updateMaxMark = (subject: string, max: number) => {
    setMaxMarksPerSubject((prev) => ({ ...prev, [subject]: max }));
    setMarkRows((prev) =>
      prev.map((row) => ({
        ...row,
        marks: { ...row.marks, [subject]: { ...row.marks[subject], max } },
      })),
    );
  };

  const handleSaveMarks = async () => {
    if (!selectedClass || markRows.length === 0 || !user) return;
    setIsSaving(true);
    try {
      let savedCount = 0;
      for (const row of markRows) {
        const subjectMarks: SubjectMark[] = subjects.map((sub) => ({
          subjectName: sub,
          maxMarks: row.marks[sub]?.max || 100,
          obtainedMarks: row.marks[sub]?.obtained || 0,
        }));
        const totalMax = subjectMarks.reduce((s, sm) => s + sm.maxMarks, 0);
        const totalObtained = subjectMarks.reduce((s, sm) => s + sm.obtainedMarks, 0);
        const percentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;
        const grade = computeGrade(percentage);
        const status: 'pass' | 'fail' = percentage >= 40 ? 'pass' : 'fail';

        await saveExamResult({
          studentId: row.studentId,
          studentName: row.studentName,
          admissionNumber: row.admissionNumber,
          classId: selectedClass,
          className: selectedClass,
          section: selectedSection || 'A',
          academicYear,
          term: selectedTerm,
          examDateFrom: new Date().toISOString().split('T')[0],
          examDateTo: new Date().toISOString().split('T')[0],
          subjects: subjectMarks,
          totalMaxMarks: totalMax,
          totalObtainedMarks: totalObtained,
          percentage,
          grade,
          status,
          createdBy: user.uid || 'admin',
        }, user.uid || 'admin');
        savedCount++;
      }
      toast.success(`Marks saved for ${savedCount} students!`);
      // Switch to results tab
      setResultsClass(selectedClass);
      setResultsTerm(selectedTerm);
      setResultsYear(academicYear);
      setActiveTab('results');
    } catch {
      toast.error('Failed to save marks. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const addSubject = () => {
    const trimmed = newSubject.trim();
    if (!trimmed || subjects.includes(trimmed)) return;
    setSubjects((prev) => [...prev, trimmed]);
    setMaxMarksPerSubject((prev) => ({ ...prev, [trimmed]: 100 }));
    setNewSubject('');
  };

  const removeSubject = (sub: string) => {
    setSubjects((prev) => prev.filter((s) => s !== sub));
  };

  const filteredResults = results.filter(
    (r) =>
      !searchQuery ||
      r.studentName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const printResult = (result: ExamTermResult) => {
    const w = window.open('', '_blank', 'width=800,height=1000');
    if (!w) return;
    const rows = result.subjects.map((sub) =>
      `<tr>
        <td style="padding:6px 10px;border:1px solid #e2e8f0;">${sub.subjectName}</td>
        <td style="padding:6px 10px;border:1px solid #e2e8f0;text-align:center;">${sub.maxMarks}</td>
        <td style="padding:6px 10px;border:1px solid #e2e8f0;text-align:center;font-weight:700;color:${sub.obtainedMarks >= sub.maxMarks * 0.4 ? '#059669' : '#dc2626'};">${sub.obtainedMarks}</td>
        <td style="padding:6px 10px;border:1px solid #e2e8f0;text-align:center;">${Math.round((sub.obtainedMarks / sub.maxMarks) * 100)}%</td>
      </tr>`
    ).join('');
    w.document.write(`
      <html><head><title>Result Card — ${result.studentName}</title>
      <style>* { margin:0; padding:0; box-sizing:border-box; } body { font-family: Arial, sans-serif; font-size:12px; color:#1a1a1a; padding:20px; }</style>
      </head><body>
        <div style="border:2px solid #1d4ed8;border-radius:8px;padding:20px;max-width:700px;margin:auto;">
          <div style="text-align:center;margin-bottom:16px;border-bottom:1px solid #e2e8f0;padding-bottom:12px;">
            <h1 style="font-size:22px;font-weight:900;color:#1e3a8a;">ACE Educational Hub</h1>
            <h2 style="font-size:14px;font-weight:700;color:#334155;margin-top:4px;">RESULT CARD — ${TERMS.find(t => t.value === result.term)?.label || result.term}</h2>
            <p style="font-size:11px;color:#64748b;margin-top:2px;">Academic Year: ${result.academicYear}</p>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;font-size:11px;">
            <div><b>Student:</b> ${result.studentName}</div>
            <div><b>Adm No:</b> ${result.admissionNumber}</div>
            <div><b>Class:</b> ${result.className} — Sec ${result.section}</div>
            <div><b>Academic Year:</b> ${result.academicYear}</div>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:16px;">
            <thead><tr style="background:#dbeafe;">
              <th style="padding:8px 10px;border:1px solid #e2e8f0;text-align:left;">Subject</th>
              <th style="padding:8px 10px;border:1px solid #e2e8f0;text-align:center;">Max Marks</th>
              <th style="padding:8px 10px;border:1px solid #e2e8f0;text-align:center;">Obtained</th>
              <th style="padding:8px 10px;border:1px solid #e2e8f0;text-align:center;">Percentage</th>
            </tr></thead>
            <tbody>${rows}</tbody>
            <tfoot><tr style="background:#f0fdf4;">
              <td style="padding:8px 10px;border:1px solid #e2e8f0;font-weight:800;">TOTAL</td>
              <td style="padding:8px 10px;border:1px solid #e2e8f0;text-align:center;font-weight:800;">${result.totalMaxMarks}</td>
              <td style="padding:8px 10px;border:1px solid #e2e8f0;text-align:center;font-weight:900;color:#1d4ed8;">${result.totalObtainedMarks}</td>
              <td style="padding:8px 10px;border:1px solid #e2e8f0;text-align:center;font-weight:900;">${result.percentage}%</td>
            </tfoot>
          </table>
          <div style="display:flex;gap:12px;justify-content:center;">
            <div style="text-align:center;background:#dbeafe;border-radius:8px;padding:10px 20px;">
              <div style="font-size:20px;font-weight:900;color:#1e3a8a;">${result.grade}</div>
              <div style="font-size:10px;color:#64748b;">Grade</div>
            </div>
            <div style="text-align:center;background:${result.status === 'pass' ? '#dcfce7' : '#fee2e2'};border-radius:8px;padding:10px 20px;">
              <div style="font-size:16px;font-weight:900;color:${result.status === 'pass' ? '#166534' : '#991b1b'};">${result.status.toUpperCase()}</div>
              <div style="font-size:10px;color:#64748b;">Result</div>
            </div>
            <div style="text-align:center;background:#f8fafc;border-radius:8px;padding:10px 20px;">
              <div style="font-size:16px;font-weight:900;color:#334155;">${result.percentage}%</div>
              <div style="font-size:10px;color:#64748b;">Percentage</div>
            </div>
          </div>
          <div style="margin-top:20px;text-align:center;font-size:9px;color:#94a3b8;border-top:1px dashed #e2e8f0;padding-top:10px;">
            Computer-generated result card — ACE Educational Hub | Exam: ${TERMS.find(t => t.value === result.term)?.label}
          </div>
        </div>
      </body></html>
    `);
    w.document.close();
    w.print();
  };

  const tabs = [
    { id: 'enter' as TabType, label: 'Enter Marks', icon: PenLine },
    { id: 'results' as TabType, label: 'View Results', icon: BookOpen },
    { id: 'analytics' as TabType, label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Exam Module"
        description="Digital marks entry, result compilation, and class performance analytics."
        action={{ label: 'Refresh', onClick: loadResults, icon: <RefreshCw className="h-4 w-4" /> }}
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === id
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── ENTER MARKS TAB ──────────────────────────────────────────────── */}
      {activeTab === 'enter' && (
        <div className="space-y-4">
          {/* Config Card */}
          <Card className="border border-slate-200 shadow-sm">
            <CardContent className="p-4 space-y-4">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <PenLine className="h-4 w-4 text-blue-600" /> Exam Configuration
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Class */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Class *</label>
                  <select
                    value={selectedClass}
                    onChange={(e) => { setSelectedClass(e.target.value); setMarkRows([]); }}
                    className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Class</option>
                    {classes.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Section */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Section</label>
                  <select
                    value={selectedSection}
                    onChange={(e) => { setSelectedSection(e.target.value); setMarkRows([]); }}
                    className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Sections</option>
                    {['A', 'B', 'C', 'D'].map((s) => <option key={s} value={s}>Section {s}</option>)}
                  </select>
                </div>

                {/* Term */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Term *</label>
                  <select
                    value={selectedTerm}
                    onChange={(e) => setSelectedTerm(e.target.value as TermType)}
                    className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {TERMS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>

                {/* Academic Year */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Academic Year</label>
                  <Input
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    placeholder="2025-2026"
                    className="border-slate-200"
                  />
                </div>
              </div>

              {/* Subjects management */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-2">Subjects</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {subjects.map((sub) => (
                    <div key={sub} className="flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1">
                      <span className="text-xs font-medium text-blue-700">{sub}</span>
                      <button onClick={() => removeSubject(sub)} className="text-blue-400 hover:text-red-500">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSubject())}
                    placeholder="Add subject (e.g., Computer Science)..."
                    className="border-slate-200 text-sm h-9"
                  />
                  <Button size="sm" onClick={addSubject} className="h-9 bg-blue-600 hover:bg-blue-700 text-white">
                    Add
                  </Button>
                </div>
              </div>

              {/* Load Students button */}
              <Button
                onClick={loadClassStudents}
                disabled={!selectedClass || isLoadingStudents}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              >
                {isLoadingStudents ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                Load Students
              </Button>
            </CardContent>
          </Card>

          {/* Marks Entry Grid */}
          {markRows.length > 0 && (
            <Card className="border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    Marks Entry — {selectedClass} {selectedSection && `Sec ${selectedSection}`} · {TERMS.find(t => t.value === selectedTerm)?.label}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">{markRows.length} students · {subjects.length} subjects</p>
                </div>
                <Button
                  onClick={handleSaveMarks}
                  disabled={isSaving}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save All Marks
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-3 font-semibold text-slate-600 sticky left-0 bg-slate-50 z-10 min-w-[160px]">
                        Student
                      </th>
                      {subjects.map((sub) => (
                        <th key={sub} className="text-center px-3 py-2 font-semibold text-slate-600 min-w-[110px]">
                          <div>{sub}</div>
                          <div className="flex items-center gap-1 mt-1 justify-center">
                            <span className="text-[10px] text-slate-400">Max:</span>
                            <input
                              type="number"
                              value={maxMarksPerSubject[sub] || 100}
                              onChange={(e) => updateMaxMark(sub, Number(e.target.value))}
                              className="w-14 h-6 text-center border border-slate-200 rounded-md text-[10px] font-semibold"
                            />
                          </div>
                        </th>
                      ))}
                      <th className="text-center px-3 py-3 font-semibold text-slate-600 min-w-[80px]">Total</th>
                      <th className="text-center px-3 py-3 font-semibold text-slate-600 min-w-[70px]">%</th>
                      <th className="text-center px-3 py-3 font-semibold text-slate-600 min-w-[60px]">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {markRows.map((row) => {
                      const totalMax = subjects.reduce((s, sub) => s + (row.marks[sub]?.max || 100), 0);
                      const totalObtained = subjects.reduce((s, sub) => s + (row.marks[sub]?.obtained || 0), 0);
                      const pct = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;
                      const grade = computeGrade(pct);
                      return (
                        <tr key={row.studentId} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-2 sticky left-0 bg-white z-10">
                            <div className="font-semibold text-slate-800">{row.studentName}</div>
                            <div className="text-[10px] text-slate-400">{row.admissionNumber}</div>
                          </td>
                          {subjects.map((sub) => (
                            <td key={sub} className="px-2 py-2 text-center">
                              <input
                                type="number"
                                min={0}
                                max={row.marks[sub]?.max || 100}
                                value={row.marks[sub]?.obtained || 0}
                                onChange={(e) => updateMark(row.studentId, sub, Number(e.target.value))}
                                className={`w-16 h-8 text-center border rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors ${
                                  (row.marks[sub]?.obtained || 0) >= (row.marks[sub]?.max || 100) * 0.4
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                    : 'border-red-200 bg-red-50 text-red-700'
                                }`}
                              />
                            </td>
                          ))}
                          <td className="px-3 py-2 text-center font-bold text-slate-800">{totalObtained}/{totalMax}</td>
                          <td className="px-3 py-2 text-center font-bold text-blue-700">{pct}%</td>
                          <td className="px-3 py-2 text-center">
                            <Badge className={`text-xs font-bold ${getGradeColor(grade)}`}>{grade}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {markRows.length === 0 && selectedClass && !isLoadingStudents && (
            <Card className="border border-dashed border-slate-200">
              <CardContent className="p-12 text-center">
                <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto mb-3" />
                <p className="font-semibold text-slate-700">No active students found</p>
                <p className="text-xs text-slate-400 mt-1">
                  Click "Load Students" to load class roster for marks entry.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── VIEW RESULTS TAB ────────────────────────────────────────────── */}
      {activeTab === 'results' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <Card className="border border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-3 items-end">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Class</label>
                  <select
                    value={resultsClass}
                    onChange={(e) => setResultsClass(e.target.value)}
                    className="h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Class</option>
                    {classes.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Term</label>
                  <select
                    value={resultsTerm}
                    onChange={(e) => setResultsTerm(e.target.value as TermType)}
                    className="h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {TERMS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Academic Year</label>
                  <Input
                    value={resultsYear}
                    onChange={(e) => setResultsYear(e.target.value)}
                    className="border-slate-200 w-32"
                  />
                </div>
                <Button onClick={loadResults} disabled={!resultsClass || isLoadingResults} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-10">
                  {isLoadingResults ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
                  Load Results
                </Button>
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search student..."
                  className="border-slate-200 h-10 w-48"
                />
              </div>
            </CardContent>
          </Card>

          {/* Results Table */}
          {isLoadingResults ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : filteredResults.length > 0 ? (
            <Card className="border border-slate-200 shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-center px-3 py-3 font-semibold text-slate-500">Rank</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-500">Student</th>
                      <th className="text-center px-3 py-3 font-semibold text-slate-500">Total</th>
                      <th className="text-center px-3 py-3 font-semibold text-slate-500">Percentage</th>
                      <th className="text-center px-3 py-3 font-semibold text-slate-500">Grade</th>
                      <th className="text-center px-3 py-3 font-semibold text-slate-500">Result</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredResults.map((res, idx) => (
                      <tr key={res.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-3 text-center">
                          <div className={`h-7 w-7 rounded-full flex items-center justify-center mx-auto font-bold text-xs ${
                            idx === 0 ? 'bg-amber-100 text-amber-700' :
                            idx === 1 ? 'bg-slate-100 text-slate-600' :
                            idx === 2 ? 'bg-orange-50 text-orange-600' :
                            'bg-slate-50 text-slate-500'
                          }`}>
                            {idx + 1}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">{res.studentName}</div>
                          <div className="text-[10px] text-slate-400">{res.admissionNumber} · {res.className} Sec {res.section}</div>
                        </td>
                        <td className="px-3 py-3 text-center font-semibold text-slate-700">
                          {res.totalObtainedMarks}/{res.totalMaxMarks}
                        </td>
                        <td className="px-3 py-3 text-center font-bold text-blue-700">{res.percentage}%</td>
                        <td className="px-3 py-3 text-center">
                          <Badge className={`text-xs font-bold ${getGradeColor(res.grade)}`}>{res.grade}</Badge>
                        </td>
                        <td className="px-3 py-3 text-center">
                          {res.status === 'pass' ? (
                            <span className="flex items-center gap-1 justify-center text-emerald-600 font-semibold text-xs">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Pass
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 justify-center text-red-600 font-semibold text-xs">
                              <XCircle className="h-3.5 w-3.5" /> Fail
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => printResult(res)}
                            className="h-7 gap-1 text-xs text-slate-500 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Printer className="h-3.5 w-3.5" /> Print
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ) : resultsClass ? (
            <Card className="border border-dashed border-slate-200">
              <CardContent className="p-12 text-center">
                <BookOpen className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="font-semibold text-slate-600">No results found</p>
                <p className="text-xs text-slate-400 mt-1">
                  Enter marks from the "Enter Marks" tab to see results here.
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}

      {/* ── ANALYTICS TAB ────────────────────────────────────────────────── */}
      {activeTab === 'analytics' && (
        <div className="space-y-4">
          {/* Load same config as results */}
          <Card className="border border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-3 items-end">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Class</label>
                  <select
                    value={resultsClass}
                    onChange={(e) => setResultsClass(e.target.value)}
                    className="h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Class</option>
                    {classes.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Term</label>
                  <select
                    value={resultsTerm}
                    onChange={(e) => setResultsTerm(e.target.value as TermType)}
                    className="h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {TERMS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <Button onClick={loadResults} disabled={!resultsClass || isLoadingResults} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-10">
                  {isLoadingResults ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
                  Load Analytics
                </Button>
              </div>
            </CardContent>
          </Card>

          {results.length > 0 && (
            <>
              {/* Analytics Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border border-slate-200 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Total Students</div>
                        <div className="text-lg font-bold text-slate-800">{results.length}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border border-slate-200 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-violet-600" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Class Average</div>
                        <div className="text-lg font-bold text-violet-700">{analytics.classAverage}%</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border border-slate-200 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Pass Rate</div>
                        <div className="text-lg font-bold text-emerald-700">{analytics.passRate}%</div>
                        <div className="text-[10px] text-slate-400">{analytics.passCount} passed · {analytics.failCount} failed</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border border-slate-200 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
                        <Trophy className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Top Scorer</div>
                        <div className="text-sm font-bold text-amber-700 truncate max-w-[100px]">{analytics.topScorer?.studentName || '—'}</div>
                        {analytics.topScorer && <div className="text-[10px] text-slate-400">{analytics.topScorer.percentage}% · Grade {analytics.topScorer.grade}</div>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Pass/Fail bar */}
              <Card className="border border-slate-200 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-slate-700">Pass/Fail Distribution</h3>
                    <span className="text-xs text-slate-400">{results.length} total students</span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-emerald-500 rounded-l-full transition-all duration-700"
                      style={{ width: `${analytics.passRate}%` }}
                    />
                    <div
                      className="h-full bg-red-400 rounded-r-full transition-all duration-700"
                      style={{ width: `${100 - analytics.passRate}%` }}
                    />
                  </div>
                  <div className="flex gap-4 mt-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <div className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span>Pass: <strong>{analytics.passCount}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <div className="h-2 w-2 rounded-full bg-red-400" />
                      <span>Fail: <strong>{analytics.failCount}</strong></span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Grade distribution */}
              <Card className="border border-slate-200 shadow-sm">
                <CardContent className="p-4">
                  <h3 className="text-sm font-bold text-slate-700 mb-4">Grade Distribution</h3>
                  <div className="flex flex-wrap gap-3">
                    {['A+', 'A', 'B+', 'B', 'C', 'D', 'F'].map((grade) => {
                      const count = results.filter((r) => r.grade === grade).length;
                      const pct = results.length > 0 ? Math.round((count / results.length) * 100) : 0;
                      return (
                        <div key={grade} className="flex flex-col items-center gap-1">
                          <div className="h-16 w-10 bg-slate-100 rounded-lg flex flex-col-reverse overflow-hidden">
                            <div
                              className="bg-blue-500 rounded-lg transition-all duration-700"
                              style={{ height: `${pct}%` }}
                            />
                          </div>
                          <Badge className={`text-xs ${getGradeColor(grade)}`}>{grade}</Badge>
                          <span className="text-[10px] text-slate-500 font-semibold">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {results.length === 0 && resultsClass && !isLoadingResults && (
            <Card className="border border-dashed border-slate-200">
              <CardContent className="p-12 text-center">
                <BarChart3 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="font-semibold text-slate-600">No data to analyze</p>
                <p className="text-xs text-slate-400 mt-1">Enter and save marks first.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
