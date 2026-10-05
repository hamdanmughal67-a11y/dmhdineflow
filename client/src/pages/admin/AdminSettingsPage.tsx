import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import {
  User,
  Mail,
  Phone,
  Lock,
  Upload,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Image as ImageIcon,
  KeyRound,
  Sparkles,
} from 'lucide-react';

export const AdminSettingsPage: React.FC = () => {
  const { user, updateUser } = useAuth();

  // Profile Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [logoPreview, setLogoPreview] = useState<string>('/dmh-logo.png');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    fetchProfileSettings();
  }, []);

  const fetchProfileSettings = async () => {
    try {
      let res;
      try {
        res = await api.get('/admin/settings/profile');
      } catch {
        res = await api.get('/auth/me');
      }
      if (res?.data) {
        setName(res.data.name || '');
        setEmail(res.data.email || '');
        setPhone(res.data.phone || '');
        if (res.data.logo) {
          setLogoPreview(res.data.logo);
        }
      }
    } catch (err) {
      if (user) {
        setName(user.name || '');
        setEmail(user.email || '');
        setPhone(user.phone || '');
      }
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setProfileLoading(true);

    try {
      let logoUrl = logoPreview;
      if (logoFile) {
        try {
          const uploadData = new FormData();
          uploadData.append('file', logoFile);
          const uploadRes = await api.post('/upload', uploadData);
          if (uploadRes.data?.url) {
            logoUrl = uploadRes.data.url;
          }
        } catch (uploadErr) {
          console.warn('Logo upload fallback:', uploadErr);
        }
      }

      const payload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        logo_url: logoUrl,
      };

      let res;
      try {
        res = await api.patch('/admin/settings/profile', payload);
      } catch (err: any) {
        if (err.response?.status === 404) {
          res = await api.patch('/auth/profile', payload);
        } else {
          throw err;
        }
      }

      if (res.data?.token) {
        localStorage.setItem('dineflow_token', res.data.token);
      }

      if (res.data?.user) {
        updateUser({
          name: res.data.user.name,
          email: res.data.user.email,
          phone: res.data.user.phone,
        });
        if (res.data.user.logo) {
          setLogoPreview(res.data.user.logo);
        }
      }

      setProfileSuccess(res.data.message || 'Profile settings updated successfully.');
      setLogoFile(null);
    } catch (err: any) {
      setProfileError(err.response?.data?.error || 'Failed to update profile settings.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirm password do not match.');
      return;
    }

    setPasswordLoading(true);

    try {
      const payload = {
        current_password: currentPassword.trim(),
        new_password: newPassword.trim(),
        confirm_password: confirmPassword.trim(),
      };

      let res;
      try {
        res = await api.patch('/admin/settings/password', payload);
      } catch (err: any) {
        if (err.response?.status === 404) {
          res = await api.patch('/auth/password', payload);
        } else {
          throw err;
        }
      }

      if (res.data?.token) {
        localStorage.setItem('dineflow_token', res.data.token);
      }

      setPasswordSuccess(res.data.message || 'Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.response?.data?.error || 'Failed to change password. Please verify current password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto font-sans">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <ShieldCheck className="w-8 h-8 text-purple-600" />
          <span>Super Admin Settings</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1 font-medium">
          Manage your administrator profile, platform branding logo, and master credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Profile & Branding Card */}
        <Card className="p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-5 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-600" />
                <span>Super Admin Profile & Branding</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Update administrator contact details and platform logo
              </p>
            </div>
            <span className="px-3 py-1 rounded-xl bg-purple-50 text-purple-700 text-xs font-black border border-purple-200">
              Master Account
            </span>
          </div>

          {profileSuccess && (
            <div className="my-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2.5 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{profileSuccess}</span>
            </div>
          )}

          {profileError && (
            <div className="my-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2.5 shadow-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="mt-6 space-y-6">
            {/* Logo Upload & Preview Section */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-center gap-6">
              <div className="relative group">
                <div className="w-24 h-24 rounded-2xl bg-white border border-slate-200 p-2 shadow-md flex items-center justify-center overflow-hidden">
                  <img
                    src={logoPreview}
                    alt="Platform Logo"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/dmh-logo.png';
                    }}
                  />
                </div>
              </div>

              <div className="flex-1 text-center sm:text-left space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center justify-center sm:justify-start gap-1.5">
                  <ImageIcon className="w-4 h-4 text-indigo-600" />
                  <span>Platform Suite Logo</span>
                </h4>
                <p className="text-xs text-slate-500 font-medium">
                  Recommended size: 512x512 PNG/JPEG with transparent background.
                </p>
                <div>
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:border-indigo-500 text-slate-700 hover:text-indigo-600 text-xs font-bold shadow-xs cursor-pointer transition-all">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload New Logo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Form Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input
                  label="Super Admin Full Name *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Master Administrator"
                  required
                  leftIcon={<User className="w-4 h-4 text-slate-400" />}
                />
              </div>

              <Input
                label="Super Admin Email Address *"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@dineflow.com"
                required
                leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
              />

              <Input
                label="Contact Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+92 300 1234567"
                leftIcon={<Phone className="w-4 h-4 text-slate-400" />}
              />
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                isLoading={profileLoading}
                className="rounded-xl px-6 font-bold"
                leftIcon={<Sparkles className="w-4 h-4" />}
              >
                Save Profile Settings
              </Button>
            </div>
          </form>
        </Card>

        {/* Password & Security Card */}
        <Card className="p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-5 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-indigo-600" />
                <span>Change Password & Security</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Update your Super Admin master access password
              </p>
            </div>
          </div>

          {passwordSuccess && (
            <div className="my-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2.5 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="my-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2.5 shadow-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="mt-6 space-y-4">
            <Input
              label="Current Password *"
              type="password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="New Password *"
                type="password"
                placeholder="Min 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
              />

              <Input
                label="Confirm New Password *"
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
              />
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                variant="primary"
                isLoading={passwordLoading}
                className="rounded-xl px-6 font-bold"
                leftIcon={<KeyRound className="w-4 h-4" />}
              >
                Update Password
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};
