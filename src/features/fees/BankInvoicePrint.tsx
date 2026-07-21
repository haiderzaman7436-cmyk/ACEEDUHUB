// ============================================================================
// ACE Educational Hub — Three-Copy Fee Challan
// Student Copy | Accounts Copy | Office Copy — all on one A4 page
// ============================================================================

import { useRef } from 'react';
import { Printer, X } from 'lucide-react';
import type { Invoice, Student } from '@/types';
import { APP_NAME } from '@/lib/constants';
import logoImg from '@/assets/logo.png';

interface BankInvoicePrintProps {
  invoice: Invoice;
  student: Student;
  onClose: () => void;
}

const SCHOOL_ADDRESS = 'Gondlanwala Road Galla Shazia Hospital Wala';
const SCHOOL_PHONE   = '+92-346-0204447';

const FEE_ROWS_BANK = [
  { key: 'Monthly Fee',       searchKey: 'MONTHLY'      },
  { key: 'Admission Fee',     searchKey: 'ADMISSION'    },
  { key: 'Registration Fee',  searchKey: 'REGISTRATION' },
  { key: 'Art Material',      searchKey: 'ART'          },
  { key: 'Transport Fee',     searchKey: 'TRANSPORT'    },
  { key: 'Books',             searchKey: 'BOOK'         },
  { key: 'Uniform',           searchKey: 'UNIFORM'      },
  { key: 'Fine / Late Fee',   searchKey: 'FINE'         },
  { key: 'Others',            searchKey: 'OTHER'        },
  { key: 'Previous Balance',  searchKey: 'PREVIOUS'     },
];

function getRowAmount(items: Invoice['items'], searchKey: string): number {
  const match = items.find((i) => i.description.toUpperCase().includes(searchKey));
  return match ? match.total : 0;
}

// Three copies — distinct labels + accent colours
const COPIES: { label: string; accent: string; badgeBg: string; badgeText: string }[] = [
  { label: 'Student Copy',  accent: '#1d4ed8', badgeBg: '#dbeafe', badgeText: '#1e3a8a' },
  { label: 'Accounts Copy', accent: '#059669', badgeBg: '#d1fae5', badgeText: '#065f46' },
  { label: 'Office Copy',   accent: '#7c3aed', badgeBg: '#ede9fe', badgeText: '#4c1d95' },
];

