import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { sounds } from '../../lib/sounds';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { DateRangeFilter } from '../../components/ui/DateRangeFilter';
import { OrderDetailModal } from './OrderDetailModal';
import { formatCurrency, formatTime, formatDate } from '../../lib/utils';
import {
  ShoppingBag,
  Search,
  Eye,
  CheckCircle2,
  Clock,
  RotateCcw,
  Receipt,
} from 'lucide-react';

export const OrdersPage: React.FC = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [orderTypeFilter, setOrderTypeFilter] = useState<'all' | 'delivery' | 'table'>('all');
  const [dateFilter, setDateFilter] = useState('today');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Ref to always access the latest filters inside intervals and socket callbacks without stale closures
  const filtersRef = React.useRef({
    orderTypeFilter,
    dateFilter,
    fromDate,
    toDate,
    statusFilter,
    search,
  });

  // Keep filtersRef continuously in sync with the latest state
  useEffect(() => {
    filtersRef.current = {
      orderTypeFilter,
      dateFilter,
      fromDate,
      toDate,
      statusFilter,
      search,
    };
  }, [orderTypeFilter, dateFilter, fromDate, toDate, statusFilter, search]);

  // Selected Order for detail modal
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [newOrderAlert, setNewOrderAlert] = useState<{ id: string; order_number: string; customer_name?: string; total: number } | null>(null);

  // Central fetchOrders function that ALWAYS respects currently active filters
  const fetchOrders = async (overrides?: Partial<typeof filtersRef.current>) => {
    if (!user?.restaurant_id) return;
    const f = { ...filtersRef.current, ...overrides };

    try {
      const tzOffset = new Date().getTimezoneOffset();
      const params: any = {
        tz_offset: tzOffset,
      };

      if (f.orderTypeFilter && f.orderTypeFilter !== 'all') {
        params.order_type = f.orderTypeFilter;
      }

      if (f.statusFilter && f.statusFilter !== 'all') {
        params.status = f.statusFilter;
      }

      if (f.search && f.search.trim()) {
        params.search = f.search.trim();
      }

      if (f.dateFilter === 'custom' && (f.fromDate || f.toDate)) {
        if (f.fromDate) params.from_date = f.fromDate;
        if (f.toDate) params.to_date = f.toDate;
      } else if (f.dateFilter) {
        params.date_filter = f.dateFilter;
      } else {
        params.date_filter = 'today';
      }

      const res = await api.get(`/restaurants/${user.restaurant_id}/orders`, { params });
      if (res.data && Array.isArray(res.data)) {
        setOrders(res.data);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.restaurant_id) {
      fetchOrders();
    }
  }, [user, orderTypeFilter, dateFilter, fromDate, toDate, statusFilter]);

  // Real-time socket updates & background auto-poll (Guaranteed to NEVER wipe or reset active filters)
  useEffect(() => {
    if (user?.restaurant_id) {
      // Ensure restaurant room is joined
      if (socket) {
        socket.emit('join:restaurant', user.restaurant_id);
      }
    }

    const handleNewOrder = (orderData: any) => {
      try {
        sounds.playOrderAlert();
      } catch (e) {
        console.warn('Audio alert error:', e);
      }

      if (orderData) {
        setNewOrderAlert({
          id: orderData.id,
          order_number: orderData.order_number,
          customer_name: orderData.customer_name || 'Customer',
          total: orderData.total,
        });

        // Only prepend to live list if it matches currently active filters
        const f = filtersRef.current;
        let matches = true;
        const actualType = orderData.order_type || (orderData.table_id ? 'table' : 'delivery');
        if (f.orderTypeFilter !== 'all' && actualType !== f.orderTypeFilter) {
          matches = false;
        }
        if (f.statusFilter !== 'all' && orderData.status !== f.statusFilter) {
          matches = false;
        }
        if (f.search && f.search.trim()) {
          const s = f.search.trim().toLowerCase();
          const orderNum = (orderData.order_number || '').toLowerCase();
          const cust = (orderData.customer_name || '').toLowerCase();
          if (!orderNum.includes(s) && !cust.includes(s)) {
            matches = false;
          }
        }

        if (matches) {
          setOrders((prev) => {
            const exists = prev.some((o) => o.id === orderData.id);
            if (exists) return prev;
            return [orderData, ...prev];
          });
        }
      }

      // Re-fetch in background to sync full counts while preserving active filters
      fetchOrders();
    };

    const handleStatusUpdate = () => {
      fetchOrders();
    };

    if (socket) {
      socket.on('order:new', handleNewOrder);
      socket.on('order:status_updated', handleStatusUpdate);
    }

    // Background Auto-Polling (every 5 seconds) - uses filtersRef so filters NEVER disappear
    const pollTimer = setInterval(() => {
      fetchOrders();
    }, 5000);

    return () => {
      if (socket) {
        socket.off('order:new', handleNewOrder);
        socket.off('order:status_updated', handleStatusUpdate);
      }
      clearInterval(pollTimer);
    };
  }, [socket, user?.restaurant_id]);

  const handlePresetSelect = (preset: string) => {
    setDateFilter(preset);
    setFromDate('');
    setToDate('');
    fetchOrders({ dateFilter: preset, fromDate: '', toDate: '' });
  };

  const handleCustomDateChange = (from: string, to: string) => {
    setFromDate(from);
    setToDate(to);
    setDateFilter('custom');
    fetchOrders({ fromDate: from, toDate: to, dateFilter: 'custom' });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders({ search });
  };

  return (
    <div className="space-y-6">
      {/* Live Order Incoming Banner */}
      {newOrderAlert && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-[#d70f64] to-pink-600 text-white shadow-xl flex items-center justify-between animate-bounce">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-white text-[#d70f64] flex items-center justify-center font-black text-lg shadow-sm">
              🔔
            </span>
            <div>
              <p className="font-black text-sm">NEW ORDER RECEIVED: #{newOrderAlert.order_number}</p>
              <p className="text-xs text-pink-100 font-medium">
                {newOrderAlert.customer_name} • {formatCurrency(newOrderAlert.total)}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedOrderId(newOrderAlert.id);
              setNewOrderAlert(null);
            }}
            className="px-4 py-2 rounded-xl bg-white text-[#d70f64] font-black text-xs hover:bg-pink-50 shadow-sm"
          >
            View Order
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Live Orders Management
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Manage online deliveries, dine-in table orders, and customer settlements in real time. (Auto-updating)
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              sounds.playOrderAlert();
            }}
            className="px-3.5 py-2.5 rounded-2xl bg-pink-50 border border-pink-200 text-[#d70f64] text-xs font-bold hover:bg-pink-100 shadow-2xs flex items-center gap-1.5 transition-colors"
            title="Test notification sound chime"
          >
            <span>🔊 Test Sound</span>
          </button>
          <button
            onClick={() => fetchOrders()}
            className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Order Type Tabs (Online Delivery vs Table Dine-In) */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/80 max-w-md">
        <button
          onClick={() => {
            setOrderTypeFilter('all');
            fetchOrders({ orderTypeFilter: 'all' });
          }}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all ${
            orderTypeFilter === 'all'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          All Orders
        </button>
        <button
          onClick={() => {
            setOrderTypeFilter('delivery');
            fetchOrders({ orderTypeFilter: 'delivery' });
          }}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
            orderTypeFilter === 'delivery'
              ? 'bg-[#d70f64] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>🛵 Online Delivery</span>
        </button>
        <button
          onClick={() => {
            setOrderTypeFilter('table');
            fetchOrders({ orderTypeFilter: 'table' });
          }}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
            orderTypeFilter === 'table'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>🍽️ Table Orders</span>
        </button>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 space-y-4 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <DateRangeFilter
            fromDate={fromDate}
            toDate={toDate}
            activePreset={dateFilter}
            onPresetSelect={handlePresetSelect}
            onChange={handleCustomDateChange}
            onReset={() => handlePresetSelect('today')}
          />

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                const newStatus = e.target.value;
                setStatusFilter(newStatus);
                fetchOrders({ statusFilter: newStatus });
              }}
              className="rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-bold py-2 px-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="new">New Orders</option>
              <option value="accepted">Accepted</option>
              <option value="cooking">Cooking</option>
              <option value="ready">Ready to Serve</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="Search by order number (e.g. #1001), customer name, or phone..."
              value={search}
              onChange={(e) => {
                const val = e.target.value;
                setSearch(val);
                if (!val.trim()) {
                  fetchOrders({ search: '' });
                }
              }}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
          <Button variant="secondary" type="submit">
            Search
          </Button>
          {search && (
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setSearch('');
                fetchOrders({ search: '' });
              }}
            >
              Clear
            </Button>
          )}
        </form>
      </Card>

      {/* Orders Table */}
      <Card className="p-0 overflow-hidden rounded-3xl border border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-5">Order #</th>
                <th className="py-3.5 px-4">Type / Destination</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Items</th>
                <th className="py-3.5 px-4">Total Bill</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Payment</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <ShoppingBag className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-700">No orders found</p>
                    <p className="text-xs text-slate-400 mt-0.5 font-medium">Orders will appear here in real-time when placed by customers.</p>
                  </td>
                </tr>
              ) : (
                orders.map((o) => {
                  const isPaid = o.payment_status === 'paid';
                  const isDelivery = o.order_type === 'delivery';

                  return (
                    <tr key={o.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-5 font-black text-slate-900">
                        #{o.order_number}
                      </td>
                      <td className="py-4 px-4">
                        {isDelivery ? (
                          <span className="px-2.5 py-1 rounded-xl bg-pink-50 text-[#d70f64] font-black text-xs border border-pink-200/80 inline-flex items-center gap-1">
                            <span>🛵 Delivery</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 font-black text-xs border border-slate-200 inline-flex items-center gap-1">
                            <span>🍽️ Table {o.table_number || 'N/A'}</span>
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-xs font-semibold text-slate-800">
                        <div>
                          <p className="font-black text-slate-900">{o.customer_name || 'Guest'}</p>
                          {o.customer_phone && (
                            <p className="text-[11px] text-slate-500">{o.customer_phone}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-xs font-semibold text-slate-700">
                        {o.items?.length || 0} item(s)
                      </td>
                      <td className="py-4 px-4 font-black text-slate-900">
                        {formatCurrency(o.total)}
                      </td>
                      <td className="py-4 px-4">
                        <Badge status={o.status} />
                      </td>
                      <td className="py-4 px-4">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Paid
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-xs">
                        <p className="font-bold text-slate-800">{formatTime(o.created_at)}</p>
                        <p className="text-[11px] text-slate-500 font-medium">{formatDate(o.created_at)}</p>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                          onClick={() => setSelectedOrderId(o.id)}
                          className="rounded-xl font-bold"
                        >
                          View & Settle
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Order Detail & Payment Settlement Modal */}
      {selectedOrderId && (
        <OrderDetailModal
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          onStatusUpdated={fetchOrders}
        />
      )}
    </div>
  );
};
