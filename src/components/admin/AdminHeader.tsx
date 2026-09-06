// ==============================================================================
// File: src/components/admin/AdminHeader.tsx
// Description: Compact top header with breadcrumbs, realtime notification bell,
//              and profile dropdown menu.
// ==============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  LogOut,
  ChevronDown,
  Shield,
  Bell,
  CheckCheck,
  Building2,
  User,
  ExternalLink,
  BellOff
} from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { useAdminNotifications } from '../../contexts/AdminNotificationContext';
import { AdminBreadcrumbs, type BreadcrumbItem } from './AdminBreadcrumbs';
import { ADMIN_ROUTES } from '../../constants/adminRoutes';

interface AdminHeaderProps {
  breadcrumbs?: BreadcrumbItem[];
  onOpenMobile: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ breadcrumbs = [], onOpenMobile }) => {
  const { user, profile, signOut } = useAdminAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useAdminNotifications();
  const navigate = useNavigate();

  // Profile dropdown state
  const [profileOpen, setProfileOpen] = useState<boolean>(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Notification dropdown state
  const [notifOpen, setNotifOpen] = useState<boolean>(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(target)) {
        setNotifOpen(false);
      }
    };

    if (profileOpen || notifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileOpen, notifOpen]);

  const handleSignOut = async () => {
    try {
      setProfileOpen(false);
      await signOut();
      navigate(ADMIN_ROUTES.login);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const handleNotificationClick = (notifId: string, appId?: string | null, empId?: string | null) => {
    markAsRead(notifId);
    setNotifOpen(false);

    if (appId) {
      navigate(ADMIN_ROUTES.applicationDetail(appId));
    } else if (empId) {
      navigate(ADMIN_ROUTES.employerEnquiries);
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

      {/* Far Right Corner: Notifications Bell & Profile Trigger */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginLeft: 'auto' }}>
        {/* Realtime Notification Bell */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => {
              setNotifOpen((prev) => !prev);
              setProfileOpen(false);
            }}
            style={{
              position: 'relative',
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: notifOpen ? 'rgba(247, 215, 148, 0.15)' : 'transparent',
              border: '1px solid',
              borderColor: notifOpen ? 'rgba(247, 215, 148, 0.4)' : 'transparent',
              color: notifOpen ? '#F7D794' : '#FCFBFB',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              if (!notifOpen) {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
              }
            }}
            onMouseLeave={(e) => {
              if (!notifOpen) {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              }
            }}
            aria-label="View notifications"
            aria-expanded={notifOpen}
          >
            <Bell size={18} />

            {/* Unread Badge */}
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  backgroundColor: '#F7D794',
                  color: '#192A56',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  minWidth: '16px',
                  height: '16px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 3px',
                  boxShadow: '0 0 0 2px #192A56'
                }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown Panel */}
          {notifOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '360px',
                maxWidth: 'calc(100vw - 2rem)',
                backgroundColor: '#0F1B38',
                border: '1px solid rgba(247, 215, 148, 0.25)',
                borderRadius: '10px',
                boxShadow: '0 15px 35px -5px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(0, 0, 0, 0.2)',
                overflow: 'hidden',
                zIndex: 110,
                animation: 'adminDropdownFade 0.15s ease-out'
              }}
            >
              {/* Panel Header */}
              <div
                style={{
                  padding: '0.85rem 1rem',
                  backgroundColor: 'rgba(25, 42, 86, 0.85)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#FCFBFB' }}>
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        backgroundColor: 'rgba(247, 215, 148, 0.2)',
                        color: '#F7D794',
                        padding: '1px 6px',
                        borderRadius: '4px'
                      }}
                    >
                      {unreadCount} unread
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#F7D794',
                      fontSize: '0.725rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      padding: '2px 4px'
                    }}
                  >
                    <CheckCheck size={13} />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              {/* Notification List */}
              <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div
                    style={{
                      padding: '2.5rem 1.5rem',
                      textAlign: 'center',
                      color: 'rgba(252, 251, 251, 0.6)'
                    }}
                  >
                    <BellOff size={28} style={{ margin: '0 auto 0.5rem auto', opacity: 0.5 }} />
                    <div style={{ fontSize: '0.825rem', fontWeight: 600 }}>No notifications yet</div>
                    <div style={{ fontSize: '0.75rem', marginTop: '2px', opacity: 0.7 }}>
                      New candidate applications and employer enquiries will appear here in real-time.
                    </div>
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const isUnread = !notif.read;
                    const dateFormatted = new Date(notif.created_at).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif.id, notif.application_id, notif.employer_enquiry_id)}
                        style={{
                          padding: '0.85rem 1rem',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          backgroundColor: isUnread ? 'rgba(247, 215, 148, 0.06)' : 'transparent',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.75rem',
                          transition: 'background-color 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.backgroundColor = isUnread
                            ? 'rgba(247, 215, 148, 0.12)'
                            : 'rgba(255, 255, 255, 0.04)';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.backgroundColor = isUnread
                            ? 'rgba(247, 215, 148, 0.06)'
                            : 'transparent';
                        }}
                      >
                        {/* Icon */}
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            backgroundColor: isUnread ? 'rgba(247, 215, 148, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                            color: isUnread ? '#F7D794' : 'rgba(252, 251, 251, 0.7)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            marginTop: '2px'
                          }}
                        >
                          {notif.type === 'NEW_EMPLOYER_ENQUIRY' ? (
                            <Building2 size={14} />
                          ) : (
                            <User size={14} />
                          )}
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '0.5rem'
                            }}
                          >
                            <span
                              style={{
                                fontSize: '0.8rem',
                                fontWeight: isUnread ? 800 : 600,
                                color: isUnread ? '#FCFBFB' : 'rgba(252, 251, 251, 0.85)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {notif.title}
                            </span>
                            {isUnread && (
                              <span
                                style={{
                                  width: '7px',
                                  height: '7px',
                                  borderRadius: '50%',
                                  backgroundColor: '#F7D794',
                                  flexShrink: 0
                                }}
                              />
                            )}
                          </div>

                          <div
                            style={{
                              fontSize: '0.75rem',
                              color: 'rgba(252, 251, 251, 0.7)',
                              lineHeight: 1.35,
                              marginTop: '2px'
                            }}
                          >
                            {notif.message}
                          </div>

                          <div
                            style={{
                              fontSize: '0.675rem',
                              color: 'rgba(252, 251, 251, 0.45)',
                              marginTop: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}
                          >
                            <span>{dateFormatted}</span>
                            <span>•</span>
                            <span style={{ color: '#F7D794' }}>View Details</span>
                            <ExternalLink size={10} color="#F7D794" />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Trigger & Dropdown Menu */}
        <div ref={profileRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => {
              setProfileOpen((prev) => !prev);
              setNotifOpen(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              background: profileOpen ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              border: '1px solid',
              borderColor: profileOpen ? 'rgba(247, 215, 148, 0.4)' : 'transparent',
              borderRadius: '8px',
              padding: '0.35rem 0.65rem 0.35rem 0.45rem',
              cursor: 'pointer',
              color: '#FCFBFB',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              if (!profileOpen) {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
              }
            }}
            onMouseLeave={(e) => {
              if (!profileOpen) {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              }
            }}
            aria-expanded={profileOpen}
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
                transform: profileOpen ? 'rotate(180deg)' : 'rotate(0deg)'
              }}
            />
          </button>

          {/* Profile Dropdown Menu */}
          {profileOpen && (
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
