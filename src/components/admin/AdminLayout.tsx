// ==============================================================================
// File: src/components/admin/AdminLayout.tsx
// Description: Official internal application shell for A TIGER GROUPS
// ==============================================================================

import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import type { BreadcrumbItem } from './AdminBreadcrumbs';

export const AdminLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const location = useLocation();

  // Generate dynamic breadcrumbs based on pathname
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const path = location.pathname;
    if (path === '/admin') {
      return [{ label: 'Dashboard' }];
    }
    if (path === '/admin/applications') {
      return [{ label: 'Dashboard', path: '/admin' }, { label: 'Applications' }];
    }
    if (path.startsWith('/admin/applications/')) {
      return [
        { label: 'Dashboard', path: '/admin' },
        { label: 'Applications', path: '/admin/applications' },
        { label: 'Application Record' }
      ];
    }
    if (path === '/admin/employer-enquiries') {
      return [{ label: 'Dashboard', path: '/admin' }, { label: 'Employer Enquiries' }];
    }
    if (path === '/admin/exports') {
      return [{ label: 'Dashboard', path: '/admin' }, { label: 'Enquiry Exports' }];
    }

    // Default formatting for other routes
    const segment = path.replace('/admin/', '').replace(/-/g, ' ');
    const formatted = segment.charAt(0).toUpperCase() + segment.slice(1);
    return [{ label: 'Dashboard', path: '/admin' }, { label: formatted }];
  };

  return (
    <div className="admin-shell">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 27, 56, 0.7)',
            backdropFilter: 'blur(2px)',
            zIndex: 45
          }}
        />
      )}

      {/* Branded Sidebar */}
      <AdminSidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Canvas (Pearl White canvas) */}
      <div className="admin-content-canvas">
        {/* Top Header */}
        <AdminHeader
          breadcrumbs={generateBreadcrumbs()}
          onOpenMobile={() => setMobileMenuOpen(true)}
        />

        {/* Page Body */}
        <main className="admin-main-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
