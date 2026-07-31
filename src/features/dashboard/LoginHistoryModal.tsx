import { useEffect, useState } from 'react';
import { X, Loader2, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/common/DataTable';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface LoginRecord {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  role: string;
  timestamp: Date;
}

interface LoginHistoryModalProps {
  onClose: () => void;
}

export function LoginHistoryModal({ onClose }: LoginHistoryModalProps) {
  const [history, setHistory] = useState<LoginRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const q = query(collection(db, 'loginHistory'), orderBy('timestamp', 'desc'), limit(100));
        const snap = await getDocs(q);
        const records = snap.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(),
          } as LoginRecord;
        });
        setHistory(records);
      } catch (error: any) {
        console.error('Failed to fetch login history', error);
        toast.error('History Error: ' + error.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const columns: Column<LoginRecord>[] = [
    {
      key: 'displayName',
      header: 'User',
      cell: (item) => (
        <div>
          <div className="font-medium text-slate-800">{item.displayName}</div>
          <div className="text-[11px] text-slate-500">{item.email}</div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      cell: (item) => (
        <Badge className="bg-slate-100 text-slate-700 capitalize border-slate-200">
          {item.role}
        </Badge>
      ),
    },
    {
      key: 'timestamp',
      header: 'Time',
      cell: (item) => (
        <div className="flex items-center gap-1.5 text-sm text-slate-600">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          <span>
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      cell: (item) => (
        <span className="text-sm text-slate-600">
          {formatDate(item.timestamp.toISOString())}
        </span>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <Card className="relative w-full max-w-3xl max-h-[85vh] flex flex-col z-10 animate-scale-in shadow-2xl border-slate-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-bold text-slate-800 text-lg">System Login History</h2>
            <p className="text-xs text-slate-500 mt-0.5">Recent user authentications across the platform</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-50 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-auto p-6 bg-slate-50/50">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p>Loading records...</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <DataTable data={history} columns={columns} />
              {history.length === 0 && (
                <div className="text-center py-10 text-slate-500">
                  No login history found.
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
