// ==============================================================================
// File: src/components/admin/AdminLayout.tsx
// Description: Official internal application shell for A TIGER GROUPS
// Features: Branded sidebar, header, breadcrumbs, realtime notifications provider,
//           and in-app toast alerts.
// ==============================================================================

import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { AdminNotificationToast } from './AdminNotificationToast';
import { AdminNotificationProvider } from '../../contexts/AdminNotificationContext';
import type { BreadcrumbItem } from './AdminBreadcrumbs';
import { ADMIN_ROUTES } from '../../constants/adminRoutes';

export const AdminLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const location = useLocation();

  // Generate dynamic breadcrumbs based on pathname
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const path = location.pathname;

    if (path === ADMIN_ROUTES.dashboard) {
      return [{ label: 'Dashboard' }];
    }
    if (path === ADMIN_ROUTES.applications) {
      return [{ label: 'Dashboard', path: ADMIN_ROUTES.dashboard }, { label: 'Applications' }];
    }
    if (path.startsWith('/admin/applications/')) {
      return [
        { label: 'Dashboard', path: ADMIN_ROUTES.dashboard },
        { label: 'Applications', path: ADMIN_ROUTES.applications },
        { label: 'Application Record' }
      ];
    }
    if (path === ADMIN_ROUTES.employerEnquiries) {
      return [{ label: 'Dashboard', path: ADMIN_ROUTES.dashboard }, { label: 'Employer Enquiries' }];
    }
    if (path === ADMIN_ROUTES.exports) {
      return [{ label: 'Dashboard', path: ADMIN_ROUTES.dashboard }, { label: 'Data & Enquiry Exports' }];
    }
    if (path === ADMIN_ROUTES.jobs) {
      return [{ label: 'Dashboard', path: ADMIN_ROUTES.dashboard }, { label: 'Jobs Management' }];
    }
    if (path === ADMIN_ROUTES.companies) {
      return [{ label: 'Dashboard', path: ADMIN_ROUTES.dashboard }, { label: 'Partner Companies' }];
    }
    if (path === ADMIN_ROUTES.joining) {
      return [{ label: 'Dashboard', path: ADMIN_ROUTES.dashboard }, { label: 'Digital Joining Packets' }];
    }
    if (path === ADMIN_ROUTES.documents) {
      return [{ label: 'Dashboard', path: ADMIN_ROUTES.dashboard }, { label: 'Document Verification' }];
    }
    if (path === ADMIN_ROUTES.payments) {
      return [{ label: 'Dashboard', path: ADMIN_ROUTES.dashboard }, { label: 'Payment Transactions' }];
    }
    if (path === ADMIN_ROUTES.referenceSlips) {
      return [{ label: 'Dashboard', path: ADMIN_ROUTES.dashboard }, { label: 'Reference Slips' }];
    }
    if (path === ADMIN_ROUTES.employees) {
      return [{ label: 'Dashboard', path: ADMIN_ROUTES.dashboard }, { label: 'Employees Directory' }];
    }
    if (path === ADMIN_ROUTES.files) {
      return [{ label: 'Dashboard', path: ADMIN_ROUTES.dashboard }, { label: 'Generated Files Archive' }];
    }
    if (path === ADMIN_ROUTES.activity) {
      return [{ label: 'Dashboard', path: ADMIN_ROUTES.dashboard }, { label: 'System Audit Activity' }];
    }
    if (path === ADMIN_ROUTES.settings) {
      return [{ label: 'Dashboard', path: ADMIN_ROUTES.dashboard }, { label: 'Administration Settings' }];
    }

    // Default formatting for other dynamic or unmapped admin paths
    const segment = path.replace('/admin/', '').replace(/-/g, ' ');
    const formatted = segment ? segment.charAt(0).toUpperCase() + segment.slice(1) : 'Admin Area';
    return [{ label: 'Dashboard', path: ADMIN_ROUTES.dashboard }, { label: formatted }];
  };

  return (
    <AdminNotificationProvider>
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
          {/* Top Header with breadcrumbs and notification bell */}
          <AdminHeader
            breadcrumbs={generateBreadcrumbs()}
            onOpenMobile={() => setMobileMenuOpen(true)}
          />

          {/* Page Body */}
          <main className="admin-main-body">
            <Outlet />
          </main>
        </div>

        {/* In-App Floating Toast Notification for Realtime Events */}
        <AdminNotificationToast />
      </div>
    </AdminNotificationProvider>
  );
};
