import { useState } from 'react';
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
  
  // Filter based on selected type:
  // Alert -> only overdue
  // Reminder -> pending or sent
  const filteredRecords = records.filter(r => 
    msgType === 'alert' ? r.status === 'overdue' : (r.status === 'pending' || r.status === 'sent' || r.status === 'partial')
  );
  
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleSendAndNext = async () => {
    if (currentIndex >= filteredRecords.length) return;
    const current = filteredRecords[currentIndex];
    
    // Attempt to send
    await sendWhatsAppAlert(current, type, msgType);
    
    // Notify parent to refresh data (optional, but good for UI)
    onAlertSent();

    // Move to next
    setCurrentIndex(prev => prev + 1);
  };

  const isDone = currentIndex >= filteredRecords.length;
  const currentRecord = filteredRecords[currentIndex];

  return (
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
              <p className="text-sm text-slate-500 mt-1">You've reached the end of the overdue queue.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-center mb-3 pb-3 border-b border-slate-100">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Queue: {currentIndex + 1} of {filteredRecords.length}
                  </span>
                  {currentRecord.alertSentAt && (
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-uppercase">
                      Already Sent
                    </span>
                  )}
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
              
              <div className="bg-blue-50 text-blue-800 text-sm p-4 rounded-xl flex items-start gap-3 border border-blue-100 shadow-sm">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-blue-600" />
                <p className="font-medium leading-relaxed">Clicking <strong>"Send & Next"</strong> will open WhatsApp Web. You must manually click the Send button in WhatsApp before returning here.</p>
              </div>

              <Button 
                onClick={handleSendAndNext}
                className="w-full h-12 text-base font-bold gap-2 bg-green-500 hover:bg-green-600 text-white"
              >
                <MessageCircle className="h-5 w-5" />
                Send & Next
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