export function BankInvoicePrint({ invoice, student, onClose }: BankInvoicePrintProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const guardian  = student.guardians?.[0];
  const total     = invoice.grandTotal;
  const paid      = invoice.paidAmount || 0;
  const balance   = Math.max(0, total - paid);
  const discount  = invoice.discount || 0;

  const dateStr    = new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
  const dueDateStr = new Date(invoice.dueDate).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });

  // Derive fee month from invoice.month or fall back to the due-date month
  const feeMonth = invoice.month ||
    new Date(invoice.dueDate).toLocaleDateString('en-PK', { month: 'long', year: 'numeric' });

  // ── Print handler ─────────────────────────────────────────────────────────
    const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const w = window.open('', '_blank', 'width=850,height=1150');
    if (!w) return;
    const logoUrl = window.location.origin + '/logo.png';

    w.document.write(`
      <html>
        <head>
          <title>Fee Challan — ${student.firstName} ${student.lastName}</title>
          <style>
            @page { size: A4 portrait; margin: 3mm 5mm; }
            * { margin:0; padding:0; box-sizing:border-box; }
            body { font-family: Arial, sans-serif; font-size: 8.5px; color: #1a1a1a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            img  { display:block; }

            .challan { border:1.5px solid #1d4ed8; border-radius:5px; padding:5px 7px; margin-bottom:0; }

            /* Scissor cut-line separator between copies */
            .cut-line {
              display: flex;
              align-items: center;
              margin: 4px 0;
              gap: 6px;
              color: #94a3b8;
              font-size: 13px;
            }
            .cut-line::before, .cut-line::after {
              content: '';
              flex: 1;
              border-top: 1.5px dashed #94a3b8;
            }
            .cut-icon { font-size: 13px; transform: rotate(-90deg); user-select: none; }

            /* Top header */
            .ch-head { display:flex; justify-content:space-between; align-items:center;
                        border-bottom:1.5px solid #c7d2fe; padding-bottom:4px; margin-bottom:4px; }
            .logo-block { display:flex; align-items:center; gap:5px; }
            .logo-img   { width:30px; height:30px; border-radius:50%; object-fit:cover; border:2px solid #1d4ed8; }
            .school-name{ font-size:12px; font-weight:900; color:#1e3a8a; line-height:1.1; }
            .school-sub { font-size:7px; color:#475569; }
            .copy-stamp { font-size:9px; font-weight:900; padding:2px 8px; border-radius:4px;
                          border:1.5px solid; display:inline-block; }

            /* Body: info + fee table */
            .ch-body { display:flex; gap:6px; }

            /* Student info */
            .info-col { flex:1; }
            .info-row { display:flex; margin-bottom:1.5px; font-size:8px; }
            .info-lbl { color:#64748b; min-width:72px; }
            .info-val { font-weight:700; color:#1e3a8a; }

            /* Fee table */
            .fee-col { min-width:180px; }
            table   { border-collapse:collapse; width:100%; }
            th, td  { border:1px solid #e2e8f0; padding:1.5px 4px; font-size:7.5px; }
            thead tr{ background:#e0e7ff; }
            th      { color:#1e3a8a; font-weight:700; }

            /* Summary rows */
            .row-total  { background:#dbeafe; font-weight:800; color:#1e3a8a; }
            .row-paid   { background:#d1fae5; font-weight:700; color:#059669; }
            .row-bal    { background:#fff1f2; font-weight:800; color:#dc2626; }

            /* Signature line */
            .sig-row { display:flex; justify-content:space-between; margin-top:4px;
                        border-top:1px dashed #cbd5e1; padding-top:3px; font-size:7px; color:#64748b; }
            .sig-line { border-bottom:1px solid #94a3b8; width:80px; display:inline-block; margin-top:6px; }
          </style>
        </head>
        <body>
          ${content.innerHTML.replace(/src="[^"]*logo[^"]*"/g, `src="${logoUrl}"`)}
        </body>
      </html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 400);
  };

  // ── Single slip ───────────────────────────────────────────────────────────
  const renderSlip = (copy: typeof COPIES[number]) => {
    const borderColor = copy.accent;

    return (
      <div
        key={copy.label}
        style={{
          border: `1.5px solid ${borderColor}`,
          borderRadius: '5px',
          padding: '7px 9px',
          marginBottom: '5px',
          background: '#fff',
          pageBreakInside: 'avoid',
        }}
      >
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                      borderBottom: `1.5px solid ${copy.badgeBg}`, paddingBottom:'4px', marginBottom:'4px' }}>
          {/* Logo + School */}
          <div style={{ display:'flex', alignItems:'center', gap:'5px' }}>
            <img
              src={logoImg}
              alt="Logo"
              style={{ width:'30px', height:'30px', borderRadius:'50%', objectFit:'cover',
                       border:`2px solid ${borderColor}`, flexShrink:0 }}
            />
            <div>
              <div style={{ fontSize:'12px', fontWeight:900, color:'#1e3a8a', lineHeight:1.1 }}>{APP_NAME}</div>
              <div style={{ fontSize:'7px', color:'#475569' }}>The School of Science &amp; Arts</div>
              <div style={{ fontSize:'6.5px', color:'#64748b' }}>{SCHOOL_ADDRESS} | {SCHOOL_PHONE}</div>
            </div>
          </div>
          {/* Copy stamp */}
          <div style={{ textAlign:'right' }}>
            <div style={{
              display:'inline-block', fontSize:'9px', fontWeight:900,
              padding:'2px 8px', borderRadius:'4px',
              border: `1.5px solid ${borderColor}`,
              background: copy.badgeBg, color: copy.badgeText,
            }}>
              {copy.label}
            </div>
            <div style={{ fontSize:'7px', color:'#64748b', marginTop:'2px' }}>
              Invoice: <strong style={{ color:'#1e3a8a' }}>{invoice.invoiceNumber}</strong>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ display:'flex', gap:'8px' }}>

          {/* Student Info */}
          <div style={{ flex:1 }}>
            {[
              ['Student Name', `${student.firstName} ${student.lastName}`],
              ['Admission No',  student.admissionNumber],
              ['Father Name',   guardian?.name || '—'],
              ['Class',         invoice.className + (invoice.section ? ` — Sec ${invoice.section}` : '')],
              ['Fee Month',     feeMonth],
              ['Issue Date',    dateStr],
              ['Due Date',      dueDateStr],
            ].map(([lbl, val]) => (
              <div key={lbl} style={{ display:'flex', marginBottom:'2px', fontSize:'8.5px' }}>
                <span style={{ color:'#64748b', minWidth:'78px' }}>{lbl}</span>
                <span style={{ fontWeight:700, color:'#1e3a8a' }}>{val}</span>
              </div>
            ))}

            {/* Signature block */}
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:'6px',
                          borderTop:'1px dashed #cbd5e1', paddingTop:'4px', fontSize:'7px', color:'#64748b' }}>
              <div>
                <div style={{ borderBottom:'1px solid #94a3b8', width:'80px', marginTop:'10px' }} />
                <div>Parent / Guardian Signature</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ borderBottom:'1px solid #94a3b8', width:'80px', marginTop:'10px' }} />
                <div>Accounts Officer</div>
              </div>
            </div>
          </div>

          {/* Fee Table */}
          <div style={{ minWidth:'185px' }}>
            <table style={{ borderCollapse:'collapse', width:'100%' }}>
              <thead>
                <tr style={{ background:'#e0e7ff' }}>
                  <th style={{ padding:'2px 4px', border:'1px solid #c7d2fe', color:'#1e3a8a', textAlign:'left', fontSize:'8px' }}>Sr.</th>
                  <th style={{ padding:'2px 4px', border:'1px solid #c7d2fe', color:'#1e3a8a', textAlign:'left', fontSize:'8px' }}>Particulars</th>
                  <th style={{ padding:'2px 4px', border:'1px solid #c7d2fe', color:'#1e3a8a', textAlign:'right', fontSize:'8px' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {FEE_ROWS_BANK.map((row, idx) => {
                  const amt = getRowAmount(invoice.items, row.searchKey);
                  return (
                    <tr key={row.key} style={{ background: idx % 2 === 0 ? '#fff' : '#f8faff' }}>
                      <td style={{ padding:'2px 4px', border:'1px solid #e2e8f0', fontSize:'8px' }}>{idx + 1}</td>
                      <td style={{ padding:'2px 4px', border:'1px solid #e2e8f0', fontSize:'8px' }}>{row.key}</td>
                      <td style={{ padding:'2px 4px', border:'1px solid #e2e8f0', textAlign:'right', fontSize:'8px' }}>
                        {amt > 0 ? amt.toLocaleString() : '—'}
                      </td>
                    </tr>
                  );
                })}

                {/* Discount */}
                {discount > 0 && (
                  <tr style={{ background:'#f0fdf4' }}>
                    <td style={{ padding:'2px 4px', border:'1px solid #e2e8f0', fontSize:'8px' }}>11</td>
                    <td style={{ padding:'2px 4px', border:'1px solid #e2e8f0', fontSize:'8px' }}>Discount</td>
                    <td style={{ padding:'2px 4px', border:'1px solid #e2e8f0', textAlign:'right', fontSize:'8px', color:'#059669' }}>
                      − {discount.toLocaleString()}
                    </td>
                  </tr>
                )}

                {/* Total */}
                <tr style={{ background:'#dbeafe' }}>
                  <td colSpan={2} style={{ padding:'3px 4px', border:'1px solid #93c5fd', fontWeight:800, color:'#1e3a8a', textAlign:'right', fontSize:'8.5px' }}>TOTAL</td>
                  <td style={{ padding:'3px 4px', border:'1px solid #93c5fd', fontWeight:800, color:'#1e3a8a', textAlign:'right', fontSize:'8.5px' }}>
                    Rs {total.toLocaleString()}
                  </td>
                </tr>

                {/* Already paid */}
                {paid > 0 && (
                  <tr style={{ background:'#d1fae5' }}>
                    <td colSpan={2} style={{ padding:'2px 4px', border:'1px solid #a7f3d0', fontWeight:700, color:'#059669', textAlign:'right', fontSize:'8px' }}>PAID</td>
                    <td style={{ padding:'2px 4px', border:'1px solid #a7f3d0', fontWeight:700, color:'#059669', textAlign:'right', fontSize:'8px' }}>
                      − Rs {paid.toLocaleString()}
                    </td>
                  </tr>
                )}

                {/* Balance */}
                <tr style={{ background:'#fff1f2' }}>
                  <td colSpan={2} style={{ padding:'3px 4px', border:'1px solid #fca5a5', fontWeight:800, color:'#dc2626', textAlign:'right', fontSize:'8.5px' }}>
                    {paid > 0 ? 'BALANCE DUE' : 'AMOUNT PAYABLE'}
                  </td>
                  <td style={{ padding:'3px 4px', border:'1px solid #fca5a5', fontWeight:800, color:'#dc2626', textAlign:'right', fontSize:'8.5px' }}>
                    Rs {balance.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </div>
    );
  };

  // ── Modal ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Fixed full-screen backdrop */}
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Fixed modal card */}
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-3xl max-h-[88vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden animate-scale-in bg-white">

          {/* Toolbar — always visible */}
          <div className="flex-shrink-0 flex items-center justify-between bg-blue-700 px-5 py-3 rounded-t-2xl">
            <div>
              <h2 className="font-bold text-white text-base">Fee Challan — 3 Copies</h2>


            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrint}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: '#f59e0b', color: '#1e1b4b',
                  fontWeight: 800, fontSize: '13px',
                  padding: '7px 16px', borderRadius: '8px',
                  border: 'none', cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                }}
              >
                <Printer style={{ width: '14px', height: '14px' }} />
                Print Challan
              </button>
              <button onClick={onClose} className="ml-1 text-white/70 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Scrollable preview */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
            <div ref={printRef} style={{ maxWidth: '720px', margin: '0 auto' }}>
              {COPIES.map((c, idx) => (
                <div key={c.label}>
                  {renderSlip(c)}
                  {idx < COPIES.length - 1 && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      margin: '2px 0',
                      color: '#94a3b8',
                      fontSize: '11px',
                    }}>
                      <div style={{ flex:1, borderTop:'1.5px dashed #94a3b8' }} />
                      <span style={{ transform:'rotate(-90deg)', display:'inline-block', userSelect:'none', fontSize:'12px' }}>✂</span>
                      <div style={{ flex:1, borderTop:'1.5px dashed #94a3b8' }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
