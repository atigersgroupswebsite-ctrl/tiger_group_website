// ==============================================================================
// File: src/components/admin/AdminSidebar.tsx
// Description: Official internal navigation sidebar for A TIGER GROUPS
// Features: Client logo, approved color hierarchy, core & suite navigation
// ==============================================================================

import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  Factory,
  FileCheck2,
  FolderOpen,
  FolderArchive,
  CreditCard,
  FileText,
  UserCheck,
  Download,
  Activity,
  Settings,
  ExternalLink,
  ShieldCheck,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { ADMIN_ROUTES } from '../../constants/adminRoutes';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

interface AdminSidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItemDef {
  name: string;
  path: string;
  icon: React.ElementType;
  isStage3?: boolean;
  requiredPermission?: string;
}

const CORE_NAV_ITEMS: NavItemDef[] = [
  { name: 'Dashboard', path: ADMIN_ROUTES.dashboard, icon: LayoutDashboard, requiredPermission: 'dashboard.view' },
  { name: 'Admin Management', path: ADMIN_ROUTES.adminManagement, icon: ShieldCheck, requiredPermission: 'admin_management.view' },
  { name: 'Applications', path: ADMIN_ROUTES.applications, icon: Users, requiredPermission: 'dashboard.view' },
  { name: 'Joining Submissions', path: ADMIN_ROUTES.joining, icon: FileCheck2, requiredPermission: 'regular_joining.submissions' },
  { name: 'Regular Joining Form', path: ADMIN_ROUTES.regularJoining, icon: FileCheck2, requiredPermission: 'regular_joining.view' },
  { name: 'Employer Enquiries', path: ADMIN_ROUTES.employerEnquiries, icon: Building2, requiredPermission: 'dashboard.view' },
  { name: 'Exports', path: ADMIN_ROUTES.exports, icon: Download, requiredPermission: 'reports.view' }
];

const OPERATOR_NAV_ITEMS: NavItemDef[] = [
  { name: 'Regular Joining Form', path: ADMIN_ROUTES.regularJoining, icon: FileCheck2 },
  { name: 'Joining Submissions', path: ADMIN_ROUTES.regularJoiningList, icon: FileCheck2 }
];

const MANAGEMENT_SUITE_ITEMS: NavItemDef[] = [
  { name: 'Jobs', path: ADMIN_ROUTES.jobs, icon: Briefcase, isStage3: true, requiredPermission: 'website.view' },
  { name: 'Companies', path: ADMIN_ROUTES.companies, icon: Factory, isStage3: true, requiredPermission: 'website.view' },
  { name: 'Documents', path: ADMIN_ROUTES.documents, icon: FolderOpen, isStage3: true, requiredPermission: 'documents.view' },
  { name: 'Payments', path: ADMIN_ROUTES.payments, icon: CreditCard, isStage3: true, requiredPermission: 'dashboard.view' },
  { name: 'Reference Slips', path: ADMIN_ROUTES.referenceSlips, icon: FileText, isStage3: true, requiredPermission: 'regular_joining.generate_slip' },
  { name: 'Employees', path: ADMIN_ROUTES.employees, icon: UserCheck, isStage3: true, requiredPermission: 'employees.view' },
  { name: 'Files', path: ADMIN_ROUTES.files, icon: FolderArchive, isStage3: true, requiredPermission: 'documents.view' },
  { name: 'Activity', path: ADMIN_ROUTES.activity, icon: Activity, isStage3: true, requiredPermission: 'admin_management.view' },
  { name: 'Settings', path: ADMIN_ROUTES.settings, icon: Settings, isStage3: true, requiredPermission: 'settings.view' },
  { name: 'Joining Config', path: ADMIN_ROUTES.joiningFormSettings, icon: SlidersHorizontal, isStage3: true, requiredPermission: 'settings.view' }
];

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const { isJoiningOperator, role, isSuperAdmin, hasPermission } = useAdminAuth();
  const isOperator = isJoiningOperator || role === 'REGULAR_JOINING_OPERATOR';

  // Filter items by permission (Super Admin sees all)
  const visibleCoreItems = CORE_NAV_ITEMS.filter(
    (item) => isSuperAdmin || !item.requiredPermission || hasPermission(item.requiredPermission)
  );

  const visibleSuiteItems = MANAGEMENT_SUITE_ITEMS.filter(
    (item) => isSuperAdmin || !item.requiredPermission || hasPermission(item.requiredPermission)
  );

  return (
    <aside className={`admin-sidebar ${mobileOpen ? 'open' : ''}`}>
      {/* Brand Header with A TIGER GROUPS Client Logo */}
      <div className="admin-sidebar-brand">
        <img
          src="/assets/tiger-logo.jpeg"
          alt="TIGER GROUPS"
          className="admin-sidebar-logo"
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="admin-sidebar-title">TIGER GROUPS</div>
          <div className="admin-sidebar-subtitle">
            {isOperator ? 'Joining Operator Panel' : 'Internal Administration'}
          </div>
        </div>

        {/* Mobile close button */}
        <button
          onClick={onCloseMobile}
          style={{
            display: 'none',
            background: 'transparent',
            border: 'none',
            color: '#FCFBFB',
            cursor: 'pointer',
            padding: '4px'
          }}
          className="admin-mobile-toggle"
          aria-label="Close menu"
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation List */}
      <div className="admin-sidebar-nav">
        {isOperator ? (
          /* Scoped Operator Navigation Group */
          <div>
            <div className="admin-nav-group-title">Joining Operations</div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {OPERATOR_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === ADMIN_ROUTES.dashboard}
                    onClick={onCloseMobile}
                    className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
                  >
                    <Icon size={17} />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        ) : (
          /* Administrator Full Operations Navigation Groups */
          <>
            {/* Core Operations Group */}
            <div>
              <div className="admin-nav-group-title">Core Operations</div>
              <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {visibleCoreItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === ADMIN_ROUTES.dashboard}
                      onClick={onCloseMobile}
                      className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
                    >
                      <Icon size={17} />
                      <span>{item.name}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            {/* Management Suite Group */}
            {visibleSuiteItems.length > 0 && (
              <div>
                <div
                  className="admin-nav-group-title"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <span>Operations Suite</span>
                  <span
                    style={{
                      fontSize: '0.625rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      color: 'rgba(252, 251, 251, 0.7)',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}
                  >
                    Stage 3
                  </span>
                </div>
                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  {visibleSuiteItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={onCloseMobile}
                      className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
                      style={{ opacity: 0.85 }}
                    >
                      <Icon size={16} />
                      <span style={{ fontSize: '0.825rem' }}>{item.name}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>
          )}
        </>
      )}
      </div>

      {/* Footer link to public website */}
      <div
        style={{
          padding: '1rem 1.25rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(15, 27, 56, 0.6)'
        }}
      >
        <Link
          to="/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            fontSize: '0.8rem',
            color: 'rgba(252, 251, 251, 0.75)',
            backgroundColor: 'rgba(25, 42, 86, 0.5)',
            border: '1px solid rgba(247, 215, 148, 0.2)',
            textDecoration: 'none',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = '#F7D794';
            (e.currentTarget as HTMLElement).style.borderColor = '#F7D794';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = 'rgba(252, 251, 251, 0.75)';
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(247, 215, 148, 0.2)';
          }}
        >
          <span>Open Public Portal</span>
          <ExternalLink size={13} />
        </Link>
      </div>
    </aside>
  );
};
