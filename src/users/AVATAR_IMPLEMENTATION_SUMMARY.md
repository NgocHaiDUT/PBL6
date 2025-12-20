# Tóm tắt: Cập nhật API Tạo User với Upload Avatar

## Đã hoàn thành

### 1. Tạo Configuration cho Avatar Upload
**File**: `src/users/config/avatar.config.ts`

- ✅ Hỗ trợ cả **S3** và **Local Storage**
- ✅ Tự động phát hiện môi trường (dựa vào env variables)
- ✅ File size limit: 5MB
- ✅ Allowed formats: JPG, PNG, GIF, HEIC, HEIF, WebP
- ✅ Folder: `avatars/` (S3) hoặc `uploads/avatars/` (Local)

### 2. Cập nhật Users Controller
**File**: `src/users/users.controller.ts`

#### Thay đổi:
- ✅ Import `FileInterceptor` từ `@nestjs/platform-express`
- ✅ Import `UseInterceptors`, `UploadedFile`, `BadRequestException`
- ✅ Import config: `avatarConfig`, `generateAvatarUrl`

#### Endpoints mới/cập nhật:

**a) POST /admin/users** (Đã cập nhật)
```typescript
@UseInterceptors(FileInterceptor('avatar', avatarConfig))
create(@Body() createUserDto, @UploadedFile() file?: Express.Multer.File)
```
- Nhận file qua field `avatar` trong multipart/form-data
- Tự động generate avatar URL và gán vào DTO
- File upload là **optional**

**b) PATCH /admin/users/:id/avatar** (Mới)
```typescript
@UseInterceptors(FileInterceptor('avatar', avatarConfig))
updateAvatar(@Param('id') id: number, @UploadedFile() file: Express.Multer.File)
```
- Endpoint riêng để cập nhật avatar
- File upload là **required**
- Validate file tồn tại trước khi xử lý

### 3. Cập nhật Users Service
**File**: `src/users/users.service.ts`

#### Method mới:
```typescript
async updateAvatar(id: number, avatarUrl: string): Promise<any>
```
- Validate user tồn tại
- Update `avatar_url` và `updated_at`
- Trả về response với thông báo thành công

### 4. Documentation
**File**: `src/users/AVATAR_UPLOAD_GUIDE.md`

- ✅ Hướng dẫn đầy đủ về cách sử dụng API
- ✅ Ví dụ với cURL, Postman, JavaScript/Fetch
- ✅ Giải thích cấu hình S3 vs Local
- ✅ Error handling và validation rules
- ✅ Technical implementation details

## Cách sử dụng

### Tạo user với avatar
```bash
POST /admin/users
Content-Type: multipart/form-data

Fields:
- email: user@example.com
- full_name: Nguyen Van A
- password: password123
- avatar: [FILE] (optional)
```

### Cập nhật avatar
```bash
PATCH /admin/users/123/avatar
Content-Type: multipart/form-data

Fields:
- avatar: [FILE] (required)
```

## Kiểm tra lỗi

✅ Không có lỗi TypeScript trong các file:
- users.controller.ts
- users.service.ts
- avatar.config.ts

## Dependencies

✅ Tất cả dependencies đã được cài đặt:
- `@aws-sdk/client-s3`: ^3.948.0
- `multer`: ^2.0.2
- `multer-s3`: ^3.0.1
- `@types/multer`: ^2.0.0
- `@types/multer-s3`: ^3.0.3

## So sánh với Product Module

Đã áp dụng đúng pattern từ Product module:

| Feature | Product Module | Users Module |
|---------|---------------|--------------|
| Config file | `config/product.config.ts` | ✅ `config/avatar.config.ts` |
| S3 + Local support | ✅ | ✅ |
| FileInterceptor | ✅ | ✅ |
| generateUrl helper | ✅ `generateBrandImageUrl` | ✅ `generateAvatarUrl` |
| USE_S3 constant | ✅ | ✅ |
| Separate update endpoint | ✅ `PATCH /brands/:id/logo` | ✅ `PATCH /users/:id/avatar` |

## Next Steps (Optional)

1. **Test API endpoints** với Postman hoặc cURL
2. **Configure S3** trong `.env` nếu muốn dùng S3:
   ```env
   USE_S3=true
   AWS_ACCESS_KEY_ID=xxx
   AWS_SECRET_ACCESS_KEY=xxx
   AWS_S3_BUCKET_NAME=xxx
   AWS_REGION=ap-southeast-1
   ```
3. **Serve static files** nếu dùng local storage (thêm vào main.ts):
   ```typescript
   app.useStaticAssets(join(__dirname, '..', 'uploads'), {
     prefix: '/uploads/',
   });
   ```
