// ==============================================================================
// File: src/components/admin/AdminHeader.tsx
// Description: Compact top header with breadcrumbs and profile dropdown menu
// ==============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, LogOut, ChevronDown, Shield } from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { AdminBreadcrumbs, type BreadcrumbItem } from './AdminBreadcrumbs';

interface AdminHeaderProps {
  breadcrumbs?: BreadcrumbItem[];
  onOpenMobile: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ breadcrumbs = [], onOpenMobile }) => {
  const { user, profile, signOut } = useAdminAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const handleSignOut = async () => {
    try {
      setDropdownOpen(false);
      await signOut();
      navigate('/admin/login');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <header
      className="admin-header"
      style={{
        width: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem',
        position: 'sticky',
        top: 0,
        zIndex: 40
      }}
    >
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

      {/* Far Right Corner: Profile Trigger & Dropdown Menu */}
      <div
        ref={dropdownRef}
        style={{
          position: 'relative',
          marginLeft: 'auto'
        }}
      >
        <button
          type="button"
          onClick={() => setDropdownOpen((prev) => !prev)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            background: dropdownOpen ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
            border: '1px solid',
            borderColor: dropdownOpen ? 'rgba(247, 215, 148, 0.4)' : 'transparent',
            borderRadius: '8px',
            padding: '0.35rem 0.65rem 0.35rem 0.45rem',
            cursor: 'pointer',
            color: '#FCFBFB',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            if (!dropdownOpen) {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            }
          }}
          onMouseLeave={(e) => {
            if (!dropdownOpen) {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
            }
          }}
          aria-expanded={dropdownOpen}
          aria-haspopup="true"
        >
          {/* Avatar circle */}
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'rgba(247, 215, 148, 0.18)',
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

          {/* Name & Role Text */}
          <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', lineHeight: 1.2 }}>
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

          <ChevronDown
            size={14}
            style={{
              color: 'rgba(252, 251, 251, 0.7)',
              transition: 'transform 0.2s ease',
              transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)'
            }}
          />
        </button>

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: '240px',
              backgroundColor: '#0F1B38',
              border: '1px solid rgba(247, 215, 148, 0.25)',
              borderRadius: '10px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 0, 0, 0.2)',
              overflow: 'hidden',
              zIndex: 100,
              animation: 'adminDropdownFade 0.15s ease-out'
            }}
          >
            {/* User Profile Overview */}
            <div
              style={{
                padding: '0.85rem 1rem',
                backgroundColor: 'rgba(25, 42, 86, 0.8)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              <div
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  color: '#FCFBFB',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {profile?.full_name || 'Administrator'}
              </div>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'rgba(252, 251, 251, 0.65)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginTop: '1px'
                }}
              >
                {user?.email || 'admin@atigergroups.com'}
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    fontSize: '0.675rem',
                    fontWeight: 700,
                    color: '#192A56',
                    backgroundColor: '#F7D794',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    letterSpacing: '0.04em'
                  }}
                >
                  <Shield size={10} />
                  <span>{profile?.role || 'SUPER_ADMIN'}</span>
                </span>
              </div>
            </div>

            {/* Actions List */}
            <div style={{ padding: '0.35rem' }}>
              <button
                type="button"
                onClick={handleSignOut}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.6rem 0.75rem',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#EDA6A3',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(237, 166, 163, 0.15)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                }}
              >
                <LogOut size={15} color="#EDA6A3" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes adminDropdownFade {
          from {
            opacity: 0;
            transform: translateY(-6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </header>
  );
};
