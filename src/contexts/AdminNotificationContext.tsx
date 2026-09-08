// ==============================================================================
// File: src/contexts/AdminNotificationContext.tsx
// Description: Realtime Notifications Context for A TIGER GROUPS Admin Panel
// Features: Supabase Realtime subscription on notifications table, authoritative
//           unread count, Web Audio API chime synthesis, sound preference toggle,
//           application & employer enquiry auto-read synchronization, and optimistic UI.
// ==============================================================================

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo
} from 'react';
import { supabase } from '../lib/supabaseClient';
import type { NotificationRow, NotificationType } from '../types/database';
import { useAdminAuth } from './AdminAuthContext';
import { getSystemSettingValue } from '../services/settingsService';

const SOUND_PREF_KEY = 'tiger_admin_notification_sound';

// Synthesize a short, subtle, professional 2-tone notification chime via Web Audio API.
// Completely local, zero bytes external asset, no network latency, handles autoplay policies.
function playNotificationChime(): void {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();

    // If suspended by browser autoplay policy, attempt resume
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {
        // Autoplay policy prevented playback until user interaction; ignore silently.
      });
    }

    const now = ctx.currentTime;

    // Tone 1: 587.33 Hz (D5) - Soft bell attack
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.0001, now);
    gain1.gain.exponentialRampToValueAtTime(0.12, now + 0.03);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.23);

    // Tone 2: 880.00 Hz (A5) - Crystal harmonic resolve
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.0, now + 0.08);
    gain2.gain.setValueAtTime(0.0001, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.14, now + 0.11);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.43);

    // Close AudioContext to release system resources after sound completes
    setTimeout(() => {
      try {
        ctx.close();
      } catch {
        // Safe ignore
      }
    }, 550);
  } catch (err) {
    // Autoplay or audio context error is non-fatal; never crash or block UI
    console.debug('[AdminNotification] Audio chime prevented by browser:', err);
  }
}

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
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  dismissToast: () => void;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  markApplicationNotificationsAsRead: (applicationId: string) => Promise<void>;
  markEmployerEnquiryNotificationsAsRead: (enquiryId: string) => Promise<void>;
  fetchNotifications: () => Promise<void>;
}

const AdminNotificationContext = createContext<AdminNotificationContextType | undefined>(undefined);

