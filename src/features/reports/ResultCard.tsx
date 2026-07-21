
import { Printer, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ExamTermResult, Student } from '@/types';
import logoImg from '@/assets/logo.png';
import { createPortal } from 'react-dom';

export interface StudentResultData {
  student: Student;
  termResults: ExamTermResult[];
}

interface ResultCardProps {
  data: StudentResultData[];
  onClose: () => void;
}

const TERM_LABEL: Record<string, string> = {
  '1st_term': '1st Term',
  '2nd_term': '2nd Term',
  'final': 'Final',
};

export function ResultCard({ data, onClose }: ResultCardProps) {
  // If data is empty, just treat as sample (won't render much)
  const isSample = data.length > 0 && data[0].termResults.every((t) => t.totalObtainedMarks === 0);

  const handlePrint = () => {
    window.print();
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:p-0 print:static print:z-auto">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm print:hidden" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl max-h-[95vh] flex flex-col z-10 bg-slate-100 rounded-2xl shadow-2xl overflow-hidden print:shadow-none print:bg-white print:max-h-none print:overflow-visible print:w-full print:rounded-none">
        
        {/* Toolbar - Hidden when printing */}
        <div className="flex items-center justify-between bg-blue-900 px-6 py-4 print:hidden">
          <div>
            <h2 className="font-bold text-white text-lg tracking-wide">Result Card Preview</h2>
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

        <div className="flex-1 overflow-y-auto p-4 md:p-8 print:p-0 print:overflow-visible">
          
          <style>{`
            @media print {
              #root {
                display: none !important;
              }
              .print-break-after {
                break-after: page;
                page-break-after: always;
              }
              @page {
                size: A4;
                margin: 0;
              }
            }
          `}</style>

          <div className="flex flex-col gap-8 print:block print:gap-0">
            {data.map(({ student, termResults }, studentIndex) => (
              <div key={student.id} className="flex flex-col gap-8 print:block print:gap-0">
                {termResults.map((term, termIndex) => {
                  const isLastPage = studentIndex === data.length - 1 && termIndex === termResults.length - 1;
                  return (
                  <div 
                    key={term.id} 
                    className={`max-w-4xl mx-auto p-8 bg-blue-50/30 border-[12px] border-blue-900 font-sans shadow-lg print:shadow-none print:border-[12px] print:w-[210mm] print:h-[297mm] print:box-border relative print:break-inside-avoid ${!isLastPage ? 'print-break-after' : ''}`}
                  >
                    {/* Watermark Background */}
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '60%',
                      height: '60%',
                      backgroundImage: `url(${logoImg})`,
                      backgroundSize: 'contain',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                      opacity: 0.10,
                      pointerEvents: 'none',
                      zIndex: 0
                    }} />

                    <div className="relative z-10">
                      {/* Header Section */}
                      <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold italic mb-2 tracking-widest text-blue-950">RESULT CARD</h2>
                        
                        <div className="flex items-center justify-center gap-4 mb-4">
                          <img src={logoImg} alt="Logo" className="w-24 h-24 object-contain" />
                          <h1 className="text-4xl md:text-5xl font-extrabold text-blue-900 tracking-wider" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.1)' }}>
                            ACE EDUCATIONAL HUB
                          </h1>
                          <div className="w-24"></div> {/* spacer for centering */}
                        </div>

                        <p className="text-blue-800 font-bold text-lg mb-2">Registration No: {student.admissionNumber || 'ACE/2026/REG'}</p>
                        <div className="inline-block bg-blue-900 text-white font-bold px-6 py-1 rounded-sm text-lg">
                          Main Campus, Education City +923007412320
                        </div>
                      </div>

                      {/* Student Details Section */}
                      <div className="mb-4 text-sm font-bold flex flex-col gap-3 italic">
                  <div className="flex items-end">
                    <span>Name</span>
                    <span className="flex-1 border-b border-dotted border-blue-900 mx-2 relative top-[-4px]">
                      {student.firstName} {student.lastName}
                    </span>
                    <span>S/o, D/o</span>
                    <span className="flex-1 border-b border-dotted border-blue-900 mx-2 relative top-[-4px]">
                      {student.guardians?.[0]?.name || ''}
                    </span>
                  </div>
                  <div className="flex items-end">
                    <span>Class</span>
                    <span className="flex-1 border-b border-dotted border-blue-900 mx-2 relative top-[-4px]">
                      {student.className}
                    </span>
                    <span>Examination</span>
                    <span className="flex-1 border-b border-dotted border-blue-900 mx-2 relative top-[-4px]">
                      {TERM_LABEL[term.term] || term.term}
                    </span>
                    <span className="w-16 border-b border-dotted border-blue-900 ml-1 relative top-[-4px] text-center">
                      {new Date().getFullYear()}
                    </span>
                  </div>
                </div>

                {/* Marks Table */}
                <table className="w-full border-collapse border-2 border-blue-900 mb-4 text-sm font-bold bg-white">
                  <thead>
                    <tr className="bg-gradient-to-r from-blue-700 to-blue-900 text-white border-b-2 border-blue-900">
                      <th className="border-r-2 border-blue-900 p-1 w-12 text-center">Sr.#</th>
                      <th className="border-r-2 border-blue-900 p-1 text-left pl-4 italic">SUBJECTS</th>
                      <th className="border-r-2 border-blue-900 p-1 w-20 leading-tight">Full<br/>Marks</th>
                      <th className="border-r-2 border-blue-900 p-1 w-24 leading-tight">Marks<br/>Obtained</th>
                      <th className="p-1 w-48 italic">Observation</th>
                    </tr>
                  </thead>
                  <tbody className="italic text-base text-black">
                    {term.subjects.length > 0 ? term.subjects.map((sub, index) => (
                      <tr key={sub.subjectName} className="border-b border-blue-900">
                        <td className="border-r-2 border-blue-900 text-center py-1">{index + 1}-</td>
                        <td className="border-r-2 border-blue-900 pl-4">{sub.subjectName}</td>
                        <td className="border-r-2 border-blue-900 text-center">{sub.maxMarks}</td>
                        <td className="border-r-2 border-blue-900 text-center text-blue-800">{isSample ? '' : sub.obtainedMarks}</td>
                        {index === 0 && (
                          <td rowSpan={Math.max(11, term.subjects.length)} className="p-0 align-top relative">
                            <div className="absolute inset-0 flex flex-col p-2 text-sm not-italic font-bold">
                              <div className="text-center italic text-base mb-2 text-blue-900">Discipline</div>
                              <div className="flex text-xs mb-1">
                                <span className="w-5">A:</span>
                                <span>Attendance</span>
                                <span className="flex-1 border-b border-dotted border-blue-900 ml-1 mb-1"></span>
                              </div>
                              <div className="flex text-xs mb-1">
                                <span className="w-5">B:</span>
                                <span>Home Work</span>
                                <span className="flex-1 border-b border-dotted border-blue-900 ml-1 mb-1"></span>
                              </div>
                              <div className="flex text-xs mb-4">
                                <span className="w-5">C:</span>
                                <span>Hand Writing</span>
                                <span className="flex-1 border-b border-dotted border-blue-900 ml-1 mb-1"></span>
                              </div>

                              <div className="text-center italic text-base mb-2 mt-auto">Cleanliness</div>
                              <div className="flex text-xs mb-1">
                                <span className="w-5">A:</span>
                                <span>Uniform</span>
                                <span className="flex-1 border-b border-dotted border-blue-900 ml-1 mb-1"></span>
                              </div>
                              <div className="flex text-xs mb-1">
                                <span className="w-5">B:</span>
                                <span>Hair</span>
                                <span className="flex-1 border-b border-dotted border-blue-900 ml-1 mb-1"></span>
                              </div>
                              <div className="flex text-xs mb-1">
                                <span className="w-5">C:</span>
                                <span>Nail</span>
                                <span className="flex-1 border-b border-dotted border-blue-900 ml-1 mb-1"></span>
                              </div>
                              <div className="flex text-xs mb-1">
                                <span className="w-5">D:</span>
                                <span>Shoes</span>
                                <span className="flex-1 border-b border-dotted border-blue-900 ml-1 mb-1"></span>
                              </div>
                            </div>
                          </td>
                        )}
                      </tr>
                    )) : (
                      // Fallback rows if no subjects are defined yet
                      [
                        'Islamiyat', 'Urdu', 'English', 'Math', 'Social Studies', 
                        'Science', 'Arabic', 'History', 'Geography', 'Home Economics', 'Drawing'
                      ].map((subject, index) => (
                        <tr key={index} className="border-b border-blue-900">
                          <td className="border-r-2 border-blue-900 text-center py-1">{index + 1}-</td>
                          <td className="border-r-2 border-blue-900 pl-4">{subject}</td>
                          <td className="border-r-2 border-blue-900 text-center"></td>
                          <td className="border-r-2 border-blue-900 text-center"></td>
                          {index === 0 && (
                            <td rowSpan={11} className="p-0 align-top relative">
                              <div className="absolute inset-0 flex flex-col p-2 text-sm not-italic font-bold">
                                <div className="text-center italic text-base mb-2 text-blue-900">Discipline</div>
                                <div className="flex text-xs mb-1">
                                  <span className="w-5">A:</span>
                                  <span>Attendance</span>
                                  <span className="flex-1 border-b border-dotted border-blue-900 ml-1 mb-1"></span>
                                </div>
                                <div className="flex text-xs mb-1">
                                  <span className="w-5">B:</span>
                                  <span>Home Work</span>
                                  <span className="flex-1 border-b border-dotted border-blue-900 ml-1 mb-1"></span>
                                </div>
                                <div className="flex text-xs mb-4">
                                  <span className="w-5">C:</span>
                                  <span>Hand Writing</span>
                                  <span className="flex-1 border-b border-dotted border-blue-900 ml-1 mb-1"></span>
                                </div>
            
                                <div className="text-center italic text-base mb-2 mt-auto text-blue-900">Cleanliness</div>
                                <div className="flex text-xs mb-1">
                                  <span className="w-5">A:</span>
                                  <span>Uniform</span>
                                  <span className="flex-1 border-b border-dotted border-blue-900 ml-1 mb-1"></span>
                                </div>
                                <div className="flex text-xs mb-1">
                                  <span className="w-5">B:</span>
                                  <span>Hair</span>
                                  <span className="flex-1 border-b border-dotted border-blue-900 ml-1 mb-1"></span>
                                </div>
                                <div className="flex text-xs mb-1">
                                  <span className="w-5">C:</span>
                                  <span>Nail</span>
                                  <span className="flex-1 border-b border-dotted border-blue-900 ml-1 mb-1"></span>
                                </div>
                                <div className="flex text-xs mb-1">
                                  <span className="w-5">D:</span>
                                  <span>Shoes</span>
                                  <span className="flex-1 border-b border-dotted border-blue-900 ml-1 mb-1"></span>
                                </div>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                    
                    {/* Make up any missing rows to reach 11 rows minimum for observation height */}
                    {term.subjects.length > 0 && term.subjects.length < 11 && (
                      Array.from({ length: 11 - term.subjects.length }).map((_, idx) => (
                        <tr key={`empty-${idx}`} className="border-b border-blue-900">
                          <td className="border-r-2 border-blue-900 text-center py-1 text-transparent">-</td>
                          <td className="border-r-2 border-blue-900 pl-4"></td>
                          <td className="border-r-2 border-blue-900 text-center"></td>
                          <td className="border-r-2 border-blue-900 text-center"></td>
                        </tr>
                      ))
                    )}

                    <tr className="border-b border-blue-900 bg-blue-50/50">
                      <td colSpan={2} className="border-r-2 border-blue-900 font-bold pl-2 italic py-2 text-blue-950">Total</td>
                      <td className="border-r-2 border-blue-900 text-center text-blue-950 font-bold">{term.totalMaxMarks > 0 ? term.totalMaxMarks : ''}</td>
                      <td className="border-r-2 border-blue-900 text-center text-blue-800 font-bold">{!isSample && term.totalMaxMarks > 0 ? term.totalObtainedMarks : ''}</td>
                      {/* The Observation column is covered by the rowSpan */}
                    </tr>
                  </tbody>
                </table>

                {/* Footer Section */}
                <div className="text-blue-900 font-bold text-sm mb-4 flex flex-col gap-3">
                  <div className="flex items-end">
                    <span>Student</span>
                    <span className="flex-1 border-b border-dotted border-blue-900 mx-2 relative top-[-4px]"></span>
                    <span>The Exam With Grade</span>
                    <span className="flex-1 border-b border-dotted border-blue-900 mx-2 relative top-[-4px] text-center text-black">
                      {!isSample && term.totalMaxMarks > 0 ? `${term.percentage.toFixed(0)}%` : ''}
                    </span>
                  </div>
                  <div className="flex items-end">
                    <span>General Remarks</span>
                    <span className="flex-1 border-b border-dotted border-blue-900 mx-2 relative top-[-4px] text-black">
                      {!isSample && term.percentage >= 80 ? 'Superb! Amazing! **' : 
                       !isSample && term.percentage >= 60 ? 'Good!' : 
                       !isSample && term.totalMaxMarks > 0 ? 'Needs Improvement!' : ''}
                    </span>
                  </div>
                </div>

                {/* Signatures */}
                <div className="flex justify-between mt-12 text-sm italic text-blue-900 font-bold">
                  <div className="text-center">
                    <div className="w-48 border-b border-dotted border-blue-900 mb-1"></div>
                    <div>Teacher's Signature</div>
                  </div>
                  <div className="text-center">
                    <div className="w-48 border-b border-dotted border-blue-900 mb-1"></div>
                    <div>Principal</div>
                  </div>
                </div>
              </div>
              </div>
            );
          })}
          </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
