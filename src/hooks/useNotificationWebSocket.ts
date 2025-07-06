import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { notificationWebSocket } from '../services/notificationWebSocket';
import { useGetNotificationCountQuery } from '../store/api/notificationApi';
import { setNotifications, setUnreadCount } from '../store/features/notificationSlice';
import { RootState } from '../store';

export const useNotificationWebSocket = () => {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const user = useSelector((state: RootState) => state.userState.user);

  // Get initial notification count
  const { data: countData } = useGetNotificationCountQuery(undefined, {
    skip: !isAuthenticated,
    refetchOnMountOrArgChange: true
  });

  useEffect(() => {
    if (countData) {
      dispatch(setUnreadCount(countData.unread_count));
    }
  }, [countData, dispatch]);

  useEffect(() => {
    if (isAuthenticated && user) {
      // Get token from localStorage or wherever it's stored
      const token = localStorage.getItem('access_token');

      if (token) {
        notificationWebSocket.setAuthToken(token);
        notificationWebSocket.connect();
      }

      // Cleanup on unmount or when user logs out
      return () => {
        if (!isAuthenticated) {
          notificationWebSocket.disconnect();
        }
      };
    } else {
      // Disconnect when user is not authenticated
      notificationWebSocket.disconnect();
    }
  }, [isAuthenticated, user]);

  // Handle token refresh
  useEffect(() => {
    const handleTokenRefresh = () => {
      const newToken = localStorage.getItem('access_token');
      if (newToken && isAuthenticated) {
        notificationWebSocket.setAuthToken(newToken);
        // Reconnect if not already connected
        if (!notificationWebSocket.isConnected()) {
          notificationWebSocket.connect();
        }
      }
    };

    // Listen for storage changes (token refresh)
    window.addEventListener('storage', handleTokenRefresh);

    return () => {
      window.removeEventListener('storage', handleTokenRefresh);
    };
  }, [isAuthenticated]);

  return {
    isConnected: notificationWebSocket.isConnected(),
    connect: () => notificationWebSocket.connect(),
    disconnect: () => notificationWebSocket.disconnect(),
    markAsRead: (notificationId: number) => notificationWebSocket.markAsRead(notificationId),
    markAllAsRead: () => notificationWebSocket.markAllAsRead()
  };
};
