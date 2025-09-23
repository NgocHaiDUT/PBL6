# Messages API Documentation

## Overview
API cho hệ thống tin nhắn (messaging system), bao gồm các chức năng:
- Tạo và quản lý cuộc hội thoại (conversations)
- Gửi và nhận tin nhắn
- Đánh dấu tin nhắn đã đọc
- Tìm kiếm cuộc hội thoại

## Database Schema
Hệ thống sử dụng 4 bảng chính:
- `conversations`: Lưu thông tin cuộc hội thoại
- `conversation_participants`: Lưu thành viên trong cuộc hội thoại
- `messages`: Lưu tin nhắn
- `message_reads`: Lưu trạng thái đã đọc tin nhắn

## Endpoints

### 1. Tạo cuộc hội thoại mới
```
POST /messages/conversations
```

**Request Body:**
```json
{
  "participant_ids": [2, 3], // Danh sách ID user tham gia
  "type": "private" // "private" hoặc "group"
}
```

**Response:**
```json
{
  "id": 1,
  "type": "private",
  "created_at": "2024-01-01T00:00:00Z",
  "participants": [
    {
      "user_id": 1,
      "role": "admin",
      "joined_at": "2024-01-01T00:00:00Z",
      "user": {
        "id": 1,
        "full_name": "John Doe",
        "avatar_url": "https://example.com/avatar1.jpg"
      }
    }
  ]
}
```

### 2. Lấy danh sách cuộc hội thoại
```
GET /messages/conversations?page=1&limit=10
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "type": "private",
      "created_at": "2024-01-01T00:00:00Z",
      "participants": [...],
      "last_message": {
        "id": 10,
        "content": "Hello there!",
        "created_at": "2024-01-01T10:00:00Z",
        "sender": {
          "id": 2,
          "full_name": "Jane Smith",
          "avatar_url": "https://example.com/avatar2.jpg"
        }
      },
      "unread_count": 3
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "pages": 1
  }
}
```

### 3. Lấy chi tiết cuộc hội thoại
```
GET /messages/conversations/:id
```

### 4. Tìm hoặc tạo cuộc hội thoại với user khác
```
POST /messages/conversations/find-or-create/:otherUserId
```

### 5. Gửi tin nhắn
```
POST /messages
```

**Request Body:**
```json
{
  "conversation_id": 1,
  "content": "Hello, how are you?"
}
```

**Response:**
```json
{
  "id": 10,
  "conversation_id": 1,
  "sender_id": 1,
  "content": "Hello, how are you?",
  "created_at": "2024-01-01T10:00:00Z",
  "sender": {
    "id": 1,
    "full_name": "John Doe",
    "avatar_url": "https://example.com/avatar1.jpg"
  }
}
```

### 6. Lấy tin nhắn trong cuộc hội thoại
```
GET /messages/conversations/:conversationId/messages?page=1&limit=20
```

**Response:**
```json
{
  "data": [
    {
      "id": 10,
      "conversation_id": 1,
      "sender_id": 1,
      "content": "Hello, how are you?",
      "created_at": "2024-01-01T10:00:00Z",
      "sender": {
        "id": 1,
        "full_name": "John Doe",
        "avatar_url": "https://example.com/avatar1.jpg"
      },
      "message_reads": [
        {
          "user_id": 1,
          "read_at": "2024-01-01T10:00:00Z",
          "user": {
            "id": 1,
            "full_name": "John Doe",
            "avatar_url": "https://example.com/avatar1.jpg"
          }
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "pages": 3
  }
}
```

### 7. Đánh dấu tin nhắn là đã đọc
```
PATCH /messages/:messageId/read
```

### 8. Đánh dấu tất cả tin nhắn trong conversation là đã đọc
```
PATCH /messages/conversations/:conversationId/read-all
```

**Response:**
```json
{
  "message": "All messages marked as read",
  "marked_count": 5
}
```

### 9. Đếm số tin nhắn chưa đọc
```
GET /messages/conversations/:conversationId/unread-count
```

**Response:**
```json
3
```

### 10. Xóa tin nhắn
```
DELETE /messages/:messageId
```

## Features

### 1. **Private Conversations**
- Tự động kiểm tra và trả về cuộc hội thoại đã tồn tại giữa 2 người
- Mỗi cặp user chỉ có 1 cuộc hội thoại private

### 2. **Group Conversations**
- Hỗ trợ cuộc hội thoại nhóm với nhiều thành viên
- Phân quyền admin/member cho các thành viên

### 3. **Message Read Status**
- Theo dõi trạng thái đã đọc của từng tin nhắn
- Đếm số tin nhắn chưa đọc trong mỗi cuộc hội thoại
- Tự động đánh dấu đã đọc cho người gửi

### 4. **Real-time Ready**
- Cấu trúc API sẵn sàng tích hợp WebSocket
- Dữ liệu response phù hợp cho real-time updates

### 5. **Pagination**
- Phân trang cho danh sách cuộc hội thoại
- Phân trang cho tin nhắn (mặc định 20 tin nhắn/trang)

## Security & Permissions

1. **User Authentication**: Hiện tại đang mock user ID = 1. Khi có authentication system, uncomment các `@UseGuards(JwtAuthGuard)` decorators.

2. **Message Permissions**:
   - Chỉ thành viên cuộc hội thoại mới có thể xem tin nhắn
   - Chỉ người gửi mới có thể xóa tin nhắn của mình
   - Tự động thêm người tạo conversation vào danh sách participants

3. **Privacy**:
   - Private conversations chỉ có 2 thành viên
   - Group conversations có thể có nhiều thành viên

## Database Indexes (Recommended)

Để tối ưu performance, nên tạo các index sau:

```sql
-- Index cho conversation participants
CREATE INDEX idx_conversation_participants_user_id ON conversation_participants(user_id);
CREATE INDEX idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);

-- Index cho messages
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Index cho message reads
CREATE INDEX idx_message_reads_user_id ON message_reads(user_id);
CREATE INDEX idx_message_reads_message_id ON message_reads(message_id);
```

## Future Enhancements

1. **File Attachments**: Hỗ trợ gửi file, hình ảnh
2. **Message Types**: Phân loại tin nhắn (text, image, file, system)
3. **Message Reactions**: Emoji reactions
4. **Message Threading**: Reply to specific messages
5. **Push Notifications**: Thông báo tin nhắn mới
6. **Message Search**: Tìm kiếm tin nhắn trong cuộc hội thoại
7. **Online Status**: Trạng thái online/offline của users
8. **Message Encryption**: Mã hóa tin nhắn