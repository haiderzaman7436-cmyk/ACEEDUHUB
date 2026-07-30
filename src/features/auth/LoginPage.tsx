// ============================================================================
// ACE Educational Hub — Login Page
// ============================================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { Eye, EyeOff, Loader2, AlertCircle, Mail, Lock, ShieldCheck } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';
import logoImg from '@/assets/logo.webp';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const from = '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      switch (firebaseError.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setError('Invalid email or password. Please try again.');
          break;
        case 'auth/too-many-requests':
          setError('Too many failed attempts. Please try again later.');
          break;
        case 'auth/user-disabled':
          setError('This account has been disabled. Contact your administrator.');
          break;
        default:
          setError('An error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Panel: Blue background with branding card */}
      <div className="relative hidden w-full flex-col justify-between bg-[#1e3a8a] lg:flex lg:w-[55%]">
        
        {/* Top Header Logo */}
        <div className="relative z-10 flex items-center gap-3 p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white p-1">
            <img src={logoImg} alt="Logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wider text-white uppercase">
              {APP_NAME}
            </h1>
            <div className="flex items-center gap-1 text-[13px] text-blue-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Secure Portal</span>
            </div>
          </div>
        </div>

        {/* Center Content Card */}
        <div className="relative z-10 flex flex-1 items-center justify-center px-12">
          <div className="w-full max-w-[500px] rounded-[2rem] bg-[#f1f5f9] p-10 sm:p-12 shadow-2xl">
            <h2 className="text-4xl font-extrabold leading-[1.15] tracking-tight text-slate-900 sm:text-5xl mb-6">
              Shaping the <span className="text-blue-600">Future</span> of Education.
            </h2>
            <p className="mb-10 text-base leading-relaxed text-slate-700">
              Experience a unified, seamless platform designed to empower educators, engage students, and streamline every aspect of school management.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-3">
              <span className="rounded-full bg-white px-4 py-2 text-[10px] font-bold tracking-wider text-slate-700 shadow-sm">SMART ANALYTICS</span>
              <span className="rounded-full bg-white px-4 py-2 text-[10px] font-bold tracking-wider text-slate-700 shadow-sm">FEE MANAGEMENT</span>
              <span className="rounded-full bg-white px-4 py-2 text-[10px] font-bold tracking-wider text-slate-700 shadow-sm">STUDENT PORTALS</span>
              <span className="rounded-full bg-white px-4 py-2 text-[10px] font-bold tracking-wider text-slate-700 shadow-sm">AUTOMATED REPORTS</span>
            </div>
          </div>
        </div>

        {/* Footer Text */}
        <div className="relative z-10 p-8">
          <p className="text-sm font-medium text-blue-200">
            © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
          </p>
        </div>

        {/* Background Watermark (using the logo faintly) */}
        <div className="absolute inset-0 flex items-center justify-end pr-10 pointer-events-none overflow-hidden opacity-[0.04]">
          <img src={logoImg} alt="Background Watermark" className="h-[120%] object-contain" />
        </div>
      </div>

      {/* Right Panel: Clean White Form */}
      <div className="flex w-full flex-col items-center justify-center bg-[#f8fafc] px-6 lg:w-[45%]">
        <div className="w-full max-w-[400px]">
          
          {/* Mobile Header (Hidden on LG) */}
          <div className="mb-10 flex flex-col lg:hidden">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-white p-2 shadow-sm">
              <img src={logoImg} alt="Logo" className="h-full w-full object-contain" />
            </div>
            <h1 className="text-2xl font-bold uppercase tracking-wider text-slate-900">
              {APP_NAME}
            </h1>
          </div>

          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Welcome Back
            </h2>
            <p className="mt-2 text-sm text-slate-500 font-medium">
              Please sign in to access your dashboard
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl bg-red-50 p-4 border border-red-100">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
              <p className="text-sm text-red-800 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-xs font-bold text-slate-900 ml-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@school.com"
                  required
                  autoComplete="email"
                  className="block w-full rounded-[14px] border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-[15px] text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-xs font-bold text-slate-900 ml-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="block w-full rounded-[14px] border border-slate-200 bg-white py-3.5 pl-12 pr-12 text-[15px] text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-600 focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !email || !password}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-[14px] bg-[#5a677d] py-4 px-4 text-[15px] font-semibold text-white shadow-sm hover:bg-[#4a5568] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In to Portal'
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
