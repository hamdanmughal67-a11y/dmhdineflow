import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { AddEditItemModal } from './AddEditItemModal';
import { formatCurrency, getImageUrl } from '../../lib/utils';
import {
  UtensilsCrossed,
  Plus,
  Search,
  Edit,
  Trash2,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react';

export const MenuItemsPage: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  // Add/Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Delete Confirm
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string; name: string }>({
    isOpen: false,
    id: '',
    name: '',
  });

  useEffect(() => {
    if (user?.restaurant_id) {
      fetchCategories();
      fetchItems();
    }
  }, [user, selectedCategory]);

  const fetchCategories = async () => {
    if (!user?.restaurant_id) return;
    try {
      const res = await api.get(`/restaurants/${user.restaurant_id}/categories`);
      setCategories(res.data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const fetchItems = async () => {
    if (!user?.restaurant_id) return;
    setLoading(true);
    try {
      const res = await api.get(`/restaurants/${user.restaurant_id}/menu-items`, {
        params: {
          category_id: selectedCategory !== 'all' ? selectedCategory : undefined,
          search: search || undefined,
        },
      });
      setItems(res.data);
    } catch (err) {
      console.error('Failed to load menu items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAvailability = async (item: any) => {
    try {
      await api.patch(`/menu-items/${item.id}/availability`);
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, available: !i.available } : i))
      );
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to toggle availability.');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/menu-items/${deleteConfirm.id}`);
      setDeleteConfirm({ ...deleteConfirm, isOpen: false });
      fetchItems();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete menu item.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Menu Items & Dishes
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your dishes, upload photos, set Half & Full prices, and toggle live availability.
          </p>
        </div>
        <Button
          leftIcon={<Plus className="w-4 h-4" />}
          size="lg"
          onClick={() => {
            setEditingItem(null);
            setModalOpen(true);
          }}
        >
          Add Menu Dish
        </Button>
      </div>

      {/* Filter Tabs & Search */}
      <Card className="p-4 space-y-3">
        {/* Category Pills */}
        <div className="flex flex-wrap gap-2 pb-2 border-b border-slate-100">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedCategory === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Dishes ({items.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="Search dishes by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
          <Button variant="secondary" onClick={fetchItems}>
            Search
          </Button>
        </div>
      </Card>

      {/* Menu Items Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          [1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-56 bg-slate-200 animate-pulse rounded-3xl" />
          ))
        ) : items.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-200 p-8">
            <UtensilsCrossed className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <h3 className="font-bold text-slate-700 text-base">No dishes found</h3>
            <p className="text-xs text-slate-400 mt-1">Start by adding your first dish with a photo and pricing.</p>
          </div>
        ) : (
          items.map((item) => {
            const hasVariants = item.variants && item.variants.length > 0;
            const imgSrc = item.image ? getImageUrl(item.image) : '';

            return (
              <Card
                key={item.id}
                className={`p-0 overflow-hidden flex flex-col justify-between transition-all rounded-3xl border border-slate-200 hover:shadow-lg ${
                  !item.available ? 'opacity-75 bg-slate-50' : 'bg-white'
                }`}
              >
                <div>
                  {/* Dish Image Header */}
                  <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                    {imgSrc ? (
                      <img
                        src={imgSrc}
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100">
                        <ImageIcon className="w-8 h-8 mb-1 text-slate-300" />
                        <span className="text-[11px] font-semibold text-slate-400">No Photo Uploaded</span>
                      </div>
                    )}

                    {/* Category Badge Floating on Image */}
                    <div className="absolute top-3 left-3">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-white/95 backdrop-blur-md text-indigo-700 shadow-sm border border-white/40">
                        {item.category_name}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div className="absolute top-3 right-3">
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg shadow-sm ${
                          item.available
                            ? 'bg-emerald-500 text-white'
                            : 'bg-rose-500 text-white'
                        }`}
                      >
                        {item.available ? 'Available' : 'Sold Out'}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-extrabold text-slate-900 text-base leading-snug">{item.name}</h3>
                      {!hasVariants && (
                        <div className="text-right shrink-0">
                          {item.original_price && item.original_price > item.base_price ? (
                            <div className="flex flex-col items-end">
                              <span className="text-xs text-slate-400 line-through font-semibold">
                                {formatCurrency(item.original_price)}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-base font-black text-rose-600">
                                  {formatCurrency(item.base_price)}
                                </span>
                                <span className="text-[10px] font-black bg-rose-500 text-white px-1.5 py-0.5 rounded-md">
                                  {Math.round(((item.original_price - item.base_price) / item.original_price) * 100)}% OFF
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-base font-black text-indigo-600 shrink-0">
                              {formatCurrency(item.base_price)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-2">
                      {item.description || 'No description provided.'}
                    </p>

                    {/* Half & Full Options Display */}
                    {hasVariants && (
                      <div className="pt-2 flex flex-wrap gap-2">
                        {item.variants.map((v: any) => {
                          const hasDiscount = v.original_price && v.original_price > v.price;
                          return (
                            <div
                              key={v.id}
                              className="px-2.5 py-1 rounded-xl bg-indigo-50/80 border border-indigo-200/60 text-indigo-900 text-xs font-bold flex items-center gap-1.5"
                            >
                              <span className="text-[10px] uppercase font-extrabold text-indigo-600">{v.name}:</span>
                              {hasDiscount && (
                                <span className="text-[11px] text-slate-400 line-through font-normal">
                                  {formatCurrency(v.original_price)}
                                </span>
                              )}
                              <span className="font-black text-indigo-900">{formatCurrency(v.price)}</span>
                              {hasDiscount && (
                                <span className="text-[9px] font-extrabold bg-rose-500 text-white px-1 py-0.2 rounded">
                                  {Math.round(((v.original_price - v.price) / v.original_price) * 100)}% OFF
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Card Controls */}
                <div className="p-4 pt-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">
                      {item.available ? 'Active' : 'Unavailable'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleAvailability(item)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                        item.available ? 'bg-emerald-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                          item.available ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<Edit className="w-3.5 h-3.5" />}
                      onClick={() => {
                        setEditingItem(item);
                        setModalOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <button
                      onClick={() =>
                        setDeleteConfirm({ isOpen: true, id: item.id, name: item.name })
                      }
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors border border-slate-200"
                      title="Delete dish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Add / Edit Item Modal */}
      {modalOpen && (
        <AddEditItemModal
          isOpen={modalOpen}
          item={editingItem}
          categories={categories}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            fetchItems();
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ ...deleteConfirm, isOpen: false })}
        onConfirm={handleDelete}
        title="Delete Menu Dish"
        message={`Are you sure you want to delete "${deleteConfirm.name}"? Existing historical orders will remain unaffected.`}
        confirmLabel="Delete Dish"
      />
    </div>
  );
};
