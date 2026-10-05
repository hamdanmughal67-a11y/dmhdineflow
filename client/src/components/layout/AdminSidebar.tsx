import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Store,
  CreditCard,
  Settings,
  Database,
  Receipt,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';

interface AdminSidebarProps {
  onCloseMobile?: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ onCloseMobile }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { label: 'Platform Overview', path: '/admin/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: 'Restaurants', path: '/admin/restaurants', icon: <Store className="w-5 h-5" /> },
    { label: 'Subscriptions', path: '/admin/subscriptions', icon: <CreditCard className="w-5 h-5" /> },
    { label: 'Payment Verifications', path: '/admin/payments', icon: <Receipt className="w-5 h-5" /> },
    { label: 'Backups & Recovery', path: '/admin/backups', icon: <Database className="w-5 h-5" /> },
    { label: 'Settings', path: '/admin/settings', icon: <Settings className="w-5 h-5" /> },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-white text-slate-700 flex flex-col h-full border-r border-slate-200 select-none shadow-sm">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
        <img
          src="/dmh-logo.png"
          alt="DMH DineFlow"
          className="w-10 h-10 rounded-xl object-contain bg-white p-1 border border-slate-200 shadow-sm shrink-0"
        />
        <div className="truncate">
          <h1 className="font-extrabold text-sm tracking-tight text-slate-900 flex items-center gap-1.5 truncate">
            DMH DineFlow
          </h1>
          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/60 mt-0.5">
            <ShieldCheck className="w-3 h-3 text-purple-600" />
            Super Admin
          </span>
        </div>
      </div>

      {/* Navigation */}
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
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
              {user?.name?.charAt(0) || 'A'}
            </div>
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
