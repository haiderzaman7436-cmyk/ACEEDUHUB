import { useEffect, useState, useCallback } from 'react';
import {
  GraduationCap, Send, FileText, Award, CreditCard, X,
  Loader2, CheckCircle2, Users, AlertCircle,
  UserCheck, Plus, Trash2, Clock,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DataTable, type Column } from '@/components/common/DataTable';
import { formatCurrency } from '@/lib/utils';
import {
  getGradeRegistrations,
  createGradeRegistration,
  sendAdmission,
  bulkSendAdmission,
  markGradeRegistrationFeePaid,
  deleteGradeRegistration,
  getGradeFeeStructure,
} from './registrationService';
import { getStudents } from '@/features/students/studentService';
import type { GradeRegistration, Student } from '@/types';
import { useAuth } from '@/features/auth/AuthContext';
import { toast } from 'sonner';

type GradeTab = 9 | 10;

function getStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs font-semibold">✓ Completed</Badge>;
    case 'fees_paid':
      return <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs font-semibold">Fees Paid</Badge>;
    case 'admission_sent':
      return <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-xs font-semibold">Admission Sent</Badge>;
    case 'registered':
      return <Badge className="bg-violet-100 text-violet-700 border-violet-200 text-xs font-semibold">Registered</Badge>;
    default:
      return <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs font-semibold">⏳ Pending</Badge>;
  }
}

function getFeeBadge(feeStatus: string) {
  switch (feeStatus) {
    case 'paid':
      return <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Paid</span>;
    case 'partial':
      return <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Partial</span>;
    default:
      return <span className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Unpaid</span>;
  }
}

