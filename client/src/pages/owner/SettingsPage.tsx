import React, { useEffect, useState, useRef } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { formatCurrency, formatDate, formatTime, getImageUrl } from '../../lib/utils';
import {
  Store,
  Clock,
  CreditCard,
  User,
  Upload,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  FileText,
  DollarSign,
  Image as ImageIcon,
  ExternalLink,
  RefreshCw,
  Trash2,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'delivery' | 'hours' | 'billing' | 'security'>('info');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [restaurantSlug, setRestaurantSlug] = useState('');

  // Logo upload state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [deleteLogo, setDeleteLogo] = useState(false);

  // Subscription & Payments state
  const [subscription, setSubscription] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofAmount, setProofAmount] = useState('');
  const [proofTxRef, setProofTxRef] = useState('');
  const [proofNotes, setProofNotes] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);

  // Form State
  const [form, setForm] = useState({
    name: '',
    description: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    city: '',
    opening_time: '11:00',
    closing_time: '23:00',
    is_open: true,
    accept_orders: true,
    // Delivery Settings
    enable_delivery: true,
    delivery_fee: '150',
    min_order_amount: '500',
    estimated_delivery_time: '25-35 mins',
    tax_rate: '5',
    service_charge_rate: '0',
    currency: 'PKR',
    // Owner Profile
    owner_name: '',
    owner_phone: '',
    current_password: '',
    new_password: '',
  });

  useEffect(() => {
    if (user?.restaurant_id) {
      fetchSettings();
      fetchPayments();
    }
  }, [user]);

  const fetchSettings = async () => {
    if (!user?.restaurant_id) return;
    try {
      const res = await api.get(`/restaurants/${user.restaurant_id}/settings`);
      const { restaurant, owner, subscription: sub } = res.data;
      setSubscription(sub);
      setRestaurantSlug(restaurant.slug || '');
      if (restaurant.logo) {
        setLogoPreview(getImageUrl(restaurant.logo));
      } else {
        setLogoPreview('');
      }
      setDeleteLogo(false);
      setLogoFile(null);

      setForm({
        name: restaurant.name || '',
        description: restaurant.description || '',
        phone: restaurant.phone || '',
        whatsapp: restaurant.whatsapp || '',
        email: restaurant.email || '',
        address: restaurant.address || '',
        city: restaurant.city || '',
        opening_time: restaurant.opening_time || '11:00',
        closing_time: restaurant.closing_time || '23:00',
        is_open: restaurant.is_open ?? true,
        accept_orders: restaurant.accept_orders ?? true,
        enable_delivery: restaurant.enable_delivery ?? true,
        delivery_fee: restaurant.delivery_fee !== undefined ? restaurant.delivery_fee.toString() : '150',
        min_order_amount: restaurant.min_order_amount !== undefined ? restaurant.min_order_amount.toString() : '500',
        estimated_delivery_time: restaurant.estimated_delivery_time || '25-35 mins',
        tax_rate: restaurant.tax_rate?.toString() || '0',
        service_charge_rate: restaurant.service_charge_rate?.toString() || '0',
        currency: restaurant.currency || 'PKR',
        owner_name: owner?.name || '',
        owner_phone: owner?.phone || '',
        current_password: '',
        new_password: '',
      });
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    if (!user?.restaurant_id) return;
    try {
      const res = await api.get(`/restaurants/${user.restaurant_id}/payments`);
      setPayments(res.data);
    } catch (err) {
      console.error('Failed to load payment history:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setDeleteLogo(false);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
    setDeleteLogo(true);
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.restaurant_id) return;
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const data = new FormData();
      Object.entries(form).forEach(([key, val]) => {
        data.append(key, val.toString());
      });

      if (logoFile) {
        data.append('logo', logoFile);
      } else if (deleteLogo) {
        data.append('delete_logo', 'true');
      }

      await api.patch(`/restaurants/${user.restaurant_id}/settings`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccessMsg('Settings and branding saved successfully!');
      refreshUser();
      fetchSettings();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadPaymentProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.restaurant_id || !proofFile) return;

    const amountVal = parseFloat(proofAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      setErrorMsg('Please enter a valid payment amount.');
      return;
    }

    setUploadingProof(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const data = new FormData();
      data.append('screenshot', proofFile);
      data.append('transaction_reference', proofTxRef);
      data.append('notes', proofNotes);
      data.append('amount', amountVal.toString());

      const res = await api.post(`/restaurants/${user.restaurant_id}/payment-proof`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccessMsg(res.data.message || 'Payment proof submitted for admin verification!');
      setProofFile(null);
      setProofTxRef('');
      setProofNotes('');
      setProofAmount('');
      fetchPayments();
      fetchSettings();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to upload payment proof.');
    } finally {
      setUploadingProof(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-lg w-48" />
        <div className="h-96 bg-slate-200 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
          Restaurant Settings & Branding
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your restaurant profile, official logo branding, operating hours, and monthly software subscription payments.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-sm font-bold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-sm font-bold text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Modern Tabs Header */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80">
        <button
          type="button"
          onClick={() => { setActiveTab('info'); setSuccessMsg(''); setErrorMsg(''); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeTab === 'info'
              ? 'bg-white text-[#d70f64] shadow-sm ring-1 ring-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Restaurant Info & Logo</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('delivery'); setSuccessMsg(''); setErrorMsg(''); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeTab === 'delivery'
              ? 'bg-white text-[#d70f64] shadow-sm ring-1 ring-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4 text-[#d70f64]" />
          <span>🛵 Delivery & Online Ordering</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('hours'); setSuccessMsg(''); setErrorMsg(''); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeTab === 'hours'
              ? 'bg-white text-[#d70f64] shadow-sm ring-1 ring-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Operating Hours & Status</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('billing'); setSuccessMsg(''); setErrorMsg(''); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeTab === 'billing'
              ? 'bg-white text-[#d70f64] shadow-sm ring-1 ring-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Subscription & Payment Proof</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('security'); setSuccessMsg(''); setErrorMsg(''); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeTab === 'security'
              ? 'bg-white text-[#d70f64] shadow-sm ring-1 ring-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Security & Profile</span>
        </button>
      </div>

      {/* Tab 1: Restaurant Info & Logo */}
      {activeTab === 'info' && (
        <form onSubmit={handleSave} className="space-y-6">
          <Card className="p-6 space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Store className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">Restaurant Public Profile & Logo</h3>
            </div>

            {/* Logo Upload Section */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Official Restaurant Logo
              </label>

              <input
                type="file"
                ref={logoInputRef}
                onChange={handleLogoSelect}
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
              />

              {logoPreview ? (
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-white p-2 border border-slate-200 shadow-sm overflow-hidden flex items-center justify-center">
                    <img src={logoPreview} alt="Logo preview" className="max-w-full max-h-full object-contain" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-700">Official Brand Logo</p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                        onClick={() => logoInputRef.current?.click()}
                      >
                        Change Logo
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                        onClick={handleRemoveLogo}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => logoInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/40 rounded-xl p-5 text-center cursor-pointer transition-all bg-white"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-1.5 border border-indigo-100">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <p className="font-bold text-slate-900 text-xs">Click to upload restaurant logo</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, or WebP logo file (up to 5MB)</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Restaurant Name *"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
              />

              <Input
                label="City"
                name="city"
                value={form.city}
                onChange={handleChange}
              />

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={2}
                  value={form.description}
                  onChange={handleChange}
                  className="block w-full rounded-xl border-slate-200 bg-white text-slate-900 text-sm shadow-sm p-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <Input
                label="Contact Phone"
                name="phone"
                value={form.phone}
                onChange={handleChange}
              />

              <Input
                label="WhatsApp Number"
                name="whatsapp"
                value={form.whatsapp}
                onChange={handleChange}
              />

              <div className="md:col-span-2">
                <Input
                  label="Official Email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                />
              </div>

              <div className="md:col-span-2">
                <Input
                  label="Full Street Address"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                />
              </div>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" size="lg" isLoading={saving} leftIcon={<Sparkles className="w-4 h-4" />}>
              Save Restaurant Info & Logo
            </Button>
          </div>
        </form>
      )}

      {/* Tab: Delivery & Online Ordering */}
      {activeTab === 'delivery' && (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Online Ordering Live Direct Link Card */}
          <Card className="p-6 space-y-4 bg-gradient-to-r from-slate-900 to-pink-950 text-white border-0 shadow-xl rounded-3xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-pink-400" />
                <h3 className="text-base font-black text-white">Your Public Online Ordering Link</h3>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest bg-pink-500/30 text-pink-200 border border-pink-400/30 px-2.5 py-1 rounded-full">
                Live URL
              </span>
            </div>

            <p className="text-xs text-slate-300 font-medium">
              Share this link directly on Instagram bio, WhatsApp, TikTok, Google Maps, or Facebook ads. Customers can order directly for delivery without scanning a table QR code!
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
              <div className="flex-1 bg-black/40 border border-white/20 rounded-2xl px-4 py-3 text-xs font-mono font-bold text-pink-200 truncate">
                {window.location.origin}/{restaurantSlug || user?.restaurant_id}
              </div>
              <a
                href={`/${restaurantSlug || user?.restaurant_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-3 bg-[#d70f64] hover:bg-[#b00c52] text-white font-black text-xs rounded-2xl flex items-center justify-center gap-1.5 shadow-lg shadow-pink-500/20 transition-all shrink-0"
              >
                <span>Open Storefront</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </Card>

          {/* Delivery Configuration */}
          <Card className="p-6 space-y-5 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-[#d70f64]" />
                <h3 className="text-base font-bold text-slate-900">Delivery Rules & Rates</h3>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.enable_delivery}
                  onChange={(e) => setForm({ ...form, enable_delivery: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#d70f64]"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Delivery Fee (PKR)"
                name="delivery_fee"
                type="number"
                value={form.delivery_fee}
                onChange={handleChange}
                placeholder="e.g. 150 (Set 0 for Free Delivery)"
              />

              <Input
                label="Minimum Order Amount (PKR)"
                name="min_order_amount"
                type="number"
                value={form.min_order_amount}
                onChange={handleChange}
                placeholder="e.g. 500"
              />

              <Input
                label="Estimated Delivery Time"
                name="estimated_delivery_time"
                value={form.estimated_delivery_time}
                onChange={handleChange}
                placeholder="e.g. 25-35 mins"
              />
            </div>
          </Card>

          <div className="flex justify-end">
            <Button
              type="submit"
              size="lg"
              isLoading={saving}
              leftIcon={<Sparkles className="w-4 h-4" />}
              className="bg-[#d70f64] hover:bg-[#b00c52] text-white font-black rounded-2xl shadow-lg shadow-pink-500/20"
            >
              Save Delivery Settings
            </Button>
          </div>
        </form>
      )}

      {/* Tab 2: Operating Hours & Live Status */}
      {activeTab === 'hours' && (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Hero Live Controls */}
          <Card className="p-6 space-y-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white border-0 shadow-lg">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-400" />
              Live Restaurant Controls
            </h3>
            <p className="text-xs text-slate-300">
              Instantly open or close your digital ordering system for walk-in or table customers.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                <div>
                  <p className="text-sm font-bold text-white">Restaurant Open Status</p>
                  <p className="text-xs text-slate-300">Indicate whether your doors are open</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_open}
                    onChange={(e) => setForm({ ...form, is_open: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                <div>
                  <p className="text-sm font-bold text-white">Accept Customer Orders</p>
                  <p className="text-xs text-slate-300">Allow customers to scan & place orders</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.accept_orders}
                    onChange={(e) => setForm({ ...form, accept_orders: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                </label>
              </div>
            </div>
          </Card>

          {/* Operating Hours */}
          <Card className="p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              Standard Operating Timings
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Opening Time"
                name="opening_time"
                type="time"
                value={form.opening_time}
                onChange={handleChange}
              />

              <Input
                label="Closing Time"
                name="closing_time"
                type="time"
                value={form.closing_time}
                onChange={handleChange}
              />
            </div>

            <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Default Tax Rate (%)"
                name="tax_rate"
                type="number"
                value={form.tax_rate}
                onChange={handleChange}
              />

              <Input
                label="Service Charge Rate (%)"
                name="service_charge_rate"
                type="number"
                value={form.service_charge_rate}
                onChange={handleChange}
              />
            </div>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" size="lg" isLoading={saving} leftIcon={<Sparkles className="w-4 h-4" />}>
              Save Operating Hours
            </Button>
          </div>
        </form>
      )}

      {/* Tab 3: Subscription & Payment Proof Upload */}
      {activeTab === 'billing' && (
        <div className="space-y-6">
          {/* Subscription Status Card */}
          <Card className="p-6 bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white border-0 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                  {subscription?.plan || 'Standard'} Tier Subscription
                </span>
                <h3 className="text-2xl font-black text-white mt-2">
                  Subscription Status: <span className="text-emerald-400">Active</span>
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Valid Until: <span className="font-bold text-white">{formatDate(subscription?.expiry_date)}</span>
                </p>
              </div>

              <div className="shrink-0">
                <span
                  className={`inline-flex px-3.5 py-1.5 rounded-xl text-xs font-bold ${
                    subscription?.payment_status === 'paid'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : subscription?.payment_status === 'pending_verification'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {subscription?.payment_status === 'paid'
                    ? '✓ Paid & Active'
                    : subscription?.payment_status === 'pending_verification'
                    ? '⏳ Payment Proof Under Review'
                    : '⚠️ Payment Pending / Overdue'}
                </span>
              </div>
            </div>
          </Card>

          {/* Upload Payment Screenshot Form */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Upload className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="text-base font-bold text-slate-900">Upload Monthly Fee Payment Proof</h3>
                <p className="text-xs text-slate-500">
                  Upload your bank transfer, EasyPaisa, or JazzCash receipt screenshot for admin verification.
                </p>
              </div>
            </div>

            <form onSubmit={handleUploadPaymentProof} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                  Payment Screenshot (JPG, PNG, WebP) *
                </label>
                <div className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-6 text-center transition-all bg-slate-50/50">
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={(e) => e.target.files && setProofFile(e.target.files[0])}
                    className="hidden"
                    id="screenshot-upload"
                    required
                  />
                  <label htmlFor="screenshot-upload" className="cursor-pointer flex flex-col items-center">
                    <ImageIcon className="w-10 h-10 text-indigo-600 mb-2" />
                    {proofFile ? (
                      <p className="text-sm font-bold text-slate-900">{proofFile.name}</p>
                    ) : (
                      <>
                        <p className="text-sm font-bold text-slate-900">Click to upload payment receipt</p>
                        <p className="text-xs text-slate-400 mt-1">PNG, JPG, or WebP up to 5MB</p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Input
                    label="Amount Paid (PKR) *"
                    type="number"
                    placeholder="Enter amount transferred"
                    value={proofAmount}
                    onChange={(e) => setProofAmount(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Input
                    label="Transaction Reference / ID"
                    placeholder="e.g. TRX-98234710"
                    value={proofTxRef}
                    onChange={(e) => setProofTxRef(e.target.value)}
                  />
                </div>

                <div>
                  <Input
                    label="Payment Notes / Bank Name"
                    placeholder="e.g. Bank Alfalah, JazzCash transfer"
                    value={proofNotes}
                    onChange={(e) => setProofNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  size="lg"
                  isLoading={uploadingProof}
                  disabled={!proofFile}
                  leftIcon={<Upload className="w-4 h-4" />}
                >
                  Submit Payment Proof for Approval
                </Button>
              </div>
            </form>
          </Card>

          {/* Payment Proofs Submission History */}
          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                Payment Submissions History
              </h4>
              <span className="text-xs text-slate-400">{payments.length} records</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 uppercase font-bold text-slate-500">
                    <th className="py-3 px-4">Submitted At</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Transaction Ref</th>
                    <th className="py-3 px-4">Verification Status</th>
                    <th className="py-3 px-4 text-right">Proof Image</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No previous payment proofs uploaded.
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {formatDate(p.submitted_at)} {formatTime(p.submitted_at)}
                        </td>
                        <td className="py-3 px-4 font-black text-slate-900">
                          {formatCurrency(p.amount)}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {p.transaction_reference || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              p.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : p.status === 'rejected'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {p.status === 'approved'
                              ? '✓ Approved'
                              : p.status === 'rejected'
                              ? '✗ Rejected'
                              : '⏳ Pending Review'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <a
                            href={getImageUrl(p.screenshot_url)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-indigo-600 font-bold hover:underline"
                          >
                            <span>View</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 4: Security & Owner Account */}
      {activeTab === 'security' && (
        <form onSubmit={handleSave} className="space-y-6">
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <User className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">Owner Profile & Login</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Owner Full Name"
                name="owner_name"
                value={form.owner_name}
                onChange={handleChange}
              />

              <Input
                label="Owner Phone Number"
                name="owner_phone"
                value={form.owner_phone}
                onChange={handleChange}
              />

              <div className="md:col-span-2 pt-2 border-t border-slate-100">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Change Owner Password
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Current Password"
                    name="current_password"
                    type="password"
                    value={form.current_password}
                    onChange={handleChange}
                    placeholder="Enter current password"
                  />

                  <Input
                    label="New Password"
                    name="new_password"
                    type="password"
                    value={form.new_password}
                    onChange={handleChange}
                    placeholder="Enter new password (min 6 chars)"
                  />
                </div>
              </div>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" size="lg" isLoading={saving} leftIcon={<ShieldCheck className="w-4 h-4" />}>
              Update Profile & Password
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
