import { useEffect, useState } from 'react';
import {
  Plus, Edit2, Trash2, Pencil, AlertTriangle, Package,
  X, Save, Loader2, ShoppingCart,
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
  getStationery,
  addStationery,
  updateStationery,
  deleteStationery,
} from './inventoryService';
import { addSale, getSoldQuantityMap } from './inventorySaleService';
import type { StationeryItem } from '@/types';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/AuthContext';

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
  const { user } = useAuth();
  const [items, setItems] = useState<StationeryItem[]>([]);
  const [_isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [soldQtyMap, setSoldQtyMap] = useState<Record<string, number>>({});

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [isSaving, setIsSaving] = useState(false);

  // Sale modal
  const [isSaleOpen, setIsSaleOpen] = useState(false);
  const [saleItem, setSaleItem] = useState<StationeryItem | null>(null);
  const [saleQty, setSaleQty] = useState(1);
  const [saleTo, setSaleTo] = useState('');
  const [isSaleSubmitting, setIsSaleSubmitting] = useState(false);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadItems = () => {
    setIsLoading(true);
    Promise.all([getStationery(), getSoldQuantityMap()])
      .then(([data, qtyMap]) => { setItems(data); setSoldQtyMap(qtyMap); })
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

  const handleSaleClick = (item: StationeryItem) => {
    setSaleItem(item);
    setSaleQty(1);
    setSaleTo('');
    setIsSaleOpen(true);
  };

  const handleSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleItem || saleQty <= 0 || !user) return;
    const soldSoFar = soldQtyMap[saleItem.id] || 0;
    const remaining = saleItem.quantity - soldSoFar;
    if (saleQty > remaining) {
      toast.error(`Only ${remaining} units remaining in stock.`);
      return;
    }
    setIsSaleSubmitting(true);
    try {
      const monthLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      await addSale({
        itemId: saleItem.id,
        itemType: 'stationery',
        itemName: saleItem.name,
        quantity: saleQty,
        unitPrice: saleItem.unitPrice,
        totalAmount: saleQty * saleItem.unitPrice,
        month: monthLabel,
        saleDate: new Date().toISOString().split('T')[0],
        soldTo: saleTo || undefined,
        createdBy: user.uid || 'admin',
      }, user.uid || 'admin');
      toast.success(`Sale of ${saleQty} × ${saleItem.name} recorded (${formatCurrency(saleQty * saleItem.unitPrice)})`);
      setIsSaleOpen(false);
      loadItems();
    } catch {
      toast.error('Failed to record sale.');
    } finally {
      setIsSaleSubmitting(false);
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
      header: 'Purchased',
      sortable: true,
      cell: (item) => (
        <span className="text-sm font-bold text-blue-700">{item.quantity}</span>
      ),
    },
    {
      key: 'sold' as any,
      header: 'Sold',
      cell: (item) => {
        const sold = soldQtyMap[item.id] || 0;
        return <span className="text-sm font-bold text-emerald-700">{sold}</span>;
      },
    },
    {
      key: 'remaining' as any,
      header: 'Remaining',
      cell: (item) => {
        const sold = soldQtyMap[item.id] || 0;
        const rem = item.quantity - sold;
        return (
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold ${rem <= item.reorderLevel ? 'text-red-600' : 'text-slate-700'}`}>
              {rem}
            </span>
            {rem <= item.reorderLevel && (
              <Badge variant="outline" className="bg-red-500/10 text-red-700 text-[10px] gap-1">
                <AlertTriangle className="h-2.5 w-2.5" /> Low
              </Badge>
            )}
          </div>
        );
      },
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
          <Button
            variant="ghost" size="sm"
            className="h-8 gap-1 text-xs text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg"
            title="Record Sale"
            onClick={() => handleSaleClick(item)}
          >
            <ShoppingCart className="h-3.5 w-3.5" /> Sell
          </Button>
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
          { label: 'Low Stock', value: items.filter(i => (i.quantity - (soldQtyMap[i.id] || 0)) <= i.reorderLevel).length, icon: AlertTriangle, color: 'text-red-600 bg-red-500/10' },
          { label: 'Total Purchased', value: items.reduce((s, i) => s + i.quantity, 0), icon: Package, color: 'text-blue-600 bg-blue-500/10' },
          { label: 'Total Sold', value: Object.values(soldQtyMap).reduce((s, v) => s + v, 0), icon: ShoppingCart, color: 'text-emerald-600 bg-emerald-500/10' },
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

      {/* Sale Modal */}
      {isSaleOpen && saleItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsSaleOpen(false)} />
          <Card className="relative w-full max-w-sm z-10 animate-scale-in shadow-2xl">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-800 text-base">Record Sale</h2>
                <p className="text-xs text-slate-400 mt-0.5">{saleItem.name}</p>
              </div>
              <button onClick={() => setIsSaleOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaleSubmit} className="p-5 space-y-4">
              <div className="bg-emerald-50 rounded-xl p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Item:</span>
                  <span className="font-semibold">{saleItem.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Unit Price:</span>
                  <span className="font-semibold">{formatCurrency(saleItem.unitPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Available Stock:</span>
                  <span className="font-bold text-emerald-700">{saleItem.quantity - (soldQtyMap[saleItem.id] || 0)} units</span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Quantity to Sell *</label>
                <Input
                  type="number" min={1}
                  max={saleItem.quantity - (soldQtyMap[saleItem.id] || 0)}
                  value={saleQty}
                  onChange={(e) => setSaleQty(Number(e.target.value))}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Sold To (optional)</label>
                <Input
                  value={saleTo}
                  onChange={(e) => setSaleTo(e.target.value)}
                  placeholder="Student name or customer..."
                />
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-xs">
                <div className="flex justify-between font-bold">
                  <span>Total Amount:</span>
                  <span className="text-emerald-700">{formatCurrency(saleQty * saleItem.unitPrice)}</span>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setIsSaleOpen(false)} disabled={isSaleSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSaleSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
                  {isSaleSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                  Record Sale
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
