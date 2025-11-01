# Notifications Module

This module handles user notifications in the beauty shopping application, including likes, comments, follows, and order updates.

## Features

- **Create Notifications**: Send notifications to users
- **Query Notifications**: Get paginated list of user's notifications
- **Mark as Read**: Mark individual or all notifications as read
- **Notification Stats**: Get unread/read notification counts
- **Cleanup**: Delete all read notifications
- **Helper Methods**: Pre-built notification types for common actions

## API Endpoints

### POST /notifications
Create a new notification for the current user

**Body:**
```json
{
  "type": "like",
  "title": "New Like",
  "body": "Someone liked your post",
  "meta_json": {
    "target_type": "post",
    "target_id": 1
  }
}
```

### GET /notifications
Get paginated list of current user's notifications

**Query Parameters:**
- `type` (optional): Filter by notification type
- `is_read` (optional): Filter by read status (true/false)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

### GET /notifications/stats
Get notification statistics for current user

**Response:**
```json
{
  "total": 100,
  "unread": 5,
  "read": 95
}
```

### POST /notifications/mark-all-read
Mark all notifications as read for current user

**Response:**
```json
{
  "updated": 5
}
```

### DELETE /notifications/read
Delete all read notifications for current user

**Response:**
```json
{
  "deleted": 95
}
```

### GET /notifications/:id
Get a specific notification by ID (must belong to current user)

### PATCH /notifications/:id
Update a notification (typically to mark as read)

**Body:**
```json
{
  "is_read": true
}
```

### PATCH /notifications/:id/mark-read
Shortcut to mark a specific notification as read

### DELETE /notifications/:id
Delete a specific notification

## Database Schema

The module uses the `notifications` table with the following structure:
- `id`: Primary key
- `user_id`: Reference to users table
- `type`: Notification type (like, comment, follow, order, etc.)
- `title`: Notification title
- `body`: Notification content
- `is_read`: Read status (default: false)
- `meta_json`: Additional metadata as JSON string
- `created_at`: Timestamp when notification was created

## Notification Types

The service includes helper methods for common notification types:

### Like Notifications
```typescript
await notificationsService.createLikeNotification(
  targetUserId,
  likerName,
  'post', 
  postId
);
```

### Comment Notifications
```typescript
await notificationsService.createCommentNotification(
  targetUserId,
  commenterName,
  'post',
  postId
);
```

### Follow Notifications
```typescript
await notificationsService.createFollowNotification(
  targetUserId,
  followerName
);
```

### Order Notifications
```typescript
await notificationsService.createOrderNotification(
  userId,
  orderId,
  'shipped'
);
```

## Metadata Structure

The `meta_json` field can contain additional information:

```json
{
  "target_type": "post",
  "target_id": 123,
  "action": "like",
  "order_id": 456,
  "status": "shipped"
}
```

## Integration with Other Modules

This module is designed to work with:
- **Likes Module**: Auto-create notifications when users like content
- **Comments Module**: Auto-create notifications for new comments
- **Posts Module**: Notify post authors of interactions
- **Orders Module**: Send order status updates
- **Users Module**: Notify about new followers

## Error Handling

- `NotFoundException`: When notification doesn't exist or doesn't belong to user
- Proper validation for all input fields
- User isolation - users can only access their own notifications

## Performance Considerations

- Notifications are ordered by `created_at DESC` for recent-first display
- Pagination is implemented to handle large notification lists
- Bulk operations for marking all as read and deleting read notifications
- Indexed queries on `user_id` and `is_read` for performance