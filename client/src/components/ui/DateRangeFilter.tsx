import React from 'react';
import { Calendar, RotateCcw, Filter } from 'lucide-react';

export interface DateRangeFilterProps {
  fromDate: string;
  toDate: string;
  activePreset?: string;
  onChange?: (fromDate: string, toDate: string) => void;
  onFromDateChange?: (date: string) => void;
  onToDateChange?: (date: string) => void;
  onPresetSelect?: (preset: string) => void;
  onReset?: () => void;
  presets?: { id: string; label: string }[];
  className?: string;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  fromDate,
  toDate,
  activePreset,
  onChange,
  onFromDateChange,
  onToDateChange,
  onPresetSelect,
  onReset,
  presets = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'week', label: 'Last 7 Days' },
    { id: 'month', label: 'This Month' },
    { id: 'all', label: 'All Time' },
  ],
  className = '',
}) => {
  const hasCustomFilter = Boolean(fromDate || toDate);

  const handleFromChange = (newFrom: string) => {
    if (onFromDateChange) onFromDateChange(newFrom);
    if (onChange) onChange(newFrom, toDate);
  };

  const handleToChange = (newTo: string) => {
    if (onToDateChange) onToDateChange(newTo);
    if (onChange) onChange(fromDate, newTo);
  };

  const handleReset = () => {
    if (onReset) {
      onReset();
    } else if (onChange) {
      onChange('', '');
    }
    if (onFromDateChange) onFromDateChange('');
    if (onToDateChange) onToDateChange('');
  };

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50/90 rounded-2xl border border-slate-200/80 ${className}`}>
      {/* Quick Presets */}
      {presets && presets.length > 0 && onPresetSelect && (
        <div className="flex flex-wrap items-center gap-1.5">
          {presets.map((p) => {
            const isSelected = !hasCustomFilter && activePreset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onPresetSelect(p.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-[#d70f64] text-white shadow-sm'
                    : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      )}

      {/* From Date -> To Date Inputs */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 bg-white border border-slate-200/90 rounded-xl px-2.5 py-1.5 shadow-2xs">
          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-[11px] font-bold text-slate-500">From:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => handleFromChange(e.target.value)}
            className="text-xs font-bold text-slate-800 bg-transparent border-0 focus:outline-none focus:ring-0 p-0.5 cursor-pointer"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-white border border-slate-200/90 rounded-xl px-2.5 py-1.5 shadow-2xs">
          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-[11px] font-bold text-slate-500">To:</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => handleToChange(e.target.value)}
            className="text-xs font-bold text-slate-800 bg-transparent border-0 focus:outline-none focus:ring-0 p-0.5 cursor-pointer"
          />
        </div>

        {hasCustomFilter && (
          <button
            type="button"
            onClick={handleReset}
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 flex items-center gap-1 transition-colors shadow-2xs"
            title="Clear and Reset Dates"
          >
            <RotateCcw className="w-3 h-3 text-slate-500" />
            <span>Reset</span>
          </button>
        )}
      </div>
    </div>
  );
};
