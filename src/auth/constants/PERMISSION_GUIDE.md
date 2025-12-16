# Permission Management Guide

## Tổng quan

File `Permission.enum.ts` tập trung quản lý tất cả các quyền (permissions) trong hệ thống. Việc sử dụng enum giúp:

- ✅ Tránh lỗi chính tả khi khai báo permission
- ✅ Auto-complete khi code (IntelliSense)
- ✅ Dễ dàng refactor và maintain
- ✅ Type-safe với TypeScript
- ✅ Dễ dàng kiểm tra permission có tồn tại hay không

## Cách sử dụng

### 1. Import Permission enum

```typescript
import { Permission } from '@/auth/constants/Permission.enum';
```

### 2. Sử dụng trong Controller

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '@/auth/guards/permissions.guard';
import { RequirePermissions } from '@/auth/decorators/permissions.decorator';
import { Permission } from '@/auth/constants/Permission.enum';

@Controller('users')
export class UsersController {
  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.VIEW_USERS)
  findAll() {
    // ...
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.CREATE_USER)
  create() {
    // ...
  }
}
```

### 3. Sử dụng trong Service hoặc Logic

```typescript
import {
  Permission,
  isValidPermission,
} from '@/auth/constants/Permission.enum';

// Kiểm tra permission có hợp lệ
if (isValidPermission('view_users')) {
  // ...
}

// Lấy tất cả permissions
import { getAllPermissions } from '@/auth/constants/Permission.enum';
const allPerms = getAllPermissions(); // ['view_users', 'create_user', ...]
```

### 4. Sử dụng Permission Groups

```typescript
import { PermissionGroups } from '@/auth/constants/Permission.enum';

// Lấy tất cả permissions liên quan đến User
const userPermissions = PermissionGroups.USER;
// [Permission.VIEW_USERS, Permission.CREATE_USER, Permission.UPDATE_USER, Permission.DELETE_USER]

// Lấy tất cả permissions liên quan đến Product
const productPermissions = PermissionGroups.PRODUCT;
```

## Danh sách Permissions hiện có

### User Permissions

- `Permission.VIEW_USERS` - Xem danh sách và thông tin người dùng
- `Permission.CREATE_USER` - Tạo người dùng mới
- `Permission.UPDATE_USER` - Cập nhật thông tin người dùng
- `Permission.DELETE_USER` - Xóa người dùng

### Role & Permission Management

- `Permission.MANAGE_ROLES` - Quản lý vai trò (roles)
- `Permission.MANAGE_PERMISSIONS` - Quản lý quyền hạn (permissions)

### Shop Permissions

- `Permission.MANAGE_SHOP_STAFF` - Quản lý nhân viên shop
- `Permission.EDIT_PROFILE_SHOP` - Chỉnh sửa thông tin shop

### Product Permissions

- `Permission.CREATE_PRODUCT` - Tạo sản phẩm mới
- `Permission.EDIT_PRODUCT` - Chỉnh sửa sản phẩm
- `Permission.DELETE_PRODUCT` - Xóa sản phẩm
- `Permission.MANAGE_BRANDS` - Quản lý thương hiệu (brands)
- `Permission.MANAGE_CATEGORYS` - Quản lý danh mục (categories)

### Post Permissions

- `Permission.CREATE_POST` - Tạo bài viết mới
- `Permission.EDIT_POST` - Chỉnh sửa bài viết
- `Permission.DELETE_POST` - Xóa bài viết

## Thêm Permission mới

Khi cần thêm permission mới, chỉ cần:

1. Mở file `src/auth/constants/Permission.enum.ts`
2. Thêm permission vào enum `Permission`:

```typescript
export enum Permission {
  // ... existing permissions

  // Thêm permission mới
  /** Mô tả permission */
  NEW_PERMISSION = 'new_permission',
}
```

3. (Optional) Thêm vào nhóm phù hợp trong `PermissionGroups`:

```typescript
export const PermissionGroups = {
  // ... existing groups

  NEW_MODULE: [Permission.NEW_PERMISSION],
} as const;
```

4. Sử dụng ngay trong controller:

```typescript
@RequirePermissions(Permission.NEW_PERMISSION)
```

## Lợi ích

### Trước khi sử dụng Enum

```typescript
@RequirePermissions('view_users') // ❌ Dễ typo, không có autocomplete
@RequirePermissions('veiw_users') // ❌ Lỗi chính tả không được phát hiện
```

### Sau khi sử dụng Enum

```typescript
@RequirePermissions(Permission.VIEW_USERS) // ✅ Autocomplete, type-safe
@RequirePermissions(Permission.VEIW_USERS) // ✅ Lỗi compile-time ngay lập tức
```

## Best Practices

1. **Luôn sử dụng enum** thay vì hardcode string
2. **Thêm JSDoc comment** khi tạo permission mới để mô tả rõ mục đích
3. **Nhóm permissions** theo module/feature để dễ quản lý
4. **Đồng bộ với database** - Đảm bảo permissions trong enum khớp với database

## Migration từ String sang Enum

Nếu có code cũ sử dụng string:

```typescript
// Cũ
@RequirePermissions('view_users')

// Mới - Chỉ cần import và thay thế
import { Permission } from '@/auth/constants/Permission.enum';

@RequirePermissions(Permission.VIEW_USERS)
```

## Seeding Permissions vào Database

Sử dụng helper function `getAllPermissions()`:

```typescript
import { getAllPermissions } from '@/auth/constants/Permission.enum';

async function seedPermissions() {
  const permissions = getAllPermissions();

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { name: permission },
      update: {},
      create: { name: permission },
    });
  }
}
```
