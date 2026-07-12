// ============================================================================
// ACE Educational Hub — Header Bar
// ============================================================================

import { useAuth } from '@/features/auth/AuthContext';
import {
  Menu, Search, Bell, LogOut, User, ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onMenuClick: () => void;
  onSearchClick: () => void;
}

export function Header({ onMenuClick, onSearchClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-[var(--header-height)] items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6 shadow-sm">
      {/* Left Side */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Search Bar */}
        <button
          onClick={onSearchClick}
          className="flex items-center gap-3 h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer min-w-[200px] lg:min-w-[280px]"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Search anything...</span>
          <kbd className="ml-auto hidden lg:inline-flex h-5 items-center gap-1 rounded border border-slate-200 bg-white px-1.5 text-[10px] font-medium text-slate-400">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-2">


        {/* Notifications */}
        <button
          onClick={() => navigate('/notifications')}
          className="relative p-2 rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))] transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-[18px] w-[18px]" />
          {/* Notification dot */}
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[hsl(var(--card))]" />
        </button>

        {/* User Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[hsl(var(--accent))] transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full gradient-primary text-white text-xs font-semibold">
              {user?.displayName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-[hsl(var(--foreground))] leading-tight">
                {user?.displayName}
              </p>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))] capitalize">
                {user?.role}
              </p>
            </div>
            <ChevronDown className={cn(
              'hidden md:block h-4 w-4 text-[hsl(var(--muted-foreground))] transition-transform duration-200',
              showUserMenu && 'rotate-180'
            )} />
          </button>

          {/* Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1.5 shadow-xl animate-scale-in">
              <div className="px-3 py-2 border-b border-[hsl(var(--border))] mb-1">
                <p className="text-sm font-medium text-[hsl(var(--foreground))]">{user?.displayName}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">{user?.email}</p>
              </div>
              <button
                onClick={() => { setShowUserMenu(false); navigate('/settings/profile'); }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] transition-colors"
              >
                <User className="h-4 w-4" />
                Profile Settings
              </button>
              <button
                onClick={() => { setShowUserMenu(false); logout(); }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
