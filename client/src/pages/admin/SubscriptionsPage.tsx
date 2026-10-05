import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { formatCurrency, formatDate } from '../../lib/utils';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Calendar,
  ShieldCheck,
  Building,
} from 'lucide-react';

export const SubscriptionsPage: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchSubs();
  }, []);

  const fetchSubs = async () => {
    try {
      const res = await api.get('/admin/subscriptions');
      setSubscriptions(res.data);
    } catch (err) {
      console.error('Failed to load subscriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRenewOneMonth = async (subId: string, restaurantName: string) => {
    setActionLoading(subId);
    setSuccessMsg('');
    try {
      const res = await api.post(`/admin/subscriptions/${subId}/renew`);
      setSuccessMsg(res.data.message || `Subscription for "${restaurantName}" renewed for 1 Month (+30 Days).`);
      fetchSubs();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to renew subscription.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateStatus = async (subId: string, status: string, paymentStatus: string) => {
    setActionLoading(subId);
    setSuccessMsg('');
    try {
      await api.patch(`/admin/subscriptions/${subId}`, {
        status,
        payment_status: paymentStatus,
      });
      fetchSubs();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update subscription.');
    } finally {
      setActionLoading(null);
    }
  };

  const activeCount = subscriptions.filter((s) => !s.is_expired && s.status === 'active').length;
  const overdueCount = subscriptions.filter((s) => s.is_expired || s.status === 'payment_due' || s.status === 'expired').length;

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <CreditCard className="w-8 h-8 text-indigo-600" />
            <span>Monthly Subscriptions & Access Control</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Dynamic monthly software subscriptions. Automatically checks expiry and enforces login restrictions when payment is due.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-black border border-emerald-200">
            <span>{activeCount} Active</span>
          </div>
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-50 text-amber-800 text-xs font-black border border-amber-200">
            <span>{overdueCount} Payment Due</span>
          </div>
          <button
            onClick={fetchSubs}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs"
            title="Refresh"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-xs animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <Card className="p-0 overflow-hidden rounded-3xl border border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-4 px-5">Restaurant</th>
                <th className="py-4 px-4">Billing Plan</th>
                <th className="py-4 px-4">Monthly Fee</th>
                <th className="py-4 px-4">Cycle Expiry</th>
                <th className="py-4 px-4">Validity / Days Left</th>
                <th className="py-4 px-4">Software Access</th>
                <th className="py-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                    Loading monthly subscriptions...
                  </td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <p className="font-bold text-slate-700">No subscriptions found</p>
                  </td>
                </tr>
              ) : (
                subscriptions.map((s) => {
                  const isOverdue = s.is_expired || s.days_remaining < 0 || s.status === 'payment_due' || s.status === 'expired';

                  return (
                    <tr key={s.id} className={`transition-colors ${isOverdue ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-slate-50/60'}`}>
                      <td className="py-4 px-5">
                        <div className="font-black text-slate-900 flex items-center gap-1.5">
                          <Building className="w-4 h-4 text-slate-400" />
                          <span>{s.restaurant_name}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
                          Started: {formatDate(s.start_date || s.created_at)}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 font-black text-xs border border-indigo-200 uppercase">
                          {s.plan || 'Pro Monthly'}
                        </span>
                      </td>

                      <td className="py-4 px-4 font-black text-slate-900">
                        {formatCurrency(s.amount || 3000)} / mo
                      </td>

                      <td className="py-4 px-4 text-xs font-bold text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDate(s.expiry_date)}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        {isOverdue ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-100 text-rose-800 text-xs font-black border border-rose-200">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Payment Due ({Math.abs(s.days_remaining)}d overdue)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-black border border-emerald-200">
                            <Clock className="w-3 h-3" />
                            <span>{s.days_remaining} Days Remaining</span>
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        {isOverdue ? (
                          <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 text-xs font-black border border-amber-300">
                            🔒 Blocked / Due
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 text-xs font-black border border-emerald-300">
                            ✓ Active Access
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            isLoading={actionLoading === s.id}
                            onClick={() => handleRenewOneMonth(s.id, s.restaurant_name)}
                            className="bg-[#d70f64] hover:bg-[#b00c52] text-white font-black rounded-xl text-xs shadow-xs"
                            leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                          >
                            Renew 1 Month (+30d)
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
