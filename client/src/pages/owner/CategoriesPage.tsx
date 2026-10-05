import React, { useEffect, useState, useRef } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { getImageUrl } from '../../lib/utils';
import { Layers, Plus, Edit, Trash2, Image as ImageIcon, RefreshCw, Sparkles } from 'lucide-react';

export const CategoriesPage: React.FC = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add/Edit Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<any | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', sort_order: '1' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [removeImage, setRemoveImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string; name: string }>({
    isOpen: false,
    id: '',
    name: '',
  });

  useEffect(() => {
    if (user?.restaurant_id) {
      fetchCategories();
    }
  }, [user]);

  const fetchCategories = async () => {
    if (!user?.restaurant_id) return;
    try {
      const res = await api.get(`/restaurants/${user.restaurant_id}/categories`);
      setCategories(res.data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingCat(null);
    setFormData({ name: '', description: '', sort_order: (categories.length + 1).toString() });
    setImageFile(null);
    setImagePreview('');
    setRemoveImage(false);
    setError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (cat: any) => {
    setEditingCat(cat);
    setFormData({
      name: cat.name,
      description: cat.description || '',
      sort_order: cat.sort_order?.toString() || '1',
    });
    setImageFile(null);
    setImagePreview(cat.image ? getImageUrl(cat.image) : '');
    setRemoveImage(false);
    setError('');
    setModalOpen(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setRemoveImage(false);
      setImagePreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview('');
    setRemoveImage(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.restaurant_id) return;
    setError('');

    // Category Image is Mandatory
    if (!editingCat && !imageFile) {
      setError('Category image is mandatory. Please upload a clear photo.');
      return;
    }

    if (editingCat && !imagePreview && !imageFile) {
      setError('Category image is mandatory. Please upload a category photo.');
      return;
    }

    setSubmitting(true);

    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('description', formData.description);
      data.append('sort_order', formData.sort_order);
      if (imageFile) {
        data.append('image', imageFile);
      }
      if (removeImage && !imageFile) {
        data.append('remove_image', 'true');
      }

      if (editingCat) {
        await api.patch(`/categories/${editingCat.id}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post(`/restaurants/${user.restaurant_id}/categories`, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      setModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save category.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/categories/${deleteConfirm.id}`);
      setDeleteConfirm({ ...deleteConfirm, isOpen: false });
      fetchCategories();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete category.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Menu Categories
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Organize dishes into visual categories with mandatory high-definition food covers.
          </p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={handleOpenAdd}>
          Add Category
        </Button>
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map((i) => <div key={i} className="h-44 bg-slate-200 animate-pulse rounded-3xl" />)
        ) : categories.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200 p-8">
            <Layers className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <h3 className="font-bold text-slate-700 text-base">No categories created yet</h3>
            <p className="text-xs text-slate-400 mt-1">Click "Add Category" to create your first visual category.</p>
          </div>
        ) : (
          categories.map((cat) => (
            <Card key={cat.id} className="p-0 overflow-hidden flex flex-col justify-between group rounded-3xl border-slate-200" hoverEffect>
              <div className="relative h-36 w-full bg-slate-100 overflow-hidden">
                {cat.image ? (
                  <img
                    src={getImageUrl(cat.image)}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-indigo-50 text-indigo-400">
                    <Layers className="w-10 h-10 mb-1" />
                    <span className="text-[11px] font-bold">Category</span>
                  </div>
                )}

                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-black bg-white/95 backdrop-blur-md text-slate-800 shadow-sm border border-slate-100">
                    {cat.item_count || 0} items
                  </span>
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg group-hover:text-indigo-600 transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {cat.description || 'No description added'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400">
                    Order: #{cat.sort_order || 0}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(cat)}
                      className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      title="Edit Category"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm({ isOpen: true, id: cat.id, name: cat.name })}
                      className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete Category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Add / Edit Category Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCat ? 'Edit Category' : 'Add New Category'}
        description="Categories group your dishes on the digital QR menu with visual imagery"
      >
        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category Image Upload (Mandatory) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Category Image (Mandatory) *
            </label>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
            />

            {imagePreview ? (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm group h-40">
                <img
                  src={imagePreview}
                  alt="Category preview"
                  className="w-full h-full object-cover"
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
                    Remove
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
                <p className="font-bold text-slate-900 text-xs">Click to upload category cover photo *</p>
                <p className="text-[11px] text-slate-500 mt-0.5">High-quality PNG, JPG, or WebP</p>
              </div>
            )}
          </div>

          <Input
            label="Category Name *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Karahi, Fast Food, BBQ, Beverages, Desserts"
            required
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description for customer menu..."
              className="block w-full rounded-xl border-slate-200 bg-white text-slate-900 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 p-3"
            />
          </div>

          <Input
            label="Sort Order"
            type="number"
            value={formData.sort_order}
            onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
            placeholder="1, 2, 3..."
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              {editingCat ? 'Save Changes' : 'Create Category'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ ...deleteConfirm, isOpen: false })}
        onConfirm={handleDelete}
        title="Delete Category"
        message={`Are you sure you want to delete "${deleteConfirm.name}"? Only empty categories without menu items can be deleted.`}
        confirmLabel="Delete Category"
      />
    </div>
  );
};
