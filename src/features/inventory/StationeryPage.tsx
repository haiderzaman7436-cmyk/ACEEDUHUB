import { useEffect, useState } from 'react';
import {
  Plus, Edit2, Trash2, Pencil, AlertTriangle, Package,
  X, Save, Loader2,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable, type Column } from '@/components/common/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  getStationery,
  addStationery,
  updateStationery,
  deleteStationery,
} from './inventoryService';
import type { StationeryItem } from '@/types';
import { toast } from 'sonner';

const CATEGORIES = ['Paper', 'Pens', 'Markers', 'Notebooks', 'Correction', 'Scissors & Cutters', 'Tape & Adhesives', 'Other'];

type FormState = {
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  supplier: string;
  reorderLevel: number;
  notes: string;
};

const defaultForm: FormState = {
  name: '',
  category: 'Paper',
  quantity: 0,
  unitPrice: 0,
  supplier: '',
  reorderLevel: 5,
  notes: '',
};

export default function StationeryPage() {
  const [items, setItems] = useState<StationeryItem[]>([]);
  const [_isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');

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
    getStationery()
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

  const handleEditClick = (item: StationeryItem) => {
    setForm({
      name: item.name,
      category: item.category,
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
        await updateStationery(editId, form);
        toast.success('Item updated successfully.');
      } else {
        await addStationery(form);
        toast.success('Item added to inventory.');
      }
      setIsFormOpen(false);
      loadItems();
    } catch {
      toast.error('Failed to save item.');
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
      await deleteStationery(deleteId);
      toast.success('Item removed from inventory.');
      loadItems();
    } catch {
      toast.error('Failed to delete item.');
    } finally {
      setIsDeleting(false);
      setIsDeleteOpen(false);
      setDeleteId(null);
    }
  };

  const filtered = items.filter((i) =>
    !categoryFilter || i.category === categoryFilter,
  );

  const lowStock = items.filter((i) => i.quantity <= i.reorderLevel);
  const uniqueCategories = Array.from(new Set(items.map((i) => i.category)));

  const columns: Column<StationeryItem>[] = [
    {
      key: 'name',
      header: 'Item Name',
      sortable: true,
      cell: (item) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
            <Pencil className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-[hsl(var(--foreground))]">{item.name}</div>
            <div className="text-xs text-[hsl(var(--muted-foreground))]">{item.category}</div>
          </div>
        </div>
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
              <AlertTriangle className="h-2.5 w-2.5" /> Low Stock
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'reorderLevel',
      header: 'Reorder At',
      cell: (item) => <span className="text-sm">{item.reorderLevel} units</span>,
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
      key: 'lastRestocked',
      header: 'Last Restocked',
      cell: (item) => formatDate(item.lastRestocked as Date | undefined),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="ghost" size="icon"
            className="h-8 w-8 text-[hsl(var(--muted-foreground))] hover:text-blue-600 rounded-lg"
            title="Edit"
            onClick={() => handleEditClick(item)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost" size="icon"
            className="h-8 w-8 text-[hsl(var(--muted-foreground))] hover:text-red-500 rounded-lg"
            title="Delete"
            onClick={() => handleDeleteClick(item.id)}
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
        title="Stationery Stock"
        description="Monitor classroom supply levels, track reorder points, and manage vendors."
        action={{ label: 'Add Item', onClick: handleAddClick, icon: <Plus className="h-4 w-4" /> }}
      />

      {/* Low stock alert banner */}
      {lowStock.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            <span className="font-bold">{lowStock.length} item{lowStock.length > 1 ? 's' : ''}</span>
            {' '}below reorder level:{' '}
            <span className="font-semibold">{lowStock.map((i) => i.name).join(', ')}</span>
          </p>
        </div>
      )}

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Items', value: items.length, icon: Package, color: 'text-indigo-600 bg-indigo-500/10' },
          { label: 'Low Stock', value: lowStock.length, icon: AlertTriangle, color: 'text-red-600 bg-red-500/10' },
          { label: 'Categories', value: uniqueCategories.length, icon: Pencil, color: 'text-amber-600 bg-amber-500/10' },
          { label: 'Total Units', value: items.reduce((s, i) => s + i.quantity, 0), icon: Package, color: 'text-emerald-600 bg-emerald-500/10' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-[hsl(var(--border))]/60 shadow-xs">
            <CardContent className="flex items-center gap-4 p-4">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
                <Icon className="h-5 w-5" />
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
        searchPlaceholder="Search stationery items..."
        filterComponent={
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-10 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-all"
          >
            <option value="">All Categories</option>
            {uniqueCategories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        }
      />

      {/* Add / Edit Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setIsFormOpen(false)} />
          <Card className="relative w-full max-w-lg z-10 animate-scale-in">
            <CardHeader className="p-0 px-6 pt-6 pb-4 flex flex-row items-center justify-between border-b border-[hsl(var(--border))]/50">
              <CardTitle className="text-base font-bold">
                {isEditing ? 'Edit Stationery Item' : 'Add Stationery Item'}
              </CardTitle>
              <button onClick={() => setIsFormOpen(false)} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <form onSubmit={handleFormSubmit}>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Item Name *</label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. A4 Printing Paper" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Category</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="flex h-10 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                    >
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Supplier</label>
                    <Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="e.g. Office Mart" />
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
                  <label className="text-xs font-semibold">Notes</label>
                  <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." />
                </div>
              </CardContent>
              <div className="flex justify-end gap-2 border-t border-[hsl(var(--border))]/40 px-6 py-4">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSaving}>Cancel</Button>
                <Button type="submit" disabled={isSaving} className="gap-2">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isEditing ? 'Save Changes' : 'Add Item'}
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
        title="Remove Stationery Item?"
        description="This will permanently delete this item from inventory. This action cannot be undone."
        confirmLabel="Remove Item"
        isDestructive
        isLoading={isDeleting}
      />
    </div>
  );
}
