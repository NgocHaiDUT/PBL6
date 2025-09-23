# Posts API Documentation

## Overview
API cho quản lý bài viết (posts), bao gồm các chức năng:
- Đăng bài (create post)
- Cập nhật/xóa bài (update/delete post)
- Like/Unlike bài viết
- Comment và xóa comment
- Upload media và thêm tags
- Liên kết products trong bài viết

## Endpoints

### 1. Tạo bài viết mới
```
POST /posts
```

**Request Body:**
```json
{
  "shop_id": 1, // optional - nếu đăng từ shop
  "post_type": "post", // optional, default: "post"
  "title": "Tiêu đề bài viết", // optional
  "content_md": "Nội dung bài viết bằng markdown",
  "cover_url": "https://example.com/cover.jpg", // optional
  "video_url": "https://example.com/video.mp4", // optional
  "visibility": "public", // optional: "public" | "private" | "friends"
  "media_urls": [ // optional - danh sách ảnh/video
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg"
  ],
  "product_ids": [1, 2, 3], // optional - liên kết products
  "tags": ["skincare", "makeup"] // optional - tags
}
```

### 2. Lấy danh sách bài viết
```
GET /posts?page=1&limit=10&user_id=1&search=skincare
```

**Query Parameters:**
- `page`: Trang hiện tại (default: 1)
- `limit`: Số bài viết mỗi trang (default: 10)
- `user_id`: Lọc theo user (optional)
- `shop_id`: Lọc theo shop (optional)
- `post_type`: Lọc theo loại bài viết (optional)
- `visibility`: Lọc theo độ hiển thị (optional)
- `search`: Tìm kiếm trong title và content (optional)

### 3. Lấy chi tiết bài viết
```
GET /posts/:id
```

### 4. Cập nhật bài viết
```
PATCH /posts/:id
```

**Request Body:** Giống như tạo bài viết, chỉ cần truyền các field muốn cập nhật

### 5. Xóa bài viết
```
DELETE /posts/:id
```

### 6. Like bài viết
```
POST /posts/:id/like
```

### 7. Unlike bài viết
```
DELETE /posts/:id/like
```

### 8. Thêm comment
```
POST /posts/:id/comments
```

**Request Body:**
```json
{
  "content": "Nội dung comment",
  "parent_id": 123 // optional - để reply comment
}
```

### 9. Lấy danh sách comment
```
GET /posts/:id/comments?page=1&limit=10
```

### 10. Xóa comment
```
DELETE /posts/comments/:commentId
```

### 11. Like comment
```
POST /posts/comments/:commentId/like
```

### 12. Unlike comment
```
DELETE /posts/comments/:commentId/like
```

### 13. Lấy danh sách người like comment
```
GET /posts/comments/:commentId/likes?page=1&limit=10
```

## Response Format

### Post Response
```json
{
  "id": 1,
  "user_id": 1,
  "shop_id": null,
  "post_type": "post",
  "title": "Sample Post",
  "content_md": "This is a sample post content",
  "cover_url": "https://example.com/cover.jpg",
  "video_url": null,
  "moderation_status": "approved",
  "visibility": "public",
  "view_count": 100,
  "like_count": 25,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z",
  "user": {
    "id": 1,
    "full_name": "John Doe",
    "avatar_url": "https://example.com/avatar.jpg"
  },
  "shop": null,
  "post_media": [
    {
      "id": 1,
      "media_url": "https://example.com/image1.jpg",
      "media_type": "image",
      "sort_order": 0
    }
  ],
  "post_products": [
    {
      "product": {
        "id": 1,
        "name": "Product Name",
        "slug": "product-name"
      }
    }
  ],
  "post_tags": [
    {
      "tag": {
        "id": 1,
        "name": "skincare",
        "slug": "skincare"
      }
    }
  ],
  "likes_count": 25,
  "comments_count": 10
}
```

### Comment Response
```json
{
  "id": 1,
  "user_id": 1,
  "target_type": "post",
  "target_id": 1,
  "content": "This is a great post!",
  "parent_id": null,
  "created_at": "2024-01-01T00:00:00Z",
  "user": {
    "id": 1,
    "full_name": "John Doe",
    "avatar_url": "https://example.com/avatar.jpg"
  },
  "likes_count": 5
}
```

### Like Response
```json
{
  "id": 1,
  "user_id": 1,
  "target_type": "comment",
  "target_id": 1,
  "created_at": "2024-01-01T00:00:00Z",
  "user": {
    "id": 1,
    "full_name": "John Doe",
    "avatar_url": "https://example.com/avatar.jpg"
  }
}
```

### Paginated Response
```json
{
  "data": [...], // Array of posts/comments/likes
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

## Notes

1. **Authentication**: Hiện tại đang mock user ID = 1. Khi có authentication system, uncomment các `@UseGuards(JwtAuthGuard)` decorators và lấy user ID từ JWT token.

2. **File Upload**: API này chưa handle file upload trực tiếp. Bạn cần upload file lên cloud storage (AWS S3, Cloudinary, etc.) trước rồi truyền URL vào `media_urls`.

3. **Permissions**: 
   - Chỉ chủ sở hữu mới có thể update/delete post
   - Chỉ chủ sở hữu mới có thể delete comment của mình

4. **Moderation**: Posts mới tạo sẽ có status "pending", cần admin approve thành "approved" mới hiển thị trong danh sách public.

5. **Share functionality**: Có thể implement thêm endpoint để share posts, hoặc sử dụng frontend để generate share links.