export default function RegistrationsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<GradeTab>(9);
  const [registrations, setRegistrations] = useState<GradeRegistration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Grade fee structures
  const [grade9Fees, setGrade9Fees] = useState<{ registrationFee: number; examFee: number } | null>(null);
  const [grade10Fees, setGrade10Fees] = useState<{ registrationFee: number; examFee: number } | null>(null);

  // Add registration modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [eligibleStudents, setEligibleStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Pay fee modal
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<GradeRegistration | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [isPaySubmitting, setIsPaySubmitting] = useState(false);

  // View card modal
  const [isCardOpen, setIsCardOpen] = useState(false);
  const [cardTarget, setCardTarget] = useState<GradeRegistration | null>(null);

  // Bulk send admission modal
  const [isBulkSendOpen, setIsBulkSendOpen] = useState(false);
  const [isBulkSending, setIsBulkSending] = useState(false);

  // Delete
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [regs, f9, f10] = await Promise.all([
        getGradeRegistrations(activeTab),
        getGradeFeeStructure(9),
        getGradeFeeStructure(10),
      ]);
      setRegistrations(regs);
      setGrade9Fees(f9);
      setGrade10Fees(f10);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { loadData(); }, [loadData]);

  const currentFeeStructure = activeTab === 9 ? grade9Fees : grade10Fees;

  // Load eligible students (in 9th or 10th grade, active)
  const handleOpenAdd = async () => {
    const allStudents = await getStudents();
    const grade = activeTab === 9 ? ['Grade 9', 'Class 9', '9'] : ['Grade 10', 'Class 10', '10'];
    const eligible = allStudents.filter((s) =>
      grade.some((g) => s.className.toLowerCase().includes(g.toLowerCase())) &&
      s.status === 'active' &&
      !registrations.find((r) => r.studentId === s.id)
    );
    setEligibleStudents(eligible);
    setSelectedStudent(null);
    setIsAddOpen(true);
  };

  const handleAddRegistration = async () => {
    if (!selectedStudent || !user) return;
    if (!currentFeeStructure) {
      toast.error('Fee structure not configured. Please set it in Settings → Fee Structure first.');
      return;
    }
    setIsSaving(true);
    try {
      const totalFee = currentFeeStructure.registrationFee + currentFeeStructure.examFee;
      await createGradeRegistration({
        studentId: selectedStudent.id,
        studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
        admissionNumber: selectedStudent.admissionNumber,
        rollNumber: selectedStudent.rollNumber,
        section: selectedStudent.section,
        gradeLevel: activeTab,
        className: selectedStudent.className,
        guardianName: selectedStudent.guardians[0]?.name || '—',
        guardianPhone: selectedStudent.guardians[0]?.phone || '—',
        registrationFee: currentFeeStructure.registrationFee,
        examFee: currentFeeStructure.examFee,
        totalFee,
        paidAmount: 0,
        remainingAmount: totalFee,
        feeStatus: 'pending',
        status: 'pending',
        createdBy: user.uid,
      });
      toast.success(`${selectedStudent.firstName} ${selectedStudent.lastName} added to Grade ${activeTab} registrations.`);
      setIsAddOpen(false);
      loadData();
    } catch {
      toast.error('Failed to add registration.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendAdmission = async (reg: GradeRegistration) => {
    if (!user) return;
    try {
      await sendAdmission(reg.id, user.uid);
      toast.success(`Admission sent for ${reg.studentName}`);
      loadData();
    } catch {
      toast.error('Failed to send admission.');
    }
  };

  const handleBulkSend = async () => {
    if (!user || selectedIds.length === 0) return;
    setIsBulkSending(true);
    try {
      await bulkSendAdmission(selectedIds, user.uid);
      toast.success(`Admission sent for ${selectedIds.length} students.`);
      setIsBulkSendOpen(false);
      setSelectedIds([]);
      loadData();
    } catch {
      toast.error('Bulk send admission failed.');
    } finally {
      setIsBulkSending(false);
    }
  };

  const handlePayClick = (reg: GradeRegistration) => {
    setPayTarget(reg);
    setPayAmount(reg.remainingAmount);
    setIsPayOpen(true);
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payTarget || payAmount <= 0) return;
    setIsPaySubmitting(true);
    try {
      await markGradeRegistrationFeePaid(payTarget.id, payAmount);
      toast.success(`Payment of ${formatCurrency(payAmount)} recorded for ${payTarget.studentName}`);
      setIsPayOpen(false);
      loadData();
    } catch {
      toast.error('Payment failed.');
    } finally {
      setIsPaySubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deleteGradeRegistration(deleteId);
      toast.success('Registration removed.');
      loadData();
    } catch {
      toast.error('Failed to delete.');
    } finally {
      setIsDeleting(false);
      setIsDeleteOpen(false);
      setDeleteId(null);
    }
  };

  // KPIs
  const total = registrations.length;
  const admitted = registrations.filter((r) => r.status !== 'pending').length;
  const feesPaid = registrations.filter((r) => r.feeStatus === 'paid').length;
  const pending = registrations.filter((r) => r.status === 'pending').length;
  const totalRevenue = registrations.reduce((s, r) => s + r.paidAmount, 0);

  const columns: Column<GradeRegistration>[] = [
    {
      key: 'select',
      header: '',
      cell: (item) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(item.id)}
          onChange={(e) => {
            if (e.target.checked) setSelectedIds((prev) => [...prev, item.id]);
            else setSelectedIds((prev) => prev.filter((id) => id !== item.id));
          }}
          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
      ),
    },
    {
      key: 'studentName',
      header: 'Student',
      sortable: true,
      cell: (item) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 shrink-0 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center">
            {item.studentName.charAt(0)}
          </div>
          <div>
            <div className="font-semibold text-slate-800 text-sm">{item.studentName}</div>
            <div className="text-[11px] text-slate-500">#{item.admissionNumber} · Roll {item.rollNumber || 'N/A'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'section',
      header: 'Section',
      cell: (item) => <span className="font-semibold text-slate-700 text-sm">{item.section}</span>,
    },
    {
      key: 'feeStatus',
      header: 'Fee Status',
      sortable: true,
      cell: (item) => (
        <div className="space-y-1">
          {getFeeBadge(item.feeStatus)}
          <div className="text-[10px] text-slate-500">
            {formatCurrency(item.paidAmount)} / {formatCurrency(item.totalFee)}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Admission Status',
      sortable: true,
      cell: (item) => getStatusBadge(item.status),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (item) => (
        <div className="flex items-center gap-1.5 justify-end flex-wrap">
          {/* Send Admission */}
          {item.status === 'pending' && (
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => handleSendAdmission(item)}
            >
              <Send className="h-3.5 w-3.5" />
              Send Admission
            </Button>
          )}
          {item.status !== 'pending' && (
            <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-2 py-1 rounded-lg flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Sent
            </span>
          )}

          {/* Registration Card */}
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5 border-slate-200"
            onClick={() => { setCardTarget(item); setIsCardOpen(true); }}
          >
            <FileText className="h-3.5 w-3.5" />
            Reg. Card
          </Button>

          {/* Pay Fee */}
          {item.feeStatus !== 'paid' && (
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => handlePayClick(item)}
            >
              <CreditCard className="h-3.5 w-3.5" />
              Pay Fee
            </Button>
          )}
          {item.feeStatus === 'paid' && (
            <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-lg flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Paid
            </span>
          )}

          {/* Delete */}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
            onClick={() => { setDeleteId(item.id); setIsDeleteOpen(true); }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Grade Registrations"
        description="Manage 9th & 10th grade board registrations, admissions, and fee collection."
        action={{
          label: 'Add Student',
          onClick: handleOpenAdd,
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      {/* Grade Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([9, 10] as GradeTab[]).map((grade) => (
          <button
            key={grade}
            onClick={() => { setActiveTab(grade); setSelectedIds([]); }}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === grade
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Grade {grade}
          </button>
        ))}
      </div>

      {/* Fee Structure Info */}
      {currentFeeStructure ? (
        <Card className="border border-blue-100 bg-blue-50 shadow-none">
          <CardContent className="p-4 flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-800">Grade {activeTab} Fee Structure</span>
            </div>
            <div className="text-sm text-blue-700">
              Registration Fee: <span className="font-bold">{formatCurrency(currentFeeStructure.registrationFee)}</span>
            </div>
            <div className="text-sm text-blue-700">
              Exam Fee: <span className="font-bold">{formatCurrency(currentFeeStructure.examFee)}</span>
            </div>
            <div className="text-sm text-blue-900 font-bold">
              Total: {formatCurrency(currentFeeStructure.registrationFee + currentFeeStructure.examFee)}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-amber-200 bg-amber-50 shadow-none">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Fee structure not configured for Grade {activeTab}</p>
              <p className="text-xs text-amber-700">Go to Settings → Fee Structure to configure fees for Grade {activeTab}.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total Registered', value: total, color: 'text-blue-700', bg: 'bg-blue-50', icon: Users },
          { label: 'Admission Sent', value: admitted, color: 'text-indigo-700', bg: 'bg-indigo-50', icon: Send },
          { label: 'Fees Paid', value: feesPaid, color: 'text-emerald-700', bg: 'bg-emerald-50', icon: CheckCircle2 },
          { label: 'Pending', value: pending, color: 'text-amber-700', bg: 'bg-amber-50', icon: Clock },
          { label: 'Fee Revenue', value: formatCurrency(totalRevenue), color: 'text-green-700', bg: 'bg-green-50', icon: CreditCard },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <Card key={label} className="border border-slate-200 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-9 w-9 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                <Icon className={`h-4.5 w-4.5 ${color}`} />
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">{label}</div>
                <div className={`text-base font-bold ${color}`}>{value}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bulk Send Admission */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
          <UserCheck className="h-5 w-5 text-indigo-600 shrink-0" />
          <p className="text-sm font-semibold text-indigo-800 flex-1">
            {selectedIds.length} student{selectedIds.length > 1 ? 's' : ''} selected
          </p>
          <Button
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
            onClick={() => setIsBulkSendOpen(true)}
          >
            <Send className="h-3.5 w-3.5" />
            Send Admission to All Selected
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>Clear</Button>
        </div>
      )}

      {/* Data Table */}
      <Card className="border border-slate-200 shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="text-sm text-slate-500">Loading Grade {activeTab} registrations...</span>
              </div>
            </div>
          ) : registrations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <GraduationCap className="h-12 w-12 text-slate-300 mb-3" />
              <p className="text-slate-600 font-semibold">No Grade {activeTab} registrations yet</p>
              <p className="text-sm text-slate-400 mt-1">Click "Add Student" to register Grade {activeTab} students</p>
            </div>
          ) : (
            <DataTable
              data={registrations}
              columns={columns}
              searchField="studentName"
              searchPlaceholder={`Search Grade ${activeTab} students...`}
            />
          )}
        </CardContent>
      </Card>

      {/* ── Add Registration Modal ─────────────────────────────────────────── */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsAddOpen(false)} />
          <Card className="relative w-full max-w-lg z-10 animate-scale-in shadow-2xl border-slate-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-800 text-base">Add Grade {activeTab} Registration</h2>
                <p className="text-xs text-slate-500 mt-0.5">Select an enrolled Grade {activeTab} student</p>
              </div>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {eligibleStudents.length === 0 ? (
                <div className="text-center py-8">
                  <GraduationCap className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-600 font-semibold text-sm">No eligible Grade {activeTab} students found</p>
                  <p className="text-xs text-slate-400 mt-1">Enroll Grade {activeTab} students first in the Students section.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {eligibleStudents.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSelectedStudent(s)}
                        className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border transition-all duration-150 ${
                          selectedStudent?.id === s.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center shrink-0">
                          {s.firstName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-800 text-sm">{s.firstName} {s.lastName}</div>
                          <div className="text-xs text-slate-500">#{s.admissionNumber} · {s.className} — Sec {s.section}</div>
                        </div>
                        {selectedStudent?.id === s.id && <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0" />}
                      </button>
                    ))}
                  </div>

                  {currentFeeStructure && selectedStudent && (
                    <div className="bg-blue-50 rounded-xl p-4 text-sm space-y-1">
                      <div className="flex justify-between text-slate-600">
                        <span>Registration Fee:</span>
                        <span className="font-semibold">{formatCurrency(currentFeeStructure.registrationFee)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Exam Fee:</span>
                        <span className="font-semibold">{formatCurrency(currentFeeStructure.examFee)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-slate-800 border-t border-blue-100 pt-1 mt-1">
                        <span>Total Due:</span>
                        <span className="text-blue-700">{formatCurrency(currentFeeStructure.registrationFee + currentFeeStructure.examFee)}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                    <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                    <Button
                      onClick={handleAddRegistration}
                      disabled={!selectedStudent || isSaving}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Register Student'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ── Registration Card Modal ───────────────────────────────────────── */}
      {isCardOpen && cardTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsCardOpen(false)} />
          <Card className="relative w-full max-w-md z-10 animate-scale-in shadow-2xl border-slate-200 overflow-hidden">
            {/* Card Header */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-700 p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xs text-blue-200 font-semibold uppercase tracking-wide">ACE Educational Hub</div>
                  <div className="text-lg font-black mt-1">Grade {cardTarget.gradeLevel} Registration Card</div>
                </div>
                <GraduationCap className="h-10 w-10 text-white/40" />
              </div>
              <div className="text-sm text-blue-100">Academic Year 2026–27</div>
            </div>
            <div className="p-6 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'Student Name', value: cardTarget.studentName },
                  { label: 'Admission No.', value: cardTarget.admissionNumber },
                  { label: 'Class', value: cardTarget.className },
                  { label: 'Section', value: cardTarget.section },
                  { label: 'Roll No.', value: cardTarget.rollNumber || 'N/A' },
                  { label: 'Grade Level', value: `Grade ${cardTarget.gradeLevel}` },
                  { label: 'Guardian', value: cardTarget.guardianName },
                  { label: 'Phone', value: cardTarget.guardianPhone },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div className="text-[10px] font-semibold text-slate-400 uppercase">{label}</div>
                    <div className="font-semibold text-slate-800 text-sm">{value}</div>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-100 pt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Registration Fee:</span>
                  <span className="font-semibold">{formatCurrency(cardTarget.registrationFee)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-slate-500">Exam Fee:</span>
                  <span className="font-semibold">{formatCurrency(cardTarget.examFee)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1 font-bold text-slate-800">
                  <span>Total:</span>
                  <span className="text-blue-700">{formatCurrency(cardTarget.totalFee)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-slate-500">Paid:</span>
                  <span className="text-emerald-600 font-semibold">{formatCurrency(cardTarget.paidAmount)}</span>
                </div>
                {cardTarget.remainingAmount > 0 && (
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-slate-500">Remaining:</span>
                    <span className="text-red-600 font-bold">{formatCurrency(cardTarget.remainingAmount)}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                {getStatusBadge(cardTarget.status)}
                {getFeeBadge(cardTarget.feeStatus)}
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <Button size="sm" variant="outline" onClick={() => window.print()}>Print Card</Button>
                <Button size="sm" onClick={() => setIsCardOpen(false)} className="bg-blue-600 hover:bg-blue-700 text-white">Close</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── Pay Fee Modal ─────────────────────────────────────────────────── */}
      {isPayOpen && payTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsPayOpen(false)} />
          <Card className="relative w-full max-w-md z-10 animate-scale-in shadow-2xl border-slate-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-800 text-base">Collect Registration Fee</h2>
                <p className="text-xs text-slate-500 mt-0.5">Grade {payTarget.gradeLevel} — {payTarget.studentName}</p>
              </div>
              <button onClick={() => setIsPayOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handlePaySubmit} className="p-6 space-y-4">
              <div className="bg-blue-50 rounded-xl p-4 text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Registration Fee:</span>
                  <span className="font-semibold">{formatCurrency(payTarget.registrationFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Exam Fee:</span>
                  <span className="font-semibold">{formatCurrency(payTarget.examFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total:</span>
                  <span className="font-semibold">{formatCurrency(payTarget.totalFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Paid:</span>
                  <span className="text-emerald-600 font-semibold">{formatCurrency(payTarget.paidAmount)}</span>
                </div>
                <div className="flex justify-between border-t border-blue-100 pt-1 mt-1">
                  <span className="font-semibold text-slate-700">Balance Due:</span>
                  <span className="font-bold text-red-600">{formatCurrency(payTarget.remainingAmount)}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Payment Amount (PKR)</label>
                <Input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  max={payTarget.remainingAmount}
                  required
                  className="border-slate-200"
                />
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsPayOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isPaySubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {isPaySubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Record Payment'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ── Bulk Send Confirm ─────────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={isBulkSendOpen}
        onClose={() => setIsBulkSendOpen(false)}
        onConfirm={handleBulkSend}
        title={`Send Admission to ${selectedIds.length} Students?`}
        description={`This will mark admission as sent for all ${selectedIds.length} selected Grade ${activeTab} students.`}
        confirmLabel="Send Admission"
        isLoading={isBulkSending}
      />

      {/* ── Delete Confirm ────────────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Remove Registration?"
        description="This will permanently remove this grade registration record."
        confirmLabel="Remove"
        isDestructive
        isLoading={isDeleting}
      />
    </div>
  );
}
