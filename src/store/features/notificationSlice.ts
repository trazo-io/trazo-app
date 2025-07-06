import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'product_scan' | 'product_review' | 'carbon_verification' | 'system_alert';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  read: boolean;
  created_at: string;
  actor?: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  } | null;
  extra_data: Record<string, any>;
  time_since?: string;
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  isLoading: boolean;
  lastUpdate: string | null;
  preferences: {
    product_scan_enabled: boolean;
    product_review_enabled: boolean;
    carbon_verification_enabled: boolean;
    system_alert_enabled: boolean;
    realtime_notifications: boolean;
    email_notifications: boolean;
    push_notifications: boolean;
  };
}

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  isConnected: false,
  isLoading: false,
  lastUpdate: null,
  preferences: {
    product_scan_enabled: true,
    product_review_enabled: true,
    carbon_verification_enabled: true,
    system_alert_enabled: true,
    realtime_notifications: true,
    email_notifications: true,
    push_notifications: true
  }
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    // WebSocket connection state
    setConnectionStatus: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
    },

    // Loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    // Add new notification (from WebSocket)
    addNotification: (state, action: PayloadAction<Notification>) => {
      const newNotification = action.payload;

      // Avoid duplicates
      if (!state.notifications.find((n) => n.id === newNotification.id)) {
        state.notifications.unshift(newNotification);

        // Update unread count
        if (!newNotification.read) {
          state.unreadCount += 1;
        }

        state.lastUpdate = new Date().toISOString();
      }
    },

    // Set all notifications (from API)
    setNotifications: (state, action: PayloadAction<Notification[]>) => {
      state.notifications = action.payload;
      state.unreadCount = action.payload.filter((n) => !n.read).length;
      state.lastUpdate = new Date().toISOString();
    },

    // Update notification count
    setUnreadCount: (state, action: PayloadAction<number>) => {
      state.unreadCount = action.payload;
    },

    // Mark notification as read
    markAsRead: (state, action: PayloadAction<number>) => {
      const notification = state.notifications.find((n) => n.id === action.payload);
      if (notification && !notification.read) {
        notification.read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
        state.lastUpdate = new Date().toISOString();
      }
    },

    // Mark all notifications as read
    markAllAsRead: (state) => {
      state.notifications.forEach((notification) => {
        notification.read = true;
      });
      state.unreadCount = 0;
      state.lastUpdate = new Date().toISOString();
    },

    // Remove notification
    removeNotification: (state, action: PayloadAction<number>) => {
      const index = state.notifications.findIndex((n) => n.id === action.payload);
      if (index !== -1) {
        const notification = state.notifications[index];
        if (!notification.read) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
        state.notifications.splice(index, 1);
        state.lastUpdate = new Date().toISOString();
      }
    },

    // Update preferences
    setPreferences: (state, action: PayloadAction<Partial<NotificationState['preferences']>>) => {
      state.preferences = { ...state.preferences, ...action.payload };
    },

    // Clear all notifications
    clearNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
      state.lastUpdate = new Date().toISOString();
    }
  }
});

export const {
  setConnectionStatus,
  setLoading,
  addNotification,
  setNotifications,
  setUnreadCount,
  markAsRead,
  markAllAsRead,
  removeNotification,
  setPreferences,
  clearNotifications
} = notificationSlice.actions;

export default notificationSlice.reducer;

// Selectors
export const selectNotifications = (state: { notifications: NotificationState }) =>
  state.notifications.notifications;

export const selectUnreadCount = (state: { notifications: NotificationState }) =>
  state.notifications.unreadCount;

export const selectUnreadNotifications = (state: { notifications: NotificationState }) =>
  state.notifications.notifications.filter((n) => !n.read);

export const selectIsConnected = (state: { notifications: NotificationState }) =>
  state.notifications.isConnected;

export const selectIsLoading = (state: { notifications: NotificationState }) =>
  state.notifications.isLoading;

export const selectNotificationPreferences = (state: { notifications: NotificationState }) =>
  state.notifications.preferences;

export const selectLastUpdate = (state: { notifications: NotificationState }) =>
  state.notifications.lastUpdate;
