import { store } from '../store';
import {
  setConnectionStatus,
  addNotification,
  setUnreadCount,
  markAsRead,
  Notification
} from '../store/features/notificationSlice';
import { config, env } from 'config/environment';

export interface WebSocketMessage {
  type: 'notification' | 'notification_count' | 'notifications_list' | 'pong';
  notification?: Notification;
  notifications?: Notification[];
  count?: number;
}

export class NotificationWebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000; // 5 seconds
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private url: string;
  private token: string | null = null;

  constructor() {
    // Use centralized environment configuration
    this.url = env.getWebSocketUrl('notifications/');
  }

  setAuthToken(token: string | null) {
    this.token = token;
  }

  connect() {
    if (!this.token) {
      console.warn('Cannot connect to WebSocket: No auth token provided');
      return;
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    try {
      // SECURITY: Pass JWT via Sec-WebSocket-Protocol header instead of URL query
      // URL query params are logged in server access logs, proxy logs, and browser history
      this.ws = new WebSocket(this.url, [`access_token`, this.token]);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);

      console.log('Attempting to connect to WebSocket notifications');
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      this.handleReconnect();
    }
  }

  disconnect() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'User disconnected');
      this.ws = null;
    }

    store.dispatch(setConnectionStatus(false));
    this.reconnectAttempts = 0;
  }

  private handleOpen() {
    console.log('WebSocket connected successfully');
    store.dispatch(setConnectionStatus(true));
    this.reconnectAttempts = 0;

    // Start heartbeat to keep connection alive
    this.startHeartbeat();

    // Request initial notification count
    this.requestNotificationCount();
  }

  private handleMessage(event: MessageEvent) {
    try {
      const data: WebSocketMessage = JSON.parse(event.data);

      switch (data.type) {
        case 'notification':
          if (data.notification) {
            console.log('Received new notification:', data.notification);
            store.dispatch(addNotification(data.notification));

            // Show toast notification for new notifications
            this.showToastNotification(data.notification);
          }
          break;

        case 'notification_count':
          if (typeof data.count === 'number') {
            console.log('Updated notification count:', data.count);
            store.dispatch(setUnreadCount(data.count));
          }
          break;

        case 'notifications_list':
          if (data.notifications) {
            console.log('Received notifications list:', data.notifications.length);
            // This could be used for initial load or refresh
          }
          break;

        case 'pong':
          // Heartbeat response - connection is alive
          break;

        default:
          console.warn('Unknown WebSocket message type:', data.type);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  private handleClose(event: CloseEvent) {
    console.log('WebSocket disconnected:', event.code, event.reason);
    store.dispatch(setConnectionStatus(false));

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Attempt to reconnect unless it was a clean close
    if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.handleReconnect();
    }
  }

  private handleError(error: Event) {
    console.error('WebSocket error:', error);
    store.dispatch(setConnectionStatus(false));
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
      }
    }, 30000); // Send ping every 30 seconds
  }

  private showToastNotification(notification: Notification) {
    // Import toast service dynamically to avoid circular dependencies
    import('../utils/toast/ToastManager').then((ToastManagerModule) => {
      const toast = ToastManagerModule.default;

      let icon = '🔔';
      switch (notification.type) {
        case 'product_scan':
          icon = '📱';
          break;
        case 'product_review':
          icon = '⭐';
          break;
        case 'carbon_verification':
          icon = '🌱';
          break;
        case 'system_alert':
          icon = '⚠️';
          break;
      }

      toast.info(
        `${icon} ${notification.title}`,
        notification.message,
        5000 // Show for 5 seconds
      );
    });
  }

  // Public methods to send messages
  send(message: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('Cannot send message: WebSocket not connected');
    }
  }

  markAsRead(notificationId: number) {
    this.send({
      type: 'mark_as_read',
      notification_id: notificationId
    });
  }

  markAllAsRead() {
    this.send({
      type: 'mark_all_as_read'
    });
  }

  requestNotifications(limit = 20) {
    this.send({
      type: 'get_notifications',
      limit
    });
  }

  requestNotificationCount() {
    this.send({
      type: 'get_notification_count'
    });
  }

  // Get connection status
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
export const notificationWebSocket = new NotificationWebSocketService();
