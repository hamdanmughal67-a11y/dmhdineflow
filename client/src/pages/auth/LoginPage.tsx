import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Lock, Mail, AlertCircle, AlertTriangle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isPaymentDue, setIsPaymentDue] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsPaymentDue(false);
    setIsLoading(true);

    try {
      const res = await api.post('/auth/login', { email, password });
      login(res.data.token, res.data.user);

      if (res.data.user.role === 'super_admin') {
        navigate('/admin/dashboard');
      } else if (res.data.user.role === 'kitchen_staff') {
        navigate('/kitchen/orders');
      } else {
        navigate('/owner/dashboard');
      }
    } catch (err: any) {
      if (err.response?.data?.code === 'SUBSCRIPTION_PAYMENT_DUE' || err.response?.data?.error?.includes('subscription payment is due')) {
        setIsPaymentDue(true);
        setError('Your subscription payment is due. Please contact the administrator to renew your subscription.');
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        setError('Cannot connect to backend server. Make sure your cloud backend is running and VITE_API_URL is set.');
      } else if (err.response?.status === 404 || typeof err.response?.data === 'string') {
        setError('Backend API endpoint not found. On Netlify, please set the VITE_API_URL environment variable to your deployed backend URL.');
      } else {
        setError(err.response?.data?.error || 'Invalid email or password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col justify-center items-center p-4 selection:bg-indigo-500 selection:text-white font-sans">
      {/* Decorative backdrop glow */}
      <div className="absolute w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none -top-20 -left-20" />
      <div className="absolute w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none -bottom-20 -right-20" />

      <div className="relative w-full max-w-md">
        {/* Brand Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-white shadow-md p-2 flex items-center justify-center mb-4 border border-slate-100">
              <img src="/dmh-logo.png" alt="DMH DineFlow" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">DMH DineFlow</h1>
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mt-0.5">
              SaaS Restaurant Suite
            </p>
            <p className="text-sm text-slate-500 mt-2">Sign in to access your management dashboard</p>
          </div>

          {/* Subscription Payment Due Dedicated Warning */}
          {isPaymentDue ? (
            <div className="mb-6 p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-900 shadow-sm flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-amber-900">Subscription Payment Due</p>
                <p className="text-xs font-medium text-amber-800 mt-1 leading-relaxed">
                  Your restaurant monthly subscription has expired. Please contact the platform administrator to renew and re-activate your access.
                </p>
              </div>
            </div>
          ) : (
            error && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 leading-relaxed flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="you@restaurant.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              leftIcon={<Mail className="w-4 h-4" />}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              leftIcon={<Lock className="w-4 h-4" />}
            />

            <Button
              type="submit"
              className="w-full mt-2"
              size="lg"
              isLoading={isLoading}
            >
              Sign In to DineFlow
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-6 font-medium">
          DMH DineFlow &copy; 2026 • Multi-Tenant Restaurant SaaS
        </p>
      </div>
    </div>
  );
};
