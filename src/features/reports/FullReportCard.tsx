// ============================================================================
// ACE Educational Hub — Full Comprehensive Report Card (Printable)
// Matches image: Student Report Card with all domains + comparison block
// ============================================================================

import { useRef } from 'react';
import { Printer, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FullReportCard as FullReportCardType, Student } from '@/types';
import { APP_NAME } from '@/lib/constants';
import { calcGrade } from './examResultService';

interface FullReportCardProps {
  student: Student;
  reportCard: FullReportCardType;
  onClose: () => void;
}



export function FullReportCard({ student, reportCard, onClose }: FullReportCardProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const w = window.open('', '_blank', 'width=960,height=1200');
    if (!w) return;
    w.document.write(`
      <html>
        <head>
          <title>Student Report Card — ${student.firstName} ${student.lastName}</title>
          <style>
            * { margin:0; padding:0; box-sizing:border-box; }
            body { font-family: Arial, sans-serif; font-size: 10px; color: #1a1a1a; padding: 16px; }
            .header { text-align: center; margin-bottom: 8px; }
            .school-name { font-size: 20px; font-weight: 900; color: #1e3a8a; }
            .title { font-size: 14px; font-weight: 700; color: #1d4ed8; margin: 4px 0; }
            .divider { border-top: 2px solid #1d4ed8; margin: 6px 0; }
            table { border-collapse: collapse; }
            th, td { border: 1px solid #d1d5db; padding: 3px 5px; font-size: 9.5px; }
            thead tr { background: #dbeafe; }
            th { font-weight: 700; color: #1e3a8a; }
            .section-box { border: 1.5px solid #1d4ed8; border-radius: 6px; padding: 6px; margin-bottom: 8px; }
            .section-title { font-size: 10px; font-weight: 800; color: #1e3a8a; background: #dbeafe; padding: 3px 8px; border-radius: 3px; margin-bottom: 5px; }
            .pass { color: #16a34a; font-weight: 800; }
            .fail { color: #dc2626; font-weight: 800; }
            .star { color: #f59e0b; }
            .no-star { color: #d1d5db; }
            .footer { display: flex; justify-content: space-between; margin-top: 20px; border-top: 1px dashed #94a3b8; padding-top: 8px; font-size: 9.5px; }
          </style>
        </head>
        <body>${content.innerHTML}</body>
      </html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 400);
  };

  const rc = reportCard;

  // Aggregate overall performance across terms
  const terms = rc.termResults;
  const totalMaxAll = terms.reduce((s, t) => s + t.totalMaxMarks, 0);
  const totalObtAll = terms.reduce((s, t) => s + t.totalObtainedMarks, 0);
  const overallPct = totalMaxAll > 0 ? (totalObtAll / totalMaxAll) * 100 : 0;
  const overallGrade = calcGrade(overallPct);

  // Get unique subjects across all terms
  const allSubjects = Array.from(
    new Set(terms.flatMap((t) => t.subjects.map((s) => s.subjectName))),
  );

  const avgAffective = rc.affectiveDomains.length > 0
    ? rc.affectiveDomains.reduce((s, d) => s + d.rating, 0) / rc.affectiveDomains.length
    : 0;

  const avgPsychomotor = rc.psychomotorDomains.length > 0
    ? rc.psychomotorDomains.reduce((s, d) => s + d.rating, 0) / rc.psychomotorDomains.length
    : 0;

  const overallRating = ((avgAffective + avgPsychomotor) / 2);
  const overallScore = ((overallPct + (overallRating / 5) * 100) / 2).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl max-h-[95vh] flex flex-col z-10 animate-scale-in bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between bg-blue-700 px-5 py-3">
          <div>
            <h2 className="font-bold text-white text-base">Student Report Card</h2>
            <p className="text-blue-100 text-xs">Full comprehensive report — {rc.academicYear}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handlePrint} className="h-8 gap-1.5 text-xs bg-white text-blue-700 hover:bg-blue-50">
              <Printer className="h-3.5 w-3.5" /> Print Report Card
            </Button>
            <button onClick={onClose} className="text-white/70 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div ref={printRef} style={{ maxWidth: '850px', margin: '0 auto', fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#1a1a1a' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <div style={{ width: '42px', height: '42px', background: '#1d4ed8', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '16px', fontWeight: 900, marginBottom: '4px' }}>A</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#1e3a8a' }}>{APP_NAME}</div>
              <div style={{ fontSize: '9.5px', color: '#64748b' }}>"Your target line here"</div>
              <div style={{ fontSize: '9px', color: '#64748b' }}>+923460204447 | Pakistan | www.aceedu.com</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#1d4ed8', marginTop: '5px' }}>Student Report Card</div>
            </div>
            <div style={{ borderTop: '2px solid #1d4ed8', marginBottom: '8px' }} />

            {/* Student Info Header Bar */}
            <div style={{ border: '1.5px solid #1d4ed8', borderRadius: '6px', padding: '6px 10px', marginBottom: '8px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ width: '60px', height: '70px', background: '#e0e7ef', borderRadius: '6px', border: '2px solid #1d4ed8', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                {student.photoURL ? <img src={student.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} /> : '🎓'}
              </div>
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '3px 12px', fontSize: '10px' }}>
                {[
                  ['REGISTRATION', student.admissionNumber],
                  ['DATE OF BIRTH', student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('en-PK', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A'],
                  ['ATTENDANCE', `${rc.attendance}%`],
                  ['NAME', `${student.firstName} ${student.lastName}`],
                  ['GENDER', student.gender?.charAt(0).toUpperCase() + student.gender?.slice(1)],
                  ['LEAVES', String(rc.totalLeaves)],
                  ['CLASS', `${student.className}`],
                  ['ADMISSION DATE', student.admissionDate ? new Date(student.admissionDate).toLocaleDateString('en-PK', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A'],
                  ['ABSENTS', String(rc.totalAbsents)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div style={{ color: '#94a3b8', fontSize: '8px', fontWeight: 700 }}>{label}</div>
                    <div style={{ fontWeight: 700, color: '#1e3a8a', fontSize: '10.5px' }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cognitive Domain — Examinations */}
            <div style={{ border: '1.5px solid #1d4ed8', borderRadius: '6px', padding: '6px', marginBottom: '8px' }}>
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#1e3a8a', background: '#dbeafe', padding: '3px 8px', borderRadius: '3px', marginBottom: '5px' }}>
                🎓 COGNITIVE DOMAIN — EXAMINATION
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px' }}>
                  <thead>
                    <tr style={{ background: '#dbeafe' }}>
                      <th style={{ padding: '4px 6px', border: '1px solid #93c5fd', textAlign: 'left', color: '#1e3a8a', minWidth: '80px' }}>EXAMINATIONS</th>
                      {allSubjects.map((s) => (
                        <th key={s} style={{ padding: '4px 4px', border: '1px solid #93c5fd', textAlign: 'center', color: '#1e3a8a', fontSize: '8.5px', writingMode: 'vertical-rl', height: '50px' }}>{s}</th>
                      ))}
                      <th style={{ padding: '4px 6px', border: '1px solid #93c5fd', textAlign: 'center', color: '#1e3a8a' }}>OBT MARKS</th>
                      <th style={{ padding: '4px 6px', border: '1px solid #93c5fd', textAlign: 'center', color: '#1e3a8a' }}>TOTAL MARKS</th>
                      <th style={{ padding: '4px 6px', border: '1px solid #93c5fd', textAlign: 'center', color: '#1e3a8a' }}>PERCENTAGE</th>
                      <th style={{ padding: '4px 6px', border: '1px solid #93c5fd', textAlign: 'center', color: '#1e3a8a' }}>GRADE</th>
                      <th style={{ padding: '4px 6px', border: '1px solid #93c5fd', textAlign: 'center', color: '#1e3a8a' }}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {terms.map((term, ti) => {
                      const termLabel = { '1st_term': '1st Term Exam', '2nd_term': '2nd Term Exam', final: 'Final Exams' }[term.term];
                      const grade = term.grade || calcGrade(term.percentage);
                      return (
                        <tr key={term.id} style={{ background: ti % 2 === 0 ? '#fff' : '#f0f7ff' }}>
                          <td style={{ padding: '3px 6px', border: '1px solid #e2e8f0', fontWeight: 600 }}>{termLabel}</td>
                          {allSubjects.map((subj) => {
                            const s = term.subjects.find((x) => x.subjectName === subj);
                            return (
                              <td key={subj} style={{ padding: '3px 4px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                                {s ? s.obtainedMarks : '—'}
                              </td>
                            );
                          })}
                          <td style={{ padding: '3px 6px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 700 }}>{term.totalObtainedMarks}</td>
                          <td style={{ padding: '3px 6px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{term.totalMaxMarks}</td>
                          <td style={{ padding: '3px 6px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{term.percentage.toFixed(1)}%</td>
                          <td style={{ padding: '3px 6px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 700 }}>{grade}</td>
                          <td style={{ padding: '3px 6px', border: '1px solid #e2e8f0', textAlign: 'center', color: term.status === 'pass' ? '#16a34a' : '#dc2626', fontWeight: 800 }}>{term.status.toUpperCase()}</td>
                        </tr>
                      );
                    })}
                    {/* Overall Performance row */}
                    <tr style={{ background: '#dbeafe', fontWeight: 800 }}>
                      <td style={{ padding: '3px 6px', border: '1px solid #93c5fd', color: '#1d4ed8' }}>OVER ALL PERFORMANCE</td>
                      {allSubjects.map((subj) => {
                        const total = terms.reduce((s, t) => {
                          const m = t.subjects.find((x) => x.subjectName === subj);
                          return s + (m ? m.obtainedMarks : 0);
                        }, 0);
                        return (
                          <td key={subj} style={{ padding: '3px 4px', border: '1px solid #93c5fd', textAlign: 'center', color: '#1d4ed8' }}>{total}</td>
                        );
                      })}
                      <td style={{ padding: '3px 6px', border: '1px solid #93c5fd', textAlign: 'center', color: '#1d4ed8' }}>{totalObtAll}</td>
                      <td style={{ padding: '3px 6px', border: '1px solid #93c5fd', textAlign: 'center', color: '#1d4ed8' }}>{totalMaxAll}</td>
                      <td style={{ padding: '3px 6px', border: '1px solid #93c5fd', textAlign: 'center', color: '#1d4ed8' }}>{overallPct.toFixed(1)}%</td>
                      <td style={{ padding: '3px 6px', border: '1px solid #93c5fd', textAlign: 'center', color: '#1d4ed8' }}>{overallGrade}</td>
                      <td style={{ padding: '3px 6px', border: '1px solid #93c5fd', textAlign: 'center', color: overallPct >= 40 ? '#16a34a' : '#dc2626' }}>{overallPct >= 40 ? 'PASS' : 'FAIL'}</td>
                    </tr>
                    {/* Subject-wise totals */}
                    <tr style={{ background: '#f0f7ff', fontSize: '9px', color: '#475569' }}>
                      <td style={{ padding: '2px 6px', border: '1px solid #e2e8f0', fontWeight: 700 }}>TOTAL MARKS</td>
                      {allSubjects.map((subj) => {
                        const total = terms.reduce((s, t) => {
                          const m = t.subjects.find((x) => x.subjectName === subj);
                          return s + (m ? m.maxMarks : 0);
                        }, 0);
                        return <td key={subj} style={{ padding: '2px 4px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{total}</td>;
                      })}
                      <td colSpan={5} />
                    </tr>
                    <tr style={{ background: '#f0f7ff', fontSize: '9px', color: '#475569' }}>
                      <td style={{ padding: '2px 6px', border: '1px solid #e2e8f0', fontWeight: 700 }}>PERCENTAGE</td>
                      {allSubjects.map((subj) => {
                        const obt = terms.reduce((s, t) => {
                          const m = t.subjects.find((x) => x.subjectName === subj);
                          return s + (m ? m.obtainedMarks : 0);
                        }, 0);
                        const max = terms.reduce((s, t) => {
                          const m = t.subjects.find((x) => x.subjectName === subj);
                          return s + (m ? m.maxMarks : 0);
                        }, 0);
                        const pct = max > 0 ? ((obt / max) * 100).toFixed(1) : '0';
                        return <td key={subj} style={{ padding: '2px 4px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{pct}%</td>;
                      })}
                      <td colSpan={5} />
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Comparison with Class */}
              <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '9.5px', padding: '4px 8px', background: '#f0f9ff', borderRadius: '4px', border: '1px solid #bae6fd' }}>
                <span><strong>COMPARISON WITH CLASS</strong></span>
                <span>CLASS STRENGTH: <strong>{rc.classStrength} Students</strong></span>
                <span>CLASS AVERAGE: <strong>{rc.classAverage.toFixed(1)}%</strong></span>
                <span>CLASS MAX AVERAGE: <strong>{rc.classMaxAverage.toFixed(1)}%</strong></span>
                <span>CLASS MIN AVERAGE: <strong>{rc.classMinAverage.toFixed(1)}%</strong></span>
                <span>STUDENT POSITION: <strong style={{ color: '#1d4ed8' }}>{rc.studentPosition}{['st', 'nd', 'rd'][rc.studentPosition - 1] || 'th'} out of {rc.classStrength}</strong></span>
              </div>

              {/* Score Summary */}
              <div style={{ display: 'flex', gap: '16px', marginTop: '6px', fontSize: '9.5px', padding: '4px 8px', background: '#fff', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                <span>TOTAL SCORE: <strong>{totalObtAll} / {totalMaxAll}</strong></span>
                <span>PERCENTAGE: <strong style={{ color: '#1d4ed8' }}>{overallPct.toFixed(1)}%</strong></span>
                <span>GRADE: <strong style={{ color: '#16a34a' }}>{overallGrade}</strong></span>
                <span>STATUS: <strong style={{ color: overallPct >= 40 ? '#16a34a' : '#dc2626' }}>{overallPct >= 40 ? 'PASS' : 'FAIL'}</strong></span>
              </div>
            </div>

            {/* Bottom 3-column row: Class Tests | Affective | Psychomotor */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              {/* Class Tests */}
              <div style={{ border: '1.5px solid #1d4ed8', borderRadius: '6px', padding: '6px' }}>
                <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#1e3a8a', background: '#dbeafe', padding: '3px 8px', borderRadius: '3px', marginBottom: '5px' }}>
                  🎓 COGNITIVE DOMAIN — CLASS TESTS
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
                  <thead>
                    <tr style={{ background: '#dbeafe' }}>
                      <th style={{ padding: '3px 4px', border: '1px solid #93c5fd', textAlign: 'left', color: '#1e3a8a' }}>SUBJECTS</th>
                      <th style={{ padding: '3px 4px', border: '1px solid #93c5fd', textAlign: 'center', color: '#1e3a8a' }}>Tests</th>
                      <th style={{ padding: '3px 4px', border: '1px solid #93c5fd', textAlign: 'center', color: '#1e3a8a' }}>Max</th>
                      <th style={{ padding: '3px 4px', border: '1px solid #93c5fd', textAlign: 'center', color: '#1e3a8a' }}>Obt</th>
                      <th style={{ padding: '3px 4px', border: '1px solid #93c5fd', textAlign: 'center', color: '#1e3a8a' }}>Avg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rc.classTests.map((ct, i) => (
                      <tr key={ct.subjectName} style={{ background: i % 2 === 0 ? '#fff' : '#f0f7ff' }}>
                        <td style={{ padding: '2px 4px', border: '1px solid #e2e8f0' }}>{ct.subjectName}</td>
                        <td style={{ padding: '2px 4px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{ct.totalTests}</td>
                        <td style={{ padding: '2px 4px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{ct.totalMarks}</td>
                        <td style={{ padding: '2px 4px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{ct.obtainedMarks}</td>
                        <td style={{ padding: '2px 4px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{ct.average}%</td>
                      </tr>
                    ))}
                    {rc.classTests.length > 0 && (
                      <tr style={{ background: '#dbeafe', fontWeight: 700, fontSize: '9px' }}>
                        <td style={{ padding: '2px 4px', border: '1px solid #93c5fd', color: '#1e3a8a' }}>OVERALL</td>
                        <td style={{ padding: '2px 4px', border: '1px solid #93c5fd', textAlign: 'center', color: '#1e3a8a' }}>{rc.classTests.reduce((s, c) => s + c.totalTests, 0)}</td>
                        <td style={{ padding: '2px 4px', border: '1px solid #93c5fd', textAlign: 'center', color: '#1e3a8a' }}>{rc.classTests.reduce((s, c) => s + c.totalMarks, 0)}</td>
                        <td style={{ padding: '2px 4px', border: '1px solid #93c5fd', textAlign: 'center', color: '#1e3a8a' }}>{rc.classTests.reduce((s, c) => s + c.obtainedMarks, 0)}</td>
                        <td style={{ padding: '2px 4px', border: '1px solid #93c5fd', textAlign: 'center', color: '#1e3a8a' }}>
                          {rc.classTests.length > 0 ? (rc.classTests.reduce((s, c) => s + c.average, 0) / rc.classTests.length).toFixed(0) : 0}%
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Affective Domains */}
              <div style={{ border: '1.5px solid #f59e0b', borderRadius: '6px', padding: '6px' }}>
                <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#92400e', background: '#fef3c7', padding: '3px 8px', borderRadius: '3px', marginBottom: '5px' }}>
                  🌟 AFFECTIVE DOMAINS
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
                  <thead>
                    <tr style={{ background: '#fef3c7' }}>
                      <th style={{ padding: '3px 4px', border: '1px solid #fde68a', textAlign: 'left', color: '#92400e' }}>BEHAVIOURS</th>
                      <th style={{ padding: '3px 4px', border: '1px solid #fde68a', textAlign: 'center', color: '#92400e' }}>RATING 1-5</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rc.affectiveDomains.map((d, i) => (
                      <tr key={d.behaviour} style={{ background: i % 2 === 0 ? '#fff' : '#fffbeb' }}>
                        <td style={{ padding: '2px 4px', border: '1px solid #fde68a' }}>{d.behaviour}</td>
                        <td style={{ padding: '2px 4px', border: '1px solid #fde68a', textAlign: 'center' }}>
                          {'★'.repeat(d.rating)}{'☆'.repeat(5 - d.rating)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop: '6px', fontSize: '9px', color: '#92400e', fontWeight: 700 }}>
                  OVERALL RATING: {'★'.repeat(Math.round(avgAffective))} &nbsp; SCORE: {(avgAffective / 5 * 100).toFixed(0)}%
                </div>
              </div>

              {/* Psychomotor Domains */}
              <div style={{ border: '1.5px solid #10b981', borderRadius: '6px', padding: '6px' }}>
                <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#065f46', background: '#d1fae5', padding: '3px 8px', borderRadius: '3px', marginBottom: '5px' }}>
                  💪 PSYCHOMOTOR DOMAINS
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
                  <thead>
                    <tr style={{ background: '#d1fae5' }}>
                      <th style={{ padding: '3px 4px', border: '1px solid #6ee7b7', textAlign: 'left', color: '#065f46' }}>SKILLS</th>
                      <th style={{ padding: '3px 4px', border: '1px solid #6ee7b7', textAlign: 'center', color: '#065f46' }}>RATING 1-5</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rc.psychomotorDomains.map((d, i) => (
                      <tr key={d.skill} style={{ background: i % 2 === 0 ? '#fff' : '#f0fdf4' }}>
                        <td style={{ padding: '2px 4px', border: '1px solid #bbf7d0' }}>{d.skill}</td>
                        <td style={{ padding: '2px 4px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                          {'★'.repeat(d.rating)}{'☆'.repeat(5 - d.rating)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop: '6px', fontSize: '9px', color: '#065f46', fontWeight: 700 }}>
                  OVERALL RATING: {'★'.repeat(Math.round(avgPsychomotor))} &nbsp; SCORE: {(avgPsychomotor / 5 * 100).toFixed(0)}%
                </div>
              </div>
            </div>

            {/* Comments Block */}
            {rc.teacherComments && (
              <div style={{ border: '1.5px solid #1d4ed8', borderRadius: '6px', padding: '6px 10px', marginBottom: '8px', background: '#fafbff' }}>
                <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#1e3a8a', marginBottom: '4px' }}>📝 COMMENTS / OBSERVATIONS</div>
                <div style={{ fontSize: '10px', color: '#374151', lineHeight: '1.5' }}>{rc.teacherComments}</div>
              </div>
            )}

            {/* Overall Score Line */}
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center', padding: '6px 10px', background: '#e0f2fe', borderRadius: '6px', marginBottom: '8px', fontSize: '10px' }}>
              <div>OVERALL RATING: <strong>{'★'.repeat(Math.round(overallRating))}{'☆'.repeat(5 - Math.round(overallRating))}</strong></div>
              <div>OVERALL SCORE: <strong style={{ color: '#1d4ed8' }}>{overallScore}%</strong></div>
              <div style={{ marginLeft: 'auto', fontSize: '9px', color: '#64748b' }}>
                DATE: <strong>{new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'long', year: 'numeric' })}</strong>
                &nbsp;&nbsp; SIGNATURE: _________________ &nbsp;&nbsp; STAMP: [    ]
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', borderTop: '1px dashed #94a3b8', paddingTop: '8px', fontSize: '9.5px' }}>
              <div>
                <div>Prepared By : <span style={{ fontWeight: 700, color: '#1e3a8a', borderBottom: '1px solid #1e3a8a', paddingBottom: '1px' }}>{APP_NAME}</span></div>
                <div style={{ marginTop: '6px' }}>Checked By : <span style={{ borderBottom: '1px solid #94a3b8', display: 'inline-block', width: '110px' }}></span></div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, color: '#1e3a8a' }}>Controller Of Examination</div>
                <div style={{ color: '#64748b' }}>{APP_NAME}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
