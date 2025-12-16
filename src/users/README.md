# Users Module API Documentation

## Base URL

All endpoints are prefixed with `/users`

## Authentication & Authorization

- 🔐 All endpoints require JWT authentication (`JwtAuthGuard`)
- 🛡️ Permission-based authorization using `PermissionsGuard`
- Each endpoint requires specific permissions as listed below

---

## 📋 User Management APIs

### 1. Get Page Info

Get statistics and metadata for users page

**Endpoint:** `GET /users/page-info`

**Permission Required:** `view_users`

**Response:**

```json
{
  "success": true,
  "data": {
    "totalUsers": 100,
    "activeUsers": 85,
    "inactiveUsers": 15,
    "roles": [
      { "id": 1, "name": "admin" },
      { "id": 2, "name": "user" }
    ]
  }
}
```

---

### 2. Create User

Create a new user account

**Endpoint:** `POST /users`

**Permission Required:** `create_user`

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "full_name": "John Doe",
  "phone": "0123456789",
  "avatar_url": "https://example.com/avatar.jpg",
  "role_id": 2,
  "is_active": true,
  "firstlogin": true
}
```

**Response:**

```json
{
  "id": 1,
  "email": "user@example.com",
  "full_name": "John Doe",
  "avatar_url": "https://example.com/avatar.jpg",
  "phone": "0123456789",
  "role_id": 2,
  "is_active": true,
  "firstlogin": true,
  "created_at": "2025-11-24T10:00:00.000Z",
  "updated_at": "2025-11-24T10:00:00.000Z"
}
```

---

### 3. Get All Users

Get paginated list of users with optional filtering

**Endpoint:** `GET /users`

**Permission Required:** `view_users`

**Query Parameters:**

- `page` (number, default: 1) - Page number
- `limit` (number, default: 10) - Items per page
- `search` (string, optional) - Search by name, email, or phone
- `is_active` (boolean, optional) - Filter by active status
- `role_id` (number, optional) - Filter by role

**Example:** `GET /users?page=1&limit=10&search=john&is_active=true&role_id=2`

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "email": "user@example.com",
      "full_name": "John Doe",
      "phone": "0123456789",
      "avatar_url": "https://example.com/avatar.jpg",
      "role_id": 2,
      "is_active": true,
      "created_at": "2025-11-24T10:00:00.000Z",
      "role": {
        "id": 2,
        "name": "user"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

---

### 4. Get User by ID

Get detailed information about a specific user

**Endpoint:** `GET /users/:id`

**Permission Required:** `view_users`

**Response:**

```json
{
  "id": 1,
  "email": "user@example.com",
  "full_name": "John Doe",
  "phone": "0123456789",
  "avatar_url": "https://example.com/avatar.jpg",
  "role_id": 2,
  "is_active": true,
  "created_at": "2025-11-24T10:00:00.000Z",
  "updated_at": "2025-11-24T10:00:00.000Z"
}
```

---

### 5. Update User

Update user information

**Endpoint:** `PATCH /users/:id`

**Permission Required:** `update_user`

**Request Body:** (All fields are optional)

```json
{
  "email": "newemail@example.com",
  "password": "newPassword123",
  "full_name": "Jane Doe",
  "phone": "0987654321",
  "avatar_url": "https://example.com/new-avatar.jpg",
  "role_id": 3,
  "is_active": false,
  "firstlogin": false
}
```

**Response:**

```json
{
  "id": 1,
  "email": "newemail@example.com",
  "full_name": "Jane Doe",
  "phone": "0987654321",
  "avatar_url": "https://example.com/new-avatar.jpg",
  "role_id": 3,
  "is_active": false,
  "updated_at": "2025-11-24T12:00:00.000Z"
}
```

---

### 6. Delete User (Soft Delete)

Mark a user as deleted

**Endpoint:** `DELETE /users/:id`

**Permission Required:** `delete_user`

**Response:**

```json
{
  "id": 1,
  "email": "user@example.com",
  "is_deleted": true,
  "deleted_at": "2025-11-24T12:00:00.000Z"
}
```

---

## 🔐 Role & Permission Management APIs

### 7. Set User Role

Assign a role to a user

**Endpoint:** `PATCH /users/:id/role`

**Permission Required:** `manage_roles`

**Request Body:**

```json
{
  "role_id": 2
}
```

**Response:**

```json
{
  "success": true,
  "message": "User role updated to seller",
  "data": {
    "id": 1,
    "email": "user@example.com",
    "full_name": "John Doe",
    "role_id": 2,
    "role": {
      "id": 2,
      "name": "seller"
    }
  }
}
```

---

### 8. Set User Permissions

Set user-specific permissions (overrides role permissions)

**Endpoint:** `PATCH /users/:id/permissions`

**Permission Required:** `manage_permissions`

**Request Body:**

```json
{
  "permission_ids": [1, 2, 3, 5, 8]
}
```

**Response:**

```json
{
  "success": true,
  "message": "User permissions updated successfully",
  "data": {
    "user_id": 1,
    "permissions": [
      { "id": 1, "name": "view_users" },
      { "id": 2, "name": "create_user" },
      { "id": 3, "name": "update_user" },
      { "id": 5, "name": "view_products" },
      { "id": 8, "name": "manage_orders" }
    ]
  }
}
```

---

### 9. Get User Permissions

Get all permissions for a user (combined from role and user-specific)

**Endpoint:** `GET /users/:id/permissions`

**Permission Required:** `view_users`

**Response:**

```json
{
  "success": true,
  "data": {
    "user_id": 1,
    "role": {
      "id": 2,
      "name": "seller"
    },
    "permissions": [
      { "id": 1, "name": "view_users" },
      { "id": 2, "name": "create_user" },
      { "id": 5, "name": "view_products" },
      { "id": 6, "name": "create_product" }
    ]
  }
}
```

---

### 10. Create Permission

Create a new permission in the system

**Endpoint:** `POST /users/permissions`

**Permission Required:** `manage_permissions`

**Request Body:**

```json
{
  "name": "manage_products"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Permission created successfully",
  "data": {
    "id": 15,
    "name": "manage_products"
  }
}
```

---

### 11. Get All Permissions

Get list of all available permissions

**Endpoint:** `GET /users/permissions/all`

**Permission Required:** `view_users`

**Response:**

```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "view_users" },
    { "id": 2, "name": "create_user" },
    { "id": 3, "name": "update_user" },
    { "id": 4, "name": "delete_user" },
    { "id": 5, "name": "manage_roles" },
    { "id": 6, "name": "manage_permissions" }
  ]
}
```

---

### 12. Set Role Permissions

Assign permissions to a role

**Endpoint:** `PATCH /users/roles/:roleId/permissions`

**Permission Required:** `manage_roles`

**Request Body:**

```json
{
  "permission_ids": [1, 2, 3, 4, 5]
}
```

**Response:**

```json
{
  "success": true,
  "message": "Permissions updated for role 'seller'",
  "data": {
    "role_id": 2,
    "role_name": "seller",
    "permissions": [
      { "id": 1, "name": "view_users" },
      { "id": 2, "name": "create_user" },
      { "id": 3, "name": "update_user" },
      { "id": 4, "name": "delete_user" },
      { "id": 5, "name": "manage_roles" }
    ]
  }
}
```

---

### 13. Get All Roles

Get list of all roles with their permissions

**Endpoint:** `GET /users/roles/all`

**Permission Required:** `view_users`

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "admin",
      "permissions": [
        { "id": 1, "name": "view_users" },
        { "id": 2, "name": "create_user" },
        { "id": 3, "name": "update_user" },
        { "id": 4, "name": "delete_user" },
        { "id": 5, "name": "manage_roles" },
        { "id": 6, "name": "manage_permissions" }
      ]
    },
    {
      "id": 2,
      "name": "seller",
      "permissions": [
        { "id": 1, "name": "view_users" },
        { "id": 7, "name": "view_products" },
        { "id": 8, "name": "create_product" }
      ]
    }
  ]
}
```

