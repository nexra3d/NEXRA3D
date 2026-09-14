import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, LogIn, ArrowLeft, AlertCircle, Sparkles } from 'lucide-react';
import { User } from '../types';

interface AdminLoginPageProps {
  onLoginSuccess: (user: User) => void;
  onNavigateHome: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onLoginSuccess,
  onNavigateHome
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdminLogin = async (e?: React.FormEvent, customEmail?: string, customPass?: string) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    const loginEmail = customEmail || email;
    const loginPass = customPass || password;

    if (!loginEmail || !loginPass) {
      setErrorMsg('Please enter admin email and password.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPass })
      });

      let data: any = {};
      try {
        const text = await res.text();
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      setLoading(false);

      if (!res.ok) {
        setErrorMsg(data.error || data.message || 'Invalid administrator credentials.');
      } else {
        if (data.user?.role !== 'ADMIN') {
          setErrorMsg('Access denied. This user does not have Administrator privileges.');
          return;
        }

        if (data.token) {
          localStorage.setItem('auth_token', data.token);
        }
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        }
        onLoginSuccess(data.user);
      }
    } catch (err) {
      setLoading(false);
      setErrorMsg('Network error. Unable to connect to authentication server.');
    }
  };

  return (
    <div className="min-h-[85vh] bg-slate-50 flex items-center justify-center px-4 py-12 text-slate-900 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden relative">
        {/* Top Header Accent */}
        <div className="bg-gradient-to-r from-slate-50 via-indigo-50/60 to-slate-50 p-8 border-b border-slate-200 relative">
          <div className="flex items-center justify-between mb-4">
            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin Gateway</span>
            </span>

            <button
              onClick={onNavigateHome}
              className="text-xs text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1 font-bold cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Store</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-100">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">NEXRA Admin Portal</h1>
              <p className="text-xs text-slate-500 mt-0.5">Secure Management System Log In</p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {/* Error Alert */}
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold p-4 rounded-2xl flex items-start space-x-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                Admin Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@store.com"
                  className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-900 font-medium transition-all focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                Admin Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-indigo-500 rounded-xl pl-10 pr-10 py-3 text-xs text-slate-900 font-medium transition-all focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm py-3.5 rounded-2xl transition-all cursor-pointer shadow-md shadow-indigo-100 flex items-center justify-center space-x-2 disabled:opacity-60"
            >
              {loading ? (
                <span>Verifying Privileges...</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Log In as Admin</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
