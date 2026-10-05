import React, { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { OwnerSidebar } from './OwnerSidebar';
import { Menu, X, ChefHat } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getImageUrl } from '../../lib/utils';

export const OwnerLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();

  const logoSrc = user?.restaurant_logo ? getImageUrl(user.restaurant_logo) : '/dmh-logo.png';

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:shrink-0">
        <OwnerSidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex flex-col w-64 max-w-xs bg-white z-10 shadow-2xl border-r border-slate-200">
            <OwnerSidebar onCloseMobile={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
          <div className="flex items-center gap-2.5 truncate">
            <img
              src={logoSrc}
              alt="Logo"
              className="w-7 h-7 rounded-lg object-contain bg-slate-50 p-0.5 border border-slate-200 shrink-0"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <span className="font-extrabold text-slate-900 text-sm truncate">{user?.restaurant_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/kitchen/orders"
              className="p-2 rounded-lg bg-amber-50 text-amber-800 text-xs font-bold flex items-center gap-1 border border-amber-200"
            >
              <ChefHat className="w-4 h-4 text-amber-700" />
              <span className="hidden sm:inline">KDS</span>
            </Link>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
