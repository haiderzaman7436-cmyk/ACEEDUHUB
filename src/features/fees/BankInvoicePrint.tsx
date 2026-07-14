// ============================================================================
// ACE Educational Hub — Three-Copy Bank Invoice / Challan (Printable)
// Matches image: Bank Copy | Student Copy | Institute Copy — on one A4 page
// ============================================================================

import { useRef } from 'react';
import { Printer, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Invoice, Student } from '@/types';
import { APP_NAME } from '@/lib/constants';

interface BankInvoicePrintProps {
  invoice: Invoice;
  student: Student;
  onClose: () => void;
}

const FEE_ROWS_BANK = [
  { key: 'MONTHLY FEE', searchKey: 'MONTHLY' },
  { key: 'ADMISSION FEE', searchKey: 'ADMISSION' },
  { key: 'REGISTRATION FEE', searchKey: 'REGISTRATION' },
  { key: 'ART MATERIAL', searchKey: 'ART' },
  { key: 'TRANSPORT', searchKey: 'TRANSPORT' },
  { key: 'BOOKS', searchKey: 'BOOK' },
  { key: 'UNIFORM', searchKey: 'UNIFORM' },
  { key: 'FINE', searchKey: 'FINE' },
  { key: 'OTHERS', searchKey: 'OTHER' },
  { key: 'PREVIOUS BALANCE', searchKey: 'PREVIOUS' },
];

function getRowAmount(items: Invoice['items'], searchKey: string): number {
  const match = items.find((i) => i.description.toUpperCase().includes(searchKey));
  return match ? match.total : 0;
}

const COPIES = ['Bank Copy', 'Student Copy', 'Institute Copy'];

