import { useState, useEffect } from 'react';
import { X, Search, Plus, Minus, ShoppingCart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getBooks, getStationery, getUniforms } from '@/features/inventory/inventoryService';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Invoice, InvoiceItem } from '@/types';
import { toast } from 'sonner';

interface AddInventoryToInvoiceModalProps {
  invoice: Invoice;
  onClose: () => void;
  onSuccess: (updatedInvoice: Invoice) => void;
}

type InventoryItemBase = {
  id: string;
  name: string;
  price: number;
  stock: number;
  type: 'books' | 'stationery' | 'uniforms';
};

export function AddInventoryToInvoiceModal({ invoice, onClose, onSuccess }: AddInventoryToInvoiceModalProps) {
  const [items, setItems] = useState<InventoryItemBase[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<InventoryItemBase['type'] | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Cart: item id -> quantity
  const [cart, setCart] = useState<Record<string, number>>({});

  useEffect(() => {
    async function fetchInventory() {
      try {
        const [books, stationery, uniforms] = await Promise.all([
          getBooks(),
          getStationery(),
          getUniforms(),
        ]);

        const allItems: InventoryItemBase[] = [
          ...books.map(b => ({ id: b.id, name: b.title, price: b.unitPrice, stock: b.quantity - (b.soldQuantity || 0), type: 'books' as const })),
          ...stationery.map(s => ({ id: s.id, name: s.name, price: s.unitPrice, stock: s.quantity - (s.soldQuantity || 0), type: 'stationery' as const })),
          ...uniforms.map(u => ({ id: u.id, name: u.name, price: u.unitPrice, stock: u.quantity - (u.soldQuantity || 0), type: 'uniforms' as const })),
        ];

        setItems(allItems);
      } catch (err) {
        toast.error('Failed to load inventory items');
      } finally {
        setIsLoading(false);
      }
    }
    fetchInventory();
  }, []);

  const handleAddToCart = (item: InventoryItemBase, max: number) => {
    setCart(prev => ({
      ...prev,
      [item.id]: Math.min((prev[item.id] || 0) + 1, max)
    }));
  };

  const handleRemoveFromCart = (item: InventoryItemBase) => {
    setCart(prev => {
      const newQty = (prev[item.id] || 0) - 1;
      if (newQty <= 0) {
        const { [item.id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [item.id]: newQty };
    });
  };

  const handleSave = async () => {
    const selectedIds = Object.keys(cart);
    if (selectedIds.length === 0) return onClose();

    setIsSaving(true);
    try {
      const newItems: InvoiceItem[] = [];
      let addedTotal = 0;

      selectedIds.forEach(id => {
        const qty = cart[id];
        const inventoryItem = items.find(i => i.id === id);
        if (inventoryItem && qty > 0) {
          const total = qty * inventoryItem.price;
          addedTotal += total;
          newItems.push({
            id: `inv-${Date.now()}-${id}`,
            description: `[${inventoryItem.type.toUpperCase()}] ${inventoryItem.name}`,
            quantity: qty,
            unitPrice: inventoryItem.price,
            total: total,
            inventoryItemId: inventoryItem.id,
            inventoryItemType: inventoryItem.type,
          });
        }
      });

      const updatedItems = [...invoice.items, ...newItems];
      const newSubtotal = invoice.subtotal + addedTotal;
      const newGrandTotal = newSubtotal - invoice.discount + invoice.tax;

      await updateDoc(doc(db, 'invoices', invoice.id), {
        items: updatedItems,
        subtotal: newSubtotal,
        grandTotal: newGrandTotal,
        updatedAt: serverTimestamp(),
      });

      toast.success('Inventory items added to invoice successfully!');
      onSuccess({
        ...invoice,
        items: updatedItems,
        subtotal: newSubtotal,
        grandTotal: newGrandTotal,
      });
      onClose();

    } catch (err) {
      toast.error('Failed to update invoice');
      setIsSaving(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || item.type === filterType;
    return matchesSearch && matchesType;
  });

  const cartTotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = items.find(i => i.id === id);
    return sum + (item ? item.price * qty : 0);
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Add Items to Fee Challan</h2>
              <p className="text-sm text-slate-500">Invoice #{invoice.invoiceNumber} • {invoice.studentName}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="h-5 w-5 text-slate-400" />
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: Inventory List */}
          <div className="flex-1 flex flex-col border-r border-slate-100">
            <div className="p-4 border-b border-slate-100 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search inventory..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                {(['all', 'books', 'stationery', 'uniforms'] as const).map(type => (
                  <Badge
                    key={type}
                    variant={filterType === type ? 'default' : 'secondary'}
                    className={`cursor-pointer capitalize ${filterType === type ? 'bg-blue-600' : ''}`}
                    onClick={() => setFilterType(type)}
                  >
                    {type}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {isLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-10 text-slate-500">No items found.</div>
              ) : (
                filteredItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-colors">
                    <div>
                      <h4 className="font-medium text-slate-800">{item.name}</h4>
                      <div className="flex gap-2 text-xs mt-1">
                        <span className="text-blue-600 font-semibold">Rs. {item.price.toLocaleString()}</span>
                        <span className="text-slate-400">•</span>
                        <span className={item.stock > 0 ? 'text-emerald-600' : 'text-red-500'}>
                          {item.stock} in stock
                        </span>
                      </div>
                    </div>
                    {item.stock > 0 ? (
                      <div className="flex items-center gap-3">
                        <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden">
                          <button
                            disabled={!cart[item.id]}
                            onClick={() => handleRemoveFromCart(item)}
                            className="p-1.5 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-medium">{cart[item.id] || 0}</span>
                          <button
                            disabled={(cart[item.id] || 0) >= item.stock}
                            onClick={() => handleAddToCart(item, item.stock)}
                            className="p-1.5 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-red-500 bg-red-50">Out of Stock</Badge>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Cart Summary */}
          <div className="w-80 bg-slate-50 flex flex-col">
            <div className="p-4 border-b border-slate-200 font-semibold text-slate-800">
              Selected Items
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {Object.keys(cart).length === 0 ? (
                <div className="text-center py-10 text-sm text-slate-400">
                  Select items to add them to the invoice
                </div>
              ) : (
                Object.entries(cart).map(([id, qty]) => {
                  const item = items.find(i => i.id === id);
                  if (!item) return null;
                  return (
                    <div key={id} className="flex justify-between text-sm">
                      <div>
                        <div className="font-medium text-slate-700">{item.name}</div>
                        <div className="text-xs text-slate-500">{qty} × Rs. {item.price}</div>
                      </div>
                      <div className="font-semibold text-slate-800">
                        Rs. {(qty * item.price).toLocaleString()}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            <div className="p-4 bg-white border-t border-slate-200">
              <div className="flex justify-between items-end mb-4">
                <span className="text-sm font-medium text-slate-500">Added Total</span>
                <span className="text-xl font-bold text-blue-600">Rs. {cartTotal.toLocaleString()}</span>
              </div>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={Object.keys(cart).length === 0 || isSaving}
                onClick={handleSave}
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Add to Invoice
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
