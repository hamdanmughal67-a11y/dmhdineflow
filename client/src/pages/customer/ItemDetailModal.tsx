import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { formatCurrency, getImageUrl } from '../../lib/utils';
import { Plus, Minus, CheckCircle2, UtensilsCrossed, Sparkles } from 'lucide-react';

interface ItemDetailModalProps {
  item: any;
  currency: string;
  onClose: () => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  item,
  currency,
  onClose,
}) => {
  const { addItem } = useCart();
  const [selectedVariant, setSelectedVariant] = useState<any | null>(
    item.variants && item.variants.length > 0 ? item.variants[0] : null
  );
  const [quantity, setQuantity] = useState(1);

  const currentPrice = selectedVariant ? selectedVariant.price : item.base_price;
  const originalPrice = selectedVariant?.original_price || item.original_price;
  const hasDiscount = originalPrice && originalPrice > currentPrice;
  const discountPct = hasDiscount ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0;
  const totalPrice = currentPrice * quantity;
  const totalOriginalPrice = originalPrice ? originalPrice * quantity : null;
  const imgSrc = item.image ? getImageUrl(item.image) : '';

  const handleAddToCart = () => {
    addItem({
      menu_item_id: item.id,
      name: item.name,
      variant_id: selectedVariant?.id,
      variant_name: selectedVariant?.name,
      unit_price: currentPrice,
      quantity,
    });
    onClose();
  };

  return (
    <Modal isOpen={true} onClose={onClose} size="sm">
      <div className="space-y-4">
        {/* Large Dish Photo Banner if available */}
        {imgSrc && (
          <div className="relative -mx-6 -mt-6 h-52 rounded-t-3xl overflow-hidden bg-slate-100 shadow-inner">
            <img
              src={imgSrc}
              alt={item.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            {hasDiscount && (
              <div className="absolute top-3 left-3">
                <span className="px-3 py-1 rounded-xl bg-[#d70f64] text-white font-black text-xs uppercase shadow-md animate-pulse">
                  {discountPct}% OFF
                </span>
              </div>
            )}
          </div>
        )}

        <div className="pt-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">{item.name}</h3>
            {hasDiscount && !imgSrc && (
              <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 font-black text-xs uppercase">
                {discountPct}% OFF
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            {item.description || 'Prepared fresh with premium ingredients and authentic spices.'}
          </p>
        </div>

        {/* Flexible Size / Serving Option Selector */}
        {item.variants && item.variants.length > 0 && (
          <div className="space-y-2 pt-1">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
              Select Size & Serving:
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {item.variants.map((v: any) => {
                const isSelected = selectedVariant?.id === v.id || selectedVariant?.name === v.name;
                const vHasDiscount = v.original_price && v.original_price > v.price;
                return (
                  <button
                    key={v.id || v.name}
                    type="button"
                    onClick={() => setSelectedVariant(v)}
                    className={`p-3.5 rounded-2xl border text-left transition-all relative ${
                      isSelected
                        ? 'border-[#d70f64] bg-pink-50/70 text-slate-900 ring-2 ring-[#d70f64]/30 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm">{v.name}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-[#d70f64]" />}
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="font-black text-base text-[#d70f64]">
                        {formatCurrency(v.price, currency)}
                      </span>
                      {vHasDiscount && (
                        <span className="text-xs text-slate-400 line-through">
                          {formatCurrency(v.original_price, currency)}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Quantity Adjuster */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-100 border border-slate-200">
          <div>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Number of Dishes:</span>
            {hasDiscount && (
              <span className="text-[11px] font-bold text-emerald-700">
                You save {formatCurrency((originalPrice - currentPrice) * quantity, currency)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center font-bold text-slate-800 active:scale-95 border border-slate-200 hover:bg-slate-50"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="font-black text-base w-6 text-center text-slate-900">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center font-bold text-slate-800 active:scale-95 border border-slate-200 hover:bg-slate-50"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Add to Order CTA */}
        <button
          onClick={handleAddToCart}
          className="w-full py-3.5 rounded-2xl bg-[#d70f64] hover:bg-[#c20d5a] active:scale-95 text-white font-black text-sm shadow-xl shadow-[#d70f64]/30 flex items-center justify-center gap-2 transition-all"
        >
          <span>Add to Order</span>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <span>{formatCurrency(totalPrice, currency)}</span>
            {hasDiscount && totalOriginalPrice && (
              <span className="line-through text-pink-200 text-xs font-normal">
                {formatCurrency(totalOriginalPrice, currency)}
              </span>
            )}
          </div>
        </button>
      </div>
    </Modal>
  );
};
