import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, MessageCircle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Fee, Invoice } from '@/types';
import { sendWhatsAppAlert } from './whatsappService';
import { formatCurrency } from '@/lib/utils';

interface BulkWhatsAppModalProps {
  records: (Fee | Invoice)[];
  type: 'Fee' | 'Invoice';
  onClose: () => void;
  onAlertSent: () => void; // to trigger reload
}

export function BulkWhatsAppModal({ records, type, onClose, onAlertSent }: BulkWhatsAppModalProps) {
  const [msgType, setMsgType] = useState<'alert' | 'reminder'>('alert');
  const [skipSent, setSkipSent] = useState(false);
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [localSentIds, setLocalSentIds] = useState<Set<string>>(new Set());
  
  // Filter based on selected type and skipped IDs
  const filteredRecords = records.filter(r => {
    const typeMatch = msgType === 'alert' ? r.status === 'overdue' : (r.status === 'pending' || r.status === 'sent' || r.status === 'partial' || r.status === 'draft');
    if (!typeMatch) return false;
    if (skipSent && (r.alertSentAt || (r.id && localSentIds.has(r.id)))) return false;
    if (r.id && skippedIds.has(r.id)) return false;
    return true;
  });
  
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleSendAndNext = async () => {
    if (currentIndex >= filteredRecords.length) return;
    const current = filteredRecords[currentIndex];
    
    // Attempt to send
    await sendWhatsAppAlert(current, type, msgType);
    
    // Notify parent to refresh data in background
    onAlertSent();
    
    // Mark locally so UI updates instantly
    if (current.id) {
      setLocalSentIds(prev => new Set(prev).add(current.id!));
    }

    // Only move index if the item is not being automatically removed from the list
    if (!skipSent) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleSkipCurrent = () => {
    if (currentIndex >= filteredRecords.length) return;
    const current = filteredRecords[currentIndex];
    if (current.id) {
      setSkippedIds(prev => new Set(prev).add(current.id));
    }
  };

  const isDone = currentIndex >= filteredRecords.length;
  const currentRecord = filteredRecords[currentIndex];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <Card className="relative w-full max-w-md z-10 animate-scale-in shadow-2xl border-slate-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-800 text-lg">Bulk Send WhatsApp {msgType === 'alert' ? 'Alerts' : 'Reminders'}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{filteredRecords.length} records found</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="p-4 bg-white border-b border-slate-100">
            <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => { setMsgType('alert'); setCurrentIndex(0); }}
                className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors ${msgType === 'alert' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Overdue Alerts
              </button>
              <button
                onClick={() => { setMsgType('reminder'); setCurrentIndex(0); }}
                className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors ${msgType === 'reminder' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Fee Reminders
              </button>
            </div>
          </div>
          
          <div className="p-6 bg-slate-50/50">
            {filteredRecords.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <h3 className="font-medium text-slate-800">No Records Found</h3>
                <p className="text-sm text-slate-500 mt-1">There are no {msgType === 'alert' ? 'overdue' : 'pending'} records to send messages for.</p>
              </div>
          ) : isDone ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="font-bold text-emerald-700">All Caught Up!</h3>
              <p className="text-sm text-slate-500 mt-1">You've reached the end of the queue.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-center mb-3 pb-3 border-b border-slate-100">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Queue: {currentIndex + 1} of {filteredRecords.length}
                  </span>
                  <div className="flex items-center gap-2">
                    {(currentRecord.alertSentAt || (currentRecord.id && localSentIds.has(currentRecord.id))) && (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded uppercase">
                        Already Sent
                      </span>
                    )}
                    <div className="flex items-center gap-1.5 ml-2 border-l border-slate-200 pl-2">
                      <input 
                        type="checkbox" 
                        id="skipSent" 
                        checked={skipSent}
                        onChange={(e) => {
                          setSkipSent(e.target.checked);
                          setCurrentIndex(0);
                        }}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                      />
                      <label htmlFor="skipSent" className="text-[10px] font-bold text-slate-600 uppercase cursor-pointer">
                        Hide Sent
                      </label>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Student:</span>
                    <span className="text-sm font-bold text-slate-800">{currentRecord.studentName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Class:</span>
                    <span className="text-sm font-medium text-slate-700">{currentRecord.className} - {currentRecord.section}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Total Due:</span>
                    <span className="text-sm font-bold text-red-600">
                      {formatCurrency(
                        (type === 'Fee' ? (currentRecord as Fee).amount : (currentRecord as Invoice).grandTotal) - 
                        (currentRecord.paidAmount || 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Pending Queue List */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Upcoming in Queue
                  </span>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    {filteredRecords.length - currentIndex - 1} Remaining
                  </span>
                </div>
                <div className="max-h-28 overflow-y-auto divide-y divide-slate-100">
                  {filteredRecords.slice(currentIndex + 1).map((r, idx) => (
                    <div key={r.id || idx} className="px-4 py-2 flex justify-between items-center text-xs hover:bg-slate-50 group">
                      <div>
                        <div className="font-semibold text-slate-700">{r.studentName}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-400">{r.className} - {r.section}</span>
                          {(r.alertSentAt || (r.id && localSentIds.has(r.id))) && (
                            <span className="text-[8px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded uppercase">Sent</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-slate-600">
                          {formatCurrency((type === 'Fee' ? (r as Fee).amount : (r as Invoice).grandTotal) - (r.paidAmount || 0))}
                        </span>
                        <button 
                          onClick={() => r.id && setSkippedIds(prev => new Set(prev).add(r.id!))}
                          className="text-[10px] text-slate-400 hover:text-red-500 font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Skip
                        </button>
                      </div>
                    </div>
                  ))}
                  {filteredRecords.length - currentIndex - 1 <= 0 && (
                    <div className="px-4 py-4 text-center text-xs text-slate-400 font-medium">
                      No more students in the queue.
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-blue-50 text-blue-800 text-sm p-4 rounded-xl flex items-start gap-3 border border-blue-100 shadow-sm">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-blue-600" />
                <p className="font-medium leading-relaxed">Clicking <strong>"Send & Next"</strong> will open WhatsApp Web. You must manually click the Send button in WhatsApp before returning here.</p>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={handleSkipCurrent}
                  variant="outline"
                  className="w-1/3 h-12 text-base font-bold border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Skip
                </Button>
                <Button 
                  onClick={handleSendAndNext}
                  className="w-2/3 h-12 text-base font-bold gap-2 bg-green-500 hover:bg-green-600 text-white"
                >
                  <MessageCircle className="h-5 w-5" />
                  Send & Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>,
    document.body
  );
}
