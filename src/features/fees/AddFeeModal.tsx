import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { addFee } from './feeService';
import { toast } from 'sonner';

interface AddFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddFeeModal({ isOpen, onClose, onSuccess }: AddFeeModalProps) {
  const [students, setStudents] = useState<any[]>([]);
  const [studentId, setStudentId] = useState('');
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getDocs(query(collection(db, 'students'), where('status', '==', 'active')))
        .then((snap) => {
          const st = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          st.sort((a: any, b: any) => a.firstName.localeCompare(b.firstName));
          setStudents(st);
          if (st.length > 0) setStudentId(st[0].id);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || amount <= 0 || !description || !dueDate) return;

    setIsSubmitting(true);
    try {
      const student = students.find(s => s.id === studentId);
      if (!student) throw new Error('Student not found');

      await addFee({
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        className: student.className,
        section: student.section,
        feeType: 'other',
        description,
        amount,
        dueDate,
        paidAmount: 0,
        status: 'pending',
        month: new Date(dueDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      });

      toast.success('Fee added successfully and invoice generated.');
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to add fee.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Add Custom Fee</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Student</label>
            <select
              value={studentId}
              onChange={e => setStudentId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 text-sm"
              required
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.firstName} {s.lastName} — {s.className}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Description</label>
            <Input 
              placeholder="e.g. Fine, Books, Uniform" 
              value={description}
              onChange={e => setDescription(e.target.value)}
              required 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Amount (Rs)</label>
            <Input 
              type="number" 
              min="1" 
              value={amount || ''}
              onChange={e => setAmount(Number(e.target.value))}
              required 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Due Date</label>
            <Input 
              type="date" 
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              required 
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[100px]">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Fee'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
