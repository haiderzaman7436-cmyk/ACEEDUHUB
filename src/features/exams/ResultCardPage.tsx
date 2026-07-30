// import { ResultCard } from '@/components/ResultCard';
// import { Button } from '@/components/ui/button';
// import { Printer } from 'lucide-react';

// export default function ResultCardPage() {
//   const handlePrint = () => {
//     window.print();
//   };

//   return (
//     <div className="p-6 bg-slate-100 min-h-screen">
//       <div className="flex justify-between items-center mb-6 max-w-4xl mx-auto">
//         <h1 className="text-2xl font-bold text-slate-800">Result Card Template</h1>
//         <Button onClick={handlePrint} className="flex items-center gap-2">
//           <Printer size={16} /> Print Result Card
//         </Button>
//       </div>

//       <div className="print:m-0 print:p-0">
//         <ResultCard 
//           studentName="John Doe" 
//           parentName="Richard Doe" 
//           className="10th Grade" 
//           examination="Final" 
//           year="2026" 
//         />
//       </div>
      
//       {/* Hide elements when printing */}
//       <style>{`
//         @media print {
//           body * {
//             visibility: hidden;
//           }
//           .print\\:m-0, .print\\:m-0 * {
//             visibility: visible;
//           }
//           .print\\:m-0 {
//             position: absolute;
//             left: 0;
//             top: 0;
//             width: 100%;
//           }
//         }
//       `}</style>
//     </div>
//   );
// }
