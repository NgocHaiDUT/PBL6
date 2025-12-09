# Data Init API Guide

## Tổng quan

File này hướng dẫn cách sử dụng các API để seed data vào database theo đúng thứ tự, tránh lỗi foreign key constraint.

## Thứ tự gọi API (QUAN TRỌNG!)

### 1. Seed dữ liệu cơ bản (tự động khi khởi động server)

Các dữ liệu này được seed tự động khi server khởi động lần đầu:
- ✅ Brands
- ✅ Categories
- ✅ Roles
- ✅ Permissions
- ✅ Role Permissions
- ✅ Admin User
- ✅ Regular Users (users.json)
- ✅ Shops
- ✅ Products (với variants và media)
- ✅ Coupons

### 2. Seed dữ liệu có foreign key (gọi API thủ công)

Các API này cần được gọi **THEO THỨ TỰ** để tránh lỗi foreign key:

#### Bước 1: Tạo Shop Staffs
```bash
POST http://localhost:3000/data-init/shop-staffs
```
**Yêu cầu:** 
- Phải có `users` (đã tạo tự động)
- Phải có `shops` (đã tạo tự động)

**Response:**
```json
{
  "success": true,
  "message": "Đã tạo 4/4 shop staffs",
  "successCount": 4,
  "errorCount": 0
}
```

#### Bước 2: Tạo User Addresses
```bash
POST http://localhost:3000/data-init/addresses
```
**Yêu cầu:**
- Phải có `users` (đã tạo tự động)

**Response:**
```json
{
  "success": true,
  "message": "Đã tạo 15 địa chỉ thành công"
}
```

#### Bước 3: Tạo Shop Addresses
```bash
POST http://localhost:3000/data-init/shop-addresses
```
**Yêu cầu:**
- Phải có `shops` (đã tạo tự động)

**Response:**
```json
{
  "success": true,
  "message": "Đã tạo 3 địa chỉ shop thành công"
}
```

#### Bước 4: Tạo Carts
```bash
POST http://localhost:3000/data-init/carts
```
**Yêu cầu:**
- Phải có `users` (đã tạo tự động)

**Response:**
```json
{
  "success": true,
  "message": "Đã tạo 3/3 carts",
  "successCount": 3,
  "errorCount": 0
}
```

#### Bước 5: Tạo Cart Items
```bash
POST http://localhost:3000/data-init/cart-items
```
**Yêu cầu:**
- Phải gọi **SAU** `POST /data-init/carts`
- Phải có `products` và `product_variants` (đã tạo tự động)

**Response:**
```json
{
  "success": true,
  "message": "Đã tạo 15/15 cart items",
  "successCount": 15,
  "errorCount": 0
}
```

#### Bước 6: Tạo Orders (quan trọng nhất!)
```bash
POST http://localhost:3000/data-init/orders
```
**Yêu cầu:**
- Phải gọi **SAU** `POST /data-init/addresses` (vì cần shipping_address_id)
- Phải gọi **SAU** `POST /data-init/shop-addresses` (vì cần pickup_address_id)
- Phải có `users`, `shops`, `products`, `product_variants` (đã tạo tự động)

**Response:**
```json
{
  "success": true,
  "message": "Đã tạo 10 đơn hàng thành công"
}
```

**Lưu ý:** API này cũng tự động tạo:
- `order_items`
- `payments`
- `shipments`

## Tóm tắt thứ tự gọi API

```
1. Khởi động server (seed data cơ bản tự động)
   ↓
2. POST /data-init/shop-staffs
   ↓
3. POST /data-init/addresses
   ↓
4. POST /data-init/shop-addresses
   ↓
5. POST /data-init/carts
   ↓
6. POST /data-init/cart-items
   ↓
7. POST /data-init/orders
```

## Lỗi thường gặp

### 1. Foreign key constraint fails
**Nguyên nhân:** Gọi API sai thứ tự hoặc thiếu data phụ thuộc

**Giải pháp:** 
- Kiểm tra lại thứ tự gọi API
- Đảm bảo server đã khởi động xong (xem log "Dữ liệu khởi tạo cơ bản thành công")

### 2. "User ID X không tồn tại"
**Nguyên nhân:** users.json có user_id không khớp với database

**Giải pháp:**
- Kiểm tra file `users.json` 
- Đảm bảo user_id trong các file JSON (shop_staffs.json, carts.json, addresses.json) khớp với users đã được tạo

### 3. "Shop ID X không tồn tại"
**Nguyên nhân:** shop_staffs.json hoặc orders.json có shop_id không tồn tại

**Giải pháp:**
- Kiểm tra shops đã được tạo trong database
- Sửa shop_id trong file JSON cho phúng hợp

### 4. "Carts đã tồn tại"
**Nguyên nhân:** Đã gọi API seed trước đó

**Giải pháp:**
- Nếu muốn reset data, xóa records trong bảng tương ứng
- Hoặc xóa toàn bộ database và seed lại từ đầu

## Kiểm tra kết quả

Sau khi seed xong, có thể kiểm tra trong database:

```sql
-- Kiểm tra số lượng records
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'shops', COUNT(*) FROM shops
UNION ALL
SELECT 'shop_staffs', COUNT(*) FROM shop_staffs
UNION ALL
SELECT 'addresses', COUNT(*) FROM addresses
UNION ALL
SELECT 'shop_addresses', COUNT(*) FROM shop_addresses
UNION ALL
SELECT 'carts', COUNT(*) FROM carts
UNION ALL
SELECT 'cart_items', COUNT(*) FROM cart_items
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'order_items', COUNT(*) FROM order_items
UNION ALL
SELECT 'payments', COUNT(*) FROM payments
UNION ALL
SELECT 'shipments', COUNT(*) FROM shipments;
```

## Debug Mode

Nếu cần debug, xem log trong console:
- ✅ Màu xanh: Thành công
- ⚠️ Màu vàng: Warning (skip record)
- ❌ Màu đỏ: Lỗi

Log sẽ hiển thị chi tiết:
- Record nào được tạo thành công
- Record nào bị skip vì foreign key không tồn tại
- Lỗi cụ thể là gì

## Tips

1. **Development:** Gọi các API theo thứ tự một lần duy nhất sau khi setup project
2. **Testing:** Có thể reset database và chạy lại toàn bộ
3. **Production:** KHÔNG nên sử dụng các API seed này trên production
4. **Backup:** Nên backup database trước khi seed để dễ rollback nếu có lỗi
