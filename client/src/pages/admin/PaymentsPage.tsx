import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { DateRangeFilter } from '../../components/ui/DateRangeFilter';
import { formatCurrency, formatDate, formatTime, getImageUrl } from '../../lib/utils';
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Eye,
  ExternalLink,
  DollarSign,
  Clock,
  Store,
  ShieldCheck,
  Receipt,
  RefreshCw,
} from 'lucide-react';

export const PaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Screenshot modal
  const [viewScreenshot, setViewScreenshot] = useState<any | null>(null);

  // Approval/Rejection action state
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    paymentId: string;
    restaurantName: string;
    actualAmount: string;
    action: 'approve' | 'reject';
    extendMonths: string;
    rejectionReason: string;
  }>({
    isOpen: false,
    paymentId: '',
    restaurantName: '',
    actualAmount: '',
    action: 'approve',
    extendMonths: '1',
    rejectionReason: '',
  });

  const [submittingAction, setSubmittingAction] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, [fromDate, toDate]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/payments', {
        params: {
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
        },
      });
      setPayments(res.data);
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPayment = async () => {
    setSubmittingAction(true);
    try {
      await api.patch(`/admin/payments/${actionModal.paymentId}/verify`, {
        action: actionModal.action,
        actual_amount: parseFloat(actionModal.actualAmount) || undefined,
        extend_months: parseInt(actionModal.extendMonths),
        rejection_reason: actionModal.rejectionReason,
      });
      setActionModal({ ...actionModal, isOpen: false });
      fetchPayments();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to verify payment.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const pendingCount = payments.filter((p) => p.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Subscription Payments & Verification
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Inspect restaurant payment proof screenshots, manually enter actual amounts received, and approve software extensions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <DateRangeFilter
            fromDate={fromDate}
            toDate={toDate}
            onChange={(from, to) => {
              setFromDate(from);
              setToDate(to);
            }}
          />

          {pendingCount > 0 && (
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold shrink-0">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              {pendingCount} Pending Verification
            </span>
          )}
          <button
            onClick={fetchPayments}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Payments Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-5">Restaurant</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Transaction Ref</th>
                <th className="py-3.5 px-4">Submitted At</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Proof Screenshot</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading payment submissions...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-700">No payment proofs submitted yet</p>
                    <p className="text-xs text-slate-400 mt-0.5">When restaurant owners upload receipts in Settings, they will appear here.</p>
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="py-4 px-5">
                      <p className="font-bold text-slate-900">{p.restaurant_name}</p>
                      <p className="text-xs text-slate-400">{p.owner_name} • {p.owner_email}</p>
                    </td>
                    <td className="py-4 px-4 font-black text-slate-900">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="py-4 px-4 font-mono text-xs text-slate-700">
                      {p.transaction_reference || 'N/A'}
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-500">
                      {formatDate(p.submitted_at)} {formatTime(p.submitted_at)}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
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
                    <td className="py-4 px-4">
                      <button
                        onClick={() => setViewScreenshot(p)}
                        className="inline-flex items-center gap-1 text-indigo-600 font-bold text-xs hover:underline"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Proof</span>
                      </button>
                    </td>
                    <td className="py-4 px-5 text-right">
                      {p.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="success"
                            size="sm"
                            leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                            onClick={() =>
                              setActionModal({
                                isOpen: true,
                                paymentId: p.id,
                                restaurantName: p.restaurant_name,
                                actualAmount: p.amount?.toString() || '',
                                action: 'approve',
                                extendMonths: '1',
                                rejectionReason: '',
                              })
                            }
                          >
                            Approve
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            leftIcon={<XCircle className="w-3.5 h-3.5" />}
                            onClick={() =>
                              setActionModal({
                                isOpen: true,
                                paymentId: p.id,
                                restaurantName: p.restaurant_name,
                                actualAmount: p.amount?.toString() || '',
                                action: 'reject',
                                extendMonths: '1',
                                rejectionReason: 'Screenshot unreadable or payment not received',
                              })
                            }
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Verified</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* View Screenshot Modal */}
      {viewScreenshot && (
        <Modal
          isOpen={true}
          onClose={() => setViewScreenshot(null)}
          title={`Payment Proof — ${viewScreenshot.restaurant_name}`}
          size="md"
        >
          <div className="space-y-4">
            <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center max-h-96">
              <img
                src={getImageUrl(viewScreenshot.screenshot_url)}
                alt="Payment proof screenshot"
                className="max-h-96 w-full object-contain"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <div>
                <span className="text-slate-400 font-bold block">Submitted Amount:</span>
                <span className="font-black text-slate-900 text-sm">{formatCurrency(viewScreenshot.amount)}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">Transaction Ref:</span>
                <span className="font-mono text-slate-800">{viewScreenshot.transaction_reference || 'N/A'}</span>
              </div>
              {viewScreenshot.notes && (
                <div className="col-span-2 pt-1 text-slate-600">
                  <span className="text-slate-400 font-bold block">Notes:</span>
                  {viewScreenshot.notes}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <a href={getImageUrl(viewScreenshot.screenshot_url)} target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm" leftIcon={<ExternalLink className="w-3.5 h-3.5" />}>
                  Open Original
                </Button>
              </a>
              <Button variant="secondary" size="sm" onClick={() => setViewScreenshot(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Action Verification Modal (Admin enters actual amount manually) */}
      {actionModal.isOpen && (
        <Modal
          isOpen={true}
          onClose={() => setActionModal({ ...actionModal, isOpen: false })}
          title={
            actionModal.action === 'approve'
              ? `Approve Payment for ${actionModal.restaurantName}`
              : `Reject Payment for ${actionModal.restaurantName}`
          }
          size="sm"
        >
          <div className="space-y-4">
            {actionModal.action === 'approve' ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Actual Payment Amount Received (PKR) *
                  </label>
                  <Input
                    type="number"
                    value={actionModal.actualAmount}
                    onChange={(e) => setActionModal({ ...actionModal, actualAmount: e.target.value })}
                    placeholder="Enter actual received amount..."
                    required
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Enter the exact verified amount transferred by the restaurant.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Extend Subscription Validity By:
                  </label>
                  <select
                    value={actionModal.extendMonths}
                    onChange={(e) => setActionModal({ ...actionModal, extendMonths: e.target.value })}
                    className="block w-full rounded-xl border-slate-200 bg-white text-slate-900 text-sm shadow-sm py-2.5 px-3.5 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="1">1 Month (+30 Days)</option>
                    <option value="3">3 Months (Quarterly)</option>
                    <option value="6">6 Months (Half-Yearly)</option>
                    <option value="12">12 Months (1 Year)</option>
                    <option value="24">24 Months (2 Years)</option>
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Rejection Reason:
                </label>
                <textarea
                  rows={3}
                  value={actionModal.rejectionReason}
                  onChange={(e) => setActionModal({ ...actionModal, rejectionReason: e.target.value })}
                  className="block w-full rounded-xl border-slate-200 bg-white text-slate-900 text-sm shadow-sm p-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActionModal({ ...actionModal, isOpen: false })}
              >
                Cancel
              </Button>
              <Button
                variant={actionModal.action === 'approve' ? 'success' : 'danger'}
                size="sm"
                isLoading={submittingAction}
                onClick={handleVerifyPayment}
              >
                {actionModal.action === 'approve' ? 'Save & Approve' : 'Confirm Rejection'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
