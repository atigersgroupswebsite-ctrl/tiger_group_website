// ==============================================================================
// File: src/components/admin/AdminLayout.tsx
// Description: Main Authenticated Shell and Navigation for Admin Panel
// ==============================================================================

import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Building2,
  FileCheck2,
  FolderOpen,
  CreditCard,
  FileText,
  UserCheck,
  Files,
  Activity,
  Settings,
  LogOut,
  Shield,
  Menu,
  X,
  ExternalLink
} from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  activeRoute: boolean;
}

const PRIMARY_NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', path: '/admin', icon: LayoutDashboard, activeRoute: true },
  { name: 'Applications', path: '/admin/applications', icon: Users, activeRoute: true }
];

const FUTURE_NAV_ITEMS: NavItem[] = [
  { name: 'Jobs', path: '/admin/jobs', icon: Briefcase, activeRoute: false },
  { name: 'Companies', path: '/admin/companies', icon: Building2, activeRoute: false },
  { name: 'Joining Forms', path: '/admin/joining', icon: FileCheck2, activeRoute: false },
  { name: 'Documents', path: '/admin/documents', icon: FolderOpen, activeRoute: false },
  { name: 'Payments', path: '/admin/payments', icon: CreditCard, activeRoute: false },
  { name: 'Reference Slips', path: '/admin/reference-slips', icon: FileText, activeRoute: false },
  { name: 'Employees', path: '/admin/employees', icon: UserCheck, activeRoute: false },
  { name: 'Generated Files', path: '/admin/files', icon: Files, activeRoute: false },
  { name: 'Activity Log', path: '/admin/activity', icon: Activity, activeRoute: false },
  { name: 'Settings', path: '/admin/settings', icon: Settings, activeRoute: false }
];

export const AdminLayout: React.FC = () => {
  const { profile, signOut } = useAdminAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/admin/login');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: '#090D16',
        color: '#E2E8F0',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
      }}
    >
      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 40
          }}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        style={{
          width: '280px',
          backgroundColor: '#0F172A',
          borderRight: '1px solid #1E293B',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 50,
          transform: mobileMenuOpen ? 'translateX(0)' : undefined,
          transition: 'transform 0.2s ease-in-out'
        }}
        className={`admin-sidebar ${mobileMenuOpen ? 'open' : ''}`}
      >
        {/* Brand Header */}
        <div
          style={{
            padding: '1.5rem 1.25rem',
            borderBottom: '1px solid #1E293B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #D97706, #B45309)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(217, 119, 6, 0.25)'
              }}
            >
              <Shield size={22} color="#FFFFFF" />
            </div>
            <div>
              <div
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  letterSpacing: '0.05em',
                  color: '#F8FAFC'
                }}
              >
                A TIGER GLOBAL
              </div>
              <div
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  color: '#F59E0B',
                  textTransform: 'uppercase'
                }}
              >
                Admin Control Panel
              </div>
            </div>
          </div>

          <button
            onClick={() => setMobileMenuOpen(false)}
            style={{
              display: 'none',
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer'
            }}
            className="mobile-close-btn"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Items */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.25rem 0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}
        >
          {/* Active Primary Routes */}
          <div>
            <div
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: '#64748B',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '0 0.75rem 0.5rem 0.75rem'
              }}
            >
              Core Operations
            </div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {PRIMARY_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/admin'}
                    onClick={() => setMobileMenuOpen(false)}
                    style={({ isActive }) => ({
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? '#F59E0B' : '#CBD5E1',
                      backgroundColor: isActive ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
                      borderLeft: isActive ? '3px solid #F59E0B' : '3px solid transparent',
                      textDecoration: 'none',
                      transition: 'all 0.15s ease'
                    })}
                  >
                    <Icon size={18} />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Prepared Future Routes */}
          <div>
            <div
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: '#64748B',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '0 0.75rem 0.5rem 0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span>Management Suite</span>
              <span
                style={{
                  fontSize: '0.65rem',
                  background: '#1E293B',
                  color: '#94A3B8',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}
              >
                Upcoming
              </span>
            </div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {FUTURE_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    style={({ isActive }) => ({
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.55rem 0.85rem',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      color: isActive ? '#F59E0B' : '#64748B',
                      backgroundColor: isActive ? 'rgba(245, 158, 11, 0.08)' : 'transparent',
                      textDecoration: 'none',
                      transition: 'all 0.15s ease'
                    })}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Icon size={16} />
                      <span>{item.name}</span>
                    </div>
                    <span
                      style={{
                        fontSize: '0.625rem',
                        color: '#475569',
                        fontWeight: 600
                      }}
                    >
                      Stage 3
                    </span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Public Website Link & Sign Out */}
        <div
          style={{
            padding: '1rem',
            borderTop: '1px solid #1E293B',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
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
              color: '#94A3B8',
              backgroundColor: '#131D31',
              textDecoration: 'none'
            }}
          >
            <span>Visit Live Website</span>
            <ExternalLink size={14} />
          </Link>

          <button
            onClick={handleSignOut}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              width: '100%',
              padding: '0.6rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#F87171',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              cursor: 'pointer',
              transition: 'background 0.15s ease'
            }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          marginLeft: '280px',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0
        }}
        className="admin-main-wrapper"
      >
        {/* Top Header Bar */}
        <header
          style={{
            height: '64px',
            backgroundColor: '#0F172A',
            borderBottom: '1px solid #1E293B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 2rem',
            position: 'sticky',
            top: 0,
            zIndex: 30
          }}
        >
          {/* Mobile menu toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => setMobileMenuOpen(true)}
              style={{
                display: 'none',
                background: 'transparent',
                border: 'none',
                color: '#CBD5E1',
                cursor: 'pointer'
              }}
              className="mobile-menu-btn"
            >
              <Menu size={22} />
            </button>
            <div
              style={{
                fontSize: '0.875rem',
                color: '#94A3B8',
                fontWeight: 500
              }}
            >
              System Environment: <span style={{ color: '#10B981', fontWeight: 600 }}>Operational</span>
            </div>
          </div>

          {/* Current User Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#F8FAFC'
                }}
              >
                {profile?.full_name || 'Administrator'}
              </div>
              <div
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  color: '#F59E0B'
                }}
              >
                {profile?.role || 'SUPER_ADMIN'}
              </div>
            </div>

            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#1E293B',
                border: '1px solid #334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                color: '#F59E0B',
                fontSize: '0.85rem'
              }}
            >
              {(profile?.full_name?.[0] || 'A').toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page Content Outlet */}
        <main
          style={{
            flex: 1,
            padding: '2rem',
            maxWidth: '1600px',
            width: '100%',
            margin: '0 auto',
            boxSizing: 'border-box'
          }}
        >
          <Outlet />
        </main>
      </div>

      {/* Responsive Styles */}
      <style>{`
        @media (max-width: 1024px) {
          .admin-sidebar {
            transform: translateX(-100%);
          }
          .admin-sidebar.open {
            transform: translateX(0);
          }
          .admin-main-wrapper {
            margin-left: 0 !important;
          }
          .mobile-menu-btn {
            display: block !important;
          }
          .mobile-close-btn {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
};
