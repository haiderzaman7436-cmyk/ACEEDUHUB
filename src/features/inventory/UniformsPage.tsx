import { useEffect, useState } from 'react';
import {
  Plus, Edit2, Trash2, Shirt, AlertTriangle,
  X, Save, Loader2,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable, type Column } from '@/components/common/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { formatCurrency } from '@/lib/utils';
import {
  getUniforms,
  addUniform,
  updateUniform,
  deleteUniform,
} from './inventoryService';
import type { UniformItem } from '@/types';
import { toast } from 'sonner';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Custom'];

type FormState = {
  name: string;
  size: string;
  gender: 'male' | 'female' | 'unisex';
  color: string;
  quantity: number;
  unitPrice: number;
  supplier: string;
  reorderLevel: number;
  notes: string;
};

const defaultForm: FormState = {
  name: '',
  size: 'M',
  gender: 'unisex',
  color: '',
  quantity: 0,
  unitPrice: 0,
  supplier: '',
  reorderLevel: 5,
  notes: '',
};

export default function UniformsPage() {
  const [items, setItems] = useState<UniformItem[]>([]);
  const [_isLoading, setIsLoading] = useState(true);
  const [genderFilter, setGenderFilter] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [isSaving, setIsSaving] = useState(false);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadItems = () => {
    setIsLoading(true);
    getUniforms()
      .then(setItems)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { loadItems(); }, []);

  const handleAddClick = () => {
    setForm(defaultForm);
    setIsEditing(false);
    setEditId(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (item: UniformItem) => {
    setForm({
      name: item.name,
      size: item.size,
      gender: item.gender,
      color: item.color || '',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      supplier: item.supplier || '',
      reorderLevel: item.reorderLevel,
      notes: item.notes || '',
    });
    setIsEditing(true);
    setEditId(item.id);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setIsSaving(true);
    try {
      if (isEditing && editId) {
        await updateUniform(editId, form);
        toast.success('Uniform item updated.');
      } else {
        await addUniform(form);
        toast.success('Uniform added to inventory.');
      }
      setIsFormOpen(false);
      loadItems();
    } catch {
      toast.error('Failed to save uniform item.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deleteUniform(deleteId);
      toast.success('Uniform item removed from inventory.');
      loadItems();
    } catch {
      toast.error('Failed to delete uniform item.');
    } finally {
      setIsDeleting(false);
      setIsDeleteOpen(false);
      setDeleteId(null);
    }
  };

  const genderLabel = (g: string) =>
    g === 'male' ? 'Boys' : g === 'female' ? 'Girls' : 'Unisex';

  const genderColor = (g: string) =>
    g === 'male'
      ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
      : g === 'female'
      ? 'bg-pink-500/10 text-pink-700 dark:text-pink-400'
      : 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400';

  const filtered = items.filter((i) =>
    !genderFilter || i.gender === genderFilter,
  );

  const lowStock = items.filter((i) => i.quantity <= i.reorderLevel);

  const columns: Column<UniformItem>[] = [
    {
      key: 'name',
      header: 'Uniform Item',
      sortable: true,
      cell: (item) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-violet-600">
            <Shirt className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold">{item.name}</div>
            <div className="text-xs text-[hsl(var(--muted-foreground))]">
              {item.color} · Size {item.size}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'gender',
      header: 'Gender',
      sortable: true,
      cell: (item) => (
        <Badge variant="outline" className={genderColor(item.gender)}>
          {genderLabel(item.gender)}
        </Badge>
      ),
    },
    {
      key: 'quantity',
      header: 'Qty in Stock',
      sortable: true,
      cell: (item) => (
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${item.quantity <= item.reorderLevel ? 'text-red-600 dark:text-red-400' : 'text-[hsl(var(--foreground))]'}`}>
            {item.quantity}
          </span>
          {item.quantity <= item.reorderLevel && (
            <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-400 text-[10px] gap-1">
              <AlertTriangle className="h-2.5 w-2.5" /> Low
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'size',
      header: 'Size',
      cell: (item) => (
        <span className="rounded-md border border-[hsl(var(--border))] px-2 py-0.5 text-xs font-semibold">{item.size}</span>
      ),
    },
    {
      key: 'unitPrice',
      header: 'Unit Price',
      sortable: true,
      cell: (item) => formatCurrency(item.unitPrice),
    },
    {
      key: 'supplier',
      header: 'Supplier',
      cell: (item) => (
        <span className="text-sm text-[hsl(var(--muted-foreground))]">{item.supplier || '—'}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-blue-600 rounded-lg" onClick={() => handleEditClick(item)}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-red-500 rounded-lg" onClick={() => handleDeleteClick(item.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Uniform Inventory"
        description="Track school uniform stock by size, gender, and supplier."
        action={{ label: 'Add Uniform', onClick: handleAddClick, icon: <Plus className="h-4 w-4" /> }}
      />

      {lowStock.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            <span className="font-bold">{lowStock.length} item{lowStock.length > 1 ? 's' : ''}</span>
            {' '}below reorder level:{' '}
            <span className="font-semibold">{lowStock.map((i) => `${i.name} (${i.size})`).join(', ')}</span>
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total SKUs', value: items.length, color: 'text-violet-600 bg-violet-500/10' },
          { label: 'Low Stock', value: lowStock.length, color: 'text-red-600 bg-red-500/10' },
          { label: "Boys' Items", value: items.filter((i) => i.gender === 'male').length, color: 'text-blue-600 bg-blue-500/10' },
          { label: "Girls' Items", value: items.filter((i) => i.gender === 'female').length, color: 'text-pink-600 bg-pink-500/10' },
        ].map(({ label, value, color }) => (
          <Card key={label} className="border-[hsl(var(--border))]/60 shadow-xs">
            <CardContent className="flex items-center gap-4 p-4">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
                <Shirt className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xl font-black">{value}</div>
                <div className="text-xs text-[hsl(var(--muted-foreground))]">{label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        searchField="name"
        searchPlaceholder="Search uniform items..."
        filterComponent={
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="h-10 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-all"
          >
            <option value="">All Genders</option>
            <option value="male">Boys</option>
            <option value="female">Girls</option>
            <option value="unisex">Unisex</option>
          </select>
        }
      />

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setIsFormOpen(false)} />
          <Card className="relative w-full max-w-lg z-10 animate-scale-in">
            <CardHeader className="p-0 px-6 pt-6 pb-4 flex flex-row items-center justify-between border-b border-[hsl(var(--border))]/50">
              <CardTitle className="text-base font-bold">
                {isEditing ? 'Edit Uniform Item' : 'Add Uniform Item'}
              </CardTitle>
              <button onClick={() => setIsFormOpen(false)} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <form onSubmit={handleFormSubmit}>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Item Name *</label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. School Shirt" required />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Gender</label>
                    <select
                      value={form.gender}
                      onChange={(e) => setForm({ ...form, gender: e.target.value as FormState['gender'] })}
                      className="flex h-10 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                    >
                      <option value="male">Boys</option>
                      <option value="female">Girls</option>
                      <option value="unisex">Unisex</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Size</label>
                    <select
                      value={form.size}
                      onChange={(e) => setForm({ ...form, size: e.target.value })}
                      className="flex h-10 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                    >
                      {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Color</label>
                    <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="e.g. White" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Qty in Stock</label>
                    <Input type="number" min={0} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Unit Price (PKR)</label>
                    <Input type="number" min={0} value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Reorder Level</label>
                    <Input type="number" min={0} value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Supplier</label>
                  <Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="e.g. Karachi Garments" />
                </div>
              </CardContent>
              <div className="flex justify-end gap-2 border-t border-[hsl(var(--border))]/40 px-6 py-4">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSaving}>Cancel</Button>
                <Button type="submit" disabled={isSaving} className="gap-2">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isEditing ? 'Save Changes' : 'Add Uniform'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Remove Uniform Item?"
        description="This will permanently remove this uniform SKU from inventory. This cannot be undone."
        confirmLabel="Remove"
        isDestructive
        isLoading={isDeleting}
      />
    </div>
  );
}
