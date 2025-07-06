import { baseApi } from './baseApi';
import { Notification } from '../features/notificationSlice';

export interface NotificationListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Notification[];
}

export interface NotificationCountResponse {
  total_count: number;
  unread_count: number;
  read_count: number;
  today_count: number;
  this_week_count: number;
}

export interface NotificationPreferences {
  product_scan_enabled: boolean;
  product_review_enabled: boolean;
  carbon_verification_enabled: boolean;
  system_alert_enabled: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  realtime_notifications: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}

export interface MarkAsReadRequest {
  notification_id: number;
}

export interface CreateNotificationRequest {
  recipient_id: number;
  type: string;
  priority: string;
  title: string;
  message: string;
  extra_data?: Record<string, any>;
}

export const notificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get notifications list with pagination and filtering
    getNotifications: builder.query<
      NotificationListResponse,
      {
        page?: number;
        page_size?: number;
        unread_only?: boolean;
        type?: string;
        priority?: string;
      }
    >({
      query: (params = {}) => ({
        url: '/notifications/',
        params: {
          page: params.page || 1,
          page_size: params.page_size || 20,
          ...(params.unread_only && { unread_only: 'true' }),
          ...(params.type && { type: params.type }),
          ...(params.priority && { priority: params.priority })
        }
      }),
      providesTags: ['Notification']
    }),

    // Get notification counts
    getNotificationCount: builder.query<NotificationCountResponse, void>({
      query: () => '/notifications/count/',
      providesTags: ['NotificationCount']
    }),

    // Mark notification as read
    markNotificationAsRead: builder.mutation<
      { success: boolean; message: string },
      MarkAsReadRequest
    >({
      query: (data) => ({
        url: '/notifications/mark-as-read/',
        method: 'POST',
        body: data
      }),
      invalidatesTags: ['Notification', 'NotificationCount']
    }),

    // Mark all notifications as read
    markAllNotificationsAsRead: builder.mutation<
      { success: boolean; message: string; count: number },
      void
    >({
      query: () => ({
        url: '/notifications/mark-all-as-read/',
        method: 'POST'
      }),
      invalidatesTags: ['Notification', 'NotificationCount']
    }),

    // Get notification preferences
    getNotificationPreferences: builder.query<NotificationPreferences, void>({
      query: () => '/notifications/preferences/',
      providesTags: ['NotificationPreferences']
    }),

    // Update notification preferences
    updateNotificationPreferences: builder.mutation<
      NotificationPreferences,
      Partial<NotificationPreferences>
    >({
      query: (data) => ({
        url: '/notifications/preferences/',
        method: 'PATCH',
        body: data
      }),
      invalidatesTags: ['NotificationPreferences']
    }),

    // Delete notification
    deleteNotification: builder.mutation<{ success: boolean; message: string }, number>({
      query: (notificationId) => ({
        url: `/notifications/${notificationId}/delete/`,
        method: 'DELETE'
      }),
      invalidatesTags: ['Notification', 'NotificationCount']
    }),

    // Create test notification
    createTestNotification: builder.mutation<
      { success: boolean; message: string; notification_id: number },
      void
    >({
      query: () => ({
        url: '/notifications/test/',
        method: 'POST'
      }),
      invalidatesTags: ['Notification', 'NotificationCount']
    }),

    // Admin only: Create notification
    createNotification: builder.mutation<
      { success: boolean; message: string; notification_id: number },
      CreateNotificationRequest
    >({
      query: (data) => ({
        url: '/notifications/create/',
        method: 'POST',
        body: data
      }),
      invalidatesTags: ['Notification', 'NotificationCount']
    })
  })
});

export const {
  useGetNotificationsQuery,
  useGetNotificationCountQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
  useGetNotificationPreferencesQuery,
  useUpdateNotificationPreferencesMutation,
  useDeleteNotificationMutation,
  useCreateTestNotificationMutation,
  useCreateNotificationMutation
} = notificationApi;
