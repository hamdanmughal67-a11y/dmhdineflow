import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { StatsCard } from '../../components/ui/StatsCard';
import { DateRangeFilter } from '../../components/ui/DateRangeFilter';
import { formatCurrency } from '../../lib/utils';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export const ReportsPage: React.FC = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState<string>('week');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.restaurant_id) {
      fetchReport();
    }
  }, [user, period, fromDate, toDate]);

  const fetchReport = async () => {
    if (!user?.restaurant_id) return;
    setLoading(true);
    try {
      const res = await api.get(`/restaurants/${user.restaurant_id}/reports`, {
        params: {
          period: period !== 'custom' ? period : undefined,
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
        },
      });
      setReport(res.data);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !report) {
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
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Revenue & Sales Reports
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Analyze daily revenue, order trends, and top performing dishes.
          </p>
        </div>

        <DateRangeFilter
          fromDate={fromDate}
          toDate={toDate}
          onChange={(from, to) => {
            setFromDate(from);
            setToDate(to);
          }}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatsCard
          label="Total Revenue"
          value={formatCurrency(report.summary.totalRevenue)}
          icon={<DollarSign className="w-5 h-5" />}
          color="emerald"
        />
        <StatsCard
          label="Total Orders"
          value={report.summary.totalOrders}
          icon={<ShoppingBag className="w-5 h-5" />}
          color="blue"
        />
        <StatsCard
          label="Completed Orders"
          value={report.summary.completedOrders}
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="indigo"
          subtext={`${report.summary.cancelledOrders} cancelled`}
        />
        <StatsCard
          label="Average Order Value"
          value={formatCurrency(report.summary.avgOrderValue)}
          icon={<TrendingUp className="w-5 h-5" />}
          color="purple"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Timeline */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Revenue Timeline</h3>
              <p className="text-xs text-slate-500">Sales generated over the selected period</p>
            </div>
            <DollarSign className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={report.timeline}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(val), 'Revenue']}
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Orders Volume */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Order Volume</h3>
              <p className="text-xs text-slate-500">Number of orders received</p>
            </div>
            <ShoppingBag className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report.timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="orders" name="Orders" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Top Selling Dishes Table */}
      <Card className="p-6">
        <h3 className="text-base font-bold text-slate-900 mb-1">Top Selling Menu Items</h3>
        <p className="text-xs text-slate-500 mb-5">Ranked by total quantity ordered</p>

        {report.topItems?.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">No sales data recorded in this period.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {report.topItems?.map((item: any, idx: number) => (
              <div key={idx} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-100 font-bold text-slate-600 flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="font-bold text-slate-900 text-sm">{item.name}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900 text-sm">{formatCurrency(item.revenue)}</span>
                  <span className="text-[11px] text-slate-400 block">{item.quantity} sold</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
