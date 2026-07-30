import { useEffect, useState } from 'react';
import {
  Plus, Edit2, Trash2, BookCopy, AlertTriangle,
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
import { getBooks, addBook, updateBook, deleteBook } from './inventoryService';
import type { BookItem } from '@/types';
import { toast } from 'sonner';

type FormState = {
  title: string;
  author: string;
  isbn: string;
  subject: string;
  className: string;
  publisher: string;
  edition: string;
  quantity: number;
  unitPrice: number;
  condition: 'new' | 'good' | 'fair' | 'poor';
  supplier: string;
  reorderLevel: number;
  notes: string;
};

const defaultForm: FormState = {
  title: '',
  author: '',
  isbn: '',
  subject: '',
  className: '',
  publisher: '',
  edition: '',
  quantity: 0,
  unitPrice: 0,
  condition: 'new',
  supplier: '',
  reorderLevel: 5,
  notes: '',
};

const conditionColor = (c: string) => {
  const map: Record<string, string> = {
    new: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    good: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
    fair: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    poor: 'bg-red-500/10 text-red-700 dark:text-red-400',
  };
  return map[c] || 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
};

export default function BooksPage() {
  const [items, setItems] = useState<BookItem[]>([]);
  const [_isLoading, setIsLoading] = useState(true);
  const [classFilter, setClassFilter] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');

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
    getBooks()
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

  const handleEditClick = (item: BookItem) => {
    setForm({
      title: item.title,
      author: item.author,
      isbn: item.isbn || '',
      subject: item.subject,
      className: item.className,
      publisher: item.publisher || '',
      edition: item.edition || '',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      condition: item.condition,
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
    if (!form.title.trim()) return;
    setIsSaving(true);
    try {
      if (isEditing && editId) {
        await updateBook(editId, form);
        toast.success('Book record updated.');
      } else {
        await addBook(form);
        toast.success('Book added to library inventory.');
      }
      setIsFormOpen(false);
      loadItems();
    } catch {
      toast.error('Failed to save book record.');
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
      await deleteBook(deleteId);
      toast.success('Book removed from inventory.');
      loadItems();
    } catch {
      toast.error('Failed to delete book.');
    } finally {
      setIsDeleting(false);
      setIsDeleteOpen(false);
      setDeleteId(null);
    }
  };

  const filtered = items.filter((i) => {
    if (classFilter && i.className !== classFilter) return false;
    if (conditionFilter && i.condition !== conditionFilter) return false;
    return true;
  });

  const lowStock = items.filter((i) => i.quantity <= i.reorderLevel);
  const uniqueClasses = Array.from(new Set(items.map((i) => i.className)));

  const columns: Column<BookItem>[] = [
    {
      key: 'title',
      header: 'Book Title',
      sortable: true,
      cell: (item) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-500/10 text-teal-600">
            <BookCopy className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold">{item.title}</div>
            <div className="text-xs text-[hsl(var(--muted-foreground))]">{item.author}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'className',
      header: 'Class',
      sortable: true,
      cell: (item) => (
        <div>
          <div className="text-sm font-semibold">{item.className}</div>
          <div className="text-xs text-[hsl(var(--muted-foreground))]">{item.subject}</div>
        </div>
      ),
    },
    {
      key: 'condition',
      header: 'Condition',
      sortable: true,
      cell: (item) => (
        <Badge variant="outline" className={conditionColor(item.condition)}>
          {item.condition.charAt(0).toUpperCase() + item.condition.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'quantity',
      header: 'Qty in Stock',
      sortable: true,
      cell: (item) => (
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${item.quantity <= item.reorderLevel ? 'text-red-600 dark:text-red-400' : ''}`}>
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
      key: 'unitPrice',
      header: 'Unit Price',
      sortable: true,
      cell: (item) => formatCurrency(item.unitPrice),
    },
    {
      key: 'publisher',
      header: 'Publisher',
      cell: (item) => (
        <span className="text-sm text-[hsl(var(--muted-foreground))]">{item.publisher || '—'}</span>
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
        title="Library Books"
        description="Manage textbook stocks, conditions, and class-wise distribution."
        action={{ label: 'Add Book', onClick: handleAddClick, icon: <Plus className="h-4 w-4" /> }}
      />

      {lowStock.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            <span className="font-bold">{lowStock.length} book{lowStock.length > 1 ? 's' : ''}</span>
            {' '}below reorder threshold:{' '}
            <span className="font-semibold">{lowStock.map((i) => i.title).join(', ')}</span>
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Titles', value: items.length, color: 'text-teal-600 bg-teal-500/10' },
          { label: 'Low Stock', value: lowStock.length, color: 'text-red-600 bg-red-500/10' },
          { label: 'New Condition', value: items.filter((i) => i.condition === 'new').length, color: 'text-emerald-600 bg-emerald-500/10' },
          { label: 'Total Units', value: items.reduce((s, i) => s + i.quantity, 0), color: 'text-blue-600 bg-blue-500/10' },
        ].map(({ label, value, color }) => (
          <Card key={label} className="border-[hsl(var(--border))]/60 shadow-xs">
            <CardContent className="flex items-center gap-4 p-4">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
                <BookCopy className="h-5 w-5" />
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
        searchField="title"
        searchPlaceholder="Search by title, author, or subject..."
        filterComponent={
          <div className="flex items-center gap-2">
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="h-10 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-all"
            >
              <option value="">All Classes</option>
              {uniqueClasses.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={conditionFilter}
              onChange={(e) => setConditionFilter(e.target.value)}
              className="h-10 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-all"
            >
              <option value="">All Conditions</option>
              <option value="new">New</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
            </select>
          </div>
        }
      />

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setIsFormOpen(false)} />
          <Card className="relative w-full max-w-lg max-h-[90vh] flex flex-col z-10 animate-scale-in overflow-hidden">
            <CardHeader className="p-0 px-6 pt-6 pb-4 flex flex-row items-center justify-between border-b border-[hsl(var(--border))]/50 shrink-0">
              <CardTitle className="text-base font-bold">
                {isEditing ? 'Edit Book Record' : 'Add Book to Library'}
              </CardTitle>
              <button onClick={() => setIsFormOpen(false)} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <form onSubmit={handleFormSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto">
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Book Title *</label>
                    <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Mathematics for Grade 5" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">Author</label>
                      <Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} placeholder="e.g. Punjab Curriculum Board" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">ISBN</label>
                      <Input value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} placeholder="978-..." />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">Class</label>
                      <Input value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })} placeholder="e.g. Grade 5" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">Subject</label>
                      <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Mathematics" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">Publisher</label>
                      <Input value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} placeholder="e.g. PCTB" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">Edition</label>
                      <Input value={form.edition} onChange={(e) => setForm({ ...form, edition: e.target.value })} placeholder="e.g. 2024 Edition" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">Condition</label>
                      <select
                        value={form.condition}
                        onChange={(e) => setForm({ ...form, condition: e.target.value as FormState['condition'] })}
                        className="flex h-10 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                      >
                        <option value="new">New</option>
                        <option value="good">Good</option>
                        <option value="fair">Fair</option>
                        <option value="poor">Poor</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">Supplier</label>
                      <Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="e.g. PCTB Lahore" />
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
                </CardContent>
              </div>
              <div className="flex justify-end gap-2 border-t border-[hsl(var(--border))]/40 px-6 py-4 shrink-0">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSaving}>Cancel</Button>
                <Button type="submit" disabled={isSaving} className="gap-2">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isEditing ? 'Save Changes' : 'Add Book'}
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
        title="Remove Book?"
        description="This will permanently remove this book record from the library inventory. This cannot be undone."
        confirmLabel="Remove Book"
        isDestructive
        isLoading={isDeleting}
      />
    </div>
  );
}
