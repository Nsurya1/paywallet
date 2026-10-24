import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ShieldCheck, Lock, User, ArrowRight, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const validate = () => {
    const errs = {};
    if (!username.trim()) {
      errs.username = 'Username is required';
    }
    if (!password) {
      errs.password = 'Password is required';
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await login(username.trim(), password);
      addToast('Welcome back to PayWallet!', 'success');
      const destination = location.state?.from?.pathname || '/';
      navigate(destination, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Login failed. Invalid credentials.';
      addToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isExpired = new URLSearchParams(location.search).get('expired');

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 items-center justify-center shadow-xl shadow-indigo-500/25 mb-4">
          <ShieldCheck className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">
          Sign in to PayWallet
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Enter your credentials to access your concurrency-safe wallet
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-slate-900/90 py-8 px-6 sm:px-10 shadow-2xl rounded-2xl border border-slate-800 backdrop-blur-xl">
          {isExpired && (
            <div className="mb-6 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium">
              Your session has expired. Please log in again to continue.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 transition-all ${
                    errors.username
                      ? 'border-rose-500 focus:ring-rose-500/30'
                      : 'border-slate-800 focus:border-brand-500 focus:ring-brand-500/20'
                  }`}
                  placeholder="alice"
                  autoComplete="username"
                  disabled={isSubmitting}
                />
              </div>
              {errors.username && (
                <p className="mt-1 text-xs text-rose-400">{errors.username}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 transition-all ${
                    errors.password
                      ? 'border-rose-500 focus:ring-rose-500/30'
                      : 'border-slate-800 focus:border-brand-500 focus:ring-brand-500/20'
                  }`}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  disabled={isSubmitting}
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-rose-400">{errors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            Don't have an account yet?{' '}
            <Link
              to="/register"
              className="font-semibold text-brand-400 hover:text-brand-300 underline underline-offset-4"
            >
              Create account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
