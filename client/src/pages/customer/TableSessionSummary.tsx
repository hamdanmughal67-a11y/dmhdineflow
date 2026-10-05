import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useSocket } from '../../context/SocketContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { formatCurrency, formatTime, formatDate, getImageUrl } from '../../lib/utils';
import { ArrowLeft, Receipt, Clock, Calendar, UtensilsCrossed, CheckCircle2, ChevronRight, Phone, AlertTriangle } from 'lucide-react';

export const TableSessionSummary: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { socket, joinSession } = useSocket();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestingBill, setRequestingBill] = useState(false);
  const [billRequested, setBillRequested] = useState(false);
  const [showRequestBillModal, setShowRequestBillModal] = useState(false);

  useEffect(() => {
    if (token) {
      fetchSessionData();
    }
  }, [token, searchParams.get('order_id')]);

  // Live order status updates only — do NOT listen to session:closed here
  // because the /bill endpoint works for both active and closed sessions
  useEffect(() => {
    if (!socket || !data?.session?.id) return;
    joinSession(data.session.id);

    const handleOrderUpdate = () => {
      fetchSessionData();
    };

    socket.on('order:status_updated', handleOrderUpdate);
    socket.on('order:updated', handleOrderUpdate);

    return () => {
      socket.off('order:status_updated', handleOrderUpdate);
      socket.off('order:updated', handleOrderUpdate);
    };
  }, [socket, data?.session?.id]);

  const fetchSessionData = async () => {
    setError(null);
    try {
      // The /bill endpoint is authenticated via x-customer-session header (set by api interceptor).
      // It returns ALL orders for THIS customer's token at this table — active AND completed.
      const orderIdParam = searchParams.get('order_id');
      const billUrl = orderIdParam
        ? `/customer/table/${token}/bill?order_id=${encodeURIComponent(orderIdParam)}`
        : `/customer/table/${token}/bill`;

      const res = await api.get(billUrl);
      if (res.data) {
        setData(res.data);
      } else {
        setError('Could not load your bill. Please try again.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Bill not available. Please ask staff for assistance.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestBill = async () => {
    const targetOrderId = latestOrder?.id || (orders.length > 0 ? orders[0].id : null);
    if (!targetOrderId) return;
    setRequestingBill(true);
    try {
      await api.post(`/customer/orders/${targetOrderId}/request-bill`);
      setBillRequested(true);
      setShowRequestBillModal(true);
    } catch (err) {
      setBillRequested(true);
      setShowRequestBillModal(true);
    } finally {
      setRequestingBill(false);
    }
  };

  // --- LOADING STATE ---
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 p-4 max-w-lg mx-auto space-y-4 animate-pulse">
        <div className="h-12 bg-slate-200 rounded-2xl" />
        <div className="h-64 bg-slate-200 rounded-3xl" />
        <div className="h-48 bg-slate-200 rounded-3xl" />
      </div>
    );
  }

  // --- ERROR STATE (shows instead of endless loading) ---
  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center shadow-xl border border-slate-200">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-100">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">Bill Not Available</h2>
          <p className="text-sm text-slate-600 mb-6">{error || 'Could not load your bill.'}</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={fetchSessionData}
              className="w-full py-3 rounded-2xl bg-[#d70f64] text-white font-black text-sm hover:bg-[#b50d54] transition-all active:scale-95"
            >
              Try Again
            </button>
            <Link
              to={`/m/${token}`}
              className="w-full py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold text-sm text-center border border-slate-200 hover:bg-slate-200 transition-all active:scale-95 block"
            >
              ← Back to Menu
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { restaurant, table, current_orders } = data;
  const restaurantLogoUrl = restaurant.logo ? getImageUrl(restaurant.logo) : '';
  const orders = current_orders || [];

  // Calculate consolidated totals for all active items belonging to this customer
  const allItems: any[] = [];
  let subtotal = 0;
  let tax = 0;
  let serviceCharge = 0;
  let discount = 0;
  let grandTotal = 0;

  orders.forEach((order: any) => {
    subtotal += order.subtotal || 0;
    tax += order.tax || 0;
    serviceCharge += order.service_charge || 0;
    discount += order.discount || 0;
    grandTotal += order.total || 0;

    if (order.items && Array.isArray(order.items)) {
      order.items.forEach((item: any) => {
        allItems.push({
          ...item,
          order_number: order.order_number,
          order_status: order.status,
          order_id: order.id,
        });
      });
    }
  });

  const latestOrder = orders.length > 0 ? orders[orders.length - 1] : null;
  const orderDate = latestOrder?.created_at ? formatDate(latestOrder.created_at) : formatDate(new Date().toISOString());
  const orderTime = latestOrder?.created_at ? formatTime(latestOrder.created_at) : formatTime(new Date().toISOString());

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-20 font-sans max-w-lg mx-auto p-4 sm:p-6 space-y-5 print:p-0 print:bg-white print:max-w-none">
      {/* Top Navigation Bar - Hidden on Print */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          to={`/m/${token}`}
          className="p-2.5 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-sm hover:bg-slate-50 transition-all active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Menu</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase text-[#d70f64] bg-pink-50 border border-pink-200 px-3 py-1.5 rounded-2xl">
            TABLE {table.table_number}
          </span>
        </div>
      </div>

      {/* Main Professional Receipt Card */}
      <div className="bg-white rounded-[28px] border border-slate-200 shadow-xl overflow-hidden print:border-0 print:shadow-none">
        {/* Receipt Header */}
        <div className="p-6 text-center border-b border-dashed border-slate-200 bg-gradient-to-b from-slate-50 to-white">
          {restaurantLogoUrl ? (
            <img
              src={restaurantLogoUrl}
              alt={restaurant.name}
              className="w-16 h-16 rounded-2xl object-contain bg-white mx-auto mb-3 shadow-md border border-slate-100 p-1.5"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-[#d70f64] text-white flex items-center justify-center font-black text-2xl mx-auto mb-3 shadow-md">
              {restaurant.name?.charAt(0) || 'R'}
            </div>
          )}

          <h1 className="text-xl font-black text-slate-900 tracking-tight">{restaurant.name}</h1>
          {restaurant.address && (
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto font-medium">
              {restaurant.address}{restaurant.city ? `, ${restaurant.city}` : ''}
            </p>
          )}
          {restaurant.phone && (
            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center justify-center gap-1 font-semibold">
              <Phone className="w-3 h-3 text-slate-400" />
              <span>{restaurant.phone}</span>
            </p>
          )}

          <div className="inline-block mt-3 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-black uppercase tracking-widest border border-slate-200">
            Customer Bill / Receipt
          </div>
        </div>

        {/* Order Details Meta Bar */}
        <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-100 grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Order Number</span>
            <span className="font-black text-slate-900 text-sm">
              {latestOrder ? latestOrder.order_number : `#${table.table_number}-S`}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Table</span>
            <span className="font-black text-slate-900 text-sm">Table {table.table_number}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Date</span>
            <span className="font-semibold text-slate-700 flex items-center gap-1 mt-0.5">
              <Calendar className="w-3 h-3 text-slate-400" /> {orderDate}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Time</span>
            <span className="font-semibold text-slate-700 flex items-center justify-end gap-1 mt-0.5">
              <Clock className="w-3 h-3 text-slate-400" /> {orderTime}
            </span>
          </div>
        </div>

        {/* Itemized Order List */}
        <div className="p-6">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
            Ordered Items ({allItems.length})
          </h2>

          {allItems.length === 0 ? (
            <div className="text-center py-8 text-slate-400 space-y-2">
              <UtensilsCrossed className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-xs font-bold text-slate-500">No orders found on this bill.</p>
              <p className="text-[11px] text-slate-400">Add dishes from the menu to start your order.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {allItems.map((item: any, idx: number) => (
                <div key={item.id || idx} className="py-3 flex items-start justify-between gap-3 text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-black text-[#d70f64] bg-pink-50 px-1.5 py-0.5 rounded text-[11px]">
                        {item.quantity}x
                      </span>
                      <span className="font-bold text-slate-900 text-sm leading-snug">{item.item_name_snapshot}</span>
                    </div>

                    {item.variant_name_snapshot && (
                      <span className="inline-block text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded mt-1 ml-6">
                        Option: {item.variant_name_snapshot}
                      </span>
                    )}

                    <span className="block text-[11px] text-slate-400 mt-0.5 ml-6">
                      Unit Price: {formatCurrency(item.unit_price, restaurant.currency)}
                    </span>
                  </div>

                  <div className="text-right shrink-0 pt-0.5">
                    <span className="font-black text-slate-900 text-sm">
                      {formatCurrency(item.subtotal, restaurant.currency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Billing Breakdown & Grand Total */}
        {allItems.length > 0 && (
          <div className="px-6 py-5 bg-slate-50 border-t border-dashed border-slate-200 space-y-2.5 text-xs">
            <div className="flex justify-between text-slate-600 font-semibold">
              <span>Item Subtotal:</span>
              <span className="font-bold text-slate-900">{formatCurrency(subtotal, restaurant.currency)}</span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>Discount Applied:</span>
                <span>-{formatCurrency(discount, restaurant.currency)}</span>
              </div>
            )}

            {tax > 0 && (
              <div className="flex justify-between text-slate-600 font-semibold">
                <span>GST / Tax ({restaurant.tax_rate || 0}%):</span>
                <span className="font-bold text-slate-900">{formatCurrency(tax, restaurant.currency)}</span>
              </div>
            )}

            {serviceCharge > 0 && (
              <div className="flex justify-between text-slate-600 font-semibold">
                <span>Service Charge ({restaurant.service_charge_rate || 0}%):</span>
                <span className="font-bold text-slate-900">{formatCurrency(serviceCharge, restaurant.currency)}</span>
              </div>
            )}

            {/* Grand Total */}
            <div className="pt-3 border-t-2 border-slate-300 flex items-baseline justify-between text-slate-900">
              <div>
                <span className="text-sm font-black uppercase tracking-wider block">Grand Total</span>
                <span className="text-[10px] text-slate-400 font-medium">Inclusive of all applicable taxes</span>
              </div>
              <span className="text-2xl font-black text-[#d70f64] tracking-tight">
                {formatCurrency(grandTotal, restaurant.currency)}
              </span>
            </div>
          </div>
        )}

        {/* Receipt Footer */}
        <div className="p-5 text-center bg-white border-t border-slate-100 text-[11px] text-slate-400 space-y-1">
          <p className="font-bold text-slate-600">Thank you for dining at {restaurant.name}!</p>
          <p>Please present this bill at the counter or to your server.</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2.5 print:hidden">
        <Button
          onClick={handleRequestBill}
          disabled={requestingBill || billRequested}
          className={`w-full rounded-2xl font-black text-sm flex items-center justify-center shadow-md transition-all active:scale-98 cursor-pointer ${
            billRequested
              ? 'bg-emerald-600 text-white'
              : 'bg-[#d70f64] hover:bg-[#b50d54] text-white'
          }`}
          size="lg"
        >
          {billRequested ? 'Bill Requested' : 'Request A Bill'}
        </Button>

        {latestOrder && (
          <Link to={`/m/${token}/order/${latestOrder.id}`} className="block">
            <Button
              className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black shadow-md"
              size="lg"
            >
              <span>Track Live Preparation Status</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        )}

        <Link to={`/m/${token}`} className="block">
          <Button
            variant="outline"
            className="w-full rounded-2xl font-black border-slate-300 hover:bg-white bg-white/80"
            size="lg"
          >
            + Add More Dishes to Order
          </Button>
        </Link>
      </div>

      {/* Request A Bill Confirmation Modal (Customer Popup) */}
      {showRequestBillModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm p-4 flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] max-w-sm w-full shadow-2xl p-7 text-center border border-slate-100 relative">
            {/* Green Checked Icon */}
            <div className="w-20 h-20 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center mx-auto mb-4 text-emerald-500 shadow-md">
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
