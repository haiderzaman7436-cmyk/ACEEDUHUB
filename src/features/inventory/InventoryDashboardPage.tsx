// ============================================================================
// ACE Educational Hub — Inventory Dashboard
// Shows purchase value, sold value, remaining stock, and monthly revenue
// ============================================================================

import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, TrendingUp, Layers, BarChart3,
  BookCopy, Shirt, Pencil, ChevronRight, Loader2,
  ShoppingCart, CalendarDays, RefreshCw,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { getStationery, getUniforms, getBooks } from './inventoryService';
import {
  getAllSales, getAvailableSaleMonths,
} from './inventorySaleService';
import type { StationeryItem, UniformItem, BookItem, InventorySale } from '@/types';
import { toast } from 'sonner';

// ── Month helpers ─────────────────────────────────────────────────────────────

function getCurrentMonthLabel() {
  return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Generate years from 2020 to 2050
const YEARS = Array.from({ length: 31 }, (_, i) => 2020 + i);

// ── Types ─────────────────────────────────────────────────────────────────────

interface CategoryStats {
  name: string;
  icon: React.ReactNode;
  color: string;
  totalItems: number;
  totalQty: number;
  soldQty: number;
  remainingQty: number;
  purchaseValue: number;
  saleValue: number;
  href: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function InventoryDashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthLabel());
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [showAllTime, setShowAllTime] = useState(false);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [monthlySales, setMonthlySales] = useState<InventorySale[]>([]);

  const [stats, setStats] = useState<CategoryStats[]>([]);
  const [totalPurchaseValue, setTotalPurchaseValue] = useState(0);
  const [totalSaleValue, setTotalSaleValue] = useState(0);

  // Split selectedMonth into parts for UI
  const [monthPart, yearPart] = selectedMonth ? selectedMonth.split(' ') : getCurrentMonthLabel().split(' ');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [stationery, uniforms, books, allSales, months] = await Promise.all([
        getStationery(),
        getUniforms(),
        getBooks(),
        getAllSales(),
        getAvailableSaleMonths(),
      ]);

      setAvailableMonths(months);

      // Build soldQtyMap from all sales
      const qtyMap: Record<string, number> = {};
      allSales.forEach((s) => {
        qtyMap[s.itemId] = (qtyMap[s.itemId] || 0) + s.quantity;
      });

      // Monthly / All-time sales & revenue
      const displaySales = showAllTime
        ? allSales
        : allSales.filter((s) => {
            let mStr = (s.month || '').toLowerCase();
            if (!mStr && s.saleDate) {
              mStr = new Date(s.saleDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toLowerCase();
            }
            return mStr.includes(monthPart.toLowerCase()) && mStr.includes(yearPart.toString());
          });
      setMonthlySales(displaySales);
      setMonthlyRevenue(displaySales.reduce((sum, s) => sum + s.totalAmount, 0));

      // Category stats
      const statRec = (
        name: string, icon: React.ReactNode, color: string,
        items: (StationeryItem | UniformItem | BookItem)[],
        href: string,
      ): CategoryStats => {
        const totalQty = items.reduce((s, i) => s + i.quantity, 0);
        const soldQty = items.reduce((s, i) => s + (qtyMap[i.id] || 0), 0);
        const purchaseValue = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
        const saleValue = allSales
          .filter((sl) => sl.itemType === name.toLowerCase())
          .reduce((sum, sl) => sum + sl.totalAmount, 0);
        return {
          name, icon, color,
          totalItems: items.length,
          totalQty,
          soldQty,
          remainingQty: totalQty - soldQty,
          purchaseValue,
          saleValue,
          href,
        };
      };

      const catStats: CategoryStats[] = [
        statRec(
          'Stationery',
          <Pencil className="h-6 w-6" />,
          'from-amber-500 to-orange-500',
          stationery,
          '/inventory/stationery',
        ),
        statRec(
          'Uniforms',
          <Shirt className="h-6 w-6" />,
          'from-blue-500 to-indigo-500',
          uniforms,
          '/inventory/uniforms',
        ),
        statRec(
          'Books',
          <BookCopy className="h-6 w-6" />,
          'from-emerald-500 to-teal-500',
          books,
          '/inventory/books',
        ),
      ];

      setStats(catStats);
      setTotalPurchaseValue(catStats.reduce((s, c) => s + c.purchaseValue, 0));
      setTotalSaleValue(catStats.reduce((s, c) => s + c.saleValue, 0));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load inventory data.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth, showAllTime]);

  useEffect(() => { loadData(); }, [loadData]);

  const totalItems = stats.reduce((s, c) => s + c.totalItems, 0);
  const totalRemainingValue = totalPurchaseValue - totalSaleValue;
  const displayLabel = showAllTime ? 'All Time' : selectedMonth;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Inventory Overview"
        description="Track purchased stock, sold items, remaining inventory, and revenue across all categories."
        action={{ label: 'Refresh', onClick: loadData, icon: <RefreshCw className="h-4 w-4" /> }}
      />

      {/* Month Selector */}
      <Card className="border border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
                <CalendarDays className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-800">Monthly Revenue View</div>
                <div className="text-[11px] text-slate-500">
                  {availableMonths.length > 0
                    ? `${availableMonths.length} months with data · History from 2020`
                    : 'Full history available from January 2020'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="flex gap-2">
                <div className="relative">
                  <select
                    value={monthPart}
                    onChange={(e) => {
                      setSelectedMonth(`${e.target.value} ${yearPart}`);
                      setShowAllTime(false);
                    }}
                    disabled={showAllTime}
                    className="h-10 pl-4 pr-10 rounded-xl border border-emerald-200 bg-white text-sm font-semibold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {MONTHS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-500">▾</span>
                </div>
                <div className="relative">
                  <select
                    value={yearPart}
                    onChange={(e) => {
                      setSelectedMonth(`${monthPart} ${e.target.value}`);
                      setShowAllTime(false);
                    }}
                    disabled={showAllTime}
                    className="h-10 pl-4 pr-10 rounded-xl border border-emerald-200 bg-white text-sm font-semibold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {YEARS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-500">▾</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAllTime(!showAllTime)}
                className={`h-10 gap-1.5 text-xs font-semibold rounded-xl border-emerald-200 whitespace-nowrap ${
                  showAllTime ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-emerald-700'
                }`}
              >
                {showAllTime ? '✓ All Time' : 'Show All Time'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            <span className="text-sm text-slate-500">Loading inventory data...</span>
          </div>
        </div>
      ) : (
        <>
          {/* Top Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                    <Package className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-medium">Total Stock Value</div>
                    <div className="text-lg font-bold text-slate-800">{formatCurrency(totalPurchaseValue)}</div>
                    <div className="text-[10px] text-slate-400">{totalItems} unique items</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-medium">Total Sold Value</div>
                    <div className="text-lg font-bold text-emerald-700">{formatCurrency(totalSaleValue)}</div>
                    <div className="text-[10px] text-slate-400">All-time revenue</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                    <Layers className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-medium">Remaining Inv. Value</div>
                    <div className="text-lg font-bold text-amber-700">{formatCurrency(totalRemainingValue)}</div>
                    <div className="text-[10px] text-slate-400">Unsold stock value</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                    <BarChart3 className="h-5 w-5 text-violet-600" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-medium">
                      {showAllTime ? 'All-Time Revenue' : 'Monthly Revenue'}
                    </div>
                    <div className="text-lg font-bold text-violet-700">{formatCurrency(monthlyRevenue)}</div>
                    <div className="text-[10px] text-slate-400">{displayLabel}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Category Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {stats.map((cat) => (
              <Card key={cat.name} className="border border-slate-200 shadow-sm hover:shadow-lg transition-shadow overflow-hidden">
                <div className={`bg-gradient-to-r ${cat.color} p-4 text-white`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {cat.icon}
                      <h3 className="font-bold text-base">{cat.name}</h3>
                    </div>
                    <Link to={cat.href}>
                      <Button size="sm" className="h-7 gap-1 text-xs bg-white/20 hover:bg-white/30 text-white border-0">
                        Manage <ChevronRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                  <p className="text-xs text-white/80 mt-1">{cat.totalItems} unique items in catalog</p>
                </div>
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-blue-50 rounded-lg p-2">
                      <div className="text-sm font-bold text-blue-700">{cat.totalQty}</div>
                      <div className="text-[10px] text-slate-500">Purchased</div>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-2">
                      <div className="text-sm font-bold text-emerald-700">{cat.soldQty}</div>
                      <div className="text-[10px] text-slate-500">Sold</div>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-2">
                      <div className="text-sm font-bold text-amber-700">{cat.remainingQty}</div>
                      <div className="text-[10px] text-slate-500">Remaining</div>
                    </div>
                  </div>

                  {/* Stock bar */}
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                      <span>Stock sold</span>
                      <span>{cat.totalQty > 0 ? Math.round((cat.soldQty / cat.totalQty) * 100) : 0}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                        style={{ width: `${cat.totalQty > 0 ? (cat.soldQty / cat.totalQty) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-1 border-t border-slate-100 space-y-1 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Purchase Value</span>
                      <span className="font-semibold text-slate-800">{formatCurrency(cat.purchaseValue)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Revenue Generated</span>
                      <span className="font-semibold text-emerald-700">{formatCurrency(cat.saleValue)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Monthly / All-Time Sales Table */}
          {monthlySales.length > 0 && (
            <Card className="border border-slate-200 shadow-sm">
              <CardContent className="p-0">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-blue-600" />
                    <h3 className="font-bold text-slate-800 text-sm">
                      Sales — {displayLabel}
                    </h3>
                    <span className="text-[11px] text-slate-400">({monthlySales.length} transactions)</span>
                  </div>
                  <div className="text-sm font-bold text-emerald-700">{formatCurrency(monthlyRevenue)}</div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="text-left px-4 py-3 font-semibold text-slate-500">Item</th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-500">Type</th>
                        <th className="text-center px-4 py-3 font-semibold text-slate-500">Qty</th>
                        <th className="text-right px-4 py-3 font-semibold text-slate-500">Unit Price</th>
                        <th className="text-right px-4 py-3 font-semibold text-slate-500">Total</th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-500">Month</th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-500">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {monthlySales.map((sale) => (
                        <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5 font-medium text-slate-700">{sale.itemName}</td>
                          <td className="px-4 py-2.5 capitalize text-slate-500">{sale.itemType}</td>
                          <td className="px-4 py-2.5 text-center font-semibold">{sale.quantity}</td>
                          <td className="px-4 py-2.5 text-right text-slate-600">{formatCurrency(sale.unitPrice)}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-emerald-700">{formatCurrency(sale.totalAmount)}</td>
                          <td className="px-4 py-2.5 text-slate-500">{sale.month || '—'}</td>
                          <td className="px-4 py-2.5 text-slate-500">{sale.saleDate}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-emerald-50 border-t border-emerald-100">
                        <td colSpan={4} className="px-4 py-3 font-bold text-slate-700">
                          {showAllTime ? 'All-Time Total Revenue' : 'Monthly Total Revenue'}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-700 text-sm">{formatCurrency(monthlyRevenue)}</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {monthlySales.length === 0 && (
            <Card className="border border-dashed border-slate-200">
              <CardContent className="p-8 text-center">
                <ShoppingCart className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="font-semibold text-slate-600">
                  No sales recorded for {displayLabel}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Record sales from the Stationery, Uniforms, or Books pages using the "Record Sale" button.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
