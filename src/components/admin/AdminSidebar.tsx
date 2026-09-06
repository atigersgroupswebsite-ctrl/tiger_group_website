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
  CreditCard,
  FileText,
  UserCheck,
  Download,
  Activity,
  Settings,
  ExternalLink,
  X
} from 'lucide-react';

interface AdminSidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItemDef {
  name: string;
  path: string;
  icon: React.ElementType;
  isStage3?: boolean;
}

const CORE_NAV_ITEMS: NavItemDef[] = [
  { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { name: 'Applications', path: '/admin/applications', icon: Users },
  { name: 'Employer Enquiries', path: '/admin/employer-enquiries', icon: Building2 },
  { name: 'Exports', path: '/admin/exports', icon: Download }
];

const MANAGEMENT_SUITE_ITEMS: NavItemDef[] = [
  { name: 'Jobs', path: '/admin/jobs', icon: Briefcase, isStage3: true },
  { name: 'Companies', path: '/admin/companies', icon: Factory, isStage3: true },
  { name: 'Joining', path: '/admin/joining', icon: FileCheck2, isStage3: true },
  { name: 'Documents', path: '/admin/documents', icon: FolderOpen, isStage3: true },
  { name: 'Payments', path: '/admin/payments', icon: CreditCard, isStage3: true },
  { name: 'Reference Slips', path: '/admin/reference-slips', icon: FileText, isStage3: true },
  { name: 'Employees', path: '/admin/employees', icon: UserCheck, isStage3: true },
  { name: 'Activity', path: '/admin/activity', icon: Activity, isStage3: true },
  { name: 'Settings', path: '/admin/settings', icon: Settings, isStage3: true }
];

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  return (
    <aside className={`admin-sidebar ${mobileOpen ? 'open' : ''}`}>
      {/* Brand Header with A TIGER GROUPS Client Logo */}
      <div className="admin-sidebar-brand">
        <img
          src="/assets/tiger-logo.jpeg"
          alt="A TIGER GROUPS"
          className="admin-sidebar-logo"
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="admin-sidebar-title">A TIGER GROUPS</div>
          <div className="admin-sidebar-subtitle">Internal Administration</div>
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
        {/* Core Operations Group */}
        <div>
          <div className="admin-nav-group-title">Core Operations</div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {CORE_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/admin'}
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
            {MANAGEMENT_SUITE_ITEMS.map((item) => {
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
