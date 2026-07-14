// ============================================================================
// ACE Educational Hub — Fee Paid Receipt (Single Page Printable)
// Matches the image: header + student info + fee table + history + signature
// ============================================================================

import { useRef } from 'react';
import { Printer, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Invoice, Student, Fee } from '@/types';
import { APP_NAME } from '@/lib/constants';


interface FeeReceiptPrintProps {
  invoice: Invoice;
  student: Student;
  allFees: Fee[];           // all fees for this student (for submission history)
  onClose: () => void;
}

// Mapping fee descriptions to standard receipt rows
const FEE_ROWS = [
  'MONTHLY FEE',
  'ADMISSION FEE',
  'REGISTRATION FEE',
  'ART MATERIAL',
  'TRANSPORT',
  'BOOKS',
  'UNIFORM',
  'FINE',
  'OTHERS',
  'PREVIOUS BALANCE',
  'DISCOUNT IN FEE',
];



function serialNo(): string {
  return 'SN-' + Math.floor(Math.random() * 9000000 + 1000000);
}

export function FeeReceiptPrint({ invoice, student, allFees, onClose }: FeeReceiptPrintProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const guardian = student.guardians?.[0];
  const serialNumber = serialNo();

  const totalAmount = invoice.grandTotal;
  const depositAmount = invoice.paidAmount || 0;
  const remainingBalance = totalAmount - depositAmount;

  // Compute individual fee rows from invoice items
  const getAmount = (label: string) => {
    if (label === 'MONTHLY FEE') {
      const m = invoice.items.find(
        (i) => i.description.toUpperCase().includes('MONTHLY') || i.description.toUpperCase().includes('TUITION'),
      );
      return m ? m.total : 0;
    }
    if (label === 'ADMISSION FEE') {
      const m = invoice.items.find((i) => i.description.toUpperCase().includes('ADMISSION'));
      return m ? m.total : 0;
    }
    if (label === 'REGISTRATION FEE') {
      const m = invoice.items.find((i) => i.description.toUpperCase().includes('REGISTRATION'));
      return m ? m.total : 0;
    }
    if (label === 'ART MATERIAL') {
      const m = invoice.items.find((i) => i.description.toUpperCase().includes('ART'));
      return m ? m.total : 0;
    }
    if (label === 'TRANSPORT') {
      const m = invoice.items.find((i) => i.description.toUpperCase().includes('TRANSPORT'));
      return m ? m.total : 0;
    }
    if (label === 'BOOKS') {
      const m = invoice.items.find((i) => i.description.toUpperCase().includes('BOOK'));
      return m ? m.total : 0;
    }
    if (label === 'UNIFORM') {
      const m = invoice.items.find((i) => i.description.toUpperCase().includes('UNIFORM'));
      return m ? m.total : 0;
    }
    if (label === 'FINE') {
      const m = invoice.items.find((i) => i.description.toUpperCase().includes('FINE'));
      return m ? m.total : 0;
    }
    if (label === 'DISCOUNT IN FEE') {
      return invoice.discount || 0;
    }
    return 0;
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const w = window.open('', '_blank', 'width=800,height=1100');
    if (!w) return;
    w.document.write(`
      <html>
        <head>
          <title>Fee Paid Receipt — ${student.firstName} ${student.lastName}</title>
          <style>
            * { margin:0; padding:0; box-sizing:border-box; }
            body { font-family: 'Arial', sans-serif; font-size: 12px; color: #1a1a1a; padding: 24px; }
            .header { text-align: center; margin-bottom: 8px; }
            .logo-circle { width: 48px; height: 48px; background: #1d4ed8; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: white; font-size: 18px; font-weight: 900; margin-bottom: 4px; }
            .school-name { font-size: 22px; font-weight: 900; color: #1e3a8a; }
            .sub-line { font-size: 11px; color: #64748b; }
            .title { font-size: 16px; font-weight: 700; color: #1d4ed8; margin: 8px 0 12px; text-align: center; }
            .divider { border-top: 2px solid #1d4ed8; margin: 8px 0; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-bottom: 12px; font-size: 11px; }
            .info-item .label { color: #64748b; font-size: 9.5px; }
            .info-item .value { font-weight: 700; color: #1e3a8a; font-size: 12px; }
            .student-row { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 10px; }
            .student-photo { width: 64px; height: 64px; border-radius: 8px; background: #e0e7ef; overflow: hidden; border: 2px solid #1d4ed8; flex-shrink: 0; }
            .student-photo img { width: 100%; height: 100%; object-fit: cover; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
            thead tr { background: #e0e7ff; }
            th { padding: 6px 8px; text-align: left; font-size: 10px; font-weight: 700; color: #1e3a8a; border: 1px solid #c7d2fe; }
            td { padding: 5px 8px; border: 1px solid #e2e8f0; font-size: 11px; }
            tr:nth-child(even) td { background: #f8faff; }
            .total-row td { font-weight: 700; background: #dbeafe !important; color: #1e3a8a; border-color: #93c5fd; }
            .deposit-row td { font-weight: 700; color: #059669; }
            .balance-row td { font-weight: 700; color: #dc2626; }
            .history-title { font-size: 13px; font-weight: 700; color: #1e3a8a; margin: 12px 0 6px; }
            .footer { display: flex; justify-content: space-between; margin-top: 24px; border-top: 1px dashed #94a3b8; padding-top: 12px; font-size: 11px; }
            .prepared-by { font-weight: 700; color: #1e3a8a; border-bottom: 1px solid #1e3a8a; display: inline-block; }
          </style>
        </head>
        <body>${content.innerHTML}</body>
      </html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 400);
  };

  // Build fee submission history from allFees (paid ones for this student)
  const paidFees = allFees
    .filter((f) => f.paidDate && f.paidAmount > 0)
    .sort((a, b) => (a.paidDate || '').localeCompare(b.paidDate || ''));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[95vh] flex flex-col z-10 animate-scale-in bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between bg-blue-700 px-5 py-3">
          <h2 className="font-bold text-white text-base">Fee Paid Receipt</h2>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handlePrint} className="h-8 gap-1.5 text-xs bg-white text-blue-700 hover:bg-blue-50">
              <Printer className="h-3.5 w-3.5" /> Print Receipt
            </Button>
            <button onClick={onClose} className="text-white/70 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Receipt Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div ref={printRef} style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#1a1a1a', maxWidth: '700px', margin: '0 auto' }}>
            {/* School Header */}
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <div style={{ width: '48px', height: '48px', background: '#1d4ed8', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '18px', fontWeight: 900, marginBottom: '4px' }}>
                A
              </div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#1e3a8a' }}>{APP_NAME}</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Your target line here</div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>+923460204447 | Pakistan | www.aceedu.com</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#1d4ed8', marginTop: '6px' }}>Fees Paid Receipt</div>
            </div>

            <div style={{ borderTop: '2px solid #1d4ed8', marginBottom: '12px' }} />

            {/* Student Info Row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '12px' }}>
              {/* Photo placeholder */}
              <div style={{ width: '70px', height: '80px', background: '#e0e7ef', borderRadius: '8px', border: '2px solid #1d4ed8', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', color: '#94a3b8' }}>
                {student.photoURL
                  ? <img src={student.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }} />
                  : '🎓'}
              </div>
              {/* Info grid */}
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', fontSize: '11px' }}>
                {[
                  { label: 'Registration No', value: student.admissionNumber },
                  { label: 'Serial No', value: serialNumber },
                  { label: 'Total Amount', value: `Rs ${totalAmount.toLocaleString()}`, color: '#1d4ed8' },
                  { label: 'Student Name', value: `${student.firstName} ${student.lastName}` },
                  { label: 'Date of Submission', value: invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString('en-PK', { day: '2-digit', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'long', year: 'numeric' }) },
                  { label: 'Deposit Amount', value: `Rs ${depositAmount.toLocaleString()}`, color: '#059669' },
                  { label: 'Guardian Name', value: guardian?.name || 'N/A' },
                  { label: 'Fees Month', value: invoice.month || 'Current Month' },
                  { label: 'Remaining Balance', value: `Rs ${remainingBalance.toLocaleString()}`, color: remainingBalance > 0 ? '#dc2626' : '#059669' },
                  { label: 'Class', value: invoice.className },
                ].map((f, i) => (
                  <div key={i}>
                    <div style={{ color: '#64748b', fontSize: '9.5px' }}>{f.label}</div>
                    <div style={{ fontWeight: 700, color: f.color || '#1e3a8a', fontSize: '12px' }}>→ {f.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Fee Particulars Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
              <thead>
                <tr style={{ background: '#e0e7ff' }}>
                  <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#1e3a8a', border: '1px solid #c7d2fe' }}>Sr. No.</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#1e3a8a', border: '1px solid #c7d2fe' }}>Particulars</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right', fontSize: '10px', fontWeight: 700, color: '#1e3a8a', border: '1px solid #c7d2fe' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {FEE_ROWS.map((label, idx) => {
                  const amt = getAmount(label);
                  return (
                    <tr key={label} style={{ background: idx % 2 === 0 ? '#fff' : '#f8faff' }}>
                      <td style={{ padding: '5px 10px', border: '1px solid #e2e8f0', fontSize: '11px' }}>{idx + 1}</td>
                      <td style={{ padding: '5px 10px', border: '1px solid #e2e8f0', fontSize: '11px' }}>{label}</td>
                      <td style={{ padding: '5px 10px', border: '1px solid #e2e8f0', fontSize: '11px', textAlign: 'right' }}>{amt > 0 ? amt.toLocaleString() : 0}</td>
                    </tr>
                  );
                })}
                {/* Total */}
                <tr style={{ background: '#dbeafe' }}>
                  <td colSpan={2} style={{ padding: '6px 10px', border: '1px solid #93c5fd', fontWeight: 700, fontSize: '12px', textAlign: 'right' }}>TOTAL</td>
                  <td style={{ padding: '6px 10px', border: '1px solid #93c5fd', fontWeight: 700, fontSize: '12px', textAlign: 'right', color: '#1e3a8a' }}>Rs {totalAmount.toLocaleString()}</td>
                </tr>
                <tr style={{ background: '#f0fdf4' }}>
                  <td colSpan={2} style={{ padding: '5px 10px', border: '1px solid #bbf7d0', fontWeight: 700, fontSize: '11px', textAlign: 'right', color: '#059669' }}>DEPOSIT</td>
                  <td style={{ padding: '5px 10px', border: '1px solid #bbf7d0', fontWeight: 700, fontSize: '11px', textAlign: 'right', color: '#059669' }}>Rs {depositAmount.toLocaleString()}</td>
                </tr>
                <tr style={{ background: remainingBalance > 0 ? '#fef2f2' : '#f0fdf4' }}>
                  <td colSpan={2} style={{ padding: '5px 10px', border: '1px solid #fca5a5', fontWeight: 700, fontSize: '11px', textAlign: 'right', color: remainingBalance > 0 ? '#dc2626' : '#059669' }}>DUE-ABLE BALANCE</td>
                  <td style={{ padding: '5px 10px', border: '1px solid #fca5a5', fontWeight: 700, fontSize: '11px', textAlign: 'right', color: remainingBalance > 0 ? '#dc2626' : '#059669' }}>Rs {remainingBalance.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            {/* Fee Submission History */}
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e3a8a', margin: '14px 0 6px', textAlign: 'center' }}>
              Fee Submission Statement Of <span style={{ color: '#1d4ed8' }}>{student.firstName} {student.lastName}</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#e0e7ff' }}>
                  {['Sr#', 'Submission Date', 'Fee Month', 'Total Amount', 'Deposit', 'Due-able'].map((h) => (
                    <th key={h} style={{ padding: '6px 8px', border: '1px solid #c7d2fe', fontSize: '10px', fontWeight: 700, color: '#1e3a8a', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paidFees.length > 0 ? paidFees.map((f, i) => {
                  const dueable = Math.max(0, f.amount - (f.paidAmount || 0));
                  return (
                    <tr key={f.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8faff' }}>
                      <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', fontSize: '11px' }}>{i + 1}</td>
                      <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', fontSize: '11px' }}>{f.paidDate ? new Date(f.paidDate).toLocaleDateString('en-PK', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'}</td>
                      <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', fontSize: '11px' }}>{f.month || '-'}</td>
                      <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', fontSize: '11px' }}>{f.amount?.toLocaleString()}</td>
                      <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', fontSize: '11px', color: '#059669' }}>{(f.paidAmount || 0).toLocaleString()}</td>
                      <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', fontSize: '11px', color: dueable > 0 ? '#dc2626' : '#059669' }}>{dueable.toLocaleString()}</td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={6} style={{ padding: '8px', textAlign: 'center', color: '#94a3b8', fontSize: '11px', border: '1px solid #e2e8f0' }}>No payment history available</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Footer Signature Block */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', borderTop: '1px dashed #94a3b8', paddingTop: '12px', fontSize: '11px' }}>
              <div>
                <div>Prepared By : <span style={{ fontWeight: 700, color: '#1e3a8a', borderBottom: '1px solid #1e3a8a', paddingBottom: '1px' }}>{APP_NAME}</span></div>
                <div style={{ marginTop: '8px' }}>Checked By : <span style={{ borderBottom: '1px solid #94a3b8', display: 'inline-block', width: '120px' }}></span></div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, color: '#1e3a8a' }}>Accounts Department</div>
                <div style={{ color: '#64748b' }}>{APP_NAME}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
