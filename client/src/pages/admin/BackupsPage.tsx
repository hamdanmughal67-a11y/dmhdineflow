import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { formatDate, formatTime } from '../../lib/utils';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  Clock,
  HardDrive,
} from 'lucide-react';

export const BackupsPage: React.FC = () => {
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Restore & Delete confirms
  const [restoreConfirm, setRestoreConfirm] = useState<File | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/backups');
      setBackups(res.data);
    } catch (err: any) {
      console.error('Failed to load backups:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setCreating(true);
    setMsg(null);
    try {
      const res = await api.post('/admin/backups/create');
      setMsg({ type: 'success', text: res.data.message || 'Backup archive created successfully!' });
      fetchBackups();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Failed to create backup.' });
    } finally {
      setCreating(false);
    }
  };

  const handleDownloadBackup = (filename: string) => {
    window.open(`/api/admin/backups/${filename}/download`, '_blank');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setRestoreConfirm(e.target.files[0]);
    }
  };

  const handleExecuteRestore = async () => {
    if (!restoreConfirm) return;
    setRestoring(true);
    setMsg(null);
    try {
      const formData = new FormData();
      formData.append('backup_file', restoreConfirm);
      const res = await api.post('/admin/backups/restore', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMsg({ type: 'success', text: res.data.message || 'Database restored successfully!' });
      setRestoreConfirm(null);
      fetchBackups();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Restore failed.' });
    } finally {
      setRestoring(false);
    }
  };

  const handleDeleteBackup = async () => {
    if (!deleteConfirm) return;
    try {
      await api.delete(`/admin/backups/${deleteConfirm}`);
      setDeleteConfirm(null);
      fetchBackups();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete backup.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Database Backups & Recovery
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Automated scheduled snapshots, one-click manual backups, and disaster recovery archives.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".zip"
              onChange={handleFileUpload}
              className="hidden"
            />
            <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold text-xs hover:bg-slate-50 shadow-sm transition-all">
              <Upload className="w-4 h-4 text-indigo-600" />
              <span>Restore from ZIP</span>
            </span>
          </label>

          <Button
            onClick={handleCreateBackup}
            isLoading={creating}
            leftIcon={<Database className="w-4 h-4" />}
          >
            Create Backup Snapshot
          </Button>
        </div>
      </div>

      {msg && (
        <div
          className={`p-4 rounded-2xl border text-sm font-bold flex items-center gap-2 ${
            msg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {msg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          ) : (
            <ShieldCheck className="w-5 h-5 text-rose-600" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Auto Backup Info Card */}
      <Card className="p-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white border-0 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-indigo-300">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Automated Scheduled Backup Daemon</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Full snapshot executed automatically every 12 hours with 15-version rolling retention.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Auto-Backup Daemon ACTIVE</span>
          </div>
        </div>
      </Card>

      {/* Backups List Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-5">Archive Filename</th>
                <th className="py-3.5 px-4">Backup Type</th>
                <th className="py-3.5 px-4">Size</th>
                <th className="py-3.5 px-4">Created Timestamp</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    Loading backup archives...
                  </td>
                </tr>
              ) : backups.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No backups found. Click "Create Backup Snapshot" to generate your first backup.
                  </td>
                </tr>
              ) : (
                backups.map((b) => (
                  <tr key={b.filename} className="hover:bg-slate-50/50">
                    <td className="py-4 px-5 font-bold text-slate-900 font-mono text-xs">
                      {b.filename}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          b.type === 'auto'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {b.type === 'auto' ? 'Automated' : 'Manual'}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-semibold text-slate-700 text-xs">
                      {b.sizeFormatted}
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-500">
                      {formatDate(b.createdAt)} {formatTime(b.createdAt)}
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<Download className="w-3.5 h-3.5" />}
                          onClick={() => handleDownloadBackup(b.filename)}
                        >
                          Download
                        </Button>
                        <button
                          onClick={() => setDeleteConfirm(b.filename)}
                          className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                          title="Delete Backup"
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

      {/* Restore Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!restoreConfirm}
        onClose={() => setRestoreConfirm(null)}
        onConfirm={handleExecuteRestore}
        title="Restore Database from Backup"
        message={`Are you sure you want to restore from "${restoreConfirm?.name}"? All active database records and uploaded images will be restored to the state in this archive.`}
        confirmLabel="Confirm & Restore"
        variant="primary"
        isLoading={restoring}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteBackup}
        title="Delete Backup Archive"
        message={`Are you sure you want to delete "${deleteConfirm}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
};
