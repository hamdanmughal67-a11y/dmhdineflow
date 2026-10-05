import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useSocket } from '../../context/SocketContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { sounds } from '../../lib/sounds';
import { formatCurrency, formatTime, formatDate, getImageUrl } from '../../lib/utils';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  Clock,
  ChefHat,
  UtensilsCrossed,
  ArrowLeft,
  Sparkles,
  ShoppingBag,
  Bike,
  MapPin,
  Phone,
  CreditCard,
  DollarSign,
  Building,
  Radio,
  MessageCircle,
  Receipt,
  X,
  FileText,
  Calendar,
} from 'lucide-react';

export const OrderTracking: React.FC = () => {
  const { token, orderId } = useParams<{ token?: string; orderId?: string }>();
  const { socket, joinSession, joinOrder } = useSocket();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showRequestBillModal, setShowRequestBillModal] = useState(false);
  const [requestingBill, setRequestingBill] = useState(false);
  const [billRequested, setBillRequested] = useState(false);
  const previousStatusRef = useRef<string | null>(null);

  useEffect(() => {
    if (orderId) {
      fetchOrder(false);
    }
  }, [orderId]);

  // Guaranteed 2.5-second background poller for continuous real-time synchronization
  useEffect(() => {
    if (!orderId) return;
    const interval = setInterval(() => {
      fetchOrder(true);
    }, 2500);
    return () => clearInterval(interval);
  }, [orderId]);

  // Real-time WebSocket listener for instant zero-delay status transitions
  useEffect(() => {
    if (!socket || !orderId) return;

    // Join order room directly
    socket.emit('join:order', orderId);
    if (joinOrder) joinOrder(orderId);

    if (order?.table_session_id) {
      joinSession(order.table_session_id);
    }

    const handleStatusUpdate = (updatedOrder: any) => {
      if (updatedOrder && (updatedOrder.id === orderId || updatedOrder.order_number === order?.order_number)) {
        setOrder((prev: any) => {
          if (!prev) return updatedOrder;
          // Check if status advanced
          if (prev.status !== updatedOrder.status) {
            handleStatusChanged(updatedOrder.status);
          }
          return { ...prev, ...updatedOrder };
        });
      }
    };

    socket.on('order:status_updated', handleStatusUpdate);
    socket.on('order:updated', handleStatusUpdate);

    return () => {
      socket.off('order:status_updated', handleStatusUpdate);
      socket.off('order:updated', handleStatusUpdate);
    };
  }, [socket, order?.table_session_id, orderId]);

  const handleStatusChanged = (newStatus: string) => {
    try {
      if (newStatus === 'completed' || newStatus === 'delivered') {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
      sounds.playOrderAlert();
    } catch (e) {
      console.warn('Sound chime error:', e);
    }
  };

  const fetchOrder = async (silent: boolean = false) => {
    try {
      const res = await api.get(`/customer/orders/${orderId}`);
      if (res.data) {
        if (previousStatusRef.current && previousStatusRef.current !== res.data.status) {
          handleStatusChanged(res.data.status);
        }
        previousStatusRef.current = res.data.status;
        setOrder(res.data);
      }
    } catch (err) {
      console.error('Failed to load customer order tracking:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleRequestBill = async () => {
    if (!order?.id) return;
    setRequestingBill(true);
    try {
      await api.post(`/customer/orders/${order.id}/request-bill`);
      setBillRequested(true);
      setShowRequestBillModal(true);
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (err: any) {
      console.error('Bill request error:', err);
      setBillRequested(true);
      setShowRequestBillModal(true);
    } finally {
      setRequestingBill(false);
    }
  };

  if (loading || !order) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 max-w-lg mx-auto space-y-4 animate-pulse">
        <div className="h-44 bg-slate-200 rounded-3xl" />
        <div className="h-64 bg-slate-200 rounded-3xl" />
      </div>
    );
  }

  const isDelivery = order.order_type === 'delivery';
  const isDineIn = !isDelivery && Boolean(order.table_id || order.table_number || order.order_type === 'table');

  const deliverySteps = [
    { id: 'new', label: 'Order Received', desc: 'Sent to restaurant kitchen' },
    { id: 'accepted', label: 'Order Confirmed', desc: 'Restaurant confirmed your order' },
    { id: 'cooking', label: 'Cooking & Packing', desc: 'Chef is preparing your fresh meal' },
    { id: 'ready', label: 'Out for Delivery', desc: 'Rider is on the way to your address' },
    { id: 'delivered', label: 'Delivered', desc: 'Enjoy your food!' },
  ];

  const tableSteps = [
    { id: 'new', label: 'Order Received', desc: 'Sent directly to kitchen' },
    { id: 'accepted', label: 'Order Accepted', desc: 'Kitchen acknowledged order' },
    { id: 'cooking', label: 'Cooking & Preparing', desc: 'Chef is preparing your dishes' },
    { id: 'ready', label: 'Ready to Serve', desc: 'Plated & heading to your table' },
    { id: 'completed', label: 'Served / Complete', desc: 'Enjoy your meal!' },
  ];

  const steps = isDelivery ? deliverySteps : tableSteps;

  const stepIndexMap: Record<string, number> = {
    new: 0,
    accepted: 1,
    cooking: 2,
    preparing: 2,
    ready: 3,
    out_for_delivery: 3,
    delivered: 4,
    completed: 4,
    cancelled: -1,
  };

  const currentStep = stepIndexMap[order.status] ?? 0;

  const backLink = token ? `/m/${token}` : (order.restaurant_slug ? `/${order.restaurant_slug}` : '/');

  // Clean WhatsApp phone number for instant chat
  const cleanRestaurantPhone = (order.restaurant_whatsapp || order.restaurant_phone || '').replace(/[^0-9]/g, '');

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-900 pb-20 font-sans max-w-lg mx-auto shadow-2xl p-4 space-y-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          to={backLink}
          className="p-2.5 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-sm hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Menu</span>
        </Link>
        <div className="flex items-center gap-2">
          {/* Live indicator badge */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-black shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>LIVE TRACKING</span>
          </span>

          <span className="text-xs font-black uppercase text-[#d70f64] bg-pink-50 border border-pink-100 px-3 py-1.5 rounded-2xl flex items-center gap-1.5">
            {isDelivery ? (
              <>
                <Bike className="w-3.5 h-3.5" />
                <span>ONLINE</span>
              </>
            ) : (
              <>
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>TABLE {order.table_number}</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Order Status Hero Card */}
      <Card className="p-6 text-center bg-gradient-to-br from-[#1e1e24] via-[#2a1b2d] to-[#d70f64] text-white rounded-[32px] border-0 shadow-xl relative overflow-hidden">
        <div className="w-16 h-16 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mx-auto mb-3 text-emerald-300 shadow-inner">
          {order.status === 'cooking' || order.status === 'preparing' ? (
            <ChefHat className="w-8 h-8 animate-bounce" />
          ) : order.status === 'ready' || order.status === 'out_for_delivery' ? (
            <Bike className="w-8 h-8 text-amber-300 animate-pulse" />
          ) : order.status === 'delivered' || order.status === 'completed' ? (
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          ) : order.status === 'accepted' ? (
            <CheckCircle2 className="w-8 h-8 text-blue-300 animate-pulse" />
          ) : (
            <Clock className="w-8 h-8 text-amber-400 animate-spin" />
          )}
        </div>

        <h2 className="text-2xl font-black tracking-tight text-white">
          {order.status === 'new' && 'Order Placed & Received!'}
          {order.status === 'accepted' && 'Order Confirmed & Accepted!'}
          {(order.status === 'cooking' || order.status === 'preparing') && 'Chef is Preparing Your Food!'}
          {(order.status === 'ready' || order.status === 'out_for_delivery') && (isDelivery ? 'Out for Delivery!' : 'Order is Ready to Serve!')}
          {(order.status === 'delivered' || order.status === 'completed') && (isDelivery ? 'Delivered! Enjoy Your Food!' : 'Served & Enjoy Your Meal!')}
          {order.status === 'cancelled' && 'Order Cancelled'}
        </h2>

        <p className="text-xs text-pink-100/90 mt-1 font-medium">
          Order #{order.order_number} • Placed at {formatTime(order.created_at)}
        </p>

        {order.restaurant_name && (
          <p className="text-xs font-bold text-white/90 mt-2 bg-white/10 px-3 py-1 rounded-full inline-block backdrop-blur-sm">
            {order.restaurant_name}
          </p>
        )}
      </Card>

      {/* Live Stepper */}
      {order.status !== 'cancelled' && (
        <Card className="p-6 rounded-[28px] shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-5 pb-2 border-b border-slate-100">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#d70f64]" />
              Live Order Progress
            </h3>
            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              <Radio className="w-3 h-3 animate-pulse" />
              Auto-Updating
            </span>
          </div>

          <div className="space-y-4">
            {steps.map((s, idx) => {
              const isPast = idx < currentStep;
              const isCurrent = idx === currentStep;

              return (
                <div key={s.id} className="flex items-start gap-3.5">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs transition-all ${
                        isPast
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : isCurrent
                          ? 'bg-[#d70f64] text-white ring-4 ring-pink-100 animate-pulse'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {isPast ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                    </div>
                    {idx < steps.length - 1 && (
                      <div
                        className={`w-0.5 h-7 mt-1 ${
                          isPast ? 'bg-emerald-400' : 'bg-slate-200'
                        }`}
                      />
                    )}
                  </div>

                  <div>
                    <h4
                      className={`text-sm font-black leading-snug ${
                        isCurrent
                          ? 'text-[#d70f64]'
                          : isPast
                          ? 'text-slate-900'
                          : 'text-slate-400'
                      }`}
                    >
                      {s.label}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">{s.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Restaurant Contact / Help Card */}
      {cleanRestaurantPhone && (
        <Card className="p-4 rounded-[28px] shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-black text-slate-900">Need Help with Your Order?</p>
            <p className="text-[11px] text-slate-500 font-medium">Contact {order.restaurant_name || 'the restaurant'} directly</p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`https://wa.me/${cleanRestaurantPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 text-xs font-black shadow-sm transition-colors"
              title="Chat on WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp</span>
            </a>
            {order.restaurant_phone && (
              <a
                href={`tel:${order.restaurant_phone}`}
                className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 text-xs font-black border border-slate-200 transition-colors"
                title="Call Restaurant"
              >
                <Phone className="w-4 h-4" />
              </a>
            )}
          </div>
        </Card>
      )}

      {/* Delivery Details Card (If Delivery) */}
      {isDelivery && (
        <Card className="p-5 rounded-[28px] shadow-sm border border-slate-200 space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#d70f64]" />
            Delivery & Customer Details
          </h3>

          <div className="text-xs space-y-2 text-slate-700">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Customer:</span>
              <span className="font-bold text-slate-900">{order.customer_name || 'Guest'}</span>
            </div>
            {order.customer_phone && (
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Phone:</span>
                <span className="font-bold text-slate-900">{order.customer_phone}</span>
              </div>
            )}
            {order.delivery_address && (
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Address:</span>
                <span className="font-bold text-slate-900 text-right max-w-[65%]">
                  {order.delivery_address}, {order.delivery_city}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Payment Mode:</span>
              <span className="font-black text-slate-900 uppercase">
                {order.payment_method === 'cod' ? 'Cash on Delivery' : order.payment_method || 'Cash'}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Ordered Items Summary */}
      <Card className="p-5 rounded-[28px] shadow-sm border border-slate-200 space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100 flex items-center gap-1.5">
          <ShoppingBag className="w-3.5 h-3.5 text-[#d70f64]" />
          Order Summary
        </h3>

        <div className="space-y-2.5">
          {order.items?.map((i: any) => (
            <div key={i.id} className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900">
                <span className="text-[#d70f64] font-black mr-1.5">{i.quantity}x</span>
                {i.item_name_snapshot}
                {i.variant_name_snapshot && (
                  <span className="text-slate-500 font-medium ml-1">({i.variant_name_snapshot})</span>
                )}
              </span>
              <span className="font-black text-slate-800">{formatCurrency(i.subtotal, order.currency)}</span>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-slate-100 space-y-1 text-xs">
          <div className="flex justify-between text-slate-500 font-medium">
            <span>Subtotal:</span>
            <span className="font-bold text-slate-800">{formatCurrency(order.subtotal, order.currency)}</span>
          </div>
          {order.delivery_fee !== undefined && order.delivery_fee > 0 && (
            <div className="flex justify-between text-slate-500 font-medium">
              <span>Delivery Fee:</span>
              <span className="font-bold text-slate-800">{formatCurrency(order.delivery_fee, order.currency)}</span>
            </div>
          )}
          {order.tax > 0 && (
            <div className="flex justify-between text-slate-500 font-medium">
              <span>Tax:</span>
              <span className="font-bold text-slate-800">{formatCurrency(order.tax, order.currency)}</span>
            </div>
          )}
          {order.service_charge > 0 && (
            <div className="flex justify-between text-slate-500 font-medium">
              <span>Service Charge:</span>
              <span className="font-bold text-slate-800">{formatCurrency(order.service_charge, order.currency)}</span>
            </div>
          )}
          <div className="pt-2 border-t border-slate-100 flex justify-between font-black text-sm text-slate-900">
            <span>Grand Total:</span>
            <span className="text-[#d70f64]">{formatCurrency(order.total, order.currency)}</span>
          </div>
        </div>
      </Card>

      {/* Prominent View Bill / Invoice & Request Bill Action Buttons */}
      <div className="space-y-2 pt-1">
        <Button
          onClick={() => setShowInvoiceModal(true)}
          className="w-full bg-[#d70f64] hover:bg-[#b50d54] text-white rounded-2xl font-black shadow-md flex items-center justify-center cursor-pointer transition-all active:scale-98"
          size="lg"
        >
          View Bill / Official Receipt
        </Button>

        {/* Request A Bill: 100% Mandatory DINE-IN ONLY (Never shown for Online Orders), Text Only */}
        {isDineIn && (
          <Button
            onClick={handleRequestBill}
            disabled={requestingBill || billRequested}
            variant="outline"
            className={`w-full rounded-2xl font-bold flex items-center justify-center border-2 transition-all cursor-pointer ${
              billRequested
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
            }`}
            size="lg"
          >
            {billRequested ? 'Bill Requested' : 'Request A Bill'}
          </Button>
        )}
      </div>

      {/* Official Bill / Invoice Modal - Viewing Only (NO Print button for customers) */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="bg-white rounded-[28px] max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
            {/* Modal Top Actions - View Only with Close button */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-700 tracking-wider">Official Bill / Invoice</span>
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable Receipt Content */}
            <div className="p-6 space-y-5">
              {/* Restaurant Header */}
              <div className="text-center border-b border-dashed border-slate-200 pb-4">
                {order.restaurant_logo ? (
                  <img
                    src={getImageUrl(order.restaurant_logo)}
                    alt={order.restaurant_name}
                    className="w-14 h-14 rounded-2xl object-contain bg-white mx-auto mb-2 shadow-md border border-slate-100 p-1"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-[#d70f64] text-white flex items-center justify-center font-black text-xl mx-auto mb-2 shadow-md">
                    {order.restaurant_name?.charAt(0) || 'R'}
                  </div>
                )}
                <h3 className="text-lg font-black text-slate-900">{order.restaurant_name}</h3>
                {order.restaurant_address && (
                  <p className="text-xs text-slate-500 mt-0.5">{order.restaurant_address}, {order.restaurant_city}</p>
                )}
                {order.restaurant_phone && (
                  <p className="text-[11px] text-slate-400 mt-0.5">Phone: {order.restaurant_phone}</p>
                )}
                <div className="inline-block mt-2 px-3 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-wider">
                  Customer Receipt / Tax Invoice
                </div>
              </div>

              {/* Order Meta Details */}
              <div className="grid grid-cols-2 gap-2 text-xs py-1 border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Order No</span>
                  <span className="font-black text-slate-900">{order.order_number}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    {isDelivery ? 'Order Type' : 'Table'}
                  </span>
                  <span className="font-black text-slate-900">
                    {isDelivery ? 'Online Delivery' : `Table ${order.table_number}`}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Date</span>
                  <span className="font-semibold text-slate-700">{formatDate(order.created_at)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Time</span>
                  <span className="font-semibold text-slate-700">{formatTime(order.created_at)}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-[11px] font-black text-slate-400 uppercase pb-1 border-b border-slate-100">
                  <span>Item & Qty</span>
                  <span>Amount</span>
                </div>
                {order.items?.map((item: any, idx: number) => (
                  <div key={item.id || idx} className="flex items-start justify-between py-1">
                    <div className="pr-2">
                      <p className="font-bold text-slate-900">
                        <span className="text-[#d70f64] mr-1 font-black">{item.quantity}x</span>
                        {item.item_name_snapshot}
                      </p>
                      {item.variant_name_snapshot && (
                        <p className="text-[10px] text-slate-500 font-medium">Size/Option: {item.variant_name_snapshot}</p>
                      )}
                      <p className="text-[10px] text-slate-400">@{formatCurrency(item.unit_price, order.currency)}</p>
                    </div>
                    <span className="font-black text-slate-900 pt-0.5">
                      {formatCurrency(item.subtotal, order.currency)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals Breakdown */}
              <div className="bg-slate-50 p-4 rounded-2xl space-y-1.5 text-xs border border-slate-100">
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Subtotal:</span>
                  <span className="font-bold text-slate-900">{formatCurrency(order.subtotal, order.currency)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Discount:</span>
                    <span>-{formatCurrency(order.discount, order.currency)}</span>
                  </div>
                )}
                {order.delivery_fee !== undefined && order.delivery_fee > 0 && (
                  <div className="flex justify-between text-slate-600 font-medium">
                    <span>Delivery Fee:</span>
                    <span className="font-bold text-slate-900">{formatCurrency(order.delivery_fee, order.currency)}</span>
                  </div>
                )}
                {order.tax > 0 && (
                  <div className="flex justify-between text-slate-600 font-medium">
                    <span>GST / Tax:</span>
                    <span className="font-bold text-slate-900">{formatCurrency(order.tax, order.currency)}</span>
                  </div>
                )}
                {order.service_charge > 0 && (
                  <div className="flex justify-between text-slate-600 font-medium">
                    <span>Service Charge:</span>
                    <span className="font-bold text-slate-900">{formatCurrency(order.service_charge, order.currency)}</span>
                  </div>
                )}
                <div className="pt-2 border-t-2 border-slate-200 flex justify-between items-baseline text-slate-900">
                  <span className="text-sm font-black uppercase">Grand Total:</span>
                  <span className="text-xl font-black text-[#d70f64]">
                    {formatCurrency(order.total, order.currency)}
                  </span>
                </div>
              </div>

              {/* Receipt Footer */}
              <div className="text-center text-[11px] text-slate-400 space-y-1 pt-2 border-t border-slate-100">
                <p className="font-bold text-slate-600">Thank you for ordering with {order.restaurant_name}!</p>
                <p>Status: <span className="font-black text-slate-700 uppercase">{order.status}</span></p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request A Bill Confirmation Modal (Customer Popup) */}
      {showRequestBillModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm p-4 flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] max-w-sm w-full shadow-2xl p-7 text-center border border-slate-100 relative">
            <button
              onClick={() => setShowRequestBillModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Green Checked Icon */}
            <div className="w-20 h-20 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center mx-auto mb-4 text-emerald-500 shadow-md animate-bounce">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-1.5">
              Thank You
            </h3>

            <p className="text-sm font-semibold text-slate-600 mb-6 leading-relaxed">
              Waiter is getting you bill
            </p>

            <Button
              onClick={() => setShowRequestBillModal(false)}
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md transition-all active:scale-95 cursor-pointer"
            >
              Okay, Got It
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
