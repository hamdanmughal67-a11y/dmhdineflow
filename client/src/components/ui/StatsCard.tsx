import React from 'react';
import { Card } from './Card';
import { cn } from '../../lib/utils';

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendPositive?: boolean;
  color?: 'blue' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'purple';
  subtext?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  label,
  value,
  icon,
  trend,
  trendPositive,
  color = 'indigo',
  subtext,
}) => {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
  };

  return (
    <Card className="flex items-start justify-between p-5" hoverEffect>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">{label}</p>
        <h4 className="text-2xl font-black text-slate-900 tracking-tight">{value}</h4>
        {trend && (
          <div className="flex items-center gap-1 mt-2 text-xs font-semibold">
            <span className={trendPositive ? 'text-emerald-600' : 'text-rose-600'}>
              {trend}
            </span>
            {subtext && <span className="text-slate-400 font-normal">{subtext}</span>}
          </div>
        )}
        {subtext && !trend && (
          <p className="text-xs text-slate-400 mt-1.5">{subtext}</p>
        )}
      </div>
      <div className={cn('p-3 rounded-2xl border flex items-center justify-center shrink-0 shadow-sm', colorMap[color])}>
        {icon}
      </div>
    </Card>
  );
};
