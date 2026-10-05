import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { formatCurrency, formatTime, formatDate } from '../../lib/utils';
import {
  ShoppingBag,
  ChefHat,
  CheckCircle2,
  Clock,
  Ban,
  User,
  MessageSquare,
  DollarSign,
  CreditCard,
  Wallet,
  Receipt,
  Sparkles,
} from 'lucide-react';

interface OrderDetailModalProps {
  orderId: string;
  onClose: () => void;
  onStatusUpdated?: () => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  orderId,
  onClose,
  onStatusUpdated,
}) => {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Payment Recording State (Manual owner input - NO hardcoded 5000)
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'online' | 'other'>('cash');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const res = await api.get(`/orders/${orderId}`);
      setOrder(res.data);
      if (res.data && !res.data.amount_paid) {
        setAmountPaid(res.data.total?.toString() || '');
      } else if (res.data?.amount_paid) {
        setAmountPaid(res.data.amount_paid.toString());
      }
    } catch (err) {
      console.error('Failed to load order details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    setUpdating(true);
    try {
      await api.patch(`/orders/${orderId}/status`, { status: newStatus });
      fetchOrder();
      if (onStatusUpdated) onStatusUpdated();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update order status.');
    } finally {
      setUpdating(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError('');
    const paidNum = parseFloat(amountPaid);

    if (isNaN(paidNum) || paidNum <= 0) {
      setPaymentError('Please enter the actual amount paid by the customer.');
      return;
    }

    setPaymentSubmitting(true);
    try {
      await api.patch(`/orders/${orderId}/payment`, {
        amount_paid: paidNum,
        payment_method: paymentMethod,
        auto_complete: true,
      });
      setShowPaymentForm(false);
      fetchOrder();
      if (onStatusUpdated) onStatusUpdated();
    } catch (err: any) {
      setPaymentError(err.response?.data?.error || 'Failed to record payment.');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  if (!order && loading) {
    return (
      <Modal isOpen={true} onClose={onClose} size="lg">
        <div className="py-12 text-center text-slate-400">Loading order details...</div>
      </Modal>
    );
  }

  if (!order) return null;

  const isPaid = order.payment_status === 'paid';
  const numPaid = parseFloat(amountPaid) || 0;
  const changeDue = Math.max(0, numPaid - (order.total || 0));

  const isDelivery = order.order_type === 'delivery';

  // Format clean WhatsApp phone number for link
  const cleanPhone = (order.customer_whatsapp || order.customer_phone || '').replace(/[^0-9]/g, '');

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      size="lg"
      title={`Order #${order.order_number}`}
      description={
        isDelivery
          ? `🛵 Online Delivery • Placed at ${formatTime(order.created_at)} (${formatDate(order.created_at)})`
          : `🍽️ Table ${order.table_number || 'N/A'} • Placed at ${formatTime(order.created_at)} (${formatDate(order.created_at)})`
      }
    >
      <div className="space-y-5">
        {/* Status & Payment Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Order Status:</span>
            <Badge status={order.status} />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payment:</span>
            {isPaid ? (
              <span className="px-3 py-1 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-black flex items-center gap-1 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Paid ({formatCurrency(order.amount_paid || order.total)})
              </span>
            ) : (
              <span className="px-3 py-1 rounded-xl bg-amber-100 text-amber-800 text-xs font-black border border-amber-200">
                ⏳ Unpaid / Pending Settle
              </span>
            )}
          </div>
        </div>

        {/* Online Delivery Details Section */}
        {isDelivery && (
          <div className="p-4 rounded-2xl bg-pink-50/70 border border-pink-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-[#d70f64] tracking-wider flex items-center gap-1.5">
                <span>🛵 Customer & Delivery Destination</span>
              </span>

              {cleanPhone && (
                <a
                  href={`https://wa.me/${cleanPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1 shadow-sm transition-colors"
                >
                  <span>💬 WhatsApp Chat</span>
                </a>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
              <div>
                <span className="font-bold text-slate-500">Customer Name: </span>
                <span className="font-black text-slate-900">{order.customer_name || 'Guest'}</span>
              </div>
              <div>
                <span className="font-bold text-slate-500">Contact Number: </span>
                <span className="font-black text-slate-900">{order.customer_phone || 'N/A'}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="font-bold text-slate-500">Street Address: </span>
                <span className="font-black text-slate-900">{order.delivery_address || 'N/A'}, {order.delivery_city}</span>
              </div>
              {order.payment_method && (
                <div>
                  <span className="font-bold text-slate-500">Payment Mode: </span>
                  <span className="font-black text-[#d70f64] uppercase">{order.payment_method}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Customer Info & Note */}
        {(order.customer_note || order.delivery_notes) && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-2.5">
            <MessageSquare className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-amber-900">Customer Special Instructions:</p>
              <p className="text-xs text-amber-800 mt-0.5 font-medium">{order.customer_note || order.delivery_notes}</p>
            </div>
          </div>
        )}

        {/* Order Items Table */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-slate-500">
              <tr>
                <th className="py-2.5 px-4">Dish</th>
                <th className="py-2.5 px-3">Size / Option</th>
                <th className="py-2.5 px-3 text-center">Qty</th>
                <th className="py-2.5 px-3 text-right">Price</th>
                <th className="py-2.5 px-4 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.items?.map((item: any) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-bold text-slate-900">{item.item_name_snapshot}</td>
                  <td className="py-3 px-3 text-slate-600 font-semibold">{item.variant_name_snapshot || 'Standard'}</td>
                  <td className="py-3 px-3 text-center font-black text-slate-900">{item.quantity}</td>
                  <td className="py-3 px-3 text-right text-slate-600 font-semibold">{formatCurrency(item.unit_price)}</td>
                  <td className="py-3 px-4 text-right font-black text-slate-900">{formatCurrency(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pricing Breakdown */}
          <div className="p-4 bg-slate-50/70 border-t border-slate-200 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600 font-medium">
              <span>Subtotal:</span>
              <span className="font-bold">{formatCurrency(order.subtotal)}</span>
            </div>
            {order.delivery_fee !== undefined && order.delivery_fee > 0 && (
              <div className="flex justify-between text-slate-600 font-medium">
                <span>Delivery Fee:</span>
                <span className="font-bold">{formatCurrency(order.delivery_fee)}</span>
              </div>
            )}
            {order.tax > 0 && (
              <div className="flex justify-between text-slate-600 font-medium">
                <span>Tax:</span>
                <span className="font-bold">{formatCurrency(order.tax)}</span>
              </div>
            )}
            {order.service_charge > 0 && (
              <div className="flex justify-between text-slate-600 font-medium">
                <span>Service Charge:</span>
                <span className="font-bold">{formatCurrency(order.service_charge)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
              <span>Total Bill:</span>
              <span className="text-[#d70f64]">{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Manual Payment Entry Form */}
        {showPaymentForm ? (
          <form onSubmit={handleRecordPayment} className="p-4 rounded-2xl bg-pink-50/60 border border-pink-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-pink-200/60">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-[#d70f64]" />
                Record Customer Payment
              </h4>
              <button
                type="button"
                onClick={() => setShowPaymentForm(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            </div>

            {paymentError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700">
                {paymentError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Amount Received from Customer (PKR) *
                </label>
                <Input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder="Enter paid amount..."
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Payment Method *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="block w-full rounded-xl border-slate-200 bg-white text-slate-900 text-sm shadow-sm py-2.5 px-3 focus:border-[#d70f64] focus:ring-2 focus:ring-pink-500/20"
                >
                  <option value="cash">Cash / Cash on Delivery</option>
                  <option value="card">Debit / Credit Card</option>
                  <option value="online">JazzCash / EasyPaisa / Bank IBFT</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {numPaid > order.total && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-black text-emerald-800 flex items-center justify-between">
                <span>Change to Return:</span>
                <span className="text-sm">{formatCurrency(changeDue)}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="success"
              className="w-full bg-[#d70f64] hover:bg-[#b00c52] text-white border-0 font-black shadow-md shadow-pink-500/20"
              size="md"
              isLoading={paymentSubmitting}
            >
              Approve Payment & Settle Order ({formatCurrency(numPaid)})
            </Button>
          </form>
        ) : (
          !isPaid && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-slate-900">Customer Settle & Payment</p>
                <p className="text-xs text-slate-500">Record customer payment manually and approve order</p>
              </div>
              <Button
                variant="success"
                size="sm"
                leftIcon={<DollarSign className="w-4 h-4" />}
                onClick={() => setShowPaymentForm(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
              >
                Record Payment
              </Button>
            </div>
          )
        )}

        {/* Order Status Controls */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl font-bold">
            Close
          </Button>

          <div className="flex flex-wrap gap-2">
            {order.status === 'new' && (
              <Button
                variant="primary"
                size="sm"
                isLoading={updating}
                onClick={() => handleUpdateStatus('accepted')}
                className="bg-[#d70f64] hover:bg-[#b00c52] text-white font-bold rounded-xl"
              >
                Accept Order
              </Button>
            )}

            {order.status === 'accepted' && (
              <Button
                variant="primary"
                size="sm"
                isLoading={updating}
                leftIcon={<ChefHat className="w-4 h-4" />}
                onClick={() => handleUpdateStatus('cooking')}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl"
              >
                {isDelivery ? 'Start Cooking / Packing' : 'Start Cooking'}
              </Button>
            )}

            {order.status === 'cooking' && (
              <Button
                variant="success"
                size="sm"
                isLoading={updating}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
                onClick={() => handleUpdateStatus(isDelivery ? 'out_for_delivery' : 'ready')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl"
              >
                {isDelivery ? '🛵 Out for Delivery' : 'Mark as Ready'}
              </Button>
            )}

            {(order.status === 'ready' || order.status === 'out_for_delivery') && (
              <Button
                variant="success"
                size="sm"
                isLoading={updating}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
                onClick={() => handleUpdateStatus(isDelivery ? 'delivered' : 'completed')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
              >
                {isDelivery ? '✅ Mark as Delivered' : 'Complete Order'}
              </Button>
            )}

            {order.status !== 'completed' && order.status !== 'delivered' && order.status !== 'cancelled' && (
              <Button
                variant="danger"
                size="sm"
                isLoading={updating}
                leftIcon={<Ban className="w-4 h-4" />}
                onClick={() => handleUpdateStatus('cancelled')}
                className="rounded-xl font-bold"
              >
                Cancel Order
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
