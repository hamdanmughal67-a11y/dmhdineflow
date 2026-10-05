import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { DateRangeFilter } from '../../components/ui/DateRangeFilter';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { formatDate, getImageUrl } from '../../lib/utils';
import {
  Store,
  Plus,
  Search,
  MoreVertical,
  ExternalLink,
  Ban,
  CheckCircle2,
  Trash2,
  Edit,
  Eye,
  ShieldAlert,
  AlertTriangle,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const RestaurantsPage: React.FC = () => {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [subscriptionFilter, setSubscriptionFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'suspend' | 'activate' | 'delete';
    restaurantId: string;
    restaurantName: string;
  }>({
    isOpen: false,
    type: 'suspend',
    restaurantId: '',
    restaurantName: '',
  });
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  useEffect(() => {
    fetchRestaurants();
  }, [statusFilter, subscriptionFilter, fromDate, toDate]);

  const fetchRestaurants = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/restaurants', {
        params: {
          search: search || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          subscription: subscriptionFilter !== 'all' ? subscriptionFilter : undefined,
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
        },
      });
      setRestaurants(res.data);
    } catch (err) {
      console.error('Failed to load restaurants:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRestaurants();
  };

  const handleStatusChange = async () => {
    const { type, restaurantId } = confirmModal;
    try {
      if (type === 'delete') {
        await api.delete(`/admin/restaurants/${restaurantId}`);
      } else {
        const newStatus = type === 'suspend' ? 'suspended' : 'active';
        await api.patch(`/admin/restaurants/${restaurantId}/status`, { status: newStatus });
      }
      setConfirmModal({ ...confirmModal, isOpen: false });
      fetchRestaurants();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update restaurant status.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Restaurants Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage all tenant restaurants, owner accounts, and software access privileges.
          </p>
        </div>
        <Link to="/admin/restaurants/new">
          <Button leftIcon={<Plus className="w-4 h-4" />}>Create Restaurant</Button>
        </Link>
      </div>

      {/* Search & Date Filters */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <DateRangeFilter
            fromDate={fromDate}
            toDate={toDate}
            onChange={(from, to) => {
              setFromDate(from);
              setToDate(to);
            }}
          />

          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 px-3.5 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="inactive">Inactive</option>
            </select>

            <select
              value={subscriptionFilter}
              onChange={(e) => setSubscriptionFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 px-3.5 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Subscriptions</option>
              <option value="active">Subscribed (Active)</option>
              <option value="expired">Expired</option>
              <option value="pending">Pending Payment</option>
            </select>
          </div>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="Search by restaurant name, email, or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
      </Card>

      {/* Restaurants Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-5">Restaurant</th>
                <th className="py-3.5 px-4">Owner</th>
                <th className="py-3.5 px-4">City / Contact</th>
                <th className="py-3.5 px-4">Account Status</th>
                <th className="py-3.5 px-4">Ordering Privileges</th>
                <th className="py-3.5 px-4">Subscription</th>
                <th className="py-3.5 px-4">Created Date</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading restaurants...
                  </td>
                </tr>
              ) : restaurants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No restaurants found.
                  </td>
                </tr>
              ) : (
                restaurants.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        {r.logo ? (
                          <img
                            src={getImageUrl(r.logo)}
                            alt={r.name}
                            className="w-11 h-11 rounded-xl object-contain bg-white p-1 border border-slate-200 shrink-0 shadow-sm"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center text-white font-extrabold text-sm shrink-0 shadow-sm">
                            {r.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-900">{r.name}</p>
                          <p className="text-xs text-slate-400">{r.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {r.owner ? (
                        <div>
                          <p className="font-semibold text-slate-800">{r.owner.name}</p>
                          <p className="text-xs text-slate-400">{r.owner.email}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">No owner assigned</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-medium text-slate-700">{r.city || 'N/A'}</p>
                      <p className="text-xs text-slate-400">{r.phone || r.email}</p>
                    </td>
                    <td className="py-4 px-4">
                      <Badge status={r.status} />
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-1 text-[10px] font-extrabold">
                        <span className={`px-2 py-0.5 rounded-md inline-block w-fit ${
                          r.enable_dine_in !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400 line-through'
                        }`}>
                          🍽️ Dine-In: {r.enable_dine_in !== false ? 'ON' : 'OFF'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md inline-block w-fit ${
                          r.enable_online_ordering !== false ? 'bg-pink-100 text-[#d70f64]' : 'bg-slate-100 text-slate-400 line-through'
                        }`}>
                          🛵 Online: {r.enable_online_ordering !== false ? 'ON' : 'OFF'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <Badge status={r.subscription_status} />
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-500">
                      {formatDate(r.created_at)}
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link to={`/admin/restaurants/${r.id}`}>
                          <button
                            title="View Details"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </Link>

                        {r.status === 'active' ? (
                          <button
                            title="Suspend Restaurant"
                            onClick={() =>
                              setConfirmModal({
                                isOpen: true,
                                type: 'suspend',
                                restaurantId: r.id,
                                restaurantName: r.name,
                              })
                            }
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            title="Reactivate Restaurant"
                            onClick={() =>
                              setConfirmModal({
                                isOpen: true,
                                type: 'activate',
                                restaurantId: r.id,
                                restaurantName: r.name,
                              })
                            }
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          title="Permanently Delete Restaurant"
                          onClick={() => {
                            setDeleteConfirmText('');
                            setConfirmModal({
                              isOpen: true,
                              type: 'delete',
                              restaurantId: r.id,
                              restaurantName: r.name,
                            });
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Confirmation Modals */}
      {confirmModal.type === 'delete' ? (
        <Modal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
          title="🚨 High Security: Permanent Restaurant Deletion"
          size="md"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs leading-relaxed">
              <div className="flex items-center gap-2 font-black text-rose-900 mb-1">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>IRREVERSIBLE ACTION</span>
              </div>
              You are about to permanently delete <strong>{confirmModal.restaurantName}</strong> (ID: <code className="font-mono text-[11px] bg-rose-100 px-1 py-0.5 rounded">{confirmModal.restaurantId}</code>). This will wipe all menus, owner accounts, tables, and records.
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">
                To confirm deletion, type <span className="font-mono text-rose-600 font-black">{confirmModal.restaurantName}</span> below:
              </label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={`Type "${confirmModal.restaurantName}" to confirm`}
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={deleteConfirmText.trim().toLowerCase() !== confirmModal.restaurantName.trim().toLowerCase() && deleteConfirmText.trim() !== 'DELETE'}
                onClick={handleStatusChange}
                leftIcon={<Trash2 className="w-4 h-4" />}
              >
                Permanently Delete
              </Button>
            </div>
          </div>
        </Modal>
      ) : (
        <ConfirmDialog
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
          onConfirm={handleStatusChange}
          title={confirmModal.type === 'suspend' ? 'Suspend Restaurant' : 'Reactivate Restaurant'}
          message={
            confirmModal.type === 'suspend'
              ? `Are you sure you want to suspend "${confirmModal.restaurantName}"? The owner dashboard and customer ordering will be locked immediately.`
              : `Reactivate "${confirmModal.restaurantName}" to restore full software access and menu ordering.`
          }
          confirmLabel={confirmModal.type === 'suspend' ? 'Suspend Access' : 'Reactivate'}
          variant={confirmModal.type === 'activate' ? 'primary' : 'danger'}
        />
      )}
    </div>
  );
};
