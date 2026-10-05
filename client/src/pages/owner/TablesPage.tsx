import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { formatCurrency } from '../../lib/utils';
import {
  Grid,
  Plus,
  QrCode,
  Download,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Layers,
} from 'lucide-react';
import QRCode from 'qrcode';

export const TablesPage: React.FC = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Single Add / Bulk Generate Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState('');
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [generateCount, setGenerateCount] = useState('5');
  const [submitting, setSubmitting] = useState(false);

  // View QR Modal
  const [qrModal, setQrModal] = useState<{ isOpen: boolean; qrDataUrl: string; tableNumber: number; url: string }>({
    isOpen: false,
    qrDataUrl: '',
    tableNumber: 0,
    url: '',
  });

  // Close Session Confirm
  const [closeSessionConfirm, setCloseSessionConfirm] = useState<{
    isOpen: boolean;
    sessionId: string;
    tableNumber: number;
    total: number;
  }>({
    isOpen: false,
    sessionId: '',
    tableNumber: 0,
    total: 0,
  });

  // Delete Confirm
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string; number: number }>({
    isOpen: false,
    id: '',
    number: 0,
  });

  useEffect(() => {
    if (user?.restaurant_id) {
      fetchTables();
    }
  }, [user]);

  // Real-time synchronization: Instant updates for session start, close, order status & table events
  useEffect(() => {
    if (!user?.restaurant_id) return;

    if (socket) {
      socket.emit('join:restaurant', user.restaurant_id);

      const handleTableSync = (payload: any) => {
        if (payload?.restaurant_id && payload.restaurant_id !== user.restaurant_id) return;
        fetchTables(true); // Silent update without flickering loading spinner
      };

      socket.on('session:started', handleTableSync);
      socket.on('session:closed', handleTableSync);
      socket.on('table:updated', handleTableSync);
      socket.on('order:new', handleTableSync);
      socket.on('order:status_updated', handleTableSync);
      socket.on('order:updated', handleTableSync);

      return () => {
        socket.off('session:started', handleTableSync);
        socket.off('session:closed', handleTableSync);
        socket.off('table:updated', handleTableSync);
        socket.off('order:new', handleTableSync);
        socket.off('order:status_updated', handleTableSync);
        socket.off('order:updated', handleTableSync);
      };
    }
  }, [socket, user?.restaurant_id]);

  // Safety net poller: Every 4 seconds, verify table active statuses silently
  useEffect(() => {
    if (!user?.restaurant_id) return;
    const interval = setInterval(() => {
      fetchTables(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [user?.restaurant_id]);

  const fetchTables = async (silent: boolean = false) => {
    if (!user?.restaurant_id) return;
    if (!silent) setLoading(true);
    try {
      const res = await api.get(`/restaurants/${user.restaurant_id}/tables`);
      setTables(res.data);
    } catch (err) {
      console.error('Failed to load tables:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.restaurant_id) return;
    setSubmitting(true);
    try {
      await api.post(`/restaurants/${user.restaurant_id}/tables`, {
        table_number: tableNumber,
      });
      setAddModalOpen(false);
      setTableNumber('');
      fetchTables();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add table.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateTables = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.restaurant_id) return;
    setSubmitting(true);
    try {
      await api.post(`/restaurants/${user.restaurant_id}/tables/generate`, {
        count: generateCount,
      });
      setGenerateModalOpen(false);
      fetchTables();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to generate tables.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewQR = async (table: any) => {
    const url = `${window.location.origin}/m/${table.qr_token}`;
    try {
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 350,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' },
      });
      setQrModal({
        isOpen: true,
        qrDataUrl,
        tableNumber: table.table_number,
        url,
      });
    } catch (err) {
      console.error('Failed to generate QR:', err);
    }
  };

  const handleCloseSession = async () => {
    try {
      await api.post(`/sessions/${closeSessionConfirm.sessionId}/close`);
      setCloseSessionConfirm({ ...closeSessionConfirm, isOpen: false });
      fetchTables();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to close session.');
    }
  };

  const handleDeleteTable = async () => {
    try {
      await api.delete(`/tables/${deleteConfirm.id}`);
      setDeleteConfirm({ ...deleteConfirm, isOpen: false });
      fetchTables();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete table.');
    }
  };

  const [downloadingZip, setDownloadingZip] = useState(false);

  const handleDownloadAllQRs = async () => {
    if (!user?.restaurant_id) return;
    setDownloadingZip(true);
    try {
      const res = await api.get(`/restaurants/${user.restaurant_id}/tables/qr-all`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${user.restaurant_name || 'Restaurant'}_QR_Codes.zip`.replace(/\s+/g, '_'));
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Failed to download QR codes ZIP:', err);
      alert('Failed to download QR codes. Please try again.');
    } finally {
      setDownloadingZip(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Dining Tables & QR Codes
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure tables, download print-ready QR codes, and manage active customer sessions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleDownloadAllQRs}
          >
            Download All QRs (ZIP)
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Layers className="w-4 h-4" />}
            onClick={() => setGenerateModalOpen(true)}
          >
            Bulk Generate
          </Button>
          <Button
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setAddModalOpen(true)}
          >
            Add Table
          </Button>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {loading ? (
          [1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 bg-slate-200 animate-pulse rounded-2xl" />
          ))
        ) : tables.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400">
            <Grid className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <h3 className="font-bold text-slate-700">No tables configured</h3>
            <p className="text-xs text-slate-400 mt-1">Use "Bulk Generate" to create 5-20 tables in 1 second.</p>
          </div>
        ) : (
          tables.map((table) => (
            <Card
              key={table.id}
              className={`p-5 flex flex-col justify-between transition-all ${
                table.has_active_session
                  ? 'border-indigo-300 bg-indigo-50/20 shadow-md'
                  : 'bg-white'
              }`}
              hoverEffect
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
                      {table.table_number}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base">
                        Table {table.table_number}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          table.has_active_session
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {table.has_active_session ? 'Active Session' : 'Available'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleViewQR(table)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors shadow-sm"
                    title="View QR Code"
                  >
                    <QrCode className="w-5 h-5" />
                  </button>
                </div>

                {/* Active Session Info if any */}
                {table.has_active_session && (
                  <div className="mt-4 p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs">
                    <div className="flex justify-between font-semibold text-slate-700">
                      <span>Orders in Session:</span>
                      <span className="font-bold">{table.active_orders}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900 mt-1">
                      <span>Session Total:</span>
                      <span className="text-indigo-600">{formatCurrency(table.session_total)}</span>
                    </div>
                    <button
                      onClick={() =>
                        setCloseSessionConfirm({
                          isOpen: true,
                          sessionId: table.session_id,
                          tableNumber: table.table_number,
                          total: table.session_total,
                        })
                      }
                      className="w-full mt-2 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-[11px] hover:bg-indigo-700 transition-colors"
                    >
                      Close Table Session
                    </button>
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <a
                  href={`/m/${table.qr_token}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-indigo-600 font-bold hover:underline"
                >
                  <span>Test Scan</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <button
                  onClick={() =>
                    setDeleteConfirm({
                      isOpen: true,
                      id: table.id,
                      number: table.table_number,
                    })
                  }
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                  title="Delete Table"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Add Single Table Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add Single Table"
        description="Enter the table number for your dining area"
      >
        <form onSubmit={handleAddTable} className="space-y-4">
          <Input
            label="Table Number *"
            type="number"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            placeholder="e.g. 7"
            required
          />
          <div className="flex justify-end gap-3 pt-3">
            <Button variant="outline" type="button" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Add Table
            </Button>
          </div>
        </form>
      </Modal>

      {/* Bulk Generate Modal */}
      <Modal
        isOpen={generateModalOpen}
        onClose={() => setGenerateModalOpen(false)}
        title="Bulk Generate Tables"
        description="Quickly generate sequential dining tables with unique secure QR tokens"
      >
        <form onSubmit={handleGenerateTables} className="space-y-4">
          <Input
            label="Number of Tables to Create *"
            type="number"
            value={generateCount}
            onChange={(e) => setGenerateCount(e.target.value)}
            placeholder="5"
            min="1"
            max="100"
            required
          />
          <div className="flex justify-end gap-3 pt-3">
            <Button variant="outline" type="button" onClick={() => setGenerateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Generate Tables
            </Button>
          </div>
        </form>
      </Modal>

      {/* View QR Code Modal */}
      <Modal
        isOpen={qrModal.isOpen}
        onClose={() => setQrModal({ ...qrModal, isOpen: false })}
        title={`Table ${qrModal.tableNumber} QR Code`}
        size="sm"
      >
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-md">
            <img src={qrModal.qrDataUrl} alt={`Table ${qrModal.tableNumber} QR`} className="w-56 h-56" />
            <p className="font-black text-slate-900 text-lg mt-2 uppercase tracking-wider">
              TABLE {qrModal.tableNumber}
            </p>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">
              DMH DineFlow Smart Menu
            </p>
          </div>

          <p className="text-xs text-slate-500 max-w-xs">
            Scan with any smartphone camera to open the restaurant menu and order instantly.
          </p>

          <div className="flex gap-2 w-full pt-2">
            <a
              href={qrModal.qrDataUrl}
              download={`Table_${qrModal.tableNumber}_QR.png`}
              className="flex-1"
            >
              <Button variant="primary" className="w-full" size="sm" leftIcon={<Download className="w-4 h-4" />}>
                Download PNG
              </Button>
            </a>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(qrModal.url, '_blank')}
            >
              Open Menu
            </Button>
          </div>
        </div>
      </Modal>

      {/* Close Session Confirm */}
      <ConfirmDialog
        isOpen={closeSessionConfirm.isOpen}
        onClose={() => setCloseSessionConfirm({ ...closeSessionConfirm, isOpen: false })}
        onConfirm={handleCloseSession}
        title="Close Table Session"
        message={`Close session for Table ${closeSessionConfirm.tableNumber}? Current table total is ${formatCurrency(closeSessionConfirm.total)}. The table will become available for the next dining group.`}
        confirmLabel="Close Session"
        variant="primary"
      />

      {/* Delete Table Confirm */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ ...deleteConfirm, isOpen: false })}
        onConfirm={handleDeleteTable}
        title="Delete Table"
        message={`Are you sure you want to delete Table ${deleteConfirm.number}? Existing order history will remain preserved.`}
        confirmLabel="Delete Table"
      />
    </div>
  );
};
