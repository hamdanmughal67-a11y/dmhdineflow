import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = 'PKR'): string {
  const num = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  if (currency === 'PKR') {
    return `Rs. ${num.toLocaleString('en-PK')}`;
  }
  if (currency === 'USD') {
    return `$${num.toFixed(2)}`;
  }
  if (currency === 'AED') {
    return `AED ${num.toFixed(2)}`;
  }
  if (currency === 'SAR') {
    return `SAR ${num.toFixed(2)}`;
  }
  return `${currency} ${num.toLocaleString()}`;
}

export function getImageUrl(path?: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const defaultBackend = 'https://dmhdineflow-production.up.railway.app';
  const apiUrl = import.meta.env.VITE_API_URL || defaultBackend;
  const cleanApi = apiUrl.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanApi}${cleanPath}`;
}

export function formatTime(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function formatDate(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function timeAgo(isoString: string): string {
  if (!isoString) return '';
  const now = new Date();
  const past = new Date(isoString);
  const diffMs = now.getTime() - past.getTime();
  const mins = Math.floor(diffMs / 60000);

  if (mins < 1) return 'Just now';
  if (mins === 1) return '1 min ago';
  if (mins < 60) return `${mins} mins ago`;
  const hours = Math.floor(mins / 60);
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
}

export function getStatusBadge(status: string) {
  switch (status) {
    case 'new':
      return { label: 'New', bg: 'bg-amber-100 text-amber-800 border-amber-200', dot: 'bg-amber-500' };
    case 'accepted':
      return { label: 'Accepted', bg: 'bg-blue-100 text-blue-800 border-blue-200', dot: 'bg-blue-500' };
    case 'cooking':
      return { label: 'Cooking', bg: 'bg-orange-100 text-orange-800 border-orange-200', dot: 'bg-orange-500' };
    case 'ready':
      return { label: 'Ready', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' };
    case 'completed':
      return { label: 'Completed', bg: 'bg-slate-100 text-slate-800 border-slate-200', dot: 'bg-slate-500' };
    case 'cancelled':
      return { label: 'Cancelled', bg: 'bg-rose-100 text-rose-800 border-rose-200', dot: 'bg-rose-500' };
    case 'active':
      return { label: 'Active', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' };
    case 'suspended':
      return { label: 'Suspended', bg: 'bg-rose-100 text-rose-800 border-rose-200', dot: 'bg-rose-500' };
    case 'inactive':
      return { label: 'Inactive', bg: 'bg-slate-100 text-slate-800 border-slate-200', dot: 'bg-slate-500' };
    default:
      return { label: status, bg: 'bg-slate-100 text-slate-800 border-slate-200', dot: 'bg-slate-400' };
  }
}
