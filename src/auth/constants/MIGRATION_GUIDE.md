# 🔄 Migration Guide: Cập nhật Permissions

## ⚠️ Quan trọng

Sau khi cập nhật code, cần **reset database** để áp dụng permissions mới.

## 📋 Các thay đổi

### 1. **Permissions đã GỘP**
```
❌ Cũ (bị xóa):
- create_product
- edit_product  
- delete_product

✅ Mới (thay thế):
- manage_product
```

### 2. **Permissions MỚI cho Shop**
```
✅ Thêm mới:
- manage_order           (Quản lý đơn hàng)
- try_on_tester         (Thử nghiệm try-on)
- chat_with_customer    (Chat với khách)
- manage_shop_setting   (Cài đặt shop)
- view_dashboard        (Xem dashboard)
```

### 3. **Phân quyền STAFF thay đổi**
```
❌ Staff CŨ:
- manage_shop_staff

✅ Staff MỚI:
- manage_order
- chat_with_customer
- view_dashboard
```

## 🚀 Cách áp dụng

### Option 1: Reset toàn bộ database (Khuyến nghị cho dev)

1. **Xóa database hiện tại:**
```bash
# Nếu dùng PostgreSQL
psql -U postgres
DROP DATABASE pbl6_db;
CREATE DATABASE pbl6_db;
```

2. **Chạy lại migrations:**
```bash
npx prisma migrate reset --force
```

3. **Seed data mới:**
```bash
npm run start
# Hoặc gọi API: POST http://localhost:3000/data-init/seed
```

### Option 2: Update thủ công (Cho production có data)

```sql
-- 1. Xóa permissions cũ
DELETE FROM rolepermission WHERE permission_id IN (
  SELECT id FROM permission WHERE name IN ('create_product', 'edit_product', 'delete_product')
);

DELETE FROM permission WHERE name IN ('create_product', 'edit_product', 'delete_product');

-- 2. Thêm permission mới
INSERT INTO permission (name) VALUES 
('manage_product'),
('manage_order'),
('try_on_tester'),
('chat_with_customer'),
('manage_shop_setting'),
('view_dashboard');

-- 3. Lấy IDs
-- (Chạy query để lấy ID của các permission và role mới thêm)

-- 4. Gán permissions cho SELLER (chủ shop)
INSERT INTO rolepermission (role_id, permission_id) VALUES
-- Giả sử role_id của SELLER là 2
(2, (SELECT id FROM permission WHERE name = 'manage_product')),
(2, (SELECT id FROM permission WHERE name = 'manage_order')),
(2, (SELECT id FROM permission WHERE name = 'try_on_tester')),
(2, (SELECT id FROM permission WHERE name = 'chat_with_customer')),
(2, (SELECT id FROM permission WHERE name = 'manage_shop_setting')),
(2, (SELECT id FROM permission WHERE name = 'view_dashboard'));

-- 5. Cập nhật permissions cho STAFF
DELETE FROM rolepermission WHERE role_id = (SELECT id FROM role WHERE name = 'staff');

INSERT INTO rolepermission (role_id, permission_id) VALUES
-- Giả sử role_id của STAFF là 4
(4, (SELECT id FROM permission WHERE name = 'manage_order')),
(4, (SELECT id FROM permission WHERE name = 'chat_with_customer')),
(4, (SELECT id FROM permission WHERE name = 'view_dashboard'));

-- 6. Cập nhật permissions cho ADMIN
INSERT INTO rolepermission (role_id, permission_id) VALUES
-- Giả sử role_id của ADMIN là 3
(3, (SELECT id FROM permission WHERE name = 'manage_product')),
(3, (SELECT id FROM permission WHERE name = 'manage_order')),
(3, (SELECT id FROM permission WHERE name = 'view_dashboard'));
```

## ✅ Kiểm tra sau migration

### 1. Kiểm tra permissions trong database
```sql
-- Xem tất cả permissions
SELECT * FROM permission ORDER BY id;

-- Xem permissions của SELLER
SELECT p.name 
FROM permission p
JOIN rolepermission rp ON p.id = rp.permission_id
JOIN role r ON r.id = rp.role_id
WHERE r.name = 'seller';

-- Xem permissions của STAFF
SELECT p.name 
FROM permission p
JOIN rolepermission rp ON p.id = rp.permission_id
JOIN role r ON r.id = rp.role_id
WHERE r.name = 'staff';
```

### 2. Test API với permissions mới
```bash
# Test SELLER tạo product
POST /products
Headers: Authorization: Bearer <seller_token>
# Phải có quyền manage_product

# Test STAFF quản lý order
GET /orders
Headers: Authorization: Bearer <staff_token>
# Phải có quyền manage_order

# Test STAFF tạo product (phải fail)
POST /products
Headers: Authorization: Bearer <staff_token>
# Phải trả về 403 Forbidden
```

## 📝 Checklist

- [ ] Backup database trước khi migrate
- [ ] Chạy migration/reset database
- [ ] Verify permissions trong DB
- [ ] Test với user có role SELLER
- [ ] Test với user có role STAFF
- [ ] Test với user có role ADMIN
- [ ] Update Postman collection nếu có
- [ ] Update API documentation

## 🔗 Files liên quan

- [Permission.enum.ts](./Permission.enum.ts) - Định nghĩa permissions
- [Role.enum.ts](./Role.enum.ts) - Mapping role-permissions
- [PERMISSIONS_GUIDE.md](./PERMISSIONS_GUIDE.md) - Hướng dẫn chi tiết

## 💡 Lưu ý

1. **MANAGE_SHOP_STAFF** chỉ dành cho chủ shop (SELLER), STAFF không có quyền này
2. **MANAGE_PRODUCT** gộp cả create/edit/delete product
3. **STAFF** chỉ có quyền vận hành cơ bản: order, chat, dashboard
4. Sau khi migrate, cần test kỹ tất cả endpoints có sử dụng permissions

## ❓ Câu hỏi thường gặp

**Q: Tại sao phải reset database?**
A: Vì permissions được seed từ enum trong code. Reset sẽ đảm bảo DB sync với code mới nhất.

**Q: Làm sao để không mất data khi migrate?**
A: Dùng Option 2 (update thủ công) hoặc export data trước, reset DB, rồi import lại.

**Q: User cũ có tự động được cấp permissions mới không?**
A: Không. Permissions gán qua role. Nếu user có role SELLER, họ sẽ tự động có permissions mới sau khi migrate.
