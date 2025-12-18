# Hướng dẫn quản lý Permissions và Role Permissions

## ✅ Cách hệ thống hoạt động

### 1. **Permissions được quản lý ở đâu?**

**Nguồn duy nhất**: [`src/auth/constants/Permission.enum.ts`](../auth/constants/Permission.enum.ts)

```typescript
export enum Permission {
  MANAGE_USERS = 'manage_users',
  MANAGE_SHOP_STAFF = 'manage_shop_staff',
  EDIT_PROFILE_SHOP = 'edit_profile_shop',
  // ... các permissions khác
}
```

### 2. **Role Permissions được quản lý ở đâu?**

**Nguồn duy nhất**: [`src/auth/constants/Role.enum.ts`](../auth/constants/Role.enum.ts)

```typescript
export const RolePermissions: Record<Role, Permission[]> = {
  [Role.USER]: [
    Permission.CREATE_POST,
    Permission.EDIT_POST,
    Permission.DELETE_POST,
  ],

  [Role.SELLER]: [
    Permission.CREATE_POST,
    Permission.EDIT_POST,
    Permission.DELETE_POST,
    Permission.MANAGE_PRODUCT,
    Permission.MANAGE_SHOP_STAFF,
    // ... các permissions khác
  ],

  [Role.ADMIN]: [
    Permission.MANAGE_USERS,
    Permission.MANAGE_PRODUCT,
    Permission.MANAGE_BRANDS,
    // ... các permissions khác
  ],

  [Role.STAFF]: [
    Permission.MANAGE_ORDER,
    Permission.CHAT_WITH_CUSTOMER,
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_SHOP_TUTORIAL,
  ],
};
```

### 3. **Cách permissions được seed vào database**

File: [`data-init.service.ts`](./data-init.service.ts)

```typescript
// 1. Seed tất cả permissions từ enum
private async seedPermissions() {
  const allPermissions = getAllPermissions(); // Lấy từ Permission.enum.ts
  // Tạo các permissions chưa tồn tại trong DB
}

// 2. Seed role-permissions mapping từ enum
private async seedRolePermissions() {
  // Duyệt qua RolePermissions từ Role.enum.ts
  for (const [roleName, permissions] of Object.entries(RolePermissions)) {
    // Gán permissions cho role trong DB
  }
}
```

---

## 🔧 Cách thêm Permission mới

### Bước 1: Thêm vào Permission.enum.ts

```typescript
export enum Permission {
  // ... existing permissions
  
  // Thêm permission mới
  MANAGE_ANALYTICS = 'manage_analytics',
}
```

### Bước 2: Gán cho Role trong Role.enum.ts

```typescript
export const RolePermissions: Record<Role, Permission[]> = {
  [Role.SELLER]: [
    // ... existing permissions
    Permission.MANAGE_ANALYTICS, // Thêm vào đây
  ],
  
  [Role.ADMIN]: [
    // ... existing permissions
    Permission.MANAGE_ANALYTICS, // Hoặc thêm vào đây
  ],
};
```

### Bước 3: Restart server

Khi server khởi động, `data-init.service.ts` sẽ tự động:
- Tạo permission mới trong database
- Gán permission cho các roles đã định nghĩa

**KHÔNG CẦN** tạo file JSON hay chạy script riêng!

---

## 🚫 Những gì KHÔNG NÊN làm

❌ **Không tạo/sửa file `permissions.json`** - File này đã bị xóa vì không dùng nữa

❌ **Không tạo/sửa file `role_permissions.json`** - File này đã bị xóa vì không dùng nữa

❌ **Không hardcode permissions trong database** - Luôn dùng enum

❌ **Không tạo permissions trực tiếp trong controller/service** - Phải khai báo trong enum trước

---

## 📋 Các Permission hiện có

### User Management
- `manage_users` - Quản lý người dùng, vai trò và quyền hạn

### Shop Management
- `manage_shop_staff` - Quản lý nhân viên shop (chỉ chủ shop)
- `edit_profile_shop` - Chỉnh sửa thông tin shop
- `manage_shop_admin` - Quản lý shop (admin level)
- `manage_order` - Quản lý đơn hàng
- `try_on_tester` - Thử nghiệm tính năng try-on
- `chat_with_customer` - Chat với khách hàng
- `manage_shop_setting` - Quản lý cài đặt shop
- `view_dashboard` - Xem dashboard thống kê
- `view_shop_tutorial` - Xem hướng dẫn/tutorial của shop

### Product Management
- `manage_product` - Quản lý sản phẩm (tạo, sửa, xóa)
- `manage_brands` - Quản lý thương hiệu
- `manage_categorys` - Quản lý danh mục

### Post Management
- `create_post` - Tạo bài viết mới
- `edit_post` - Chỉnh sửa bài viết
- `delete_post` - Xóa bài viết

### Address Management
- `manage_shop_address` - Quản lý địa chỉ shop

---

## 🔐 Role Permissions Mapping

### USER (Người dùng thông thường)
- create_post
- edit_post
- delete_post

### SELLER (Chủ shop)
- create_post, edit_post, delete_post
- manage_product
- manage_shop_staff ⭐ (Chỉ chủ shop)
- edit_profile_shop
- manage_shop_address
- manage_order
- try_on_tester
- chat_with_customer
- manage_shop_setting
- view_dashboard

### ADMIN (Quản trị viên)
- manage_users
- manage_product
- manage_brands
- manage_categorys
- manage_shop_admin
- manage_shop_staff
- manage_order
- view_dashboard

### STAFF (Nhân viên shop)
- manage_order
- chat_with_customer
- view_dashboard
- view_shop_tutorial

---

## 💡 Best Practices

1. **Single Source of Truth**: Luôn coi enum là nguồn chân lý duy nhất
2. **Semantic Naming**: Đặt tên permission rõ ràng theo format `<action>_<resource>`
3. **Documentation**: Thêm JSDoc comment cho mỗi permission
4. **Grouping**: Nhóm permissions theo module trong `PermissionGroups`
5. **Testing**: Test permissions trước khi deploy production

---

## 🔍 Debug và kiểm tra

### Kiểm tra permissions trong database

```sql
-- Xem tất cả permissions
SELECT * FROM permissions;

-- Xem role-permissions mapping
SELECT r.name as role, p.name as permission
FROM role_permissions rp
JOIN roles r ON rp.role_id = r.id
JOIN permissions p ON rp.permission_id = p.id
ORDER BY r.name, p.name;
```

### Kiểm tra permissions của user

```sql
SELECT u.username, r.name as role, p.name as permission
FROM users u
JOIN roles r ON u.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE u.username = 'your_username';
```

---

## 🆘 Troubleshooting

### Permission không sync vào database?

1. Kiểm tra enum có đúng format không
2. Restart server để trigger `seedData()`
3. Xem logs trong console

### Role không có permission mong muốn?

1. Kiểm tra `RolePermissions` mapping trong `Role.enum.ts`
2. Restart server để sync lại
3. Nếu cần, xóa record trong `role_permissions` table và để server tự tạo lại

### Permission bị duplicate?

Code đã xử lý duplicate check, không tạo trùng. Nếu vẫn bị:
```sql
-- Xóa duplicates (giữ lại 1 bản ghi)
DELETE FROM role_permissions
WHERE id NOT IN (
  SELECT MIN(id) FROM role_permissions
  GROUP BY role_id, permission_id
);
```

---

**Lưu ý**: File này được tạo ngày 18/12/2025. Nếu có thay đổi về cấu trúc permissions, hãy cập nhật tài liệu này.
