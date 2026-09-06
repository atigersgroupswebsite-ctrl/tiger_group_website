// ==============================================================================
// File: src/contexts/AdminNotificationContext.tsx
// Description: Realtime Notifications Context for A TIGER GROUPS Admin Panel
// Features: Supabase Realtime subscription on notifications table, unread count,
//           live toast notifications, mark-as-read, and mark-all-as-read.
// ==============================================================================

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { NotificationRow, NotificationType } from '../types/database';
import { useAdminAuth } from './AdminAuthContext';

export interface ToastNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  applicationId?: string | null;
  employerEnquiryId?: string | null;
}

export interface AdminNotificationContextType {
  notifications: NotificationRow[];
  unreadCount: number;
  loading: boolean;
  activeToast: ToastNotification | null;
  dismissToast: () => void;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
}

const AdminNotificationContext = createContext<AdminNotificationContextType | undefined>(undefined);

export const AdminNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin } = useAdminAuth();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeToast, setActiveToast] = useState<ToastNotification | null>(null);

  // Track if initial load has completed to avoid popping toasts for historic notifications
  const initialLoadCompleted = useRef<boolean>(false);
  // Set of seen notification IDs to prevent duplicates
  const seenNotificationIds = useRef<Set<string>>(new Set());

  // Fetch notifications from database
  const fetchNotifications = useCallback(async () => {
    if (!isAdmin) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(40);

      if (error) {
        console.error('[AdminNotifications] Error fetching notifications:', error.message);
        return;
      }

      const rows = (data as NotificationRow[]) || [];
      rows.forEach((r) => seenNotificationIds.current.add(r.id));
      setNotifications(rows);
      setUnreadCount(rows.filter((n) => !n.read).length);
    } catch (err) {
      console.error('[AdminNotifications] Unexpected fetch error:', err);
    } finally {
      setLoading(false);
      initialLoadCompleted.current = true;
    }
  }, [isAdmin]);

  // Initial fetch on mount or auth change
  useEffect(() => {
    if (isAdmin) {
      fetchNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
      initialLoadCompleted.current = false;
      seenNotificationIds.current.clear();
    }
  }, [isAdmin, fetchNotifications]);

  // Realtime subscription to notifications table
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel('admin_notifications_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          const newNotif = payload.new as NotificationRow;

          // Prevent duplicate handling
          if (seenNotificationIds.current.has(newNotif.id)) {
            return;
          }
          seenNotificationIds.current.add(newNotif.id);

          // Prepend to notifications list
          setNotifications((prev) => [newNotif, ...prev]);

          // Update unread count if unread
          if (!newNotif.read) {
            setUnreadCount((count) => count + 1);
          }

          // Trigger live toast ONLY if initial load has finished (i.e. real-time event)
          if (initialLoadCompleted.current) {
            setActiveToast({
              id: newNotif.id,
              type: newNotif.type,
              title: newNotif.title,
              message: newNotif.message,
              applicationId: newNotif.application_id,
              employerEnquiryId: newNotif.employer_enquiry_id
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          const updated = payload.new as NotificationRow;
          setNotifications((prev) =>
            prev.map((item) => (item.id === updated.id ? updated : item))
          );
          // Recalculate unread count
          setNotifications((prev) => {
            const next = prev.map((item) => (item.id === updated.id ? updated : item));
            setUnreadCount(next.filter((n) => !n.read).length);
            return next;
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          const old = payload.old as { id?: string };
          if (old?.id) {
            setNotifications((prev) => {
              const next = prev.filter((item) => item.id !== old.id);
              setUnreadCount(next.filter((n) => !n.read).length);
              return next;
            });
          }
        }
      )
      .subscribe((_status, err) => {
        if (err) {
          console.error('[AdminNotifications] Realtime channel subscription error:', err);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  // Mark a single notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((count) => Math.max(0, count - 1));

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('[AdminNotifications] Error marking notification as read:', error.message);
        // Re-fetch to synchronize state on error
        fetchNotifications();
      }
    } catch (err) {
      console.error('[AdminNotifications] Failed to mark notification as read:', err);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      // Optimistic update
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('read', false);

      if (error) {
        console.error('[AdminNotifications] Error marking all as read:', error.message);
        fetchNotifications();
      }
    } catch (err) {
      console.error('[AdminNotifications] Failed to mark all as read:', err);
    }
  };

  // Dismiss current live toast
  const dismissToast = () => {
    setActiveToast(null);
  };

  // Auto-dismiss live toast after 8 seconds
  useEffect(() => {
    if (activeToast) {
      const timer = setTimeout(() => {
        setActiveToast(null);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [activeToast]);

  const value = {
    notifications,
    unreadCount,
    loading,
    activeToast,
    dismissToast,
    markAsRead,
    markAllAsRead,
    fetchNotifications
  };

  return (
    <AdminNotificationContext.Provider value={value}>
      {children}
    </AdminNotificationContext.Provider>
  );
};

export const useAdminNotifications = (): AdminNotificationContextType => {
  const context = useContext(AdminNotificationContext);
  if (!context) {
    throw new Error('useAdminNotifications must be used within an AdminNotificationProvider');
  }
  return context;
};
