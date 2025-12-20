# Avatar Upload Guide

## Tổng quan
API tạo và cập nhật user hiện đã hỗ trợ upload avatar trực tiếp thông qua multipart/form-data. Hệ thống tự động hỗ trợ cả **S3 storage** và **local storage** dựa trên cấu hình môi trường.

## Cấu hình

### Biến môi trường
```env
# S3 Configuration (optional)
USE_S3=true                                    # true để dùng S3, false hoặc không set để dùng local
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET_NAME=your_bucket_name
AWS_REGION=ap-southeast-1
```

### Storage Behavior
- **S3 Mode**: Khi `USE_S3=true` và có đầy đủ AWS credentials
  - Avatar sẽ được upload lên S3
  - URL trả về dạng: `https://bucket-name.s3.region.amazonaws.com/avatars/xxxxx.jpg`
  
- **Local Mode**: Khi không cấu hình S3 hoặc `USE_S3=false`
  - Avatar lưu tại thư mục `uploads/avatars/`
  - URL trả về dạng: `/uploads/avatars/avatar_timestamp_random.jpg`

## API Endpoints

### 1. Tạo User với Avatar
**POST** `/admin/users`

#### Request
- **Content-Type**: `multipart/form-data`
- **Headers**: `Authorization: Bearer <token>`
- **Required Permission**: `manage_users`

#### Form Fields
```
email: string (required)
password: string (optional, min 6 chars)
full_name: string (optional)
phone: string (optional)
is_active: boolean (optional, default: true)
firstlogin: boolean (optional, default: true)
role_id: number (optional)
avatar: file (optional) - Image file (JPG, PNG, GIF, HEIC, HEIF, WebP, max 5MB)
```

#### Example using cURL
```bash
curl -X POST http://localhost:3000/admin/users \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "email=newuser@example.com" \
  -F "password=password123" \
  -F "full_name=Nguyen Van A" \
  -F "phone=0912345678" \
  -F "is_active=true" \
  -F "role_id=2" \
  -F "avatar=@/path/to/avatar.jpg"
```

#### Example using Postman
1. Chọn method **POST** và URL `/admin/users`
2. Tab **Authorization** → Type: Bearer Token → Paste token
3. Tab **Body** → Chọn **form-data**
4. Thêm các fields:
   - `email`: newuser@example.com
   - `full_name`: Nguyen Van A
   - `phone`: 0912345678
   - `password`: password123
   - `is_active`: true
   - `role_id`: 2
   - `avatar`: [Chọn type là **File**, click "Select Files" để upload ảnh]

#### Example using JavaScript/Fetch
```javascript
const formData = new FormData();
formData.append('email', 'newuser@example.com');
formData.append('password', 'password123');
formData.append('full_name', 'Nguyen Van A');
formData.append('phone', '0912345678');
formData.append('is_active', 'true');
formData.append('role_id', '2');
formData.append('avatar', fileInput.files[0]); // file từ input type="file"

const response = await fetch('http://localhost:3000/admin/users', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
```

#### Response Success (201)
```json
{
  "id": 123,
  "email": "newuser@example.com",
  "full_name": "Nguyen Van A",
  "phone": "0912345678",
  "avatar_url": "https://bucket.s3.region.amazonaws.com/avatars/1702998765-123456789.jpg",
  "is_active": true,
  "firstlogin": true,
  "role_id": 2,
  "created_at": "2024-12-19T10:00:00.000Z",
  "updated_at": "2024-12-19T10:00:00.000Z"
}
```

---

### 2. Cập nhật Avatar riêng
**PATCH** `/admin/users/:id/avatar`

#### Request
- **Content-Type**: `multipart/form-data`
- **Headers**: `Authorization: Bearer <token>`
- **Required Permission**: `manage_users`

#### Form Fields
```
avatar: file (required) - Image file (JPG, PNG, GIF, HEIC, HEIF, WebP, max 5MB)
```

#### Example using cURL
```bash
curl -X PATCH http://localhost:3000/admin/users/123/avatar \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "avatar=@/path/to/new-avatar.jpg"
```

#### Example using Postman
1. Chọn method **PATCH** và URL `/admin/users/123/avatar`
2. Tab **Authorization** → Type: Bearer Token → Paste token
3. Tab **Body** → Chọn **form-data**
4. Thêm field `avatar` với type **File**, click "Select Files"

#### Example using JavaScript/Fetch
```javascript
const formData = new FormData();
formData.append('avatar', fileInput.files[0]);

const response = await fetch('http://localhost:3000/admin/users/123/avatar', {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
```

#### Response Success (200)
```json
{
  "success": true,
  "message": "Avatar updated successfully",
  "data": {
    "id": 123,
    "email": "user@example.com",
    "full_name": "Nguyen Van A",
    "avatar_url": "https://bucket.s3.region.amazonaws.com/avatars/1702998765-987654321.jpg",
    "role": {
      "id": 2,
      "name": "User"
    },
    ...
  }
}
```

---

## File Restrictions

### Allowed File Types
- JPG/JPEG
- PNG
- GIF
- HEIC/HEIF
- WebP

### File Size Limit
- Maximum: **5MB** per avatar

### Error Responses

#### 400 Bad Request - No File
```json
{
  "statusCode": 400,
  "message": "No avatar file provided",
  "error": "Bad Request"
}
```

#### 400 Bad Request - Invalid File Type
```json
{
  "statusCode": 400,
  "message": "Only image files (JPG, PNG, GIF, HEIC, HEIF, WebP) are allowed!",
  "error": "Bad Request"
}
```

#### 400 Bad Request - File Too Large
```json
{
  "statusCode": 400,
  "message": "File too large. Maximum size is 5MB",
  "error": "Bad Request"
}
```

## Technical Implementation

### Architecture
```
Controller (users.controller.ts)
  ↓ (FileInterceptor + avatarConfig)
  ↓ File Upload
  ↓ (generateAvatarUrl)
  ↓
Service (users.service.ts)
  ↓ (Prisma ORM)
  ↓
Database (PostgreSQL)
```

### Configuration File
File: `src/users/config/avatar.config.ts`

- Tự động phát hiện S3 config từ env variables
- Fallback về local storage nếu không có S3
- Export `avatarConfig` cho Multer
- Export `generateAvatarUrl` helper function
- Export `USE_S3` và `STORAGE_TYPE` constants

### File Naming Convention
- **S3**: `avatars/{timestamp}-{random}.{ext}`
- **Local**: `avatar_{timestamp}_{random}.{ext}`

## Rollback về Local Storage

Nếu muốn tạm thời chuyển về local storage:
1. Set `USE_S3=false` trong `.env`
2. Restart application
3. Uploads sẽ tự động chuyển sang thư mục `uploads/avatars/`

Không cần thay đổi code!

## Notes

- Avatar cũ sẽ **KHÔNG** tự động xóa khi upload avatar mới
- Nếu không upload avatar khi tạo user, `avatar_url` sẽ là `null`
- Local uploads cần serve static files qua Express hoặc Nginx
- S3 URLs là public accessible (cấu hình bucket policy)
