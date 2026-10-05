import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { StatsCard } from '../../components/ui/StatsCard';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { formatCurrency } from '../../lib/utils';
import {
  Store,
  ShoppingBag,
  DollarSign,
  CreditCard,
  TrendingUp,
  Plus,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

export const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/admin/dashboard');
      setData(res.data);
    } catch (err) {
      console.error('Failed to load admin dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Platform Overview
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Global metrics, tenant performance, and platform subscriptions.
          </p>
        </div>
        <Link to="/admin/restaurants/new">
          <Button leftIcon={<Plus className="w-4 h-4" />}>Create Restaurant</Button>
        </Link>
      </div>

      {/* KPI Cards: SaaS Platform Management (Zero Restaurant Sales Exposure) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatsCard
          label="Total Registered Tenants"
          value={data.totalRestaurants}
          icon={<Store className="w-5 h-5" />}
          color="indigo"
          subtext={`${data.activeRestaurants} active • ${data.suspendedRestaurants} suspended`}
        />
        <StatsCard
          label="Active SaaS Subscriptions"
          value={data.activeSubscriptions}
          icon={<ShieldCheck className="w-5 h-5" />}
          color="blue"
          subtext={`${data.expiredSubscriptions} expired accounts`}
        />
        <StatsCard
          label="SaaS Monthly Software Billing"
          value={formatCurrency(data.monthlySaaSBilling || 0)}
          icon={<DollarSign className="w-5 h-5" />}
          color="emerald"
          subtext="License fees collected from restaurants"
        />
        <StatsCard
          label="Pending Verifications"
          value={data.pendingPayments}
          icon={<CreditCard className="w-5 h-5" />}
          color="purple"
          subtext="Tenant payment screenshots awaiting review"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6">
        {/* Tenant Registrations Growth Area Chart */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">7-Day Tenant Registration Growth</h3>
              <p className="text-xs text-slate-500">New restaurant signups and tenant onboarding</p>
            </div>
            <TrendingUp className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.tenantsOverTime || []}>
                <defs>
                  <linearGradient id="tenantGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderRadius: '12px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="New Restaurants"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#tenantGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Link to="/admin/restaurants">
          <Card className="p-5 flex items-center justify-between group hover:border-indigo-300" hoverEffect>
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Manage Restaurants</h4>
                <p className="text-xs text-slate-500">View, suspend, or configure tenants</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          </Card>
        </Link>

        <Link to="/admin/subscriptions">
          <Card className="p-5 flex items-center justify-between group hover:border-purple-300" hoverEffect>
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Subscriptions</h4>
                <p className="text-xs text-slate-500">Access control & payment tracking</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-purple-600 transition-colors" />
          </Card>
        </Link>

        <Link to="/admin/settings">
          <Card className="p-5 flex items-center justify-between group hover:border-blue-300" hoverEffect>
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Platform Settings</h4>
                <p className="text-xs text-slate-500">Super admin profile, logo & security</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-purple-600 transition-colors" />
          </Card>
        </Link>
      </div>
    </div>
  );
};
