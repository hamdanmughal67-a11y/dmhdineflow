import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  Layers,
  Grid,
  QrCode,
  BarChart3,
  Settings,
  LogOut,
  ChefHat,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn, getImageUrl } from '../../lib/utils';

interface OwnerSidebarProps {
  onCloseMobile?: () => void;
}

export const OwnerSidebar: React.FC<OwnerSidebarProps> = ({ onCloseMobile }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { label: 'Dashboard', path: '/owner/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: 'Live Orders', path: '/owner/orders', icon: <ShoppingBag className="w-5 h-5" /> },
    { label: 'Categories', path: '/owner/categories', icon: <Layers className="w-5 h-5" /> },
    { label: 'Menu Items', path: '/owner/menu-items', icon: <UtensilsCrossed className="w-5 h-5" /> },
    { label: 'Tables', path: '/owner/tables', icon: <Grid className="w-5 h-5" /> },
    { label: 'QR Codes', path: '/owner/qr-codes', icon: <QrCode className="w-5 h-5" /> },
    { label: 'Reports & Analytics', path: '/owner/reports', icon: <BarChart3 className="w-5 h-5" /> },
    { label: 'Settings', path: '/owner/settings', icon: <Settings className="w-5 h-5" /> },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const logoSrc = user?.restaurant_logo ? getImageUrl(user.restaurant_logo) : '/dmh-logo.png';

  return (
    <aside className="w-64 bg-white text-slate-700 flex flex-col h-full border-r border-slate-200 select-none shadow-sm">
      {/* Restaurant Header with Official Logo */}
      <div className="p-5 border-b border-slate-100 flex items-center gap-3.5 bg-slate-50/50">
        <img
          src={logoSrc}
          alt={user?.restaurant_name || 'Restaurant Logo'}
          className="w-10 h-10 rounded-xl object-contain bg-white p-1 border border-slate-200 shadow-sm shrink-0"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        <div className="truncate">
          <h2 className="font-extrabold text-sm tracking-tight text-slate-900 truncate">
            {user?.restaurant_name || 'Restaurant Owner'}
          </h2>
          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/60 mt-0.5">
            Owner Portal
          </span>
        </div>
      </div>

      {/* Navigation Links in Clean Light Theme */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onCloseMobile}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150',
                isActive
                  ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200/80 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              )
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}

        {/* Quick link to Kitchen KDS */}
        <div className="pt-4 mt-4 border-t border-slate-100">
          <NavLink
            to="/kitchen/orders"
            onClick={onCloseMobile}
            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100/80 border border-amber-200 transition-all shadow-sm"
          >
            <span className="flex items-center gap-2">
              <ChefHat className="w-4 h-4 text-amber-700" />
              Kitchen Display (KDS)
            </span>
            <ExternalLink className="w-3.5 h-3.5 text-amber-700" />
          </NavLink>
        </div>
      </nav>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            {user?.restaurant_logo ? (
              <img
                src={getImageUrl(user.restaurant_logo)}
                alt={user.restaurant_name || user.name}
                className="w-8 h-8 rounded-lg object-contain bg-white border border-slate-200 shrink-0 shadow-sm p-0.5"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-xs shrink-0 shadow-sm">
                {user?.name?.charAt(0) || 'O'}
              </div>
            )}
            <div className="truncate">
              <p className="text-xs font-bold text-slate-900 truncate">{user?.name}</p>
              <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Logout"
            className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
