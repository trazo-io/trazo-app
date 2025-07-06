# Trazo Real-time Notification System

A comprehensive real-time notification system for the Trazo agricultural carbon transparency platform.

## Features

- **Real-time Notifications**: WebSocket-based instant notifications
- **Product Scan Notifications**: Get notified when someone scans your product QR codes
- **Product Review Notifications**: Get notified when someone leaves reviews
- **User Preferences**: Granular control over notification types and delivery methods
- **Responsive Design**: Mobile-optimized notification dropdown
- **Connection Status**: Visual indicators for WebSocket connection status
- **Badge Counts**: Unread notification counters

## Components

### NotificationDropdown

The main notification component that replaces the BellIcon in the navigation bar.

**Features:**

- Shows unread notification count badge
- Real-time connection status indicator
- Paginated notification list (latest 10)
- Mark as read/unread functionality
- Delete individual notifications
- Mark all as read option

**Usage:**

```tsx
import { NotificationDropdown } from 'components/Notifications';

<NotificationDropdown navbarIcon={navbarIcon} />;
```

### NotificationSettings

A comprehensive settings panel for managing notification preferences.

**Features:**

- Toggle notification types (scans, reviews, carbon verification, system alerts)
- Configure delivery methods (real-time, email, push)
- Send test notifications
- Real-time preference updates

**Usage:**

```tsx
import { NotificationSettings } from 'components/Notifications';

<NotificationSettings />;
```

### NotificationTest

A development component for testing notification functionality.

**Features:**

- Create local test notifications
- Send server test notifications
- Test different notification types and priorities

## Backend Integration

### Models

- `Notification`: Core notification with read/delivered tracking
- `NotificationPreference`: User-specific notification settings
- `NotificationChannel`: WebSocket connection tracking
- `NotificationTemplate`: Message templates for different notification types

### API Endpoints

- `GET /api/notifications/` - List notifications with filtering
- `POST /api/notifications/mark-as-read/` - Mark individual as read
- `POST /api/notifications/mark-all-as-read/` - Mark all as read
- `GET /api/notifications/count/` - Get notification counts
- `GET/PATCH /api/notifications/preferences/` - Manage preferences
- `POST /api/notifications/test/` - Create test notification

### WebSocket Connection

- **URL**: `ws://localhost:8000/ws/notifications/`
- **Authentication**: JWT token via query parameter
- **Real-time Features**: Instant notification delivery, connection status, heartbeat

## Integration Points

### Product Scans

When a user scans a product QR code (`history/views.py:public_history`):

```python
notification_service.create_product_scan_notification(
    product_owner=product_owner,
    scanner=scanner,
    product_name=product_name,
    scan_location=scan_location
)
```

### Product Reviews

When a user creates a review (`reviews/views.py:create`):

```python
notification_service.create_product_review_notification(
    product_owner=product_owner,
    reviewer=reviewer,
    product_name=product_name,
    rating=rating,
    review_text=review_text
)
```

## Setup Instructions

### Backend Setup

1. Django Channels is already configured in `settings/base.py`
2. Redis is used as the channel layer backend
3. Migrations have been applied for notification models
4. WebSocket routing is configured in `backend/asgi.py`

### Frontend Setup

1. Redux store includes notification slice
2. RTK Query API endpoints for notification management
3. WebSocket service for real-time connections
4. Notification components integrated in navigation

### Running the System

1. Start Redis: `redis-server`
2. Start Django: `poetry run python manage.py runserver`
3. Start React: `npm start`
4. Navigate to the app and check the notification bell icon

## Usage Examples

### Triggering Notifications

1. **Product Scan**: Visit a product QR URL while logged in as a different user
2. **Product Review**: Create a review for someone else's product
3. **Test Notification**: Use the settings panel to send a test notification

### Managing Preferences

1. Access notification settings from user profile or settings page
2. Toggle notification types and delivery methods
3. Changes are saved automatically and applied in real-time

### WebSocket Connection

- Automatically connects when user is authenticated
- Reconnects on token refresh or connection loss
- Shows connection status in notification dropdown

## Technical Details

### State Management

```typescript
// Redux store structure
interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  isLoading: boolean;
  preferences: NotificationPreferences;
}
```

### WebSocket Messages

```typescript
interface WebSocketMessage {
  type: 'notification' | 'notification_count' | 'pong';
  notification?: Notification;
  count?: number;
}
```

### Notification Types

- `product_scan`: Someone scanned your product
- `product_review`: Someone reviewed your product
- `carbon_verification`: Carbon verification updates
- `system_alert`: System notifications

### Priority Levels

- `low`: Gray indicator
- `medium`: Blue indicator
- `high`: Orange indicator
- `urgent`: Red indicator

## Troubleshooting

### WebSocket Connection Issues

1. Check that Redis is running
2. Verify JWT token is valid
3. Check browser console for connection errors
4. Ensure CORS settings allow WebSocket connections

### Notification Not Appearing

1. Check user preferences (may be disabled)
2. Verify user is not triggering their own notifications
3. Check network tab for API errors
4. Verify notification was created in Django admin

### Performance Considerations

- Notifications are paginated (max 10 visible)
- WebSocket connection uses heartbeat to stay alive
- Automatic reconnection with exponential backoff
- Efficient Redux state updates to prevent re-renders

## Future Enhancements

1. **Push Notifications**: Browser push notifications for background alerts
2. **Email Notifications**: Email delivery for important notifications
3. **Notification History**: Full notification history with search/filtering
4. **Bulk Actions**: Select multiple notifications for bulk operations
5. **Rich Notifications**: Images, actions, and rich content in notifications
6. **Mobile Apps**: Push notifications for mobile applications
