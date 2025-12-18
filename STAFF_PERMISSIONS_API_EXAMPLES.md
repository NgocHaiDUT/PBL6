# Staff Permissions API - Example Request & Response

## Scenario
- Shop ID: 3
- Staff Email: nguyenhai842003@gmail.com
- Staff hiện có 6 permissions (3 từ role staff + 3 từ role user)

---

## Old API (Returns only granted permissions)

### Request
```http
GET /shop/3/staff/nguyenhai842003@gmail.com/permissions HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Response
```json
[
  "create_post",
  "edit_post", 
  "delete_post",
  "manage_order",
  "chat_with_customer",
  "view_dashboard"
]
```

### Problem ❌
- Chỉ biết staff có 6 permissions
- Không biết có tổng cộng bao nhiêu permissions
- Không biết permission nào staff **CHƯA** có
- **Không thể hiển thị checkboxes đúng cách!**

---

## New API (Returns all permissions with status) ⭐

### Request
```http
GET /shop/3/staff/nguyenhai842003@gmail.com/permissions/all HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Response
```json
[
  {
    "id": 7,
    "name": "chat_with_customer",
    "isGranted": true
  },
  {
    "id": 13,
    "name": "create_post",
    "isGranted": true
  },
  {
    "id": 14,
    "name": "delete_post",
    "isGranted": true
  },
  {
    "id": 3,
    "name": "edit_profile_shop",
    "isGranted": false
  },
  {
    "id": 15,
    "name": "edit_post",
    "isGranted": true
  },
  {
    "id": 11,
    "name": "manage_brands",
    "isGranted": false
  },
  {
    "id": 12,
    "name": "manage_categorys",
    "isGranted": false
  },
  {
    "id": 5,
    "name": "manage_order",
    "isGranted": true
  },
  {
    "id": 10,
    "name": "manage_product",
    "isGranted": false
  },
  {
    "id": 4,
    "name": "manage_shop_admin",
    "isGranted": false
  },
  {
    "id": 16,
    "name": "manage_shop_address",
    "isGranted": false
  },
  {
    "id": 8,
    "name": "manage_shop_setting",
    "isGranted": false
  },
  {
    "id": 2,
    "name": "manage_shop_staff",
    "isGranted": false
  },
  {
    "id": 1,
    "name": "manage_users",
    "isGranted": false
  },
  {
    "id": 6,
    "name": "try_on_tester",
    "isGranted": false
  },
  {
    "id": 9,
    "name": "view_dashboard",
    "isGranted": true
  }
]
```

### Benefits ✅
- Hiển thị **TẤT CẢ 16 permissions** có trong hệ thống
- Mỗi permission có `isGranted: true/false`
- Có thể render checkboxes chính xác:
  - ✓ 6 checkboxes được tick (isGranted: true)
  - ☐ 10 checkboxes không tick (isGranted: false)
- User có thể click để toggle permissions

---

## Frontend UI Example

Với response từ new API, có thể tạo UI như sau:

```
┌─────────────────────────────────────────────┐
│  Quản Lý Quyền Hạn Staff                   │
│  nguyenhai842003@gmail.com                  │
├─────────────────────────────────────────────┤
│                                             │
│  ✓ chat_with_customer                      │
│  ✓ create_post                             │
│  ✓ delete_post                             │
│  ☐ edit_profile_shop                       │
│  ✓ edit_post                               │
│  ☐ manage_brands                           │
│  ☐ manage_categorys                        │
│  ✓ manage_order                            │
│  ☐ manage_product                          │
│  ☐ manage_shop_admin                       │
│  ☐ manage_shop_address                     │
│  ☐ manage_shop_setting                     │
│  ☐ manage_shop_staff                       │
│  ☐ manage_users                            │
│  ☐ try_on_tester                           │
│  ✓ view_dashboard                          │
│                                             │
│         [Lưu Thay Đổi]   [Hủy]             │
└─────────────────────────────────────────────┘
```

---

## Frontend Code Example (React)

```tsx
import { useState, useEffect } from 'react';

interface Permission {
  id: number;
  name: string;
  isGranted: boolean;
}

function StaffPermissionsManager({ shopId, staffEmail }: Props) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    const response = await fetch(
      `/shop/${shopId}/staff/${staffEmail}/permissions/all`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    const data = await response.json();
    setPermissions(data);
    setLoading(false);
  };

  const handleToggle = async (permission: Permission) => {
    const method = permission.isGranted ? 'DELETE' : 'PUT';
    
    await fetch(
      `/shop/${shopId}/staff/${staffEmail}/permissions`,
      {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          permissions: [permission.name]
        })
      }
    );

    // Refresh
    fetchPermissions();
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="permissions-manager">
      <h2>Quản Lý Quyền Hạn Staff</h2>
      <p>{staffEmail}</p>
      
      <div className="permissions-list">
        {permissions.map(permission => (
          <label key={permission.id} className="permission-item">
            <input
              type="checkbox"
              checked={permission.isGranted}
              onChange={() => handleToggle(permission)}
            />
            <span>{permission.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
```

---

## API Comparison Table

| Feature | Old API | New API ⭐ |
|---------|---------|----------|
| Endpoint | `/permissions` | `/permissions/all` |
| Returns | Array of strings | Array of objects |
| Shows granted permissions | ✅ | ✅ |
| Shows NOT granted permissions | ❌ | ✅ |
| Permission IDs | ❌ | ✅ |
| isGranted flag | ❌ | ✅ |
| Suitable for checkboxes | ❌ | ✅ |
| Backward compatible | ✅ | N/A |

---

## Summary

### Before Fix
```json
["manage_order", "chat_with_customer"]
```
→ Không đủ dữ liệu để render UI đầy đủ

### After Fix ✅
```json
[
  { "id": 5, "name": "manage_order", "isGranted": true },
  { "id": 7, "name": "chat_with_customer", "isGranted": true },
  { "id": 10, "name": "manage_product", "isGranted": false }
]
```
→ Đầy đủ dữ liệu để render checkboxes với đúng trạng thái

---

**Recommendation:** Frontend team should migrate to use the new API endpoint `/permissions/all` for better UX.
