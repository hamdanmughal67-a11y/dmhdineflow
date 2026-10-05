import React from 'react';
import { cn, getStatusBadge } from '../../lib/utils';

interface BadgeProps {
  status?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  children?: React.ReactNode;
  className?: string;
  showDot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  status,
  variant,
  children,
  className,
  showDot = true,
}) => {
  if (status) {
    const info = getStatusBadge(status);
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border',
          info.bg,
          className
        )}
      >
        {showDot && <span className={cn('w-1.5 h-1.5 rounded-full', info.dot)} />}
        {children || info.label}
      </span>
    );
  }

  const variants = {
    default: 'bg-slate-100 text-slate-800 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border',
        variants[variant || 'default'],
        className
      )}
    >
      {children}
    </span>
  );
};