---

## 📝 API Summary

| Method   | Endpoint                           | Description               | Permission Required  |
| -------- | ---------------------------------- | ------------------------- | -------------------- |
| `GET`    | `/users/page-info`                 | Get users page statistics | `view_users`         |
| `POST`   | `/users`                           | Create a new user         | `create_user`        |
| `GET`    | `/users`                           | Get all users (paginated) | `view_users`         |
| `GET`    | `/users/:id`                       | Get user by ID            | `view_users`         |
| `PATCH`  | `/users/:id`                       | Update user               | `update_user`        |
| `DELETE` | `/users/:id`                       | Delete user (soft delete) | `delete_user`        |
| `PATCH`  | `/users/:id/role`                  | Set user role             | `manage_roles`       |
| `PATCH`  | `/users/:id/permissions`           | Set user permissions      | `manage_permissions` |
| `GET`    | `/users/:id/permissions`           | Get user permissions      | `view_users`         |
| `POST`   | `/users/permissions`               | Create new permission     | `manage_permissions` |
| `GET`    | `/users/permissions/all`           | Get all permissions       | `view_users`         |
| `PATCH`  | `/users/roles/:roleId/permissions` | Set role permissions      | `manage_roles`       |
| `GET`    | `/users/roles/all`                 | Get all roles             | `view_users`         |

---

## 🔑 Required Permissions List

- `view_users` - View user information
- `create_user` - Create new users
- `update_user` - Update user information
- `delete_user` - Delete users
- `manage_roles` - Manage user roles and role permissions
- `manage_permissions` - Manage permissions and user permissions

---

## 📚 DTOs

### CreateUserDto

```typescript
{
  email: string;
  password?: string;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  role_id?: number;
  is_active?: boolean;
  firstlogin?: boolean;
}
```

### UpdateUserDto

```typescript
{
  email?: string;
  password?: string;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  role_id?: number;
  is_active?: boolean;
  firstlogin?: boolean;
}
```

### QueryUsersDto

```typescript
{
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
  role_id?: number;
}
```

### SetUserRoleDto

```typescript
{
  role_id: number;
}
```

### SetUserPermissionDto

```typescript
{
  permission_ids: number[];
}
```

### CreatePermissionDto

```typescript
{
  name: string;
}
```

### SetRolePermissionDto

```typescript
{
  permission_ids: number[];
}
```

---

## ⚠️ Error Responses

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "Email already exists",
  "error": "Bad Request"
}
```

### 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 403 Forbidden

```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "User with id 123 not found",
  "error": "Not Found"
}
```

---

## 🧪 Testing

Use tools like Postman, Thunder Client, or cURL to test the APIs. Make sure to include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

---

## 📌 Notes

1. All endpoints use JWT authentication
2. Soft delete is implemented - deleted users have `is_deleted: true`
3. User permissions are a combination of role permissions + user-specific permissions
4. Passwords are automatically hashed using bcrypt
5. All timestamps use ISO 8601 format
6. Search is case-insensitive across name, email, and phone fields
