import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { formatCurrency } from '../../lib/utils';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  X,
  Sparkles,
  MessageSquare,
  User,
  Phone,
  MapPin,
  Building,
  CreditCard,
  DollarSign,
  Bike,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface CartDrawerProps {
  isOpen: boolean;
  restaurant: any;
  table?: any;
  sessionId?: string;
  qrToken?: string;
  orderMode?: 'table' | 'online';
  onClose: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  restaurant,
  table,
  sessionId,
  qrToken,
  orderMode = 'table',
  onClose,
}) => {
  const navigate = useNavigate();
  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
    subtotal,
    customerName,
    setCustomerName,
    customerNote,
    setCustomerNote,
  } = useCart();

  // Online delivery fields
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryCity, setDeliveryCity] = useState(restaurant?.city || 'Karachi');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bank_transfer' | 'easypaisa' | 'jazzcash'>('cod');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const isOnline = orderMode === 'online' || !table;
  const deliveryFee = isOnline ? (restaurant?.delivery_fee || 0) : 0;
  const tax = Math.round((subtotal * (restaurant?.tax_rate || 0)) / 100);
  const serviceCharge = Math.round((subtotal * (restaurant?.service_charge_rate || 0)) / 100);
  const grandTotal = subtotal + deliveryFee + tax + serviceCharge;

  const handlePlaceOrder = async () => {
    if (items.length === 0) return;
    setError('');

    if (isOnline) {
      if (!customerName.trim()) {
        setError('Please enter your full name.');
        return;
      }
      if (!phone.trim()) {
        setError('Please enter your mobile/phone number.');
        return;
      }
      if (!deliveryAddress.trim()) {
        setError('Please enter your complete delivery street address.');
        return;
      }
      if (restaurant?.min_order_amount && subtotal < restaurant.min_order_amount) {
        setError(`Minimum order amount is ${formatCurrency(restaurant.min_order_amount, restaurant.currency)}.`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (isOnline) {
        const payload = {
          restaurant_id: restaurant.id,
          order_type: 'delivery',
          customer_name: customerName.trim(),
          customer_phone: phone.trim(),
          customer_whatsapp: whatsapp.trim() || phone.trim(),
          delivery_address: deliveryAddress.trim(),
          delivery_city: deliveryCity.trim(),
          delivery_notes: customerNote.trim() || undefined,
          payment_method: paymentMethod,
          items: items.map((i) => ({
            menu_item_id: i.menu_item_id,
            variant_id: i.variant_id,
            quantity: i.quantity,
          })),
        };

        const res = await api.post('/customer/orders/online', payload);

        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.6 },
        });

        clearCart();
        onClose();
        navigate(`/track/${res.data.id}`);
      } else {
        const orderPayload = {
          restaurant_id: restaurant.id,
          table_id: table.id,
          session_id: sessionId,
          customer_name: customerName || undefined,
          customer_note: customerNote || undefined,
          items: items.map((i) => ({
            menu_item_id: i.menu_item_id,
            variant_id: i.variant_id,
            quantity: i.quantity,
          })),
        };

        const res = await api.post('/orders', orderPayload);

        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });

        clearCart();
        onClose();
        navigate(`/m/${qrToken}/order/${res.data.id}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-Up Bottom Sheet */}
      <div className="fixed inset-x-0 bottom-0 max-w-lg mx-auto bg-white rounded-t-[36px] shadow-2xl p-6 flex flex-col max-h-[90vh] z-10 border-t border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              {isOnline ? (
                <>
                  <Bike className="w-5 h-5 text-[#d70f64]" />
                  <span>Your Delivery Order</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-5 h-5 text-[#d70f64]" />
                  <span>Your Table Cart</span>
                </>
              )}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              {isOnline ? (
                <>🛵 Online Delivery • {restaurant?.name}</>
              ) : (
                <>Table {table?.table_number} • {restaurant?.name}</>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="my-3 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3 divide-y divide-slate-100">
          {items.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">Your cart is empty</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="pt-3 first:pt-0 flex items-center justify-between gap-3">
                <div className="flex-1">
                  <h4 className="font-bold text-slate-900 text-sm leading-snug">{item.name}</h4>
                  {item.variant_name && (
                    <span className="text-[11px] font-bold text-[#d70f64] bg-pink-50 px-2 py-0.5 rounded-md">
                      {item.variant_name}
                    </span>
                  )}
                  <p className="text-xs font-black text-slate-700 mt-1">
                    {formatCurrency(item.unit_price * item.quantity, restaurant?.currency)}
                  </p>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-2 bg-slate-100 rounded-xl p-1 border border-slate-200">
                  <button
                    onClick={() => updateQuantity(item.id, -1)}
                    className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-700 active:scale-95 transition-transform"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-5 text-center font-black text-xs text-slate-900">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, 1)}
                    className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-700 active:scale-95 transition-transform"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Online Delivery Information & Payment Selection */}
        {isOnline ? (
          <div className="py-3 border-t border-slate-100 space-y-2.5 max-h-56 overflow-y-auto pr-1">
            <div className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#d70f64]" />
              Delivery Details
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Full Name *"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                leftIcon={<User className="w-4 h-4 text-slate-400" />}
                className="text-xs"
              />
              <Input
                placeholder="Mobile / Phone *"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                leftIcon={<Phone className="w-4 h-4 text-slate-400" />}
                className="text-xs"
              />
            </div>
            <Input
              placeholder="WhatsApp Number (for live updates)"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              leftIcon={<Phone className="w-4 h-4 text-emerald-500" />}
              className="text-xs"
            />
            <Input
              placeholder="Complete Street Address (House/Flat, Street, Area) *"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              leftIcon={<MapPin className="w-4 h-4 text-slate-400" />}
              className="text-xs"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="City *"
                value={deliveryCity}
                onChange={(e) => setDeliveryCity(e.target.value)}
                leftIcon={<Building className="w-4 h-4 text-slate-400" />}
                className="text-xs"
              />
              <Input
                placeholder="Notes / Rider instructions"
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                leftIcon={<MessageSquare className="w-4 h-4 text-slate-400" />}
                className="text-xs"
              />
            </div>

            {/* Payment Method Selector */}
            <div className="pt-2">
              <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5 block">
                Payment Method
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cod')}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                    paymentMethod === 'cod'
                      ? 'border-[#d70f64] bg-pink-50/60 ring-2 ring-[#d70f64]/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <DollarSign className={`w-4 h-4 ${paymentMethod === 'cod' ? 'text-[#d70f64]' : 'text-slate-500'}`} />
                  <div>
                    <p className="text-xs font-black text-slate-900">Cash on Delivery</p>
                    <p className="text-[10px] text-slate-500 font-medium">Pay at your doorstep</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('bank_transfer')}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                    paymentMethod === 'bank_transfer'
                      ? 'border-[#d70f64] bg-pink-50/60 ring-2 ring-[#d70f64]/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <CreditCard className={`w-4 h-4 ${paymentMethod === 'bank_transfer' ? 'text-[#d70f64]' : 'text-slate-500'}`} />
                  <div>
                    <p className="text-xs font-black text-slate-900">Bank / Wallet</p>
                    <p className="text-[10px] text-slate-500 font-medium">Online Transfer / IBFT</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Table Customer Information (Optional) */
          <div className="py-3 border-t border-slate-100 space-y-2.5 shrink-0">
            <Input
              placeholder="Your Name (Optional)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              leftIcon={<User className="w-4 h-4" />}
            />
            <Input
              placeholder="Special instructions (e.g. less spicy)..."
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              leftIcon={<MessageSquare className="w-4 h-4" />}
            />
          </div>
        )}

        {/* Totals & Submit Button */}
        <div className="pt-3 border-t border-slate-100 space-y-2 shrink-0">
          <div className="flex justify-between text-xs text-slate-500 font-medium">
            <span>Subtotal:</span>
            <span className="font-bold text-slate-800">{formatCurrency(subtotal, restaurant?.currency)}</span>
          </div>

          {isOnline && (
            <div className="flex justify-between text-xs text-slate-500 font-medium">
              <span>Delivery Fee:</span>
              <span className="font-bold text-slate-800">
                {deliveryFee === 0 ? (
                  <span className="text-emerald-600 font-black">FREE</span>
                ) : (
                  formatCurrency(deliveryFee, restaurant?.currency)
                )}
              </span>
            </div>
          )}

          {tax > 0 && (
            <div className="flex justify-between text-xs text-slate-500 font-medium">
              <span>Tax ({restaurant?.tax_rate}%):</span>
              <span className="font-bold text-slate-800">{formatCurrency(tax, restaurant?.currency)}</span>
            </div>
          )}
          {serviceCharge > 0 && (
            <div className="flex justify-between text-xs text-slate-500 font-medium">
              <span>Service Charge:</span>
              <span className="font-bold text-slate-800">{formatCurrency(serviceCharge, restaurant?.currency)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-black text-slate-900 pt-1 border-t border-slate-100">
            <span>Grand Total:</span>
            <span className="text-[#d70f64]">{formatCurrency(grandTotal, restaurant?.currency)}</span>
          </div>

          <Button
            onClick={handlePlaceOrder}
            disabled={items.length === 0 || isSubmitting}
            className="w-full mt-2 bg-[#d70f64] hover:bg-[#b00c52] text-white shadow-lg shadow-pink-500/20 font-black"
            size="lg"
            isLoading={isSubmitting}
            leftIcon={<Sparkles className="w-4 h-4" />}
          >
            {isOnline ? 'Confirm & Place Delivery Order' : 'Confirm & Place Order'}
          </Button>
        </div>
      </div>
    </div>
  );
};