export const AdminNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin } = useAdminAuth();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeToast, setActiveToast] = useState<ToastNotification | null>(null);

  // Sound preference state (default ON)
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(SOUND_PREF_KEY);
      return stored !== 'false';
    } catch {
      return true;
    }
  });

  const soundEnabledRef = useRef<boolean>(soundEnabled);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // Synchronize with database system_settings on initial admin session
  useEffect(() => {
    if (!isAdmin) return;
    let mounted = true;
    getSystemSettingValue<boolean>('notification_sound_enabled', true).then((val) => {
      if (mounted && typeof val === 'boolean') {
        setSoundEnabledState(val);
      }
    });
    return () => {
      mounted = false;
    };
  }, [isAdmin]);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled);
    try {
      localStorage.setItem(SOUND_PREF_KEY, String(enabled));
    } catch {
      // Safe ignore storage access error
    }
  }, []);

  // Derive unread count strictly as count of notifications where read === false
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  // Track if initial load has completed to avoid sound or toasts on initial load / refresh
  const initialLoadCompleted = useRef<boolean>(false);
  // Set of seen notification IDs to prevent duplicates from re-renders or reconnects
  const seenNotificationIds = useRef<Set<string>>(new Set());

  // Fetch notifications from database (scoped to authenticated admin or broadcast)
  const fetchNotifications = useCallback(async () => {
    if (!isAdmin) return;

    try {
      setLoading(true);
      let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (user?.id) {
        query = query.or(`admin_user_id.is.null,admin_user_id.eq.${user.id}`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[AdminNotifications] Error fetching notifications:', error.message);
        return;
      }

      const rows = (data as NotificationRow[]) || [];
      rows.forEach((r) => seenNotificationIds.current.add(r.id));
      setNotifications(rows);
    } catch (err) {
      console.error('[AdminNotifications] Unexpected fetch error:', err);
    } finally {
      setLoading(false);
      initialLoadCompleted.current = true;
    }
  }, [isAdmin, user?.id]);

  // Initial fetch on mount or auth change
  useEffect(() => {
    if (isAdmin) {
      fetchNotifications();
    } else {
      setNotifications([]);
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

          // Multi-admin check: ignore notification if explicitly addressed to another admin
          if (newNotif.admin_user_id && user?.id && newNotif.admin_user_id !== user.id) {
            return;
          }

          // Authoritative deduplication using notification database ID
          if (seenNotificationIds.current.has(newNotif.id)) {
            return;
          }
          seenNotificationIds.current.add(newNotif.id);

          // Prepend to local notifications list
          setNotifications((prev) => [newNotif, ...prev]);

          // Trigger sound and live toast ONLY for live realtime arrivals (not initial load or refresh)
          if (initialLoadCompleted.current) {
            if (soundEnabledRef.current) {
              playNotificationChime();
            }

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
            setNotifications((prev) => prev.filter((item) => item.id !== old.id));
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
  }, [isAdmin, user?.id]);

  // Mark a single notification as read with optimistic update & rollback on error
  const markNotificationAsRead = useCallback(
    async (notificationId: string): Promise<void> => {
      const target = notifications.find((n) => n.id === notificationId);
      // If already marked read or not in state, nothing to do optimistically
      if (target?.read) return;

      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );

      try {
        let query = supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', notificationId);

        if (user?.id) {
          query = query.or(`admin_user_id.is.null,admin_user_id.eq.${user.id}`);
        }

        const { error } = await query;
        if (error) {
          throw new Error(error.message);
        }
      } catch (err: unknown) {
        console.error('[AdminNotifications] Failed to mark notification as read in DB:', err);
        // Rollback optimistic update
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, read: false } : n))
        );
        throw err;
      }
    },
    [notifications, user?.id]
  );

  // Alias for backward compatibility
  const markAsRead = markNotificationAsRead;

  // Mark all notifications as read
  const markAllAsRead = useCallback(async (): Promise<void> => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    try {
      let query = supabase
        .from('notifications')
        .update({ read: true })
        .eq('read', false);

      if (user?.id) {
        query = query.or(`admin_user_id.is.null,admin_user_id.eq.${user.id}`);
      }

      const { error } = await query;
      if (error) {
        throw new Error(error.message);
      }
    } catch (err: unknown) {
      console.error('[AdminNotifications] Failed to mark all notifications as read:', err);
      // Rollback
      const unreadSet = new Set(unreadIds);
      setNotifications((prev) =>
        prev.map((n) => (unreadSet.has(n.id) ? { ...n, read: false } : n))
      );
    }
  }, [notifications, user?.id]);

  // Mark all notifications corresponding to a specific application ID as read
  const markApplicationNotificationsAsRead = useCallback(
    async (applicationId: string): Promise<void> => {
      const matchingUnread = notifications.filter(
        (n) => n.application_id === applicationId && !n.read
      );
      const matchingIds = new Set(matchingUnread.map((m) => m.id));

      if (matchingIds.size > 0) {
        // Optimistic update
        setNotifications((prev) =>
          prev.map((n) => (matchingIds.has(n.id) ? { ...n, read: true } : n))
        );
      }

      try {
        let query = supabase
          .from('notifications')
          .update({ read: true })
          .eq('application_id', applicationId)
          .eq('read', false);

        if (user?.id) {
          query = query.or(`admin_user_id.is.null,admin_user_id.eq.${user.id}`);
        }

        const { error } = await query;
        if (error) {
          throw new Error(error.message);
        }
      } catch (err: unknown) {
        console.error('[AdminNotifications] Failed to mark application notifications as read:', err);
        if (matchingIds.size > 0) {
          // Rollback
          setNotifications((prev) =>
            prev.map((n) => (matchingIds.has(n.id) ? { ...n, read: false } : n))
          );
        }
      }
    },
    [notifications, user?.id]
  );

  // Mark all notifications corresponding to an employer enquiry ID as read
  const markEmployerEnquiryNotificationsAsRead = useCallback(
    async (enquiryId: string): Promise<void> => {
      const matchingUnread = notifications.filter(
        (n) => n.employer_enquiry_id === enquiryId && !n.read
      );
      const matchingIds = new Set(matchingUnread.map((m) => m.id));

      if (matchingIds.size > 0) {
        // Optimistic update
        setNotifications((prev) =>
          prev.map((n) => (matchingIds.has(n.id) ? { ...n, read: true } : n))
        );
      }

      try {
        let query = supabase
          .from('notifications')
          .update({ read: true })
          .eq('employer_enquiry_id', enquiryId)
          .eq('read', false);

        if (user?.id) {
          query = query.or(`admin_user_id.is.null,admin_user_id.eq.${user.id}`);
        }

        const { error } = await query;
        if (error) {
          throw new Error(error.message);
        }
      } catch (err: unknown) {
        console.error('[AdminNotifications] Failed to mark employer enquiry notifications as read:', err);
        if (matchingIds.size > 0) {
          // Rollback
          setNotifications((prev) =>
            prev.map((n) => (matchingIds.has(n.id) ? { ...n, read: false } : n))
          );
        }
      }
    },
    [notifications, user?.id]
  );

  // Dismiss current live toast
  const dismissToast = useCallback(() => {
    setActiveToast(null);
  }, []);

  // Auto-dismiss live toast after 8 seconds
  useEffect(() => {
    if (activeToast) {
      const timer = setTimeout(() => {
        setActiveToast(null);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [activeToast]);

  const value: AdminNotificationContextType = {
    notifications,
    unreadCount,
    loading,
    activeToast,
    soundEnabled,
    setSoundEnabled,
    dismissToast,
    markNotificationAsRead,
    markAsRead,
    markAllAsRead,
    markApplicationNotificationsAsRead,
    markEmployerEnquiryNotificationsAsRead,
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
