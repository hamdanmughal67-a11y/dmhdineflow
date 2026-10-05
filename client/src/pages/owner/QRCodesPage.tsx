import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { QrCode, Download, Printer } from 'lucide-react';
import QRCode from 'qrcode';

export const QRCodesPage: React.FC = () => {
  const { user } = useAuth();
  const [tables, setTables] = useState<any[]>([]);
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.restaurant_id) {
      fetchTablesAndGenerateQrs();
    }
  }, [user]);

  const fetchTablesAndGenerateQrs = async () => {
    if (!user?.restaurant_id) return;
    setLoading(true);
    try {
      const res = await api.get(`/restaurants/${user.restaurant_id}/tables`);
      const tableList = res.data;
      setTables(tableList);

      const map: Record<string, string> = {};
      for (const t of tableList) {
        const url = `${window.location.origin}/m/${t.qr_token}`;
        const dataUrl = await QRCode.toDataURL(url, {
          width: 300,
          margin: 2,
          color: { dark: '#0f172a', light: '#ffffff' },
        });
        map[t.id] = dataUrl;
      }
      setQrMap(map);
    } catch (err) {
      console.error('Failed to load QR codes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const [downloadingZip, setDownloadingZip] = useState(false);

  const handleDownloadAll = async () => {
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Printable Table QR Codes
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Print or download high-resolution QR codes to place on dining tables.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            leftIcon={<Printer className="w-4 h-4" />}
            onClick={handlePrint}
          >
            Print Sheet
          </Button>
          <Button
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleDownloadAll}
          >
            Download All (ZIP)
          </Button>
        </div>
      </div>

      {/* QR Code Printable Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {loading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 bg-slate-200 animate-pulse rounded-2xl" />
          ))
        ) : tables.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400">
            <QrCode className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <h3 className="font-bold text-slate-700">No table QR codes generated</h3>
            <p className="text-xs text-slate-400 mt-1">Add tables in the Tables tab to generate QR tokens.</p>
          </div>
        ) : (
          tables.map((t) => (
            <Card
              key={t.id}
              className="p-5 flex flex-col items-center text-center bg-white border-2 border-slate-200 shadow-sm rounded-3xl print:border print:shadow-none"
            >
              <div className="w-full flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                  Scan & Order
                </span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">
                  {user?.restaurant_name}
                </span>
              </div>

              {qrMap[t.id] ? (
                <img
                  src={qrMap[t.id]}
                  alt={`Table ${t.table_number} QR`}
                  className="w-44 h-44 object-contain rounded-xl p-1 bg-white"
                />
              ) : (
                <div className="w-44 h-44 bg-slate-100 animate-pulse rounded-xl" />
              )}

              <h3 className="text-xl font-black text-slate-900 mt-3 tracking-wide">
                TABLE {t.table_number}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Scan with phone camera to order
              </p>

              <div className="mt-4 pt-3 border-t border-slate-100 w-full print:hidden">
                <a
                  href={qrMap[t.id]}
                  download={`Table_${t.table_number}_QR.png`}
                  className="block w-full"
                >
                  <Button variant="secondary" size="sm" className="w-full" leftIcon={<Download className="w-3.5 h-3.5" />}>
                    Download PNG
                  </Button>
                </a>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
