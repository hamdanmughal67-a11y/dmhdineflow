import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import {
  Store,
  User,
  CreditCard,
  Clock,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Upload,
  Image as ImageIcon,
  Trash2,
  RefreshCw,
} from 'lucide-react';

export const CreateRestaurantPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Logo upload state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    city: 'Lahore',
    opening_time: '11:00',
    closing_time: '23:00',
    currency: 'PKR',
    tax_rate: '5',
    service_charge_rate: '0',
    // Owner Account
    owner_name: '',
    owner_email: '',
    owner_phone: '',
    owner_password: '',
    // Subscription & Access Control
    plan: 'Premium',
    package_plan: 'full_suite',
    enable_dine_in: true,
    enable_online_ordering: true,
    subscription_amount: '',
    subscription_expiry_months: '12',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    setFormData({ ...formData, [target.name]: value });
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + parseInt(formData.subscription_expiry_months));

    try {
      let uploadedLogoUrl = '';

      // Upload logo if selected
      if (logoFile) {
        const uploadData = new FormData();
        uploadData.append('file', logoFile);
        const uploadRes = await api.post('/upload', uploadData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploadedLogoUrl = uploadRes.data.url;
      }

      await api.post('/admin/restaurants', {
        restaurant: {
          name: formData.name,
          logo: uploadedLogoUrl,
          description: formData.description,
          phone: formData.phone,
          whatsapp: formData.whatsapp,
          email: formData.email,
          address: formData.address,
          city: formData.city,
          opening_time: formData.opening_time,
          closing_time: formData.closing_time,
          currency: formData.currency,
          tax_rate: parseFloat(formData.tax_rate) || 0,
          service_charge_rate: parseFloat(formData.service_charge_rate) || 0,
          plan: formData.plan,
          package_plan: formData.package_plan,
          enable_dine_in: formData.enable_dine_in,
          enable_online_ordering: formData.enable_online_ordering,
          subscription_amount: parseFloat(formData.subscription_amount) || 0,
          subscription_expiry: expiryDate.toISOString(),
          subscription_status: 'active',
        },
        owner: {
          name: formData.owner_name,
          email: formData.owner_email,
          phone: formData.owner_phone,
          password: formData.owner_password,
        },
      });

      navigate('/admin/restaurants');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create restaurant. Please verify all details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/admin/restaurants"
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Create New Restaurant
          </h1>
          <p className="text-xs text-slate-500">
            Provision a new restaurant tenant with its own logo branding and owner account.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Restaurant Details & Logo Upload */}
        <Card className="p-6">
          <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Restaurant Information & Logo</h3>
              <p className="text-xs text-slate-500">Basic information and official restaurant logo branding</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Restaurant Logo Upload Field */}
            <div className="md:col-span-2 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Restaurant Official Logo (Mandatory) *
              </label>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleLogoSelect}
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
              />

              {logoPreview ? (
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-2xl bg-white p-2 border border-slate-200 shadow-sm overflow-hidden flex items-center justify-center">
                    <img src={logoPreview} alt="Logo preview" className="max-w-full max-h-full object-contain" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Logo Selected
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Replace Logo
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
                  onClick={() => fileInputRef.current?.click()}
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

            <div className="md:col-span-2">
              <Input
                label="Restaurant Name *"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Royal Karahi & Grill"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Description
              </label>
              <textarea
                name="description"
                rows={2}
                value={formData.description}
                onChange={handleChange}
                placeholder="Authentic Pakistani cuisine and specialties..."
                className="block w-full rounded-xl border-slate-200 bg-white text-slate-900 text-sm shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all p-3"
              />
            </div>

            <Input
              label="Contact Phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="0300-1234567"
            />

            <Input
              label="WhatsApp Number"
              name="whatsapp"
              value={formData.whatsapp}
              onChange={handleChange}
              placeholder="0300-1234567"
            />

            <Input
              label="Official Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="info@restaurant.com"
            />

            <Input
              label="City"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="Lahore, Karachi, Islamabad..."
            />

            <div className="md:col-span-2">
              <Input
                label="Full Address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Main Boulevard, Gulberg III"
              />
            </div>

            <Input
              label="Opening Time"
              type="time"
              name="opening_time"
              value={formData.opening_time}
              onChange={handleChange}
            />

            <Input
              label="Closing Time"
              type="time"
              name="closing_time"
              value={formData.closing_time}
              onChange={handleChange}
            />

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Currency
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="block w-full rounded-xl border-slate-200 bg-white text-slate-900 text-sm shadow-sm py-2.5 px-3.5 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="PKR">Pakistani Rupee (PKR)</option>
                <option value="USD">US Dollar (USD)</option>
                <option value="AED">UAE Dirham (AED)</option>
                <option value="SAR">Saudi Riyal (SAR)</option>
              </select>
            </div>

            <Input
              label="Tax Rate (%)"
              name="tax_rate"
              type="number"
              value={formData.tax_rate}
              onChange={handleChange}
              placeholder="5"
            />
          </div>
        </Card>

        {/* Section 2: Owner Credentials */}
        <Card className="p-6">
          <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Owner Account Credentials</h3>
              <p className="text-xs text-slate-500">Login details for the restaurant owner to manage their menu and orders</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Owner Full Name *"
              name="owner_name"
              value={formData.owner_name}
              onChange={handleChange}
              placeholder="e.g. Ahmed Khan"
              required
            />

            <Input
              label="Owner Contact Phone"
              name="owner_phone"
              value={formData.owner_phone}
              onChange={handleChange}
              placeholder="0300-1234567"
            />

            <Input
              label="Owner Email Address (Login ID) *"
              name="owner_email"
              type="email"
              value={formData.owner_email}
              onChange={handleChange}
              placeholder="owner@restaurant.com"
              required
            />

            <Input
              label="Owner Password *"
              name="owner_password"
              type="password"
              value={formData.owner_password}
              onChange={handleChange}
              placeholder="••••••••"
              required
            />
          </div>
        </Card>

        {/* Section 3: Subscription & Billing */}
        <Card className="p-6">
          <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Subscription & Software Validity</h3>
              <p className="text-xs text-slate-500">Configure subscription tier and validity duration</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Subscription Plan
              </label>
              <select
                name="plan"
                value={formData.plan}
                onChange={handleChange}
                className="block w-full rounded-xl border-slate-200 bg-white text-slate-900 text-sm shadow-sm py-2.5 px-3.5 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="Basic">Basic Plan</option>
                <option value="Standard">Standard Plan</option>
                <option value="Premium">Premium Plan</option>
                <option value="Enterprise">Enterprise Custom</option>
              </select>
            </div>

            <Input
              label="Monthly Subscription Fee (PKR)"
              name="subscription_amount"
              type="number"
              value={formData.subscription_amount}
              onChange={handleChange}
              placeholder="Enter monthly fee"
            />

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Software Validity Duration
              </label>
              <select
                name="subscription_expiry_months"
                value={formData.subscription_expiry_months}
                onChange={handleChange}
                className="block w-full rounded-xl border-slate-200 bg-white text-slate-900 text-sm shadow-sm py-2.5 px-3.5 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="1">1 Month (30 Days)</option>
                <option value="3">3 Months (Quarterly)</option>
                <option value="6">6 Months (Half-Yearly)</option>
                <option value="12">12 Months (1 Year)</option>
                <option value="24">24 Months (2 Years)</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Section 4: Ordering Access Controls & Package Suite */}
        <Card className="p-6">
          <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Ordering Access Controls & Feature Packages</h3>
              <p className="text-xs text-slate-500">Enable or restrict Dine-In Table Ordering and Dedicated Online Ordering link per client contract</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Client Service Package
              </label>
              <select
                name="package_plan"
                value={formData.package_plan}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({
                    ...formData,
                    package_plan: val,
                    enable_dine_in: val === 'dine_in_only' || val === 'full_suite',
                    enable_online_ordering: val === 'online_ordering_only' || val === 'full_suite',
                  });
                }}
                className="block w-full rounded-xl border-slate-200 bg-white text-slate-900 text-sm shadow-sm py-2.5 px-3.5 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="full_suite">✨ Full Suite Package (Both Dine-In QR Tables + Dedicated Online Store Link)</option>
                <option value="dine_in_only">🍽️ Dine-In QR Package Only (Table QR Ordering & Bill Requests)</option>
                <option value="online_ordering_only">🛵 Online Ordering Package Only (Dedicated Storefront Link /:slug)</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <label className={`flex items-start gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${
                formData.enable_dine_in ? 'bg-indigo-50/40 border-indigo-200' : 'bg-slate-50 border-slate-200'
              }`}>
                <input
                  type="checkbox"
                  name="enable_dine_in"
                  checked={formData.enable_dine_in}
                  onChange={handleChange}
                  className="mt-1 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <div>
                  <span className="text-sm font-black text-slate-900 block">Dine-In QR Table Ordering</span>
                  <span className="text-xs text-slate-500 block mt-0.5">
                    Allows customers inside the restaurant to scan QR codes on physical tables and place orders directly to kitchen.
                  </span>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${
                formData.enable_online_ordering ? 'bg-[#d70f64]/5 border-[#d70f64]/20' : 'bg-slate-50 border-slate-200'
              }`}>
                <input
                  type="checkbox"
                  name="enable_online_ordering"
                  checked={formData.enable_online_ordering}
                  onChange={handleChange}
                  className="mt-1 w-4 h-4 text-[#d70f64] rounded border-slate-300 focus:ring-[#d70f64]"
                />
                <div>
                  <span className="text-sm font-black text-slate-900 block">Dedicated Online Ordering Link</span>
                  <span className="text-xs text-slate-500 block mt-0.5">
                    Enables the foodpanda-style customer ordering portal at <code className="text-[#d70f64] font-bold">/:slug</code> for direct customer delivery & takeaway.
                  </span>
                </div>
              </label>
            </div>
          </div>
        </Card>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link to="/admin/restaurants">
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            size="lg"
            isLoading={isLoading}
            leftIcon={<Sparkles className="w-4 h-4" />}
          >
            Create Restaurant Account
          </Button>
        </div>
      </form>
    </div>
  );
};
