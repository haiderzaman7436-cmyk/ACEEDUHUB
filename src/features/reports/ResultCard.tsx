// ============================================================================
// ACE Educational Hub — Term-wise Result Card (Printable)
// Supports sample mode: shows max marks when no exam results exist yet
// ============================================================================

import { useRef } from 'react';
import { Printer, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ExamTermResult, Student } from '@/types';
import { APP_NAME } from '@/lib/constants';

interface ResultCardProps {
  student: Student;
  termResults: ExamTermResult[];
  onClose: () => void;
}

const TERM_LABEL: Record<string, string> = {
  '1st_term': '1st Term Exam',
  '2nd_term': '2nd Term Exam',
  'final': 'Final Exams',
};

export function ResultCard({ student, termResults, onClose }: ResultCardProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const isSample = termResults.every((t) => t.totalObtainedMarks === 0);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const w = window.open('', '_blank', 'width=800,height=1100');
    if (!w) return;
    w.document.write(`
      <html>
        <head>
          <title>Result Card — ${student.firstName} ${student.lastName}</title>
          <style>
            * { margin:0; padding:0; box-sizing:border-box; }
            body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; padding: 24px; }
            .draft-badge { background:#fef3c7; border:1px solid #fbbf24; color:#92400e; padding:3px 10px; border-radius:4px; font-size:10px; font-weight:700; margin-bottom:8px; display:inline-block; }
            .header { text-align: center; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
            thead tr { background: #d1fae5; }
            th { padding: 6px 8px; border: 1px solid #6ee7b7; font-size: 10px; font-weight: 700; color: #065f46; text-align: center; }
            td { padding: 5px 8px; border: 1px solid #d1d5db; font-size: 11px; }
            td:first-child { text-align: left; }
            td:not(:first-child) { text-align: center; }
            tr:nth-child(even) td { background: #f0fdf4; }
            .total-row td { font-weight: 800; background: #d1fae5; color: #065f46; }
            .sample-cell { color: #94a3b8; font-style: italic; }
            .footer { display:flex; justify-content:space-between; margin-top:32px; border-top:1px dashed #94a3b8; padding-top:12px; font-size:11px; }
          </style>
        </head>
        <body>${content.innerHTML}</body>
      </html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[95vh] flex flex-col z-10 bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between bg-emerald-700 px-5 py-3">
          <div>
            <h2 className="font-bold text-white text-base">Result Card</h2>
            {isSample && <p className="text-emerald-100 text-xs">Template — exam results not yet recorded</p>}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handlePrint} className="h-8 gap-1.5 text-xs bg-white text-emerald-700 hover:bg-emerald-50">
              <Printer className="h-3.5 w-3.5" /> Print Result Card
            </Button>
            <button onClick={onClose} className="text-white/70 hover:text-white"><X className="h-5 w-5" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div ref={printRef} style={{ maxWidth: '700px', margin: '0 auto', fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#1a1a1a' }}>

            {isSample && (
              <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', color: '#92400e', padding: '4px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, marginBottom: '8px', display: 'inline-block' }}>
                📋 TEMPLATE — Exam results not yet held. Fill in obtained marks after exams.
              </div>
            )}

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <div style={{ width: '48px', height: '48px', background: '#16a34a', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '18px', fontWeight: 900, marginBottom: '4px' }}>A</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#1e3a8a' }}>{APP_NAME}</div>
              <div style={{ fontSize: '10.5px', color: '#64748b' }}>"Your target line here"</div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>+923460204447 | Pakistan</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#16a34a', marginTop: '8px', letterSpacing: '2px' }}>RESULT CARD</div>
            </div>

            <div style={{ borderTop: '2px solid #16a34a', marginBottom: '12px' }} />

            {/* Student Info */}
            <div style={{ display: 'flex', gap: '14px', marginBottom: '14px', alignItems: 'flex-start' }}>
              <div style={{ width: '70px', height: '80px', background: '#e0f2fe', borderRadius: '8px', border: '2px solid #16a34a', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                {student.photoURL ? <img src={student.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }} /> : '🎓'}
              </div>
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px', fontSize: '11px' }}>
                {[
                  ['School Registration', student.admissionNumber],
                  ['Date Of Admission', student.admissionDate ? new Date(student.admissionDate).toLocaleDateString('en-PK') : 'N/A'],
                  ['Student Name', `${student.firstName} ${student.lastName}`],
                  ['Date Of Birth', student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('en-PK') : 'N/A'],
                  ['Father Name', student.guardians?.[0]?.name || 'N/A'],
                  ['Gender', student.gender?.charAt(0).toUpperCase() + (student.gender?.slice(1) || '')],
                  ['Class / Section', `${student.className} — ${student.section}`],
                  ['Academic Year', `${new Date().getFullYear()}–${new Date().getFullYear() + 1}`],
                ].map(([label, value]) => (
                  <div key={label} style={{ borderBottom: '1px dotted #e2e8f0', paddingBottom: '3px' }}>
                    <span style={{ color: '#64748b', fontSize: '9.5px', fontWeight: 600 }}>{label}: </span>
                    <span style={{ fontWeight: 700, color: '#1e3a8a', fontSize: '11.5px' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Term Tables */}
            {termResults.map((term) => {
              const isSampleTerm = term.totalObtainedMarks === 0;
              return (
                <div key={term.id}>
                  <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#1e3a8a', background: '#e0f2fe', padding: '5px 10px', borderRadius: '4px', margin: '12px 0 6px', textAlign: 'center' }}>
                    SUBJECT-WISE STATEMENT OF MARKS — {TERM_LABEL[term.term] || term.term}
                    {isSampleTerm ? ' [TEMPLATE]' : ''}
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4px' }}>
                    <thead>
                      <tr style={{ background: '#d1fae5' }}>
                        <th style={{ padding: '6px 8px', border: '1px solid #6ee7b7', fontSize: '10px', fontWeight: 700, color: '#065f46', textAlign: 'left', width: '40px' }}>Sr.</th>
                        <th style={{ padding: '6px 8px', border: '1px solid #6ee7b7', fontSize: '10px', fontWeight: 700, color: '#065f46', textAlign: 'left' }}>SUBJECTS</th>
                        <th style={{ padding: '6px 8px', border: '1px solid #6ee7b7', fontSize: '10px', fontWeight: 700, color: '#065f46', textAlign: 'center' }}>Max Marks</th>
                        <th style={{ padding: '6px 8px', border: '1px solid #6ee7b7', fontSize: '10px', fontWeight: 700, color: '#065f46', textAlign: 'center' }}>Obtained</th>
                      </tr>
                    </thead>
                    <tbody>
                      {term.subjects.map((sub, idx) => (
                        <tr key={sub.subjectName} style={{ background: idx % 2 === 0 ? '#fff' : '#f0fdf4' }}>
                          <td style={{ padding: '5px 8px', border: '1px solid #d1d5db', textAlign: 'center' }}>{idx + 1}</td>
                          <td style={{ padding: '5px 8px', border: '1px solid #d1d5db' }}>{sub.subjectName}</td>
                          <td style={{ padding: '5px 8px', border: '1px solid #d1d5db', textAlign: 'center', fontWeight: 600 }}>{sub.maxMarks}</td>
                          <td style={{ padding: '5px 8px', border: '1px solid #d1d5db', textAlign: 'center', color: isSampleTerm ? '#94a3b8' : undefined, fontStyle: isSampleTerm ? 'italic' : undefined }}>
                            {isSampleTerm ? <div style={{ borderBottom: '1px solid #94a3b8', width: '30px', margin: '4px auto 0' }} /> : sub.obtainedMarks}
                          </td>
                        </tr>
                      ))}
                      <tr style={{ background: '#d1fae5' }}>
                        <td colSpan={2} style={{ padding: '6px 8px', border: '1px solid #6ee7b7', fontWeight: 800, color: '#065f46', textAlign: 'right' }}>TOTAL</td>
                        <td style={{ padding: '6px 8px', border: '1px solid #6ee7b7', fontWeight: 800, textAlign: 'center', color: '#065f46' }}>{term.totalMaxMarks}</td>
                        <td style={{ padding: '6px 8px', border: '1px solid #6ee7b7', fontWeight: 800, textAlign: 'center', color: isSampleTerm ? '#94a3b8' : '#065f46', fontStyle: isSampleTerm ? 'italic' : undefined }}>
                          {isSampleTerm ? <div style={{ borderBottom: '1px solid #94a3b8', width: '40px', margin: '4px auto 0' }} /> : term.totalObtainedMarks}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  {!isSampleTerm && (
                    <div style={{ fontSize: '11px', color: '#374151', marginBottom: '10px', padding: '4px 8px', background: '#f9fafb', borderLeft: '3px solid #16a34a' }}>
                      He/She scored <strong>{term.totalObtainedMarks}</strong> out of <strong>{term.totalMaxMarks}</strong> — Percentage: <strong>{term.percentage.toFixed(1)}%</strong> — Grade: <strong>{term.grade}</strong> — Status: <strong style={{ color: term.status === 'pass' ? '#16a34a' : '#dc2626' }}>{term.status.toUpperCase()}</strong>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', borderTop: '1px dashed #94a3b8', paddingTop: '12px', fontSize: '11px' }}>
              <div>
                <div>Prepared By : <span style={{ fontWeight: 700, color: '#1e3a8a', borderBottom: '1px solid #1e3a8a' }}>{APP_NAME}</span></div>
                <div style={{ marginTop: '8px' }}>Checked By : <span style={{ borderBottom: '1px solid #94a3b8', display: 'inline-block', width: '120px' }}></span></div>
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
