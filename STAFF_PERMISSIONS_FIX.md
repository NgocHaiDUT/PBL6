# Fix Staff Permissions Checkbox Issue

## 🐛 Vấn đề ban đầu

Trong quản lý quyền hạn của staff, khi hiển thị danh sách các quyền (permissions), **không có checkbox tick** để thể hiện staff đang có quyền nào.

**Nguyên nhân:**  
API cũ `GET /shop/:shopid/staff/:staffemail/permissions` chỉ trả về **danh sách các permissions mà staff có** (array of strings):

```json
[
  "manage_order",
  "chat_with_customer",
  "view_dashboard"
]
```

Frontend không biết **tất cả permissions có thể có** và **permission nào staff chưa có** để hiển thị checkbox unticked.

---

## ✅ Giải pháp

Đã tạo API mới: `GET /shop/:shopid/staff/:staffemail/permissions/all`

API này trả về **TẤT CẢ permissions có thể có** kèm theo **flag `isGranted`** để biết staff có quyền đó hay không.

### Response mới:

```json
[
  {
    "id": 1,
    "name": "manage_users",
    "isGranted": false
  },
  {
    "id": 2,
    "name": "manage_shop_staff",
    "isGranted": false
  },
  {
    "id": 3,
    "name": "edit_profile_shop",
    "isGranted": false
  },
  {
    "id": 5,
    "name": "manage_order",
    "isGranted": true
  },
  {
    "id": 7,
    "name": "chat_with_customer",
    "isGranted": true
  },
  {
    "id": 9,
    "name": "view_dashboard",
    "isGranted": true
  },
  {
    "id": 10,
    "name": "manage_product",
    "isGranted": false
  },
  ...
]
```

---

## 📝 API Endpoints

### 1. **API cũ (giữ nguyên để backward compatible)**

```
GET /shop/:shopid/staff/:staffemail/permissions
```

**Response:** Array of permission names (strings)
```json
["manage_order", "chat_with_customer", "view_dashboard"]
```

**Use case:** Khi chỉ cần kiểm tra staff có permissions gì (không cần hiển thị UI)

---

### 2. **API mới (khuyên dùng cho UI quản lý permissions)** ⭐

```
GET /shop/:shopid/staff/:staffemail/permissions/all
```

**Response:** Array of objects with permission details and status
```json
[
  {
    "id": 5,
    "name": "manage_order",
    "isGranted": true
  },
  {
    "id": 10,
    "name": "manage_product",
    "isGranted": false
  }
]
```

**Use case:** Hiển thị UI checkbox để quản lý permissions của staff

---

## 💻 Frontend Integration

### React/Vue Example

```typescript
// Fetch all permissions with status
const response = await fetch(
  `/shop/${shopId}/staff/${staffEmail}/permissions/all`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

const permissions = await response.json();

// Render checkboxes
permissions.map(permission => (
  <label key={permission.id}>
    <input
      type="checkbox"
      checked={permission.isGranted}
      onChange={() => handleTogglePermission(permission)}
    />
    {permission.name}
  </label>
));
```

### Handle Toggle Permission

```typescript
const handleTogglePermission = async (permission) => {
  if (permission.isGranted) {
    // Remove permission
    await fetch(
      `/shop/${shopId}/staff/${staffEmail}/permissions`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          permissions: [permission.name]
        })
      }
    );
  } else {
    // Add permission
    await fetch(
      `/shop/${shopId}/staff/${staffEmail}/permissions`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          permissions: [permission.name]
        })
      }
    );
  }
  
  // Refresh permissions list
  fetchPermissions();
};
```

---

## 🧪 Testing

### Using cURL

```bash
# Get all permissions with status
curl -X GET \
  'http://localhost:3000/shop/3/staff/nguyenhai842003@gmail.com/permissions/all' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

### Using Node.js Script

```bash
# Update token in script first
npx tsx scripts/test-staff-permissions-api.ts
```

---

## 📊 Expected Results

### Before Fix
- Frontend không biết có bao nhiêu permissions
- Chỉ hiển thị được permissions staff có
- Không có cách nào hiển thị checkbox unticked

### After Fix ✅
- Frontend nhận được **TẤT CẢ 16 permissions**
- Mỗi permission có flag `isGranted: true/false`
- Có thể hiển thị checkbox với đúng trạng thái
- User có thể tick/untick để thêm/xóa permissions

---

## 🔒 Authorization

- **Required Permission:** `MANAGE_SHOP_STAFF`
- Chỉ chủ shop hoặc manager mới có thể xem/chỉnh sửa permissions của staff
- Staff không thể tự xem/sửa permissions của mình

---

## 📋 All Available Permissions

Hiện tại hệ thống có **16 permissions**:

1. `manage_users` - Quản lý người dùng (Admin)
2. `manage_shop_staff` - Quản lý nhân viên shop (Owner)
3. `edit_profile_shop` - Chỉnh sửa thông tin shop
4. `manage_shop_admin` - Quản lý shop (Admin level)
5. `manage_order` - Quản lý đơn hàng ⭐ (Staff default)
6. `try_on_tester` - Thử nghiệm tính năng try-on
7. `chat_with_customer` - Chat với khách hàng ⭐ (Staff default)
8. `manage_shop_setting` - Quản lý cài đặt shop
9. `view_dashboard` - Xem dashboard thống kê ⭐ (Staff default)
10. `manage_product` - Quản lý sản phẩm
11. `manage_brands` - Quản lý thương hiệu
12. `manage_categorys` - Quản lý danh mục
13. `create_post` - Tạo bài viết
14. `edit_post` - Chỉnh sửa bài viết
15. `delete_post` - Xóa bài viết
16. `manage_shop_address` - Quản lý địa chỉ shop

⭐ = Default permissions cho staff role

---

## 🎯 Summary

**Before:**
```
GET /shop/:shopid/staff/:email/permissions
→ ["manage_order", "chat_with_customer"]
```
❌ Không đủ thông tin để hiển thị checkboxes

**After:**
```
GET /shop/:shopid/staff/:email/permissions/all
→ [
  { id: 5, name: "manage_order", isGranted: true },
  { id: 7, name: "chat_with_customer", isGranted: true },
  { id: 10, name: "manage_product", isGranted: false },
  ...
]
```
✅ Đầy đủ thông tin để hiển thị UI quản lý permissions

---

## 📝 Related Files

- `src/shop/shop.controller.ts` - Added new endpoint
- `src/shop/shop.service.ts` - Added `getallpermissionswithstatus()` method
- `scripts/test-staff-permissions-api.ts` - Test script
- `STAFF_PERMISSIONS_FIX.md` - This document

---

**Date:** December 18, 2025  
**Issue:** Staff permissions không hiển thị checkbox tick/untick  
**Solution:** Tạo API mới trả về all permissions với isGranted flag  
**Status:** ✅ Fixed and Ready for Frontend Integration
