import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { sounds } from '../../lib/sounds';
import { StatsCard } from '../../components/ui/StatsCard';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { formatCurrency, formatTime, formatDate, getImageUrl } from '../../lib/utils';
import {
  ShoppingBag,
  DollarSign,
  Clock,
  ChefHat,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  UtensilsCrossed,
  Grid,
  QrCode,
  Volume2,
  Receipt,
  Printer,
  X,
  Bell,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const OwnerDashboard: React.FC = () => {
  const { user } = useAuth();
  const { socket, joinRestaurant } = useSocket();
  const [stats, setStats] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [billRequests, setBillRequests] = useState<any[]>([]);
  const [activePrintRequest, setActivePrintRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Track dismissed bill requests to guarantee they never reappear on poll
  const dismissedOrderIdsRef = React.useRef<Set<string>>(new Set());
  // Track seen bill request IDs to trigger sound when a new request arrives (via socket or poll)
  const seenBillIdsRef = React.useRef<Set<string>>(new Set());
  const initialBillFetchDoneRef = React.useRef(false);

  // Initialize dismissed IDs from sessionStorage
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('dmh_dismissed_bills');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          parsed.forEach((id) => dismissedOrderIdsRef.current.add(id));
        }
      }
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (user?.restaurant_id) {
      fetchDashboard();
      fetchBillRequests();
      if (joinRestaurant) joinRestaurant(user.restaurant_id);
    }
  }, [user]);

  // Real-time socket updates for new orders, status transitions, and customer bill requests
  useEffect(() => {
    if (!socket || !user?.restaurant_id) return;

    joinRestaurant(user.restaurant_id);

    const handleNewOrder = () => {
      sounds.play3SecondOrderAlarm();
      fetchDashboard();
    };

    const handleStatusUpdate = () => {
      fetchDashboard();
    };

    const handleBillRequested = (data: any) => {
      if (!data) return;
      const orderId = data.order_id || data.id;
      if (orderId && dismissedOrderIdsRef.current.has(orderId)) return;

      // Play clear, noticeable notification sound automatically
      sounds.playBillRequestAlert();

      if (data.id) seenBillIdsRef.current.add(data.id);
      if (data.order_id) seenBillIdsRef.current.add(data.order_id);

      setBillRequests((prev) => [data, ...prev.filter((b) => b.order_id !== data.order_id && b.id !== data.id)]);
    };

    const handleBillDismissed = (data: any) => {
      if (!data || !data.order_id) return;
      dismissedOrderIdsRef.current.add(data.order_id);
      setBillRequests((prev) => prev.filter((b) => b.order_id !== data.order_id));
    };

    const handleBillDismissedAll = () => {
      setBillRequests([]);
    };

    socket.on('order:new', handleNewOrder);
    socket.on('order:status_updated', handleStatusUpdate);
    socket.on('bill:requested', handleBillRequested);
    socket.on('bill:dismissed', handleBillDismissed);
    socket.on('bill:dismissed_all', handleBillDismissedAll);

    return () => {
      socket.off('order:new', handleNewOrder);
      socket.off('order:status_updated', handleStatusUpdate);
      socket.off('bill:requested', handleBillRequested);
      socket.off('bill:dismissed', handleBillDismissed);
      socket.off('bill:dismissed_all', handleBillDismissedAll);
    };
  }, [socket, user?.restaurant_id]);

  // Continuous background synchronization (every 3 seconds) for zero-reload bill requests & stats
  useEffect(() => {
    if (!user?.restaurant_id) return;
    const interval = setInterval(() => {
      fetchDashboard(true);
      fetchBillRequests();
    }, 3000);
    return () => clearInterval(interval);
  }, [user?.restaurant_id]);

  const fetchDashboard = async (silent: boolean = false) => {
    if (!user?.restaurant_id) return;
    try {
      const tzOffset = new Date().getTimezoneOffset();
      const [statsRes, ordersRes] = await Promise.all([
        api.get(`/restaurants/${user.restaurant_id}/orders/stats`, { params: { tz_offset: tzOffset } }),
        api.get(`/restaurants/${user.restaurant_id}/orders`, { params: { date_filter: 'today', tz_offset: tzOffset } }),
      ]);
      setStats(statsRes.data);
      setRecentOrders(ordersRes.data.slice(0, 5));
    } catch (err) {
      console.error('Failed to load owner dashboard:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchBillRequests = async () => {
    if (!user?.restaurant_id) return;
    try {
      const res = await api.get(`/restaurants/${user.restaurant_id}/bill-requests`);
      if (res.data && Array.isArray(res.data)) {
        // Filter out any dismissed orders
        const activeRequests = res.data.filter((req: any) => {
          const isDismissed = (req.order_id && dismissedOrderIdsRef.current.has(req.order_id)) ||
                              (req.id && dismissedOrderIdsRef.current.has(req.id));
          return !isDismissed;
        });

        // Check if there are newly arrived requests to trigger notification sound
        if (initialBillFetchDoneRef.current) {
          const hasNew = activeRequests.some((req: any) => {
            const key = req.order_id || req.id;
            return key && !seenBillIdsRef.current.has(key);
          });
          if (hasNew) {
            sounds.playBillRequestAlert();
          }
        }

        // Mark current items as seen
        activeRequests.forEach((req: any) => {
          if (req.id) seenBillIdsRef.current.add(req.id);
          if (req.order_id) seenBillIdsRef.current.add(req.order_id);
        });

        initialBillFetchDoneRef.current = true;
        setBillRequests(activeRequests);
      }
    } catch (err) {
      // ignore
    }
  };

  const dismissBillRequest = async (id: string, orderId?: string) => {
    // 1. Immediately record in persistent dismissed set (so poller never brings it back)
    if (id) dismissedOrderIdsRef.current.add(id);
    if (orderId) dismissedOrderIdsRef.current.add(orderId);

    try {
      sessionStorage.setItem('dmh_dismissed_bills', JSON.stringify(Array.from(dismissedOrderIdsRef.current)));
    } catch (e) {
      // ignore
    }

    // 2. Immediately close from UI on first click
    setBillRequests((prev) => prev.filter((b) => b.id !== id && (orderId ? b.order_id !== orderId : true)));

    // 3. Persist dismiss in backend
    if (orderId && user?.restaurant_id) {
      try {
        await api.patch(`/restaurants/${user.restaurant_id}/bill-requests/${orderId}/dismiss`);
      } catch (err) {
        // ignore
      }
    }
  };

  const handleDismissAll = async () => {
    // Mark all current requests as dismissed immediately
    billRequests.forEach((req) => {
      if (req.id) dismissedOrderIdsRef.current.add(req.id);
      if (req.order_id) dismissedOrderIdsRef.current.add(req.order_id);
    });

    try {
      sessionStorage.setItem('dmh_dismissed_bills', JSON.stringify(Array.from(dismissedOrderIdsRef.current)));
    } catch (e) {
      // ignore
    }

    setBillRequests([]);

    if (user?.restaurant_id) {
      try {
        await api.post(`/restaurants/${user.restaurant_id}/bill-requests/dismiss-all`);
      } catch (err) {
        // ignore
      }
    }
  };

  const handlePrintReceipt = (req: any) => {
    setActivePrintRequest(req);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  if (loading || !stats) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-lg w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Live Daily Operations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time table orders, kitchen queue, customer bill requests, and revenue metrics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/kitchen/orders">
            <Button
              variant="secondary"
              leftIcon={<ChefHat className="w-4 h-4 text-amber-600" />}
            >
              Open Kitchen KDS
            </Button>
          </Link>
          <Link to="/owner/menu-items">
            <Button leftIcon={<Plus className="w-4 h-4" />}>Add Menu Item</Button>
          </Link>
        </div>
      </div>

      {/* LIVE BILL REQUEST NOTIFICATIONS SECTION */}
      {billRequests.length > 0 && (
        <Card className="p-5 bg-gradient-to-r from-amber-500 via-orange-500 to-[#d70f64] text-white rounded-[28px] shadow-xl border-0 relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-white/20 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
                <Bell className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                  <span>Customer Bill Requests ({billRequests.length})</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                </h3>
                <p className="text-xs text-amber-100/90 font-medium">
                  Live table bill requests requiring waiter attention and receipt printing.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismissAll}
              className="text-xs font-bold bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl border border-white/20 transition-all cursor-pointer"
            >
              Clear All
            </button>
          </div>

          <div className="space-y-3">
            {billRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white text-slate-900 p-4 rounded-2xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3 border border-amber-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 font-black text-sm flex flex-col items-center justify-center shrink-0 border border-amber-200">
                    <span className="text-[10px] text-amber-700 font-bold uppercase">Table</span>
                    <span className="text-base font-black leading-none">{req.table_number}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-sm">{req.order_number}</span>
                      <span className="text-xs font-black text-rose-800 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 animate-pulse">
                        {req.message || `Table ${req.table_number} has requested a bill.`}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                      Customer: <span className="font-bold text-slate-800">{req.customer_name}</span> • Requested at{' '}
                      <span className="font-bold text-slate-800">{formatTime(req.requested_at)}</span> ({formatDate(req.requested_at)})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                  <span className="font-black text-slate-900 text-base mr-2">
                    {formatCurrency(req.total, req.currency)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePrintReceipt(req)}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer active:scale-95"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Now</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissBillRequest(req.id, req.order_id);
                    }}
                    className="p-2.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                    title="Close notification"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Top Operations KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatsCard
          label="Today's Orders"
          value={stats.total}
          icon={<ShoppingBag className="w-5 h-5" />}
          color="blue"
          subtext={`${stats.completed} completed today`}
        />
        <StatsCard
          label="Pending / In Kitchen"
          value={stats.new + stats.accepted + stats.cooking}
          icon={<Clock className="w-5 h-5" />}
          color="amber"
          subtext={`${stats.new} New • ${stats.cooking} Cooking`}
        />
        <StatsCard
          label="Ready to Serve"
          value={stats.ready}
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="emerald"
          subtext="Awaiting delivery to table"
        />
        <StatsCard
          label="Today's Revenue"
          value={formatCurrency(stats.revenue)}
          icon={<DollarSign className="w-5 h-5" />}
          color="indigo"
          subtext="Net confirmed sales"
        />
      </div>

      {/* Secondary Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase">Menu Items</p>
            <h4 className="text-xl font-extrabold text-slate-900">{stats.totalItems} Active Dishes</h4>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Grid className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase">Dining Tables</p>
            <h4 className="text-xl font-extrabold text-slate-900">{stats.totalTables} Configured</h4>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase">QR Tokens</p>
            <h4 className="text-xl font-extrabold text-slate-900">Secure Live Scans</h4>
          </div>
        </Card>
      </div>

      {/* Recent Orders Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Table Orders Today</h3>
            <p className="text-xs text-slate-500">Live incoming customer orders from QR scans</p>
          </div>
          <Link
            to="/owner/orders"
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            <span>View All Orders</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <ShoppingBag className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-600">No orders placed today yet.</p>
            <p className="text-xs text-slate-400 mt-1">Orders from QR table scans will appear here instantly.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentOrders.map((order) => (
              <div key={order.id} className="py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-extrabold text-xs text-slate-800 shrink-0">
                    T-{order.table_number}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{order.order_number}</span>
                      <Badge status={order.status} />
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {order.items?.map((i: any) => `${i.quantity}x ${i.item_name_snapshot}`).join(', ') || 'No items listed'}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 flex items-center gap-3">
                  <div>
                    <p className="font-black text-slate-900 text-sm">{formatCurrency(order.total, order.currency)}</p>
                    <p className="text-[11px] text-slate-400">{formatTime(order.created_at)}</p>
                  </div>
                  <button
                    onClick={() =>
                      handlePrintReceipt({
                        ...order,
                        order_id: order.id,
                        restaurant_name: user?.restaurant_name || order.restaurant_name,
                        restaurant_logo: user?.restaurant_logo || order.restaurant_logo,
                        requested_at: order.created_at,
                      })
                    }
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                    title="Print Receipt"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* RESTAURANT POS THERMAL RECEIPT PRINT MODAL */}
      {activePrintRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm p-4 flex items-center justify-center print:p-0 print:bg-white print:static">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden border border-slate-200 print:shadow-none print:border-0 print:w-full print:max-w-none">
            {/* Modal Screen Top Control Bar (Hidden on Print) */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between print:hidden">
              <span className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-[#d70f64]" />
                Thermal POS Receipt Preview
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm hover:bg-emerald-700 cursor-pointer active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Now</span>
                </button>
                <button
                  onClick={() => setActivePrintRequest(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Dedicated Thermal POS Receipt Container */}
            <div id="pos-thermal-receipt" className="p-6 text-slate-900 font-mono text-xs space-y-4 print:p-0 print:text-black">
              {/* Receipt Header */}
              <div className="text-center space-y-1 pb-3 border-b-2 border-dashed border-slate-400">
                {activePrintRequest.restaurant_logo && (
                  <img
                    src={getImageUrl(activePrintRequest.restaurant_logo)}
                    alt="Logo"
                    className="w-12 h-12 rounded-xl object-contain mx-auto mb-1 bg-white p-0.5 border border-slate-200 print:border-black"
                  />
                )}
                <h2 className="text-lg font-black uppercase tracking-tight">
                  {activePrintRequest.restaurant_name || user?.restaurant_name}
                </h2>
                {activePrintRequest.restaurant_address && (
                  <p className="text-[10px] text-slate-600 print:text-black">
                    {activePrintRequest.restaurant_address}
                  </p>
                )}
                {activePrintRequest.restaurant_phone && (
                  <p className="text-[10px] text-slate-600 print:text-black">
                    TEL: {activePrintRequest.restaurant_phone}
                  </p>
                )}
              </div>

              {/* Order Meta */}
              <div className="text-[11px] space-y-0.5 py-1 border-b border-dashed border-slate-300">
                <div className="flex justify-between font-bold">
                  <span>TABLE NO: {activePrintRequest.table_number}</span>
                  <span>ORDER: {activePrintRequest.order_number}</span>
                </div>
                <div className="flex justify-between text-slate-600 print:text-black text-[10px]">
                  <span>DATE: {formatDate(activePrintRequest.requested_at || new Date().toISOString())}</span>
                  <span>TIME: {formatTime(activePrintRequest.requested_at || new Date().toISOString())}</span>
                </div>
                {activePrintRequest.customer_name && (
                  <div className="text-[10px] font-bold text-slate-700 print:text-black">
                    CUSTOMER: {activePrintRequest.customer_name}
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-1.5 py-1 border-b-2 border-dashed border-slate-400">
                <div className="flex justify-between font-black text-[10px] uppercase border-b border-slate-200 pb-1">
                  <span>QTY ITEM</span>
                  <span>AMT</span>
                </div>
                {activePrintRequest.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-start text-[11px] font-semibold">
                    <div className="pr-2">
                      <span>
                        {item.quantity}x {item.item_name_snapshot}
                      </span>
                      {item.variant_name_snapshot && (
                        <span className="block text-[10px] text-slate-500 print:text-black font-normal">
                          ({item.variant_name_snapshot})
                        </span>
                      )}
                    </div>
                    <span className="font-bold shrink-0">
                      {formatCurrency(item.subtotal, activePrintRequest.currency)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Summary Totals */}
              <div className="space-y-1 text-[11px] pt-1 font-semibold">
                <div className="flex justify-between">
                  <span>SUBTOTAL:</span>
                  <span>{formatCurrency(activePrintRequest.subtotal, activePrintRequest.currency)}</span>
                </div>
                {activePrintRequest.discount > 0 && (
                  <div className="flex justify-between text-emerald-700 print:text-black">
                    <span>DISCOUNT:</span>
                    <span>-{formatCurrency(activePrintRequest.discount, activePrintRequest.currency)}</span>
                  </div>
                )}
                {activePrintRequest.tax > 0 && (
                  <div className="flex justify-between">
                    <span>TAX / GST:</span>
                    <span>{formatCurrency(activePrintRequest.tax, activePrintRequest.currency)}</span>
                  </div>
                )}
                {activePrintRequest.service_charge > 0 && (
                  <div className="flex justify-between">
                    <span>SERVICE CHARGE:</span>
                    <span>{formatCurrency(activePrintRequest.service_charge, activePrintRequest.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm pt-2 border-t-2 border-slate-800 text-slate-900 print:text-black">
                  <span>GRAND TOTAL:</span>
                  <span>{formatCurrency(activePrintRequest.total, activePrintRequest.currency)}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center text-[10px] text-slate-500 print:text-black pt-3 border-t border-dashed border-slate-300">
                <p className="font-bold">THANK YOU FOR DINING WITH US!</p>
                <p>SOFTWARE BY DMH DINEFLOW</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
