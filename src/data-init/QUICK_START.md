# Hướng Dẫn Nhanh - Data Init

## TL;DR

```powershell
# 1. Khởi động server (sẽ tự động seed data cơ bản)
npm run start:dev

# 2. Đợi 5-10 giây cho server khởi động

# 3. Chạy script để seed data còn lại
.\src\data-init\seed-all.ps1
```

Xong! Database đã sẵn sàng với đầy đủ data test.

## Hoặc Gọi API Thủ Công

Nếu không muốn dùng script, gọi theo thứ tự:

```bash
curl -X POST http://localhost:3000/data-init/shop-staffs
curl -X POST http://localhost:3000/data-init/addresses
curl -X POST http://localhost:3000/data-init/shop-addresses
curl -X POST http://localhost:3000/data-init/carts
curl -X POST http://localhost:3000/data-init/cart-items
curl -X POST http://localhost:3000/data-init/orders
```

## PowerShell (Windows)

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/data-init/shop-staffs" -Method Post
Invoke-RestMethod -Uri "http://localhost:3000/data-init/addresses" -Method Post
Invoke-RestMethod -Uri "http://localhost:3000/data-init/shop-addresses" -Method Post
Invoke-RestMethod -Uri "http://localhost:3000/data-init/carts" -Method Post
Invoke-RestMethod -Uri "http://localhost:3000/data-init/cart-items" -Method Post
Invoke-RestMethod -Uri "http://localhost:3000/data-init/orders" -Method Post
```

## Kiểm Tra Lỗi

Nếu API trả về lỗi, xem log trong terminal. Thường do:

1. **"User ID X không tồn tại"**
   - Fix: Mở database, check user IDs thực tế
   - Update file JSON với ID đúng
   - Gọi lại API

2. **"Shop ID X không tồn tại"**
   - Fix: Check shops table trong DB
   - Update file JSON
   - Gọi lại API

3. **"Data đã tồn tại"**
   - Đã seed rồi, không cần làm gì
   - Hoặc xóa data và seed lại

## Reset Database

```sql
-- Xóa toàn bộ data (thận trọng!)
TRUNCATE TABLE 
  shipment_logs, order_coupons, order_items, payments, shipments, orders,
  cart_items, carts, shop_addresses, addresses, shop_staffs,
  product_media, product_variants, product_categories, products,
  coupons, shops, users, role_permission, role, permission,
  categories, brands
CASCADE;
```

Sau đó restart server để seed lại.

## Đọc Thêm

- [API_GUIDE.md](./API_GUIDE.md) - Chi tiết về từng API
- [README.md](./README.md) - Giải thích đầy đủ về module
