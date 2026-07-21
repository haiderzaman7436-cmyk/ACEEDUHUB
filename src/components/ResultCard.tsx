import React from 'react';

interface ResultCardProps {
  studentName?: string;
  parentName?: string;
  className?: string;
  examination?: string;
  year?: string;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  studentName = '',
  parentName = '',
  className = '',
  examination = '',
  year = '202_',
}) => {
  return (
    <div className="max-w-4xl mx-auto p-8 bg-amber-50 border-[12px] border-red-600 font-sans shadow-lg">
      {/* Header Section */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold italic mb-2 tracking-widest">RESULT CARD</h2>
        
        <h1 className="text-4xl md:text-5xl font-extrabold text-red-600 mb-4 tracking-wider" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.1)' }}>
          ACE EDUCATIONAL HUB
        </h1>
        
        <div className="flex justify-center mb-4">
          <div className="w-24 h-24 rounded-full border-2 border-blue-800 flex flex-col items-center justify-center bg-white p-2 text-center text-xs text-blue-800 font-bold shadow-inner">
            <span>ACE</span>
            <span className="text-3xl my-1 block">🎓</span>
            <span>HUB</span>
          </div>
        </div>

        <p className="text-blue-800 font-bold text-lg mb-2">Registration No: ACE/2026/REG</p>
        <div className="inline-block bg-red-600 text-white font-bold px-6 py-1 rounded-sm text-lg">
          Main Campus, Education City 0300-1234567
        </div>
      </div>

      {/* Student Details Section */}
      <div className="mb-4 text-sm font-bold flex flex-col gap-3 italic">
        <div className="flex items-end">
          <span>Name</span>
          <span className="flex-1 border-b border-dotted border-black mx-2 relative top-[-4px]">{studentName}</span>
          <span>S/o, D/o</span>
          <span className="flex-1 border-b border-dotted border-black mx-2 relative top-[-4px]">{parentName}</span>
        </div>
        <div className="flex items-end">
          <span>Class</span>
          <span className="flex-1 border-b border-dotted border-black mx-2 relative top-[-4px]">{className}</span>
          <span>Examination</span>
          <span className="flex-1 border-b border-dotted border-black mx-2 relative top-[-4px]">{examination}</span>
          <span className="w-16 border-b border-dotted border-black ml-1 relative top-[-4px] text-center">{year}</span>
        </div>
      </div>

      {/* Marks Table */}
      <table className="w-full border-collapse border-2 border-black mb-4 text-sm font-bold bg-white">
        <thead>
          <tr className="bg-gradient-to-r from-blue-400 to-blue-500 text-white border-b-2 border-black">
            <th className="border-r-2 border-black p-1 w-12 text-center">Sr.#</th>
            <th className="border-r-2 border-black p-1 text-left pl-4 italic">SUBJECTS</th>
            <th className="border-r-2 border-black p-1 w-20 leading-tight">Full<br/>Marks</th>
            <th className="border-r-2 border-black p-1 w-24 leading-tight">Marks<br/>Obtained</th>
            <th className="p-1 w-48 italic">Observation</th>
          </tr>
        </thead>
        <tbody className="italic text-base">
          {[
            'Islamiyat', 'Urdu', 'English', 'Math', 'Social Studies', 
            'Science', 'Arabic', 'History', 'Geography', 'Home Economics', 'Drawing'
          ].map((subject, index) => (
            <tr key={index} className="border-b border-black">
              <td className="border-r-2 border-black text-center py-1">{index + 1}-</td>
              <td className="border-r-2 border-black pl-4">{subject}</td>
              <td className="border-r-2 border-black text-center"></td>
              <td className="border-r-2 border-black text-center"></td>
              {index === 0 && (
                <td rowSpan={11} className="p-0 align-top relative">
                  <div className="absolute inset-0 flex flex-col p-2 text-sm not-italic font-bold">
                    <div className="text-center italic text-base mb-2">Discipline</div>
                    <div className="flex text-xs mb-1">
                      <span className="w-5">A:</span>
                      <span>Attendance</span>
                      <span className="flex-1 border-b border-dotted border-black ml-1 mb-1"></span>
                    </div>
                    <div className="flex text-xs mb-1">
                      <span className="w-5">B:</span>
                      <span>Home Work</span>
                      <span className="flex-1 border-b border-dotted border-black ml-1 mb-1"></span>
                    </div>
                    <div className="flex text-xs mb-4">
                      <span className="w-5">C:</span>
                      <span>Hand Writing</span>
                      <span className="flex-1 border-b border-dotted border-black ml-1 mb-1"></span>
                    </div>

                    <div className="text-center italic text-base mb-2 mt-auto">Cleanliness</div>
                    <div className="flex text-xs mb-1">
                      <span className="w-5">A:</span>
                      <span>Uniform</span>
                      <span className="flex-1 border-b border-dotted border-black ml-1 mb-1"></span>
                    </div>
                    <div className="flex text-xs mb-1">
                      <span className="w-5">B:</span>
                      <span>Hair</span>
                      <span className="flex-1 border-b border-dotted border-black ml-1 mb-1"></span>
                    </div>
                    <div className="flex text-xs mb-1">
                      <span className="w-5">C:</span>
                      <span>Nail</span>
                      <span className="flex-1 border-b border-dotted border-black ml-1 mb-1"></span>
                    </div>
                    <div className="flex text-xs mb-1">
                      <span className="w-5">D:</span>
                      <span>Shoes</span>
                      <span className="flex-1 border-b border-dotted border-black ml-1 mb-1"></span>
                    </div>
                  </div>
                </td>
              )}
            </tr>
          ))}
          <tr className="border-b border-black">
            <td colSpan={2} className="border-r-2 border-black font-bold pl-2 italic py-1">Total</td>
            <td className="border-r-2 border-black"></td>
            <td className="border-r-2 border-black"></td>
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
          <span className="flex-1 border-b border-dotted border-blue-900 mx-2 relative top-[-4px]"></span>
        </div>
        <div className="flex items-end">
          <span>General Remarks</span>
          <span className="flex-1 border-b border-dotted border-blue-900 mx-2 relative top-[-4px]"></span>
        </div>
      </div>

      {/* Signatures */}
      <div className="flex justify-between mt-12 text-sm italic text-red-600 font-bold">
        <div className="text-center">
          <div className="w-48 border-b border-dotted border-red-600 mb-1"></div>
          <div>Teacher's Signature</div>
        </div>
        <div className="text-center">
          <div className="w-48 border-b border-dotted border-red-600 mb-1"></div>
          <div>Principal</div>
        </div>
      </div>
    </div>
  );
};
