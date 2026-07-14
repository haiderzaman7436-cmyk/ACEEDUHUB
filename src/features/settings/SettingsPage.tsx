import { useEffect, useState } from 'react';
import { Building2, UserCog, Calendar, ScrollText, DollarSign, Plus, Loader2, Save, Database, Trash2, Edit2, X, ShieldAlert } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Link, Route, Routes, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  getFeeTemplates,
  saveFeeTemplate,
  updateFeeTemplate,
} from '@/features/fees/feeService';
import {
  getGradeFeeStructure,
  saveGradeFeeStructure,
} from '@/features/registrations/registrationService';
import type { FeeTemplate, FeeType } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/features/auth/AuthContext';
import { seedDatabase, clearDummyData } from '@/lib/seedDatabase';
import { DataTable, type Column } from '@/components/common/DataTable';
import { Badge } from '@/components/ui/badge';
import type { AppUser, UserRole } from '@/types';
import { ROLE_LABELS } from '@/lib/constants';
import { getUsers, createUser, updateUserRole, toggleUserStatus } from './userService';

export default function SettingsPage() {
  const { user } = useAuth();
  const [isSeeding, setIsSeeding] = useState(false);

  const [isClearing, setIsClearing] = useState(false);

  const handleSeed = async () => {
    if (!user) return;
    const ok = window.confirm("This will inject dummy data into all collections. Proceed?");
    if (!ok) return;
    setIsSeeding(true);
    try {
      await seedDatabase(user.uid || 'admin');
      toast.success("Database populated with dummy data successfully!");
    } catch (err: any) {
      toast.error(`Seeding failed: ${err.message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleClearSeed = async () => {
    const ok = window.confirm("This will PERMANENTLY DELETE all dummy data from all collections. Proceed?");
    if (!ok) return;
    setIsClearing(true);
    try {
      await clearDummyData();
      toast.success("All dummy data removed successfully!");
    } catch (err: any) {
      toast.error(`Clear failed: ${err.message}`);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Admin Settings Control Panel"
        description="Modify academic term schedules, school metadata, student fee structures, and active roles."
      />

      <div className="grid gap-6 md:grid-cols-[240px_1fr]">
        {/* Navigation Sidebar inside Settings */}
        <div className="flex flex-col gap-1 space-y-1">
          <Link
            to="profile"
            className="flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-sm font-semibold hover:bg-slate-100 transition-all text-slate-700 hover:text-slate-900"
          >
            <Building2 className="h-4 w-4 text-slate-500" />
            School Profile
          </Link>
          <Link
            to="users"
            className="flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-sm font-semibold hover:bg-slate-100 transition-all text-slate-700 hover:text-slate-900"
          >
            <UserCog className="h-4 w-4 text-slate-500" />
            User Roles
          </Link>
          <Link
            to="fee-structure"
            className="flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-sm font-semibold hover:bg-slate-100 transition-all text-slate-700 hover:text-slate-900"
          >
            <DollarSign className="h-4 w-4 text-slate-500" />
            Fee Structures
          </Link>
          <Link
            to="academic-year"
            className="flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-sm font-semibold hover:bg-slate-100 transition-all text-slate-700 hover:text-slate-900"
          >
            <Calendar className="h-4 w-4 text-slate-500" />
            Academic Terms
          </Link>
          <Link
            to="activity-logs"
            className="flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-sm font-semibold hover:bg-slate-100 transition-all text-slate-700 hover:text-slate-900"
          >
            <ScrollText className="h-4 w-4 text-slate-500" />
            Audit Logs
          </Link>
        </div>

        {/* Content Pane */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <Routes>
            <Route index element={<Navigate to="profile" replace />} />
            <Route
              path="profile"
              element={
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-slate-800">School Profile Configuration</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Modify school phone numbers, address headers, principal signature labels, logo images, and contact emails here.
                  </p>
                  
                  <div className="mt-8 pt-6 border-t border-slate-100">
                    <h4 className="text-sm font-bold text-slate-800 mb-2">Development Actions</h4>
                    <div className="flex gap-3">
                      <Button 
                        onClick={handleSeed} 
                        disabled={isSeeding || isClearing}
                        variant="outline"
                        className="gap-2 text-violet-700 hover:text-violet-800 hover:bg-violet-50 border-violet-200"
                      >
                        {isSeeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                        {isSeeding ? 'Injecting Data...' : 'Inject Demo Data'}
                      </Button>
                      <Button 
                        onClick={handleClearSeed} 
                        disabled={isSeeding || isClearing}
                        variant="outline"
                        className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      >
                        {isClearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        {isClearing ? 'Removing...' : 'Clear Demo Data'}
                      </Button>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      Use these to safely populate or remove test dummy data. Real records will not be affected.
                    </p>
                  </div>
                </div>
              }
            />
            <Route
              path="users"
              element={<UserManagementSettings />}
            />
            <Route path="fee-structure" element={<FeeStructureSettings />} />
            <Route
              path="academic-year"
              element={
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-slate-800">Academic Year Calendar</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Set primary term start/end schedules, holidays, and close active sessions.
                  </p>
                </div>
              }
            />
            <Route
              path="activity-logs"
              element={
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-slate-800">Audit Logs View</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Observe active sessions, registrations changes, and financial collections tracking in real time.
                  </p>
                </div>
              }
            />
          </Routes>
        </div>
      </div>
    </div>
  );
}

// ── Sub-Component for Fee Structure Settings ─────────────────────────────────

function FeeStructureSettings() {
  const [templates, setTemplates] = useState<FeeTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states for class fee templates
  const [className, setClassName] = useState('Grade 9');
  const [feeType, setFeeType] = useState<FeeType>('tuition');
  const [feeAmount, setFeeAmount] = useState(15000);
  const [feeDesc, setFeeDesc] = useState('Monthly Tuition Fee');
  const [dueDay, setDueDay] = useState(10);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Form states for 9th and 10th grade board registrations
  const [g9RegFee, setG9RegFee] = useState(5000);
  const [g9ExamFee, setG9ExamFee] = useState(2500);
  const [g10RegFee, setG10RegFee] = useState(6000);
  const [g10ExamFee, setG10ExamFee] = useState(3000);
  const [isSavingBoardFees, setIsSavingBoardFees] = useState(false);

  const loadSettingsData = async () => {
    setIsLoading(true);
    try {
      const [temps, g9f, g10f] = await Promise.all([
        getFeeTemplates(),
        getGradeFeeStructure(9),
        getGradeFeeStructure(10),
      ]);
      setTemplates(temps);

      if (g9f) {
        setG9RegFee(g9f.registrationFee);
        setG9ExamFee(g9f.examFee);
      }
      if (g10f) {
        setG10RegFee(g10f.registrationFee);
        setG10ExamFee(g10f.examFee);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettingsData();
  }, []);

  const handleAddTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className || feeAmount <= 0) return;
    setIsSavingTemplate(true);
    try {
      await saveFeeTemplate({
        classId: className.toLowerCase().replace(/\s+/g, '-'),
        className,
        feeType,
        description: feeDesc,
        amount: feeAmount,
        frequency: 'monthly',
        dueDayOfMonth: dueDay,
        isActive: true,
      });
      toast.success('Fee template added successfully.');
      loadSettingsData();
    } catch {
      toast.error('Failed to save template.');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleToggleTemplate = async (id: string, currentActive: boolean) => {
    try {
      await updateFeeTemplate(id, { isActive: !currentActive });
      toast.success('Fee template updated.');
      loadSettingsData();
    } catch {
      toast.error('Failed to toggle template status.');
    }
  };

  const handleSaveBoardFees = async () => {
    setIsSavingBoardFees(true);
    try {
      await Promise.all([
        saveGradeFeeStructure(9, { registrationFee: g9RegFee, examFee: g9ExamFee }),
        saveGradeFeeStructure(10, { registrationFee: g10RegFee, examFee: g10ExamFee }),
      ]);
      toast.success('9th & 10th grade board registration fees updated.');
    } catch {
      toast.error('Failed to save board fees.');
    } finally {
      setIsSavingBoardFees(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="text-sm text-slate-500">Loading fee structures...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 9th & 10th Grade Board Registration fee config */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-50 pb-3">
          <CardTitle className="text-base font-bold text-slate-800">9th & 10th Board Registration Fees</CardTitle>
          <p className="text-xs text-slate-500">Set the custom registration and exam fees decided by admin and manager</p>
        </CardHeader>
        <CardContent className="pt-5 space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Grade 9 */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200/50">
              <h4 className="font-bold text-sm text-slate-700">Grade 9 Fee Structure</h4>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Registration Fee (PKR)</label>
                <Input
                  type="number"
                  value={g9RegFee}
                  onChange={(e) => setG9RegFee(Number(e.target.value))}
                  className="border-slate-200 bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Exam Fee (PKR)</label>
                <Input
                  type="number"
                  value={g9ExamFee}
                  onChange={(e) => setG9ExamFee(Number(e.target.value))}
                  className="border-slate-200 bg-white"
                />
              </div>
            </div>

            {/* Grade 10 */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200/50">
              <h4 className="font-bold text-sm text-slate-700">Grade 10 Fee Structure</h4>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Registration Fee (PKR)</label>
                <Input
                  type="number"
                  value={g10RegFee}
                  onChange={(e) => setG10RegFee(Number(e.target.value))}
                  className="border-slate-200 bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Exam Fee (PKR)</label>
                <Input
                  type="number"
                  value={g10ExamFee}
                  onChange={(e) => setG10ExamFee(Number(e.target.value))}
                  className="border-slate-200 bg-white"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end border-t border-slate-100 pt-4">
            <Button
              onClick={handleSaveBoardFees}
              disabled={isSavingBoardFees}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              {isSavingBoardFees ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Board Fees
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Class templates list */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-50 pb-3">
          <CardTitle className="text-base font-bold text-slate-800">Class Fee Templates</CardTitle>
          <p className="text-xs text-slate-500">Auto-assigned to students when enrolled in specific classes</p>
        </CardHeader>
        <CardContent className="pt-5 space-y-6">
          {/* Add template form */}
          <form onSubmit={handleAddTemplate} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6 bg-slate-50 p-4 rounded-xl border border-slate-200/50 items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Class Name</label>
              <select
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Grade 5">Grade 5</option>
                <option value="Grade 6">Grade 6</option>
                <option value="Grade 7">Grade 7</option>
                <option value="Grade 8">Grade 8</option>
                <option value="Grade 9">Grade 9</option>
                <option value="Grade 10">Grade 10</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Fee Type</label>
              <select
                value={feeType}
                onChange={(e) => setFeeType(e.target.value as FeeType)}
                className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="tuition">Tuition Fee</option>
                <option value="admission">Admission Fee</option>
                <option value="exam">Exam Fee</option>
                <option value="transport">Transport Fee</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Description</label>
              <Input
                value={feeDesc}
                onChange={(e) => setFeeDesc(e.target.value)}
                className="border-slate-200 bg-white"
                placeholder="e.g. Tuition Fee"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Amount (PKR)</label>
              <Input
                type="number"
                value={feeAmount}
                onChange={(e) => setFeeAmount(Number(e.target.value))}
                className="border-slate-200 bg-white"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Due Day (of month)</label>
              <Input
                type="number"
                value={dueDay}
                onChange={(e) => setDueDay(Number(e.target.value))}
                className="border-slate-200 bg-white"
                required
                min={1}
                max={28}
              />
            </div>
            <Button
              type="submit"
              disabled={isSavingTemplate}
              className="bg-blue-600 hover:bg-blue-700 text-white h-10 rounded-lg font-bold gap-1.5"
            >
              {isSavingTemplate ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add Template
            </Button>
          </form>

          {/* List templates */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 font-semibold text-slate-500">Class</th>
                  <th className="px-4 py-3 font-semibold text-slate-500">Fee Type</th>
                  <th className="px-4 py-3 font-semibold text-slate-500">Description</th>
                  <th className="px-4 py-3 font-semibold text-slate-500">Amount</th>
                  <th className="px-4 py-3 font-semibold text-slate-500">Due Day</th>
                  <th className="px-4 py-3 font-semibold text-slate-500">Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {templates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-slate-400">
                      No templates configured. Create one above to auto-assign student fees on enrollment.
                    </td>
                  </tr>
                ) : (
                  templates.map((t) => (
                    <tr key={t.id}>
                      <td className="px-4 py-3 font-semibold text-slate-700">{t.className}</td>
                      <td className="px-4 py-3 capitalize text-slate-600">{t.feeType}</td>
                      <td className="px-4 py-3 text-slate-600">{t.description}</td>
                      <td className="px-4 py-3 font-bold text-slate-700">{formatCurrency(t.amount)}</td>
                      <td className="px-4 py-3 text-slate-600">Day {t.dueDayOfMonth || 10}</td>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={t.isActive}
                          onChange={() => handleToggleTemplate(t.id, t.isActive)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Sub-Component for User Management Settings ────────────────────────────────

function UserManagementSettings() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Add User Form State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('Welcome@123');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('data_operator');

  // Edit Role State
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('data_operator');
  const [isUpdating, setIsUpdating] = useState(false);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newName || !newPassword) return;
    setIsSubmitting(true);
    try {
      await createUser({
        email: newEmail,
        password: newPassword,
        displayName: newName,
        role: newRole,
      });
      toast.success('User created successfully.');
      setIsAddOpen(false);
      setNewEmail('');
      setNewName('');
      loadUsers();
    } catch (err: any) {
      toast.error(`Failed to create user: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditRole = async (uid: string) => {
    setIsUpdating(true);
    try {
      await updateUserRole(uid, editRole);
      toast.success('Role updated successfully.');
      setEditUserId(null);
      loadUsers();
    } catch (err: any) {
      toast.error('Failed to update role.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleStatus = async (uid: string, currentStatus: boolean) => {
    try {
      await toggleUserStatus(uid, !currentStatus);
      toast.success(currentStatus ? 'User disabled.' : 'User activated.');
      loadUsers();
    } catch {
      toast.error('Failed to update status.');
    }
  };

  const columns: Column<AppUser>[] = [
    {
      key: 'displayName',
      header: 'User Name',
      sortable: true,
      cell: (item) => (
        <div>
          <div className="font-semibold text-slate-800 text-sm">{item.displayName}</div>
          <div className="text-xs text-slate-500">{item.email}</div>
        </div>
      )
    },
    {
      key: 'role',
      header: 'Role',
      sortable: true,
      cell: (item) => (
        editUserId === item.uid ? (
          <div className="flex items-center gap-2">
            <select
              value={editRole}
              onChange={(e) => setEditRole(e.target.value as UserRole)}
              className="h-8 rounded border border-slate-300 text-xs px-2 focus:ring-2 focus:ring-violet-500"
            >
              {Object.entries(ROLE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            <Button size="sm" onClick={() => handleEditRole(item.uid)} disabled={isUpdating} className="h-8 text-xs bg-violet-600 hover:bg-violet-700">
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditUserId(null)} className="h-8">Cancel</Button>
          </div>
        ) : (
          <Badge className={`font-semibold ${item.role === 'admin' ? 'bg-violet-100 text-violet-700' : item.role === 'manager' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {ROLE_LABELS[item.role] || item.role}
          </Badge>
        )
      )
    },
    {
      key: 'isActive',
      header: 'Status',
      cell: (item) => (
        <Badge className={item.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>
          {item.isActive ? 'Active' : 'Disabled'}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (item) => (
        <div className="flex justify-end gap-2">
          {editUserId !== item.uid && (
            <Button variant="ghost" size="sm" onClick={() => { setEditUserId(item.uid); setEditRole(item.role); }}>
              <Edit2 className="h-4 w-4 text-slate-500 hover:text-violet-600" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(item.uid, item.isActive)}>
            <ShieldAlert className={`h-4 w-4 ${item.isActive ? 'text-amber-500 hover:text-amber-600' : 'text-emerald-500 hover:text-emerald-600'}`} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-base font-bold text-slate-800">User Role Policies</h3>
          <p className="text-sm text-slate-500">Create staff accounts and assign system roles.</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="bg-violet-600 hover:bg-violet-700 text-white gap-2 text-sm h-9">
          <Plus className="h-4 w-4" /> Add User
        </Button>
      </div>

      {isLoading ? (
        <div className="h-40 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <DataTable data={users} columns={columns} searchField="displayName" searchPlaceholder="Search users..." />
      )}

      {/* Add User Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsAddOpen(false)} />
          <Card className="relative w-full max-w-md z-10 shadow-2xl animate-scale-in">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Add New User</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-5 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Full Name</label>
                <Input required value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Jane Doe" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Email</label>
                <Input type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="e.g. staff@school.com" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Temporary Password</label>
                <Input required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {Object.entries(ROLE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full bg-violet-600 hover:bg-violet-700 text-white h-10 mt-4">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create User'}
              </Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
