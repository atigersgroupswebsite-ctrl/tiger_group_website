// ==============================================================================
// File: src/components/admin/AdminNotificationToast.tsx
// Description: Temporary In-App Floating Toast for Realtime Events
// Brand: A TIGER GROUPS — Midnight Navy & Champagne Aesthetics
// ==============================================================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminNotifications } from '../../contexts/AdminNotificationContext';
import { Bell, ArrowRight, X, Building2, User } from 'lucide-react';
import { ADMIN_ROUTES } from '../../constants/adminRoutes';

export const AdminNotificationToast: React.FC = () => {
  const {
    activeToast,
    dismissToast,
    markNotificationAsRead,
    markApplicationNotificationsAsRead,
    markEmployerEnquiryNotificationsAsRead
  } = useAdminNotifications();
  const navigate = useNavigate();

  if (!activeToast) return null;

  const isJobEnquiry = activeToast.type === 'NEW_JOB_ENQUIRY';
  const isEmployerEnquiry = activeToast.type === 'NEW_EMPLOYER_ENQUIRY';

  const handleAction = async () => {
    const toast = activeToast;
    dismissToast();

    try {
      await markNotificationAsRead(toast.id);
      if (toast.applicationId) {
        await markApplicationNotificationsAsRead(toast.applicationId);
      } else if (toast.employerEnquiryId) {
        await markEmployerEnquiryNotificationsAsRead(toast.employerEnquiryId);
      }
    } catch (err) {
      console.error('[AdminNotificationToast] Error marking read:', err);
    }

    if (isJobEnquiry && toast.applicationId) {
      navigate(ADMIN_ROUTES.applicationDetail(toast.applicationId));
    } else if (isEmployerEnquiry && toast.employerEnquiryId) {
      navigate(ADMIN_ROUTES.employerEnquiryDetail(toast.employerEnquiryId));
    } else if (isEmployerEnquiry) {
      navigate(ADMIN_ROUTES.employerEnquiries);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '1.25rem',
        right: '1.5rem',
        zIndex: 150,
        maxWidth: '400px',
        width: 'calc(100vw - 3rem)',
        backgroundColor: '#0F1B38',
        border: '1px solid rgba(247, 215, 148, 0.4)',
        borderRadius: '12px',
        boxShadow: '0 15px 35px -5px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(247, 215, 148, 0.2)',
        overflow: 'hidden',
        animation: 'adminToastSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        color: '#FCFBFB'
      }}
    >
      {/* Top Accent bar */}
      <div
        style={{
          height: '3px',
          background: 'linear-gradient(90deg, #F7D794 0%, #EDA6A3 100%)'
        }}
      />

      <div style={{ padding: '1rem 1.15rem' }}>
        {/* Header row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.4rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                backgroundColor: 'rgba(247, 215, 148, 0.18)',
                color: '#F7D794',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {isEmployerEnquiry ? <Building2 size={15} /> : isJobEnquiry ? <User size={15} /> : <Bell size={15} />}
            </div>
            <span
              style={{
                fontSize: '0.725rem',
                fontWeight: 800,
                color: '#F7D794',
                letterSpacing: '0.06em',
                textTransform: 'uppercase'
              }}
            >
              {isEmployerEnquiry ? 'New Employer Enquiry' : 'New Enquiry Received'}
            </span>
          </div>

          <button
            type="button"
            onClick={dismissToast}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(252, 251, 251, 0.6)',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center'
            }}
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>

        {/* Message */}
        <div
          style={{
            fontSize: '0.85rem',
            color: '#FCFBFB',
            lineHeight: 1.45,
            marginBottom: '0.75rem',
            fontWeight: 500
          }}
        >
          {activeToast.message}
        </div>

        {/* Action button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={handleAction}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: '#F7D794',
              color: '#192A56',
              border: 'none',
              borderRadius: '6px',
              padding: '0.45rem 0.85rem',
              fontSize: '0.75rem',
              fontWeight: 800,
              cursor: 'pointer',
              letterSpacing: '0.04em',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = '#F7D794';
            }}
          >
            <span>{isEmployerEnquiry ? 'VIEW ENQUIRY' : 'VIEW APPLICATION'}</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes adminToastSlideIn {
          from {
            opacity: 0;
            transform: translateY(-12px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
};
