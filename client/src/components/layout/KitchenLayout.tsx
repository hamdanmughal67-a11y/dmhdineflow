import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ChefHat, ArrowLeft, Volume2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const KitchenLayout: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* Clean Light Top Header */}
      <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shadow-sm">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-black text-base text-slate-900 tracking-tight flex items-center gap-2">
              <span>{user?.restaurant_name || 'Kitchen Display System'}</span>
              <span className="text-[10px] uppercase font-extrabold tracking-widest px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                Live KDS
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">Touch-Optimized Kitchen Order Management</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
            <Volume2 className="w-4 h-4 text-emerald-600 animate-pulse" />
            <span>Audio Chime Active</span>
          </div>

          {user?.role === 'restaurant_owner' && (
            <Link
              to="/owner/dashboard"
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-200 shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Owner Panel</span>
            </Link>
          )}

          {user?.role === 'kitchen_staff' && (
            <button
              onClick={logout}
              className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors border border-rose-200 shadow-sm"
            >
              Logout Staff
            </button>
          )}
        </div>
      </header>

      {/* Main KDS Canvas */}
      <main className="flex-1 overflow-hidden p-4 md:p-6 bg-slate-50">
        <Outlet />
      </main>
    </div>
  );
};
