// ============================================================================
// ACE Educational Hub — Sidebar Navigation (Light Theme)
// ============================================================================

import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { NAV_ITEMS, APP_NAME } from '@/lib/constants';
import { cn } from '@/lib/utils';
import logoImg from '@/assets/logo.jpeg';
import {
  LayoutDashboard, GraduationCap, Users, BookOpen, DollarSign,
  Receipt, Package, UserPlus, BarChart3, Settings, ChevronDown,
  ChevronLeft, ChevronRight, School, BookText, ClipboardCheck,
  FileText, Pencil, Shirt, BookCopy, Building2, UserCog,
  Calendar, ScrollText, LogOut, X, Shield, TrendingDown,
} from 'lucide-react';

// Icon map
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, GraduationCap, Users, BookOpen, DollarSign,
  Receipt, Package, UserPlus, BarChart3, Settings, School,
  BookText, ClipboardCheck, FileText, Pencil, Shirt, BookCopy,
  Building2, UserCog, Calendar, ScrollText, TrendingDown,
};

interface SidebarProps {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onToggleCollapse: () => void;
  onMobileClose: () => void;
}

export function Sidebar({ isCollapsed, isMobileOpen, onToggleCollapse, onMobileClose }: SidebarProps) {
  const { user, logout, hasRole } = useAuth();
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpand = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title]
    );
  };

  const isActive = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  const filteredNavItems = NAV_ITEMS.filter((item) => hasRole(item.roles));

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 flex h-full flex-col transition-all duration-300 ease-in-out',
          'bg-white text-slate-700',
          'border-r border-slate-200 shadow-sm',
          // Desktop
          'lg:relative lg:z-auto',
          isCollapsed ? 'lg:w-[var(--sidebar-collapsed-width)]' : 'lg:w-[var(--sidebar-width)]',
          // Mobile
          isMobileOpen ? 'translate-x-0 w-[272px]' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* Logo / School Header */}
        <div className="flex h-[var(--header-height)] items-center justify-between px-4 border-b border-slate-100 bg-gradient-to-r from-blue-700 to-indigo-700">
          {!isCollapsed && (
            <div className="flex items-center gap-3 animate-fade-in">
              <div className="flex h-10 w-10 items-center justify-center rounded-full overflow-hidden bg-white p-0.5 shadow-md shrink-0">
                <img src={logoImg} alt="ACE Logo" className="h-full w-full object-cover rounded-full" />
              </div>
              <div className="overflow-hidden">
                <h1 className="text-sm font-bold text-white tracking-tight truncate">{APP_NAME}</h1>
                <p className="text-[10px] text-blue-100">The School of Science &amp; Arts</p>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="flex h-10 w-10 items-center justify-center rounded-full overflow-hidden bg-white p-0.5 shadow-md mx-auto">
              <img src={logoImg} alt="ACE Logo" className="h-full w-full object-cover rounded-full" />
            </div>
          )}

          {/* Mobile close button */}
          <button
            onClick={onMobileClose}
            className="lg:hidden p-1 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {filteredNavItems.map((item) => {
            const Icon = iconMap[item.icon];
            const active = isActive(item.href);
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expandedItems.includes(item.title);

            // Auto-expand if a child is active
            const childActive = item.children?.some((c) => isActive(c.href));

            if (hasChildren) {
              return (
                <div key={item.title}>
                  <button
                    onClick={() => toggleExpand(item.title)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                      childActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                      isCollapsed && 'justify-center px-2'
                    )}
                    title={isCollapsed ? item.title : undefined}
                  >
                    {Icon && <Icon className={cn('h-[18px] w-[18px] shrink-0', childActive ? 'text-blue-600' : 'text-slate-500')} />}
                    {!isCollapsed && (
                      <>
                        <span className="flex-1 text-left truncate">{item.title}</span>
                        <ChevronDown
                          className={cn(
                            'h-4 w-4 shrink-0 transition-transform duration-200 text-slate-400',
                            (isExpanded || childActive) && 'rotate-180'
                          )}
                        />
                      </>
                    )}
                  </button>

                  {/* Children */}
                  {!isCollapsed && (isExpanded || childActive) && (
                    <div className="mt-0.5 ml-4 pl-3 border-l-2 border-slate-100 space-y-0.5">
                      {item.children!
                        .filter((child) => hasRole(child.roles))
                        .map((child) => {
                          const ChildIcon = iconMap[child.icon];
                          const childIsActive = isActive(child.href);
                          return (
                            <NavLink
                              key={child.href}
                              to={child.href}
                              onClick={onMobileClose}
                              className={cn(
                                'flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-all duration-200',
                                childIsActive
                                  ? 'bg-blue-600 text-white font-medium shadow-sm'
                                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                              )}
                            >
                              {ChildIcon && <ChildIcon className="h-4 w-4 shrink-0" />}
                              <span className="truncate">{child.title}</span>
                            </NavLink>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={onMobileClose}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  active
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                  isCollapsed && 'justify-center px-2'
                )}
                title={isCollapsed ? item.title : undefined}
              >
                {Icon && <Icon className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-white' : 'text-slate-500')} />}
                {!isCollapsed && <span className="truncate">{item.title}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Collapse Toggle (Desktop) */}
        <div className="hidden lg:block px-3 py-2 border-t border-slate-100">
          <button
            onClick={onToggleCollapse}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>

        {/* User Info */}
        <div className="border-t border-slate-100 p-3 bg-slate-50">
          <div className={cn(
            'flex items-center gap-3',
            isCollapsed && 'justify-center'
          )}>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-bold shrink-0">
              {user?.displayName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{user?.displayName}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Shield className="h-3 w-3 text-blue-500" />
                  <p className="text-[11px] text-blue-600 capitalize font-medium">{user?.role}</p>
                </div>
              </div>
            )}
            {!isCollapsed && (
              <button
                onClick={logout}
                className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
