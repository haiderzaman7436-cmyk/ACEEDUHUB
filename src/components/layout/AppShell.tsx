// ============================================================================
// ACE Educational Hub — App Shell (Main Layout)
// ============================================================================

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { cn } from '@/lib/utils';

export function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[hsl(var(--background))]">
      {/* Sidebar */}
      <Sidebar
        isCollapsed={sidebarCollapsed}
        isMobileOpen={mobileOpen}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          onMenuClick={() => setMobileOpen(true)}
          onSearchClick={() => {
            // Global search — will be implemented in Phase 6
            console.log('Open global search');
          }}
        />

        {/* Page Content */}
        <main
          className={cn(
            'flex-1 overflow-y-auto p-4 lg:p-6',
            'transition-all duration-300'
          )}
        >
          <div className="mx-auto max-w-[1600px] page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
