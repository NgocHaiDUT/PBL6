# Tính Năng Đổi Mật Khẩu Lần Đầu

## Tổng Quan
Tính năng này yêu cầu người dùng đổi mật khẩu trong lần đăng nhập đầu tiên để đảm bảo bảo mật.

## Cách Hoạt Động

### Backend (NestJS)

#### 1. AuthService Updates
- **Method `login()`**: Kiểm tra trường `firstlogin` và trả về `requiresPasswordChange`
- **Method `changePasswordFirstTime()`**: Xử lý đổi mật khẩu lần đầu với validation
- **Method `register()`**: Set `firstlogin = true` cho user mới

#### 2. AuthController Updates
- **Endpoint `/auth/change-password-first-time`**: API để đổi mật khẩu lần đầu
- Validation: userId và newPassword là bắt buộc

#### 3. Guard Middleware
- **RequirePasswordChangeGuard**: Bảo vệ các route quan trọng
- Kiểm tra `firstlogin` status trước khi cho phép truy cập

#### 4. Database Schema
- Sử dụng trường `firstlogin` có sẵn trong model `users`
- Ghi audit log vào bảng `audit_logs`

### Frontend (React)

#### 1. AuthContext Updates
- Thêm `requiresPasswordChange` state
- Thêm `changePasswordFirstTime()` method
- Tự động kiểm tra `firstlogin` status khi load user

#### 2. Components
- **FirstTimePasswordChange**: Form đổi mật khẩu với validation
- **AuthGuard**: Wrapper component để kiểm tra và redirect

#### 3. API Integration
- Thêm `changePasswordFirstTime` vào authApi
- Tích hợp với backend endpoint

## Flow Hoạt Động

1. **User đăng ký**: `firstlogin = true`
2. **User đăng nhập lần đầu**: 
   - Backend trả về `requiresPasswordChange = true`
   - Frontend hiển thị form đổi mật khẩu
3. **User đổi mật khẩu**:
   - Validation mật khẩu mới
   - Backend cập nhật `firstlogin = false`
   - Ghi audit log
4. **User tiếp tục**: Có thể truy cập các tính năng bình thường

## API Endpoints

### POST `/auth/change-password-first-time`
```json
{
  "userId": 123,
  "newPassword": "newpassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Đổi mật khẩu thành công"
}
```

## Validation Rules

- Mật khẩu mới phải có ít nhất 6 ký tự
- Mật khẩu mới phải khác mật khẩu cũ
- Chỉ cho phép đổi mật khẩu khi `firstlogin = true`

## Security Features

- Audit logging cho mọi lần đổi mật khẩu
- Guard middleware bảo vệ routes quan trọng
- Validation nghiêm ngặt ở cả frontend và backend

## Usage Example

```jsx
// Trong component
const { requiresPasswordChange, changePasswordFirstTime } = useAuth();

if (requiresPasswordChange) {
  return <FirstTimePasswordChange onSuccess={() => window.location.reload()} />;
}

// Sử dụng AuthGuard
<AuthGuard>
  <ProtectedComponent />
</AuthGuard>
```

## Testing

Để test tính năng:
1. Tạo user mới (sẽ có `firstlogin = true`)
2. Đăng nhập với mật khẩu tạm thời
3. Sẽ được redirect đến form đổi mật khẩu
4. Sau khi đổi thành công, có thể truy cập bình thường