export function BankInvoicePrint({ invoice, student, onClose }: BankInvoicePrintProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const guardian = student.guardians?.[0];
  const total = invoice.grandTotal;
  const discount = invoice.discount || 0;
  const discountLabel = discount > 0 ? `DISCOUNT IN FEE ${discount}` : 'DISCOUNT IN FEE 0';

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const w = window.open('', '_blank', 'width=850,height=1100');
    if (!w) return;
    w.document.write(`
      <html>
        <head>
          <title>Bank Challan — ${student.firstName} ${student.lastName}</title>
          <style>
            * { margin:0; padding:0; box-sizing:border-box; }
            body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a1a; padding: 16px; }
            .challan { border: 2px solid #1d4ed8; border-radius: 8px; margin-bottom: 12px; padding: 10px; page-break-inside: avoid; }
            .challan-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
            .school-left { flex: 1; }
            .school-name { font-size: 16px; font-weight: 900; color: #1e3a8a; }
            .school-sub { font-size: 10px; color: #475569; }
            .bank-right { text-align: right; }
            .bank-name { font-size: 13px; font-weight: 800; color: #1e3a8a; }
            .bank-sub { font-size: 9px; color: #64748b; }
            .info-table { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 12px; font-size: 10.5px; margin-bottom: 8px; }
            .info-row { display: flex; gap: 4px; }
            .info-label { color: #64748b; white-space: nowrap; }
            .info-value { font-weight: 700; color: #1e3a8a; }
            .copy-badge { display: inline-block; background: #dbeafe; border: 1px solid #93c5fd; color: #1e3a8a; font-weight: 700; font-size: 10px; padding: 2px 8px; border-radius: 4px; margin-bottom: 6px; }
            .bank-details { background: #f8faff; border: 1px solid #c7d2fe; border-radius: 4px; padding: 6px 8px; font-size: 10px; margin-bottom: 8px; }
            .bank-details-title { font-weight: 700; font-size: 10.5px; color: #1e3a8a; margin-bottom: 3px; }
            .barcode { font-family: 'Courier New', monospace; font-size: 16px; letter-spacing: 2px; color: #1a1a1a; margin: 4px 0; }
            .instruction { font-size: 9px; color: #64748b; font-style: italic; border-top: 1px dashed #e2e8f0; padding-top: 4px; margin-top: 4px; }
            .fee-table { border-collapse: collapse; font-size: 10.5px; }
            .fee-table th, .fee-table td { border: 1px solid #e2e8f0; padding: 3px 6px; }
            .fee-table thead tr { background: #e0e7ff; }
            .fee-table th { font-size: 9.5px; color: #1e3a8a; font-weight: 700; }
            .total-row td { font-weight: 800; background: #dbeafe; color: #1e3a8a; }
            .payable-row td { font-weight: 800; color: #dc2626; background: #fff1f2; }
            .body-grid { display: flex; gap: 12px; align-items: flex-start; }
            .left-col { flex: 1; }
            .right-col { min-width: 200px; }
          </style>
        </head>
        <body>${content.innerHTML}</body>
      </html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 400);
  };

  const renderChallan = (copyLabel: string) => (
    <div
      key={copyLabel}
      style={{
        border: '2px solid #1d4ed8',
        borderRadius: '8px',
        marginBottom: '12px',
        padding: '10px',
        pageBreakInside: 'avoid',
      }}
    >
      {/* Challan Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', background: '#1d4ed8', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: '12px', flexShrink: 0 }}>A</div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 900, color: '#1e3a8a' }}>{APP_NAME}</div>
              <div style={{ fontSize: '9.5px', color: '#475569' }}>Your target line here</div>
              <div style={{ fontSize: '9px', color: '#64748b' }}>FLAT 1 Rowan Lodge chester road</div>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '14px', fontWeight: 900, color: '#1e3a8a' }}>Bank Alfalah</div>
          <div style={{ fontSize: '9px', color: '#64748b' }}>Islamic Banking</div>
        </div>
      </div>

      {/* Body: left info + right fee table */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        {/* Left: Student Info + Copy Badge + Bank Details */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2px', fontSize: '10.5px', marginBottom: '8px' }}>
            {[
              ['Student ID', student.admissionNumber],
              ['Student Name', `${student.firstName} ${student.lastName}`],
              ['Father Name', guardian?.name || 'N/A'],
              ['Class', invoice.className],
              ['Fee Month', invoice.month || 'Current Month'],
              ['Date', invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })],
              ['Due Date', new Date(invoice.dueDate).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', gap: '4px' }}>
                <span style={{ color: '#64748b', minWidth: '80px' }}>{label}</span>
                <span style={{ fontWeight: 700, color: '#1e3a8a' }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Copy Badge */}
          <div style={{ display: 'inline-block', background: '#dbeafe', border: '1px solid #93c5fd', color: '#1e3a8a', fontWeight: 700, fontSize: '10.5px', padding: '3px 10px', borderRadius: '4px', marginBottom: '8px' }}>
            {copyLabel}
          </div>

          {/* Bank Details */}
          <div style={{ background: '#f8faff', border: '1px solid #c7d2fe', borderRadius: '4px', padding: '6px 8px', fontSize: '10px' }}>
            <div style={{ fontWeight: 700, fontSize: '10.5px', color: '#1e3a8a', marginBottom: '3px' }}>Bank Name: Bank Alfalah Limited</div>
            <div style={{ color: '#475569' }}>Address: Adil Pur Post office Dhoda, Pasrur</div>
            <div style={{ color: '#475569' }}>Account#: 01723646922304</div>
            {/* Barcode representation */}
            <div style={{ fontFamily: 'Courier New, monospace', fontSize: '14px', letterSpacing: '2px', color: '#1a1a1a', margin: '4px 0' }}>
              ||| |||| || ||||| || ||||| |||||
            </div>
            <div style={{ fontSize: '9px', color: '#64748b', fontStyle: 'italic', borderTop: '1px dashed #e2e8f0', paddingTop: '4px', marginTop: '4px' }}>
              Instructions* — Please submit the fee before the due date in order to stop getting late fee fine. please submit fee in the school accounts department after submitting into the bank
            </div>
          </div>
        </div>

        {/* Right: Fee Table */}
        <div style={{ minWidth: '210px' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: '10.5px', width: '100%' }}>
            <thead>
              <tr style={{ background: '#e0e7ff' }}>
                <th style={{ padding: '4px 6px', border: '1px solid #c7d2fe', color: '#1e3a8a', textAlign: 'left', fontSize: '9.5px' }}>Sr.</th>
                <th style={{ padding: '4px 6px', border: '1px solid #c7d2fe', color: '#1e3a8a', textAlign: 'left', fontSize: '9.5px' }}>Particulars</th>
                <th style={{ padding: '4px 6px', border: '1px solid #c7d2fe', color: '#1e3a8a', textAlign: 'right', fontSize: '9.5px' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {FEE_ROWS_BANK.map((row, idx) => {
                const amt = getRowAmount(invoice.items, row.searchKey);
                return (
                  <tr key={row.key} style={{ background: idx % 2 === 0 ? '#fff' : '#f8faff' }}>
                    <td style={{ padding: '3px 6px', border: '1px solid #e2e8f0' }}>{idx + 1}</td>
                    <td style={{ padding: '3px 6px', border: '1px solid #e2e8f0' }}>{row.key}</td>
                    <td style={{ padding: '3px 6px', border: '1px solid #e2e8f0', textAlign: 'right' }}>{amt > 0 ? amt.toLocaleString() : 0}</td>
                  </tr>
                );
              })}
              {/* Discount row */}
              <tr style={{ background: '#f8faff' }}>
                <td style={{ padding: '3px 6px', border: '1px solid #e2e8f0' }}>11</td>
                <td style={{ padding: '3px 6px', border: '1px solid #e2e8f0' }}>{discountLabel}</td>
                <td style={{ padding: '3px 6px', border: '1px solid #e2e8f0', textAlign: 'right' }}>{discount > 0 ? `- ${discount.toLocaleString()}` : '0'}</td>
              </tr>
              {/* Total */}
              <tr style={{ background: '#dbeafe' }}>
                <td colSpan={2} style={{ padding: '4px 6px', border: '1px solid #93c5fd', fontWeight: 800, color: '#1e3a8a', textAlign: 'right' }}>TOTAL</td>
                <td style={{ padding: '4px 6px', border: '1px solid #93c5fd', fontWeight: 800, color: '#1e3a8a', textAlign: 'right' }}>Rs {total.toLocaleString()}</td>
              </tr>
              {/* Paid Amount (if any) */}
              {(invoice.paidAmount || 0) > 0 && (
                <tr style={{ background: '#ecfdf5' }}>
                  <td colSpan={2} style={{ padding: '4px 6px', border: '1px solid #a7f3d0', fontWeight: 700, color: '#059669', textAlign: 'right' }}>ALREADY PAID</td>
                  <td style={{ padding: '4px 6px', border: '1px solid #a7f3d0', fontWeight: 800, color: '#059669', textAlign: 'right' }}>- Rs {(invoice.paidAmount || 0).toLocaleString()}</td>
                </tr>
              )}
              {/* Payable after due (Balance) */}
              <tr style={{ background: '#fff1f2' }}>
                <td colSpan={2} style={{ padding: '4px 6px', border: '1px solid #fca5a5', fontWeight: 700, color: '#dc2626', textAlign: 'right', fontSize: '9.5px' }}>
                  {(invoice.paidAmount || 0) > 0 ? 'BALANCE PAYABLE' : 'PAYABLE AFTER DUE DATE'}
                </td>
                <td style={{ padding: '4px 6px', border: '1px solid #fca5a5', fontWeight: 800, color: '#dc2626', textAlign: 'right' }}>
                  Rs {Math.max(0, total - (invoice.paidAmount || 0)).toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[95vh] flex flex-col z-10 animate-scale-in bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between bg-blue-700 px-5 py-3">
          <div>
            <h2 className="font-bold text-white text-base">Bank Challan — 3 Copies</h2>
            <p className="text-blue-100 text-xs">Bank Copy · Student Copy · Institute Copy</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handlePrint} className="h-8 gap-1.5 text-xs bg-white text-blue-700 hover:bg-blue-50">
              <Printer className="h-3.5 w-3.5" /> Print Challan
            </Button>
            <button onClick={onClose} className="text-white/70 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Challan Content — 3 copies stacked */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div ref={printRef} style={{ maxWidth: '720px', margin: '0 auto' }}>
            {COPIES.map((c) => renderChallan(c))}
          </div>
        </div>
      </div>
    </div>
  );
}
