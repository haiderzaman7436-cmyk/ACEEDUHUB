// ============================================================================
// ACE Educational Hub — Term-wise Result Card (Printable)
// Professional layout with Logo, Watermark, and strict academic formatting
// ============================================================================

import { useRef } from 'react';
import { Printer, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ExamTermResult, Student } from '@/types';
import { APP_NAME } from '@/lib/constants';
import logoImg from '@/assets/logo.jpeg';

interface ResultCardProps {
  student: Student;
  termResults: ExamTermResult[];
  onClose: () => void;
}

const TERM_LABEL: Record<string, string> = {
  '1st_term': '1st Term Examination',
  '2nd_term': '2nd Term Examination',
  'final': 'Annual Examination',
};

export function ResultCard({ student, termResults, onClose }: ResultCardProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const isSample = termResults.every((t) => t.totalObtainedMarks === 0);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const w = window.open('', '_blank', 'width=900,height=1200');
    if (!w) return;
    
    // Convert imported logo path to absolute URL for the print window
    const logoUrl = window.location.origin + logoImg;

    w.document.write(`
      <html>
        <head>
          <title>Result Card — ${student.firstName} ${student.lastName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Roboto:wght@400;500;700;900&display=swap');
            
            * { margin:0; padding:0; box-sizing:border-box; }
            body { 
              font-family: 'Roboto', Arial, sans-serif; 
              font-size: 13px; 
              color: #111827; 
              padding: 40px; 
              background: #fff;
              position: relative;
            }
            
            /* Watermark */
            body::before {
              content: '';
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 500px;
              height: 500px;
              background-image: url('${logoUrl}');
              background-repeat: no-repeat;
              background-position: center;
              background-size: contain;
              opacity: 0.04;
              z-index: -1;
              pointer-events: none;
            }

            .print-container {
              border: 8px solid #1e3a8a;
              padding: 24px 32px;
              position: relative;
              background: transparent;
            }
            .inner-border {
              border: 2px solid #1e3a8a;
              padding: 24px;
              min-height: 900px;
              position: relative;
            }
            
            .header-section {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 24px;
              margin-bottom: 24px;
              text-align: center;
              border-bottom: 3px double #1e3a8a;
              padding-bottom: 24px;
            }
            .logo { width: 110px; height: 110px; object-fit: contain; }
            .school-title {
              font-family: 'Playfair Display', serif;
              font-size: 38px;
              font-weight: 700;
              color: #1e3a8a;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              margin-bottom: 4px;
            }
            .school-subtitle { font-size: 13px; color: #4b5563; font-weight: 500; letter-spacing: 0.5px; margin-bottom: 4px; }
            .school-address { font-size: 11px; color: #6b7280; font-weight: 500; letter-spacing: 0.5px; margin-bottom: 12px; text-transform: uppercase; }
            
            .result-badge {
              display: inline-block;
              background: #1e3a8a;
              color: #fff;
              padding: 8px 32px;
              border-radius: 40px;
              font-size: 20px;
              font-weight: 900;
              letter-spacing: 4px;
            }

            .student-info {
              display: flex;
              gap: 24px;
              margin-bottom: 32px;
            }
            .photo-box {
              width: 120px;
              height: 140px;
              border: 3px solid #1e3a8a;
              padding: 4px;
              background: #fff;
            }
            .photo-box img { width: 100%; height: 100%; object-fit: cover; }
            
            .info-grid {
              flex: 1;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 16px 32px;
              align-content: center;
            }
            .info-item {
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 4px;
              display: flex;
            }
            .info-label { width: 140px; color: #4b5563; font-weight: 700; font-size: 11px; text-transform: uppercase; }
            .info-value { flex: 1; font-weight: 900; color: #111827; font-size: 14px; text-transform: uppercase; }

            .term-title {
              font-family: 'Playfair Display', serif;
              font-size: 18px;
              font-weight: 700;
              color: #1e3a8a;
              text-align: center;
              margin: 32px 0 12px;
              text-transform: uppercase;
              background: #eff6ff;
              padding: 8px;
              border: 1px solid #bfdbfe;
            }

            table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            th { 
              padding: 10px; 
              border: 1px solid #1e3a8a; 
              background: #1e3a8a; 
              color: #fff;
              font-size: 11px; 
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            td { padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center; font-size: 13px; font-weight: 500; }
            td:nth-child(2) { text-align: left; font-weight: 700; }
            tr:nth-child(even) td { background: #f8fafc; }
            
            .total-row td { 
              font-weight: 900; 
              background: #eff6ff !important; 
              border-top: 2px solid #1e3a8a;
              border-bottom: 2px solid #1e3a8a;
              color: #1e3a8a; 
              font-size: 14px;
            }

            .remarks-box {
              border: 1px solid #cbd5e1;
              background: #f8fafc;
              padding: 16px;
              margin-bottom: 40px;
            }
            .remarks-text {
              font-size: 13px;
              line-height: 1.6;
              color: #1f2937;
            }
            
            .grading-scale {
              display: flex;
              gap: 16px;
              justify-content: center;
              font-size: 10px;
              color: #4b5563;
              margin-bottom: 48px;
              flex-wrap: wrap;
            }
            .grade-item { background: #f1f5f9; padding: 4px 8px; border-radius: 4px; border: 1px solid #e2e8f0; font-weight: 700;}

            .signatures {
              display: flex;
              justify-content: space-between;
              margin-top: auto;
              padding-top: 60px;
            }
            .sig-line {
              width: 180px;
              border-top: 1px solid #111827;
              text-align: center;
              padding-top: 8px;
              font-weight: 700;
              font-size: 11px;
              text-transform: uppercase;
              color: #111827;
            }
          </style>
        </head>
        <body>${content.innerHTML}</body>
      </html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 800); // slightly longer timeout to allow image to load
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl max-h-[95vh] flex flex-col z-10 bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between bg-blue-900 px-6 py-4">
          <div>
            <h2 className="font-bold text-white text-lg tracking-wide">Official Result Card</h2>
            {isSample && <p className="text-blue-200 text-xs mt-0.5">Template Mode — Add marks to generate final card</p>}
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handlePrint} className="h-10 gap-2 bg-white text-blue-900 hover:bg-blue-50 font-bold px-6 shadow-sm">
              <Printer className="h-4 w-4" /> Print Document
            </Button>
            <button onClick={onClose} className="text-white/70 hover:text-white p-2 bg-blue-800 rounded-full hover:bg-blue-700 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-slate-100">
          <div ref={printRef} style={{ maxWidth: '820px', margin: '0 auto', background: '#fff' }}>
            
            <div className="print-container">
              <div className="inner-border">
                
                {isSample && (
                  <div style={{ background: '#fef2f2', border: '1px solid #ef4444', color: '#991b1b', padding: '8px', textAlign: 'center', fontWeight: 900, marginBottom: '24px', letterSpacing: '2px' }}>
                    SAMPLE TEMPLATE ONLY
                  </div>
                )}

                {/* Header Section */}
                <div className="header-section">
                  <img src={window.location.origin + logoImg} alt="Logo" className="logo" />
                  <div>
                    <div className="school-title">{APP_NAME}</div>
                    <div className="school-subtitle">Excellence in Education | Character | Leadership</div>
                    <div className="school-address">Gondlanwala Road Galla Shazia Hospital Wala</div>
                    <div className="result-badge">RESULT CARD</div>
                  </div>
                </div>

                {/* Student Profile */}
                <div className="student-info">
                  <div className="photo-box">
                    {student.photoURL ? (
                      <img src={student.photoURL} alt="Student" />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', background: '#f1f5f9', color: '#94a3b8' }}>🎓</div>
                    )}
                  </div>
                  <div className="info-grid">
                    {[
                      ['Registration No.', student.admissionNumber],
                      ['Student Name', `${student.firstName} ${student.lastName}`],
                      ['Father Name', student.guardians?.[0]?.name || '—'],
                      ['Class & Section', `${student.className} — ${student.section}`],
                      ['Date of Birth', student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('en-GB') : '—'],
                      ['Academic Session', `${new Date().getFullYear()} - ${new Date().getFullYear() + 1}`],
                    ].map(([label, value]) => (
                      <div key={label} className="info-item">
                        <div className="info-label">{label}</div>
                        <div className="info-value">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Academic Results */}
                {termResults.map((term) => {
                  const isSampleTerm = term.totalObtainedMarks === 0;
                  return (
                    <div key={term.id}>
                      <div className="term-title">
                        {TERM_LABEL[term.term] || term.term} {isSampleTerm && <span style={{ color: '#ef4444' }}>(Template)</span>}
                      </div>
                      
                      <table>
                        <thead>
                          <tr>
                            <th style={{ width: '60px' }}>Sr.</th>
                            <th style={{ textAlign: 'left' }}>Subjects</th>
                            <th style={{ width: '120px' }}>Max Marks</th>
                            <th style={{ width: '120px' }}>Passing Marks</th>
                            <th style={{ width: '120px' }}>Obtained</th>
                            <th style={{ width: '100px' }}>Grade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {term.subjects.map((sub, idx) => {
                            const passing = Math.round(sub.maxMarks * 0.4); // Assuming 40% passing standard
                            const isFail = !isSampleTerm && sub.obtainedMarks < passing;
                            return (
                              <tr key={sub.subjectName}>
                                <td>{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}</td>
                                <td>{sub.subjectName}</td>
                                <td>{sub.maxMarks}</td>
                                <td>{passing}</td>
                                <td style={{ 
                                  color: isSampleTerm ? '#94a3b8' : (isFail ? '#dc2626' : '#111827'),
                                  fontWeight: isFail ? 900 : 700
                                }}>
                                  {isSampleTerm ? '—' : sub.obtainedMarks}
                                </td>
                                <td style={{ color: isFail ? '#dc2626' : '#111827', fontWeight: 900 }}>
                                  {isSampleTerm ? '—' : (isFail ? 'F' : 'Pass')}
                                </td>
                              </tr>
                            );
                          })}
                          <tr className="total-row">
                            <td colSpan={2} style={{ textAlign: 'right', paddingRight: '24px' }}>GRAND TOTAL</td>
                            <td>{term.totalMaxMarks}</td>
                            <td>—</td>
                            <td style={{ color: isSampleTerm ? '#94a3b8' : '#1e3a8a' }}>
                              {isSampleTerm ? '—' : term.totalObtainedMarks}
                            </td>
                            <td>—</td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Remarks & Final Status */}
                      {!isSampleTerm && (
                        <div className="remarks-box">
                          <div className="remarks-text">
                            <div>Overall Percentage: <strong style={{ fontSize: '16px', color: '#1e3a8a' }}>{term.percentage.toFixed(2)}%</strong></div>
                            <div style={{ marginTop: '8px' }}>
                              Academic Status: <strong style={{ 
                                color: term.status === 'pass' ? '#16a34a' : '#dc2626', 
                                textTransform: 'uppercase',
                                fontSize: '14px'
                              }}>
                                {term.status === 'pass' ? 'PROMOTED / PASSED' : 'NEEDS IMPROVEMENT'}
                              </strong>
                            </div>
                            <div style={{ marginTop: '8px', fontStyle: 'italic', color: '#4b5563' }}>
                              Remarks: {term.percentage >= 80 ? 'Excellent performance. Keep it up!' : term.percentage >= 60 ? 'Good effort, but has potential to do better.' : 'Needs significant focus and improvement.'}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Grading Scale */}
                <div className="grading-scale">
                  <div className="grade-item">A+ (90% - 100%)</div>
                  <div className="grade-item">A (80% - 89%)</div>
                  <div className="grade-item">B (70% - 79%)</div>
                  <div className="grade-item">C (60% - 69%)</div>
                  <div className="grade-item">D (50% - 59%)</div>
                  <div className="grade-item">F (Below 50%)</div>
                </div>

                {/* Signatures */}
                <div className="signatures">
                  <div className="sig-line">Class Teacher</div>
                  <div className="sig-line">Parents / Guardian</div>
                  <div className="sig-line">Principal</div>
                </div>

              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
