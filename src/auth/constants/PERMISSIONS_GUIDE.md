# 🔐 Hướng dẫn Permissions System

## 📋 Tổng quan

Hệ thống permissions được quản lý thông qua **TypeScript Enum** để đảm bảo type-safety và tính nhất quán trong toàn bộ codebase.

## ✅ Tại sao nên dùng Enum?

### 1. **Type Safety** 
```typescript
// ✅ Đúng - IDE sẽ autocomplete và kiểm tra lỗi
@RequirePermissions(Permission.MANAGE_PRODUCT)

// ❌ Sai - Dễ gõ nhầm, không có autocomplete
@RequirePermissions('manage_product')
```

### 2. **Refactoring dễ dàng**
- Nếu đổi tên permission, chỉ cần đổi 1 chỗ trong enum
- TypeScript sẽ báo lỗi tất cả nơi sử dụng permission cũ
- Find & Replace an toàn với IDE

### 3. **Documentation tập trung**
- Tất cả permissions được liệt kê ở 1 file
- Dễ review và audit permissions
- Comment/description rõ ràng cho mỗi permission

### 4. **Tránh lỗi typo**
```typescript
// ❌ String - Dễ gõ sai
@RequirePermissions('manag_prodcut') // Lỗi typo nhưng không phát hiện được

// ✅ Enum - Lỗi ngay lập tức
@RequirePermissions(Permission.MANAG_PRODCUT) // TypeScript báo lỗi ngay
```

## 🎯 Cấu trúc Permissions

### User Permissions
- `MANAGE_USERS` - Quản lý người dùng, vai trò và quyền hạn

### Shop Permissions (Cho Shop Owner & Staff)
- `MANAGE_SHOP_STAFF` ⚠️ - **Chỉ chủ shop** - Quản lý nhân viên
- `EDIT_PROFILE_SHOP` - Chỉnh sửa thông tin shop
- `MANAGE_SHOP_ADMIN` - Quản lý shop (admin level)
- `MANAGE_ORDER` - Quản lý đơn hàng
- `TRY_ON_TESTER` - Thử nghiệm tính năng try-on
- `CHAT_WITH_CUSTOMER` - Chat với khách hàng
- `MANAGE_SHOP_SETTING` - Quản lý cài đặt shop
- `VIEW_DASHBOARD` - Xem dashboard thống kê
- `MANAGE_SHOP_ADDRESS` - Quản lý địa chỉ shop

### Product Permissions
- `MANAGE_PRODUCT` - Quản lý sản phẩm (tạo, sửa, xóa)
- `MANAGE_BRANDS` - Quản lý thương hiệu
- `MANAGE_CATEGORYS` - Quản lý danh mục

### Post Permissions
- `CREATE_POST` - Tạo bài viết mới
- `EDIT_POST` - Chỉnh sửa bài viết
- `DELETE_POST` - Xóa bài viết

## 👥 Phân quyền theo Role

### 🔵 USER (Người dùng thông thường)
```typescript
- CREATE_POST
- EDIT_POST
- DELETE_POST
```

### 🟢 SELLER (Chủ shop)
```typescript
// Product
- MANAGE_PRODUCT

// Shop - Có TẤT CẢ quyền shop
- MANAGE_SHOP_STAFF ⭐ (Chỉ chủ shop)
- EDIT_PROFILE_SHOP
- MANAGE_SHOP_ADDRESS
- MANAGE_ORDER
- TRY_ON_TESTER
- CHAT_WITH_CUSTOMER
- MANAGE_SHOP_SETTING
- VIEW_DASHBOARD
```

### 🟣 STAFF (Nhân viên shop)
```typescript
// Chỉ có quyền vận hành cơ bản
- MANAGE_ORDER
- CHAT_WITH_CUSTOMER
- VIEW_DASHBOARD
```

**⚠️ Lưu ý:** Staff **KHÔNG** có quyền:
- `MANAGE_SHOP_STAFF` (không thể quản lý nhân viên)
- `MANAGE_PRODUCT` (không thể tạo/sửa/xóa sản phẩm)
- `MANAGE_SHOP_SETTING` (không thể thay đổi cài đặt shop)

### 🔴 ADMIN (Quản trị viên)
```typescript
// User Management
- MANAGE_USERS

// Product
- MANAGE_PRODUCT
- MANAGE_BRANDS
- MANAGE_CATEGORYS

// Shop
- MANAGE_SHOP_ADMIN
- MANAGE_SHOP_STAFF
- MANAGE_ORDER
- VIEW_DASHBOARD
```

## 📝 Cách sử dụng

### 1. Import Permission Enum
```typescript
import { Permission } from '@/auth/constants/Permission.enum';
```

### 2. Sử dụng với Decorator
```typescript
@Post()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(Permission.MANAGE_PRODUCT)
async createProduct() {
  // Chỉ user có permission MANAGE_PRODUCT mới gọi được
}
```

### 3. Kiểm tra Permission trong Code
```typescript
import { Permission, isValidPermission } from '@/auth/constants/Permission.enum';

if (isValidPermission('manage_product')) {
  // Permission hợp lệ
}
```

### 4. Lấy danh sách Permissions
```typescript
import { getAllPermissions } from '@/auth/constants/Permission.enum';

const allPerms = getAllPermissions();
// ['manage_users', 'manage_product', ...]
```

## 🔄 Migration từ string sang Enum

### Trước (❌ Không nên)
```typescript
@RequirePermissions('create_product')
@RequirePermissions('edit_product')
@RequirePermissions('delete_product')
```

### Sau (✅ Nên dùng)
```typescript
@RequirePermissions(Permission.MANAGE_PRODUCT)
```

## 🛡️ Best Practices

1. **Luôn dùng Enum** - Không dùng string trực tiếp
2. **Gộp quyền liên quan** - VD: `MANAGE_PRODUCT` thay vì tách CREATE/EDIT/DELETE
3. **Đặt tên rõ ràng** - VD: `MANAGE_ORDER` không phải `ORDER`
4. **Document đầy đủ** - Comment cho mỗi permission
5. **Review thường xuyên** - Đảm bảo không có permission thừa/thiếu

## 🔍 So sánh: Enum vs String vs Database

| Tiêu chí | Enum (✅) | String (❌) | Database (⚠️) |
|----------|----------|-------------|---------------|
| Type Safety | ✅ Có | ❌ Không | ❌ Không |
| Autocomplete | ✅ Có | ❌ Không | ❌ Không |
| Refactoring | ✅ Dễ | ❌ Khó | ⚠️ Rất khó |
| Validation | ✅ Compile-time | ❌ Runtime | ❌ Runtime |
| Performance | ✅ Tốt nhất | ✅ Tốt | ⚠️ Chậm (query DB) |
| Flexibility | ⚠️ Cần deploy code | ✅ Flexible | ✅ Rất flexible |
| Consistency | ✅ 100% | ❌ Dễ sai | ⚠️ Phụ thuộc data |

## 💡 Kết luận

**Nên dùng Enum** cho permissions vì:
- ✅ Type-safe, tránh lỗi typo
- ✅ Dễ maintain và refactor
- ✅ IDE support tốt (autocomplete, go to definition)
- ✅ Performance tốt (không cần query DB)
- ✅ Self-documented code

**Chỉ dùng database** khi:
- ⚠️ Cần dynamic permissions (thêm permission không deploy code)
- ⚠️ Multi-tenant với permissions khác nhau
- ⚠️ End-user có thể tự định nghĩa permissions

**Với hệ thống hiện tại**, Enum là lựa chọn tốt nhất! 🎯
