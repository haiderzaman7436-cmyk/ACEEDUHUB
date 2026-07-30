// ============================================================================
// ACE Educational Hub — Unauthorized (403) Page
// ============================================================================

import { useNavigate } from 'react-router-dom';
import { ShieldX, ArrowLeft, Home } from 'lucide-react';

export function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))] px-6">
      <div className="text-center max-w-md animate-fade-in">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-red-500/10">
          <ShieldX className="h-10 w-10 text-red-500" />
        </div>
        <h1 className="text-3xl font-bold text-[hsl(var(--foreground))]">Access Denied</h1>
        <p className="mt-3 text-[hsl(var(--muted-foreground))] leading-relaxed">
          You don't have permission to access this page. Contact your administrator if you believe this is an error.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex h-10 items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-5 text-sm font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex h-10 items-center gap-2 rounded-xl gradient-primary px-5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            <Home className="h-4 w-4" />
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
