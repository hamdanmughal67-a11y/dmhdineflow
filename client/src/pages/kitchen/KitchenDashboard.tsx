import React, { useEffect, useState, useRef } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { sounds } from '../../lib/sounds';
import { formatCurrency, formatTime, timeAgo } from '../../lib/utils';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  Volume2,
  Ban,
  MessageSquare,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Flame,
  Bike,
  Utensils,
  MapPin,
  Phone,
  User,
  Undo2,
  Bell,
  X,
} from 'lucide-react';

export const KitchenDashboard: React.FC = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'online' | 'table'>('all');
  const [newOrderAlert, setNewOrderAlert] = useState<{ orderNumber: string; isOnline: boolean; itemsCount: number } | null>(null);

  // In-flight tracking to guarantee ONE CLICK ONLY per order action
  const inFlightIdsRef = useRef<Set<string>>(new Set());
  // Optimistic statuses lock with timestamps to protect against background poller race conditions
  const optimisticStatusMap = useRef<Map<string, { status: string; timestamp: number }>>(new Map());
  // Known order IDs to trigger 3-second sound on new arrivals
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDoneRef = useRef<boolean>(false);

  useEffect(() => {
    if (user?.restaurant_id) {
      fetchKitchenOrders();
    }
  }, [user]);

  // Guaranteed 4-second background poller for continuous real-time synchronization
  useEffect(() => {
    if (!user?.restaurant_id) return;
    const interval = setInterval(() => {
      fetchKitchenOrders(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [user?.restaurant_id]);

  // Real-time socket listener
  useEffect(() => {
    if (!socket) return;

    if (user?.restaurant_id) {
      socket.emit('join:kitchen', user.restaurant_id);
    }

    const handleNewOrder = (order: any) => {
      if (!order || !order.id) return;

      // 1. Play full 3-second loud unmissable alarm
      sounds.play3SecondOrderAlarm();

      // 2. Track known ID
      knownOrderIdsRef.current.add(order.id);

      // 3. Show top visual alert banner
      setNewOrderAlert({
        orderNumber: order.order_number || '#Order',
        isOnline: isOnlineOrder(order),
        itemsCount: order.items?.length || 1,
      });

      // 4. Prepend order immediately to UI (0ms latency)
      setOrders((prev) => {
        const exists = prev.some((o) => o.id === order.id);
        if (exists) return prev.map((o) => (o.id === order.id ? { ...o, ...order } : o));
        return [order, ...prev];
      });
    };

    const handleStatusUpdate = (updatedOrder: any) => {
      if (!updatedOrder || !updatedOrder.id) return;
      // Remove from optimistic map once server confirms
      optimisticStatusMap.current.delete(updatedOrder.id);
      setOrders((prev) =>
        prev.map((o) => (o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o))
      );
    };

    socket.on('order:new', handleNewOrder);
    socket.on('order:status_updated', handleStatusUpdate);
    socket.on('order:updated', handleStatusUpdate);

    return () => {
      socket.off('order:new', handleNewOrder);
      socket.off('order:status_updated', handleStatusUpdate);
      socket.off('order:updated', handleStatusUpdate);
    };
  }, [socket, user?.restaurant_id]);

  const fetchKitchenOrders = async (silent: boolean = false) => {
    if (!user?.restaurant_id) return;
    if (!silent) setLoading(true);
    try {
      const res = await api.get(`/restaurants/${user.restaurant_id}/orders?date_filter=today`);
      const fetched: any[] = res.data || [];

      // Check if there are newly arrived orders not yet seen
      if (initialLoadDoneRef.current) {
        let hasNewIncoming = false;
        fetched.forEach((order) => {
          if (order.status === 'new' && !knownOrderIdsRef.current.has(order.id)) {
            hasNewIncoming = true;
            knownOrderIdsRef.current.add(order.id);
          }
        });
        if (hasNewIncoming) {
          sounds.play3SecondOrderAlarm();
        }
      } else {
        fetched.forEach((order) => knownOrderIdsRef.current.add(order.id));
        initialLoadDoneRef.current = true;
      }

      // Merge fetched orders while protecting recent optimistic transitions (last 10s)
      const now = Date.now();
      const merged = fetched.map((serverOrder) => {
        const optimistic = optimisticStatusMap.current.get(serverOrder.id);
        if (optimistic && (now - optimistic.timestamp) < 10000) {
          return { ...serverOrder, status: optimistic.status };
        }
        return serverOrder;
      });

      setOrders(merged);
    } catch (err) {
      console.error('Failed to load kitchen orders:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // 100% 1-CLICK INSTANT OPTIMISTIC TRANSITION
  // Moves the card to the next column on the very first click with 0ms delay
  const handleAdvanceStatus = async (orderId: string, newStatus: string) => {
    // Prevent accidental duplicate rapid clicks while the request is in flight
    if (inFlightIdsRef.current.has(orderId)) return;
    inFlightIdsRef.current.add(orderId);

    // 1. Play immediate click audio feedback
    sounds.playClick();

    // 2. Capture the CURRENT status of just this order before overwriting it
    //    (Do NOT snapshot entire orders array — that causes stale-closure rollback bugs)
    let previousStatus: string | null = null;
    setOrders((prev) => {
      const found = prev.find((o) => o.id === orderId);
      if (found) previousStatus = found.status;
      return prev; // No state change here — we just read the current status
    });

    // 3. Lock optimistic status with timestamp so background poller does not revert it
    optimisticStatusMap.current.set(orderId, {
      status: newStatus,
      timestamp: Date.now(),
    });

    // 4. INSTANT OPTIMISTIC UI UPDATE (0ms delay!)
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, status: newStatus, updated_at: new Date().toISOString() }
          : o
      )
    );

    try {
      // 5. Send background update to server
      const res = await api.patch(`/orders/${orderId}/status`, { status: newStatus });
      if (res.data) {
        // Server confirmed — clear optimistic lock and apply the authoritative server response
        optimisticStatusMap.current.delete(orderId);
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, ...res.data } : o))
        );
      }
    } catch (err: any) {
      console.error('Failed to update order status:', err);
      // Clear the optimistic lock
      optimisticStatusMap.current.delete(orderId);
      // Revert ONLY this order back to its previous status (not the whole list)
      if (previousStatus !== null) {
        const revertStatus = previousStatus;
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId ? { ...o, status: revertStatus } : o
          )
        );
      }
      alert(err.response?.data?.error || 'Failed to update order status. Please check your internet connection.');
    } finally {
      inFlightIdsRef.current.delete(orderId);
    }
  };

  const isOnlineOrder = (order: any) => {
    return (
      order.order_type === 'delivery' ||
      order.order_type === 'pickup' ||
      order.order_type === 'online' ||
      !order.table_id ||
      order.table_number === 'Delivery' ||
      order.table_number === '?'
    );
  };

  // Filtered orders
  const displayedOrders = orders.filter((o) => {
    if (filterType === 'online') return isOnlineOrder(o);
    if (filterType === 'table') return !isOnlineOrder(o);
    return true;
  });

  const onlineCount = orders.filter(isOnlineOrder).length;
  const tableCount = orders.filter((o) => !isOnlineOrder(o)).length;

  const columns = [
    {
      id: 'new',
      title: 'NEW ORDERS',
      headerBg: 'bg-amber-500 text-white',
      colBg: 'bg-amber-50/40 border-amber-200',
      badgeBg: 'bg-amber-100 text-amber-900',
    },
    {
      id: 'accepted',
      title: 'ACCEPTED',
      headerBg: 'bg-blue-600 text-white',
      colBg: 'bg-blue-50/40 border-blue-200',
      badgeBg: 'bg-blue-100 text-blue-900',
    },
    {
      id: 'cooking',
      title: 'PREPARING / COOKING',
      headerBg: 'bg-orange-500 text-white',
      colBg: 'bg-orange-50/40 border-orange-200',
      badgeBg: 'bg-orange-100 text-orange-900',
    },
    {
      id: 'ready',
      title: 'READY TO SERVE',
      headerBg: 'bg-emerald-600 text-white',
      colBg: 'bg-emerald-50/40 border-emerald-200',
      badgeBg: 'bg-emerald-100 text-emerald-900',
    },
    {
      id: 'completed',
      title: 'COMPLETED / SERVED',
      headerBg: 'bg-slate-700 text-white',
      colBg: 'bg-slate-100/60 border-slate-200',
      badgeBg: 'bg-slate-200 text-slate-800',
    },
  ];

  return (
    <div className="h-full flex flex-col space-y-4 font-sans">
      {/* Visual New Order Alert Banner (Pulsing 3-Second Visual Alert) */}
      {newOrderAlert && (
        <div className="bg-gradient-to-r from-pink-600 via-rose-600 to-amber-500 text-white px-5 py-3 rounded-2xl shadow-lg flex items-center justify-between animate-bounce shrink-0 border border-white/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Bell className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <p className="font-black text-sm tracking-wide flex items-center gap-2">
                <span>🚨 NEW INCOMING ORDER: {newOrderAlert.orderNumber}</span>
                {newOrderAlert.isOnline ? (
                  <span className="px-2 py-0.5 rounded-md bg-white text-pink-700 text-xs font-black">
                    ONLINE DELIVERY
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-white text-indigo-700 text-xs font-black">
                    TABLE DINE-IN
                  </span>
                )}
              </p>
              <p className="text-xs text-white/90 font-medium">
                {newOrderAlert.itemsCount} dishes ordered • 3-Second Audio Alert Activated
              </p>
            </div>
          </div>
          <button
            onClick={() => setNewOrderAlert(null)}
            className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all"
            title="Dismiss Alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Bar: Live Summary & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm shrink-0">
        <div className="flex items-center gap-2">
          {/* Filter Pills */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterType === 'all' ? 'bg-white text-slate-900 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Orders ({orders.length})
            </button>
            <button
              onClick={() => setFilterType('online')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                filterType === 'online'
                  ? 'bg-pink-600 text-white shadow-sm font-black'
                  : 'text-slate-600 hover:text-pink-600'
              }`}
            >
              <Bike className="w-3.5 h-3.5" />
              <span>Online ({onlineCount})</span>
            </button>
            <button
              onClick={() => setFilterType('table')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                filterType === 'table'
                  ? 'bg-indigo-600 text-white shadow-sm font-black'
                  : 'text-slate-600 hover:text-indigo-600'
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>Table ({tableCount})</span>
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => sounds.play3SecondOrderAlarm()}
            className="px-3.5 py-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-700 flex items-center gap-1.5 text-xs font-bold transition-all border border-pink-200 active:scale-95"
            title="Test 3-Second Kitchen Sound"
          >
            <Volume2 className="w-3.5 h-3.5 text-pink-600" />
            <span>🔊 Test 3s Alarm</span>
          </button>

          <button
            onClick={() => fetchKitchenOrders(false)}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 text-xs font-bold transition-colors border border-slate-200 shadow-sm active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {/* 5-Column Kanban Board */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto min-h-0">
        {columns.map((col) => {
          const colOrders = displayedOrders.filter((o) => {
            if (col.id === 'cooking') return o.status === 'cooking' || o.status === 'preparing';
            if (col.id === 'ready') return o.status === 'ready' || o.status === 'out_for_delivery';
            if (col.id === 'completed') return o.status === 'completed' || o.status === 'delivered';
            return o.status === col.id;
          });

          return (
            <div
              key={col.id}
              className={`flex flex-col rounded-2xl border ${col.colBg} overflow-hidden shadow-sm bg-white`}
            >
              {/* Column Header */}
              <div className={`p-3.5 ${col.headerBg} flex items-center justify-between shrink-0 shadow-sm`}>
                <h3 className="font-black text-xs tracking-wider uppercase">{col.title}</h3>
                <span className="w-6 h-6 rounded-full bg-white/25 backdrop-blur-sm text-white font-black text-xs flex items-center justify-center">
                  {colOrders.length}
                </span>
              </div>

              {/* Scrollable Order Cards List */}
              <div className="flex-1 p-3 space-y-3 overflow-y-auto bg-slate-50/50">
                {colOrders.length === 0 ? (
                  <div className="h-40 flex items-center justify-center text-xs text-slate-400 font-semibold italic">
                    No orders in this queue
                  </div>
                ) : (
                  colOrders.map((order) => {
                    const isOnline = isOnlineOrder(order);

                    return (
                      <div
                        key={order.id}
                        className={`p-4 rounded-2xl bg-white border shadow-sm hover:shadow-md text-slate-900 flex flex-col justify-between transition-all ${
                          col.id === 'new'
                            ? 'ring-2 ring-amber-400/80 border-amber-300'
                            : isOnline
                            ? 'border-pink-200'
                            : 'border-slate-200'
                        }`}
                      >
                        <div>
                          {/* Card Header: Order # + Mandatory ONLINE vs TABLE Badge */}
                          <div className="flex items-start justify-between pb-3 mb-2.5 border-b border-slate-100">
                            <div>
                              <span className="font-black text-lg text-slate-900 tracking-tight block">
                                {order.order_number}
                              </span>
                              <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3" />
                                {timeAgo(order.created_at)}
                              </span>
                            </div>

                            {/* Prominent Badge */}
                            {isOnline ? (
                              <div className="px-3 py-1.5 rounded-xl bg-pink-100 text-pink-700 font-black text-xs border border-pink-300 shadow-sm flex items-center gap-1.5 animate-pulse">
                                <Bike className="w-3.5 h-3.5 text-pink-600" />
                                <span>ONLINE</span>
                              </div>
                            ) : (
                              <div className="px-3 py-1.5 rounded-xl bg-indigo-100 text-indigo-800 font-black text-xs border border-indigo-300 shadow-sm flex items-center gap-1.5">
                                <Utensils className="w-3.5 h-3.5 text-indigo-600" />
                                <span>TABLE {order.table_number}</span>
                              </div>
                            )}
                          </div>

                          {/* Customer Details for Online Orders */}
                          {isOnline && (order.customer_name || order.customer_phone || order.delivery_address) && (
                            <div className="mb-3 p-2.5 rounded-xl bg-pink-50/70 border border-pink-100 text-xs space-y-1">
                              {order.customer_name && (
                                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                  <User className="w-3 h-3 text-pink-600" />
                                  <span>{order.customer_name}</span>
                                </div>
                              )}
                              {order.customer_phone && (
                                <div className="text-slate-600 flex items-center gap-1.5 text-[11px]">
                                  <Phone className="w-3 h-3 text-pink-600" />
                                  <span>{order.customer_phone}</span>
                                </div>
                              )}
                              {order.delivery_address && (
                                <div className="text-slate-600 flex items-start gap-1.5 text-[11px] leading-tight">
                                  <MapPin className="w-3 h-3 text-pink-600 shrink-0 mt-0.5" />
                                  <span className="line-clamp-2">{order.delivery_address}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Customer Special Note */}
                          {order.customer_note && (
                            <div className="mb-3 p-2.5 rounded-xl bg-amber-50 text-amber-900 text-xs font-semibold border border-amber-200 flex items-start gap-1.5">
                              <MessageSquare className="w-3.5 h-3.5 shrink-0 text-amber-600 mt-0.5" />
                              <span>{order.customer_note}</span>
                            </div>
                          )}

                          {/* Item List with high readability */}
                          <div className="space-y-2 text-xs py-1">
                            {order.items?.map((item: any) => (
                              <div key={item.id} className="flex items-start justify-between font-bold text-slate-800">
                                <span className="leading-snug">
                                  <span className="inline-block px-1.5 py-0.5 rounded-md bg-slate-100 text-indigo-700 font-black mr-2">
                                    {item.quantity}x
                                  </span>
                                  {item.item_name_snapshot}
                                  {item.variant_name_snapshot && (
                                    <span className="text-[10px] text-indigo-600 font-semibold ml-1.5 bg-indigo-50 px-1.5 py-0.5 rounded">
                                      {item.variant_name_snapshot}
                                    </span>
                                  )}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Touch Action Controls - 100% 1-CLICK INSTANT RESPONSIVE TRANSITIONS */}
                        <div className="mt-4 pt-3 border-t border-slate-100 flex gap-2">
                          {col.id === 'new' && (
                            <>
                              <button
                                onClick={() => handleAdvanceStatus(order.id, 'accepted')}
                                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-xs transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Accept Order</span>
                              </button>
                              <button
                                onClick={() => handleAdvanceStatus(order.id, 'cancelled')}
                                className="px-3.5 py-3 rounded-xl bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 font-bold text-xs transition-all border border-rose-200 cursor-pointer"
                                title="Reject"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {col.id === 'accepted' && (
                            <>
                              <button
                                onClick={() => handleAdvanceStatus(order.id, 'cooking')}
                                className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-black text-xs transition-all shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer"
                              >
                                <ChefHat className="w-4 h-4" />
                                <span>Start Cooking</span>
                              </button>
                              <button
                                onClick={() => handleAdvanceStatus(order.id, 'new')}
                                className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs transition-all cursor-pointer"
                                title="Move Back to New"
                              >
                                <Undo2 className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {col.id === 'cooking' && (
                            <>
                              <button
                                onClick={() => handleAdvanceStatus(order.id, 'ready')}
                                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Mark as Ready</span>
                              </button>
                              <button
                                onClick={() => handleAdvanceStatus(order.id, 'accepted')}
                                className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs transition-all cursor-pointer"
                                title="Move Back to Accepted"
                              >
                                <Undo2 className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {col.id === 'ready' && (
                            <>
                              <button
                                onClick={() => handleAdvanceStatus(order.id, 'completed')}
                                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-900 active:scale-95 text-white font-black text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>{isOnline ? 'Delivered / Done' : 'Served / Done'}</span>
                              </button>
                              <button
                                onClick={() => handleAdvanceStatus(order.id, 'cooking')}
                                className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs transition-all cursor-pointer"
                                title="Move Back to Cooking"
                              >
                                <Undo2 className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {col.id === 'completed' && (
                            <span className="text-[11px] text-slate-400 font-semibold mx-auto py-1">
                              Completed at {formatTime(order.updated_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
