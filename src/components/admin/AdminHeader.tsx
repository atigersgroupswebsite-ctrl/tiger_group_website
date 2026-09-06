// ==============================================================================
// File: src/components/admin/AdminHeader.tsx
// Description: Compact top header for admin shell with breadcrumbs, profile, and logout
// ==============================================================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, LogOut } from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { AdminBreadcrumbs, type BreadcrumbItem } from './AdminBreadcrumbs';

interface AdminHeaderProps {
  breadcrumbs?: BreadcrumbItem[];
  onOpenMobile: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ breadcrumbs = [], onOpenMobile }) => {
  const { profile, signOut } = useAdminAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/admin/login');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <header className="admin-header">
      {/* Left side: Mobile Toggle & Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          type="button"
          onClick={onOpenMobile}
          style={{
            display: 'none',
            background: 'transparent',
            border: 'none',
            color: '#FCFBFB',
            cursor: 'pointer',
            padding: '4px'
          }}
          className="admin-mobile-toggle"
          aria-label="Open sidebar"
        >
          <Menu size={20} />
        </button>

        {breadcrumbs.length > 0 && <AdminBreadcrumbs items={breadcrumbs} />}
      </div>

      {/* Right side: Admin Profile & Logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {/* Profile identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'rgba(247, 215, 148, 0.15)',
              border: '1px solid #F7D794',
              color: '#F7D794',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.8rem'
            }}
          >
            {(profile?.full_name?.[0] || 'A').toUpperCase()}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
            <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#FCFBFB' }}>
              {profile?.full_name || 'Administrator'}
            </span>
            <span
              style={{
                fontSize: '0.675rem',
                fontWeight: 700,
                color: '#F7D794',
                letterSpacing: '0.04em'
              }}
            >
              {profile?.role || 'SUPER_ADMIN'}
            </span>
          </div>
        </div>

        {/* Logout Button */}
        <button
          type="button"
          onClick={handleSignOut}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.4rem 0.75rem',
            borderRadius: '6px',
            backgroundColor: 'rgba(237, 166, 163, 0.12)',
            color: '#EDA6A3',
            border: '1px solid rgba(237, 166, 163, 0.3)',
            fontSize: '0.775rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(237, 166, 163, 0.25)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(237, 166, 163, 0.12)';
          }}
          title="Sign out of Admin Panel"
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
};
