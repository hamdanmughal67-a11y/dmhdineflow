import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { StatsCard } from '../../components/ui/StatsCard';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { formatCurrency, formatDate, getImageUrl } from '../../lib/utils';
import {
  Store,
  User,
  ShoppingBag,
  DollarSign,
  Grid,
  UtensilsCrossed,
  ArrowLeft,
  Ban,
  CheckCircle2,
  Calendar,
  Clock,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  Upload,
  RefreshCw,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react';

export const RestaurantDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updatingLogo, setUpdatingLogo] = useState(false);

  // Status confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [actionType, setActionType] = useState<'suspend' | 'activate'>('suspend');

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const fetchDetails = async () => {
    try {
      const res = await api.get(`/admin/restaurants/${id}`);
      setRestaurant(res.data);
    } catch (err) {
      console.error('Failed to load restaurant details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    try {
      const newStatus = actionType === 'suspend' ? 'suspended' : 'active';
      await api.patch(`/admin/restaurants/${id}/status`, { status: newStatus });
      setConfirmOpen(false);
      fetchDetails();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update status.');
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUpdatingLogo(true);

    try {
      const uploadData = new FormData();
      uploadData.append('file', file);
      const uploadRes = await api.post('/upload', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await api.patch(`/admin/restaurants/${id}`, {
        logo: uploadRes.data.url,
      });

      fetchDetails();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update restaurant logo.');
    } finally {
      setUpdatingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!id || !confirm('Are you sure you want to remove this restaurant logo?')) return;
    setUpdatingLogo(true);
    try {
      await api.patch(`/admin/restaurants/${id}`, {
        logo: '',
      });
      fetchDetails();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to remove logo.');
    } finally {
      setUpdatingLogo(false);
    }
  };

  if (loading || !restaurant) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-lg w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const logoSrc = restaurant.logo ? getImageUrl(restaurant.logo) : '/dmh-logo.png';

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Link
            to="/admin/restaurants"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <img
            src={logoSrc}
            alt={restaurant.name}
            className="w-12 h-12 rounded-2xl object-contain bg-white p-1 border border-slate-200 shadow-sm shrink-0"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {restaurant.name}
              </h1>
              <Badge status={restaurant.status} />
              <Badge status={restaurant.subscription_status} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Tenant ID: <span className="font-mono">{restaurant.id}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            className="bg-[#d70f64] hover:bg-[#b00c50] text-white font-bold"
            leftIcon={<Sparkles className="w-4 h-4" />}
            onClick={async () => {
              if (!id) return;
              try {
                const res = await api.post(`/admin/restaurants/${id}/renew-subscription`);
                alert(res.data.message || 'Subscription renewed for 1 Month (+30 Days).');
                fetchDetails();
              } catch (err: any) {
                alert(err.response?.data?.error || 'Failed to renew subscription.');
              }
            }}
          >
            Renew 1 Month (+30d)
          </Button>

          {restaurant.status === 'active' ? (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Ban className="w-4 h-4 text-amber-600" />}
              onClick={() => {
                setActionType('suspend');
                setConfirmOpen(true);
              }}
            >
              Suspend
            </Button>
          ) : (
            <Button
              variant="success"
              size="sm"
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
              onClick={() => {
                setActionType('activate');
                setConfirmOpen(true);
              }}
            >
              Reactivate
            </Button>
          )}

          <Button
            variant="danger"
            size="sm"
            leftIcon={<Trash2 className="w-4 h-4" />}
            onClick={async () => {
              if (!id || !confirm(`Are you sure you want to PERMANENTLY DELETE "${restaurant.name}"? This cannot be undone and will delete all menus, orders, tables, and owner account.`)) return;
              try {
                await api.delete(`/admin/restaurants/${id}`);
                alert(`Restaurant "${restaurant.name}" permanently deleted.`);
                navigate('/admin/restaurants');
              } catch (err: any) {
                alert(err.response?.data?.error || 'Failed to delete restaurant.');
              }
            }}
          >
            Permanently Delete
          </Button>
        </div>
      </div>

      {/* Privacy-Protected Tenant Management Cards (Zero Sales/Revenue Exposure) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatsCard
          label="Physical Tables"
          value={restaurant.stats?.totalTables || 0}
          icon={<Grid className="w-5 h-5" />}
          color="indigo"
          subtext="Active Dine-in QR Tables"
        />
        <StatsCard
          label="Catalog Dishes"
          value={restaurant.stats?.totalItems || 0}
          icon={<UtensilsCrossed className="w-5 h-5" />}
          color="purple"
          subtext="Menu items configured"
        />
        <StatsCard
          label="Software Plan"
          value={restaurant.subscription?.plan || restaurant.plan || 'Standard'}
          icon={<Sparkles className="w-5 h-5" />}
          color="blue"
          subtext={`Plan: ${restaurant.package_plan || 'full_suite'}`}
        />
        <StatsCard
          label="Account Status"
          value={restaurant.status?.toUpperCase() || 'ACTIVE'}
          icon={<Store className="w-5 h-5" />}
          color="emerald"
          subtext={`Sub: ${restaurant.subscription_status || 'active'}`}
        />
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Restaurant Details & Logo Management */}
        <Card className="p-6 lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">Restaurant Profile & Branding</h3>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleLogoUpload}
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
            />
          </div>

          {/* Logo Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-16 h-16 rounded-2xl bg-white p-2 border border-slate-200 shadow-sm flex items-center justify-center shrink-0">
                <img src={logoSrc} alt={restaurant.name} className="max-w-full max-h-full object-contain" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Official Logo Branding</p>
                <p className="text-sm font-black text-slate-900">{restaurant.name}</p>
                <p className="text-[11px] text-slate-400">Displayed on customer QR menus and invoices</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                isLoading={updatingLogo}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                onClick={() => fileInputRef.current?.click()}
              >
                Change Logo
              </Button>
              {restaurant.logo && (
                <Button
                  variant="danger"
                  size="sm"
                  isLoading={updatingLogo}
                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                  onClick={handleRemoveLogo}
                >
                  Remove
                </Button>
              )}
            </div>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">
            {restaurant.description || 'No description provided.'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm pt-2">
            <div className="flex items-center gap-2.5 text-slate-600">
              <Phone className="w-4 h-4 text-slate-400" />
              <span>{restaurant.phone || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-600">
              <Mail className="w-4 h-4 text-slate-400" />
              <span>{restaurant.email || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-600">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span>{restaurant.address ? `${restaurant.address}, ${restaurant.city}` : restaurant.city || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-600">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>{restaurant.opening_time} - {restaurant.closing_time}</span>
            </div>
          </div>
        </Card>

        {/* Owner & Subscription Details */}
        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100">
              <User className="w-4 h-4 text-blue-600" />
              <h4 className="text-sm font-bold text-slate-900">Assigned Owner</h4>
            </div>
            {restaurant.owner ? (
              <div className="space-y-1.5 text-xs text-slate-600">
                <p className="font-bold text-sm text-slate-900">{restaurant.owner.name}</p>
                <p>{restaurant.owner.email}</p>
                <p>{restaurant.owner.phone || 'No phone recorded'}</p>
              </div>
            ) : (
              <p className="text-xs text-slate-400">No owner assigned.</p>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100">
              <Store className="w-4 h-4 text-indigo-600" />
              <h4 className="text-sm font-bold text-slate-900">Ordering Access Controls</h4>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="font-bold text-slate-900 block">🍽️ Dine-In QR Ordering</span>
                  <span className="text-[11px] text-slate-400">Physical tables QR scanning</span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const nextVal = restaurant.enable_dine_in === false ? true : false;
                    await api.patch(`/admin/restaurants/${id}`, { enable_dine_in: nextVal });
                    fetchDetails();
                  }}
                  className={`px-3 py-1 rounded-lg font-black text-xs transition-colors shadow-xs ${
                    restaurant.enable_dine_in !== false
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                  }`}
                >
                  {restaurant.enable_dine_in !== false ? 'ENABLED (ON)' : 'DISABLED (OFF)'}
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="font-bold text-slate-900 block">🛵 Online Ordering Link</span>
                  <span className="text-[11px] text-slate-400">Web store at /:slug</span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const nextVal = restaurant.enable_online_ordering === false ? true : false;
                    await api.patch(`/admin/restaurants/${id}`, { enable_online_ordering: nextVal });
                    fetchDetails();
                  }}
                  className={`px-3 py-1 rounded-lg font-black text-xs transition-colors shadow-xs ${
                    restaurant.enable_online_ordering !== false
                      ? 'bg-[#d70f64] text-white hover:bg-[#b00c50]'
                      : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                  }`}
                >
                  {restaurant.enable_online_ordering !== false ? 'ENABLED (ON)' : 'DISABLED (OFF)'}
                </button>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100">
              <Calendar className="w-4 h-4 text-purple-600" />
              <h4 className="text-sm font-bold text-slate-900">Subscription Plan</h4>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Plan Tier:</span>
                <span className="font-bold text-slate-800">{restaurant.subscription?.plan || restaurant.plan || 'Standard'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Package:</span>
                <span className="font-bold text-indigo-700 uppercase tracking-wider">{restaurant.package_plan || 'full_suite'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <Badge status={restaurant.subscription_status} />
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Expiry Date:</span>
                <span className="font-semibold text-slate-700">{formatDate(restaurant.subscription_expiry)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleToggleStatus}
        title={actionType === 'suspend' ? 'Suspend Restaurant Software Access' : 'Reactivate Restaurant Access'}
        message={
          actionType === 'suspend'
            ? `Suspending "${restaurant.name}" will prevent the owner from modifying menus or viewing orders, and customers will see an inactive message.`
            : `Reactivating "${restaurant.name}" will immediately restore full portal access and menu ordering.`
        }
        confirmLabel={actionType === 'suspend' ? 'Confirm Suspension' : 'Reactivate'}
        variant={actionType === 'suspend' ? 'danger' : 'primary'}
      />
    </div>
  );
};
