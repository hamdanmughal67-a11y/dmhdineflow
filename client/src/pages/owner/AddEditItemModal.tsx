import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { getImageUrl } from '../../lib/utils';
import {
  Upload,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  RefreshCw,
  Plus,
  Layers,
  Sparkles,
  Tag,
} from 'lucide-react';

interface VariantOption {
  id?: string;
  name: string;
  original_price?: string;
  price: string;
}

interface AddEditItemModalProps {
  isOpen: boolean;
  item?: any;
  categories: any[];
  onClose: () => void;
  onSaved: () => void;
}

export const AddEditItemModal: React.FC<AddEditItemModalProps> = ({
  isOpen,
  item,
  categories,
  onClose,
  onSaved,
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sortOrder, setSortOrder] = useState('1');

  // Pricing Mode: 'single' | 'variants'
  const [pricingMode, setPricingMode] = useState<'single' | 'variants'>('single');
  const [originalPrice, setOriginalPrice] = useState('');
  const [standardPrice, setStandardPrice] = useState('');
  const [variantsList, setVariantsList] = useState<VariantOption[]>([]);

  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [deleteImage, setDeleteImage] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (item) {
      setName(item.name || '');
      setDescription(item.description || '');
      setCategoryId(item.category_id || (categories[0]?.id || ''));
      setSortOrder(item.sort_order?.toString() || '1');
      setOriginalPrice(item.original_price?.toString() || '');
      setStandardPrice(item.base_price?.toString() || '');

      const existingVariants = item.variants || [];
      if (existingVariants.length > 0) {
        setPricingMode('variants');
        setVariantsList(
          existingVariants.map((v: any) => ({
            id: v.id,
            name: v.name,
            original_price: v.original_price?.toString() || '',
            price: v.price?.toString() || '',
          }))
        );
      } else {
        setPricingMode('single');
        setVariantsList([]);
      }

      if (item.image) {
        setImagePreview(getImageUrl(item.image));
      } else {
        setImagePreview('');
      }
    } else {
      setName('');
      setDescription('');
      setCategoryId(categories[0]?.id || '');
      setSortOrder('1');
      setPricingMode('single');
      setOriginalPrice('');
      setStandardPrice('');
      setVariantsList([]);
      setImagePreview('');
    }
    setImageFile(null);
    setDeleteImage(false);
    setError('');
  }, [item, categories, isOpen]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setDeleteImage(false);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview('');
    setDeleteImage(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Preset Handlers
  const applyPreset = (options: string[]) => {
    setPricingMode('variants');
    setVariantsList(options.map((optName) => ({ name: optName, original_price: '', price: '' })));
  };

  const handleAddVariant = () => {
    setPricingMode('variants');
    setVariantsList([...variantsList, { name: '', original_price: '', price: '' }]);
  };

  const handleUpdateVariant = (index: number, field: 'name' | 'price' | 'original_price', value: string) => {
    const updated = [...variantsList];
    updated[index][field] = value;
    setVariantsList(updated);
  };

  const handleRemoveVariant = (index: number) => {
    const updated = variantsList.filter((_, i) => i !== index);
    setVariantsList(updated);
    if (updated.length === 0) {
      setPricingMode('single');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.restaurant_id) return;
    setError('');

    if (!name.trim()) {
      setError('Dish name is required.');
      return;
    }

    if (!categoryId) {
      setError('Please select a category.');
      return;
    }

    let computedBasePrice = 0;
    let computedOriginalPrice: number | undefined = undefined;
    const finalVariants: any[] = [];

    if (pricingMode === 'single') {
      if (!standardPrice || isNaN(parseFloat(standardPrice)) || parseFloat(standardPrice) <= 0) {
        setError('Please enter a valid selling/offer price for this dish.');
        return;
      }
      computedBasePrice = parseFloat(standardPrice);
      if (originalPrice && !isNaN(parseFloat(originalPrice)) && parseFloat(originalPrice) > 0) {
        computedOriginalPrice = parseFloat(originalPrice);
      }
    } else {
      if (variantsList.length === 0) {
        setError('Please add at least one size or serving option, or switch to Single Price.');
        return;
      }

      for (let i = 0; i < variantsList.length; i++) {
        const v = variantsList[i];
        if (!v.name.trim() || !v.price || isNaN(parseFloat(v.price)) || parseFloat(v.price) <= 0) {
          setError(`Please enter a valid name and price for option #${i + 1}.`);
          return;
        }
        finalVariants.push({
          name: v.name.trim(),
          original_price: v.original_price && !isNaN(parseFloat(v.original_price)) ? parseFloat(v.original_price) : undefined,
          price: parseFloat(v.price),
        });
      }

      // Base price is the minimum variant price
      computedBasePrice = Math.min(...finalVariants.map((v) => v.price));
      const variantsWithOriginal = finalVariants.filter((v) => v.original_price && v.original_price > 0);
      if (variantsWithOriginal.length > 0) {
        computedOriginalPrice = Math.min(...variantsWithOriginal.map((v) => v.original_price));
      }
    }

    setSubmitting(true);

    try {
      const data = new FormData();
      data.append('name', name.trim());
      data.append('description', description.trim());
      data.append('category_id', categoryId);
      data.append('sort_order', sortOrder);
      data.append('base_price', computedBasePrice.toString());
      if (computedOriginalPrice) {
        data.append('original_price', computedOriginalPrice.toString());
      } else {
        data.append('original_price', '');
      }
      data.append('variants', JSON.stringify(finalVariants));

      if (imageFile) {
        data.append('image', imageFile);
      } else if (deleteImage) {
        data.append('delete_image', 'true');
      }

      if (item) {
        await api.patch(`/menu-items/${item.id}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post(`/restaurants/${user.restaurant_id}/menu-items`, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      onSaved();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save menu item.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={item ? 'Edit Menu Dish' : 'Add New Menu Dish'}
      description="Add dish photos, details, and configure flexible serving sizes or single pricing."
    >
      {error && (
        <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 1. Dish Image Upload & Preview Section */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Dish Photo (Image)
          </label>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/png, image/jpeg, image/webp"
            className="hidden"
          />

          {imagePreview ? (
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm group">
              <img
                src={imagePreview}
                alt="Dish preview"
                className="w-full h-44 object-cover"
              />
              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Replace Image
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                  onClick={handleRemoveImage}
                >
                  Delete Image
                </Button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/30 rounded-2xl p-5 text-center cursor-pointer transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2 border border-indigo-100 shadow-xs">
                <ImageIcon className="w-5 h-5" />
              </div>
              <p className="font-bold text-slate-900 text-xs">Click to upload dish photo</p>
              <p className="text-[11px] text-slate-500 mt-0.5">High-quality PNG, JPG, or WebP</p>
            </div>
          )}
        </div>

        {/* 2. Basic Dish Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Input
              label="Dish Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Chicken Karahi, Zinger Burger, Fajita Pizza, Cold Drink"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Category *
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="block w-full rounded-xl border-slate-200 bg-white text-slate-900 text-sm shadow-sm py-2.5 px-3.5 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              required
            >
              <option value="" disabled>Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Input
              label="Menu Display Order"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              placeholder="1"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Freshly prepared with aromatic spices, fresh tomatoes, and green chillies..."
              className="block w-full rounded-xl border-slate-200 bg-white text-slate-900 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 p-3"
            />
          </div>
        </div>

        {/* 3. Flexible Pricing & Sizes Setup */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-600" />
                Dish Pricing & Serving Sizes
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Select single price or configure dish-specific options (e.g. Pizza sizes, Karahi weights, Drink sizes)
              </p>
            </div>

            {/* Mode Toggle Buttons */}
            <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-xs shrink-0">
              <button
                type="button"
                onClick={() => {
                  setPricingMode('single');
                  setVariantsList([]);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  pricingMode === 'single'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Single Price
              </button>
              <button
                type="button"
                onClick={() => {
                  setPricingMode('variants');
                  if (variantsList.length === 0) {
                    setVariantsList([
                      { name: 'Regular', price: standardPrice || '' },
                      { name: 'Large', price: '' },
                    ]);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  pricingMode === 'variants'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Multiple Sizes / Options
              </button>
            </div>
          </div>

          {pricingMode === 'single' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Original / Sell Price (PKR)
                    <span className="text-slate-400 font-normal ml-1">(Regular Price)</span>
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 1500"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-700"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Leave empty if not discounted.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1.5">
                    Discount / Final Price (PKR) *
                    <span className="text-indigo-600 font-bold ml-1">(Customer Pays)</span>
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 1200"
                    value={standardPrice}
                    onChange={(e) => setStandardPrice(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm font-black rounded-xl border border-indigo-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-indigo-700 bg-indigo-50/20"
                    required
                  />
                  <p className="text-[11px] text-slate-500 mt-1">The actual amount charged to customer.</p>
                </div>
              </div>

              {/* Dynamic Live FOMO Savings Preview */}
              {parseFloat(originalPrice) > parseFloat(standardPrice) && parseFloat(standardPrice) > 0 && (
                <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black bg-rose-500 text-white uppercase tracking-wider animate-pulse">
                      {Math.round(((parseFloat(originalPrice) - parseFloat(standardPrice)) / parseFloat(originalPrice)) * 100)}% OFF
                    </span>
                    <span className="text-xs font-bold text-emerald-800">
                      Customer Saves Rs. {(parseFloat(originalPrice) - parseFloat(standardPrice)).toLocaleString()}
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-700 font-medium bg-emerald-100/60 px-2 py-0.5 rounded-md">
                    FOMO Deal Active 🔥
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Quick Presets Bar */}
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Quick Size Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyPreset(['Small', 'Regular', 'Large'])}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:border-indigo-400 hover:text-indigo-600 transition-all shadow-2xs"
                  >
                    🍕 Small / Regular / Large
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset(['Quarter', 'Half', 'Full'])}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:border-indigo-400 hover:text-indigo-600 transition-all shadow-2xs"
                  >
                    🍗 Quarter / Half / Full
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset(['Single', 'Double'])}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:border-indigo-400 hover:text-indigo-600 transition-all shadow-2xs"
                  >
                    🍔 Single / Double
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset(['Regular', 'Large'])}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:border-indigo-400 hover:text-indigo-600 transition-all shadow-2xs"
                  >
                    🥤 Regular / Large
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset(['500ml', '1.5 Litre'])}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:border-indigo-400 hover:text-indigo-600 transition-all shadow-2xs"
                  >
                    🍾 500ml / 1.5L
                  </button>
                </div>
              </div>

              {/* Dynamic Option Rows */}
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-12 gap-2 px-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <div className="col-span-5">Size / Option Name</div>
                  <div className="col-span-3">Original Price (Rs.)</div>
                  <div className="col-span-3">Offer Price (Rs.) *</div>
                  <div className="col-span-1"></div>
                </div>

                {variantsList.map((variant, index) => {
                  const origP = parseFloat(variant.original_price || '0');
                  const finalP = parseFloat(variant.price || '0');
                  const hasDiscount = origP > finalP && finalP > 0;
                  const discountPct = hasDiscount ? Math.round(((origP - finalP) / origP) * 100) : 0;

                  return (
                    <div key={index} className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-5">
                          <input
                            type="text"
                            placeholder="Option Name (e.g. Half / Large)"
                            value={variant.name}
                            onChange={(e) => handleUpdateVariant(index, 'name', e.target.value)}
                            className="w-full px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                            required
                          />
                        </div>
                        <div className="col-span-3">
                          <input
                            type="number"
                            placeholder="Regular Rs."
                            value={variant.original_price || ''}
                            onChange={(e) => handleUpdateVariant(index, 'original_price', e.target.value)}
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 text-slate-500"
                          />
                        </div>
                        <div className="col-span-3">
                          <input
                            type="number"
                            placeholder="Offer Rs. *"
                            value={variant.price}
                            onChange={(e) => handleUpdateVariant(index, 'price', e.target.value)}
                            className="w-full px-3 py-1.5 text-xs font-black rounded-lg border border-indigo-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 text-indigo-700 bg-indigo-50/20"
                            required
                          />
                        </div>
                        <div className="col-span-1 flex justify-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(index)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Remove option"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {hasDiscount && (
                        <div className="flex items-center gap-2 pl-1 text-[11px] font-medium text-emerald-700">
                          <span className="bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded font-bold">{discountPct}% OFF</span>
                          <span>Save Rs. {(origP - finalP).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={handleAddVariant}
                className="w-full border-dashed border-slate-300 hover:border-indigo-500"
              >
                Add Custom Serving / Size Option
              </Button>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={submitting} size="lg">
            {item ? 'Save Changes' : 'Create Dish'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
