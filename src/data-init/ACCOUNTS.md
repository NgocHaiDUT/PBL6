# Tài Khoản Init - PBL6

## 🔐 Mật khẩu chung cho TẤT CẢ tài khoản: `123456`

---

## 👤 Admin

| Email | Password | Role | ID |
|-------|----------|------|-----|
| admin@pbl6.com | 123456 | Admin | 1 |

**Quyền hạn**: Quản lý toàn bộ hệ thống

---

## 🛍️ Customers (Khách hàng)

| Email | Password | Tên | ID |
|-------|----------|-----|-----|
| customer1@pbl6.com | 123456 | Nguyễn Văn A | 2 |
| customer2@pbl6.com | 123456 | Trần Thị B | 3 |
| customer3@pbl6.com | 123456 | Lê Văn C | 4 |

**Quyền hạn**: 
- Mua hàng
- Đánh giá sản phẩm
- Tạo posts
- Like, comment
- Follow shops

---

## 🏪 Shop Owners (Chủ shop)

| Email | Password | Shop Name | Shop ID | User ID | Địa chỉ |
|-------|----------|-----------|---------|---------|---------|
| owner1@shop.com | 123456 | BeautyShop | 1 | 5 | Hà Nội |
| owner2@shop.com | 123456 | SkincareShop | 2 | 6 | TP.HCM |
| owner3@shop.com | 123456 | MakeupShop | 3 | 7 | Đà Nẵng |
| owner4@shop.com | 123456 | CosmeticShop | 4 | 8 | Cần Thơ |

**Quyền hạn**:
- Quản lý sản phẩm của shop
- Quản lý đơn hàng
- Tạo posts quảng bá
- Xem thống kê

---

## 📊 Dữ liệu đã seed

### Products
- **Tổng**: 20 sản phẩm
- **Phân bố**: 5 sản phẩm/shop
- **Trạng thái**: Tất cả đã approved và published

### Orders
- **Tổng**: 24 đơn hàng
- **Phân bố**: 6 đơn/shop
- **Customers**: Từ user IDs 2, 3, 4

### Posts
- **Tổng**: 29 posts
- **Shop posts**: 20 (5 posts/shop owner)
- **Customer posts**: 9 (3 posts/customer)

### Social Data
- **Likes**: 87 (không duplicate)
- **Comments**: 86
- **Follows**: 7 shop follows
- **Reviews**: 6
- **Wishlists**: 9

### Carts
- **Tổng**: 3 carts (1 cart/customer)
- **Cart items**: 9 items

---

## 🚀 Cách sử dụng

### 1. Reset database và seed data
```bash
npm run prisma:reset
```

### 2. Login với tài khoản
- **Admin**: admin@pbl6.com / 123456
- **Customer**: customer1@pbl6.com / 123456
- **Shop Owner**: owner1@shop.com / 123456

### 3. Test features
- ✅ Mua hàng với customer accounts
- ✅ Quản lý shop với owner accounts
- ✅ Quản lý hệ thống với admin account

---

## 📝 Notes

- Tất cả passwords đã được hash bằng bcrypt (10 rounds)
- Images được upload lên S3 (nếu có AWS credentials)
- Địa chỉ shops ở các thành phố khác nhau (Hà Nội, TP.HCM, Đà Nẵng, Cần Thơ)
- Dữ liệu được tạo với timestamps thực tế
- Tất cả IDs đã được kiểm tra và match với nhau

---

## 🔍 Quick Reference

### User IDs
- 1: Admin
- 2-4: Customers
- 5-8: Shop Owners

### Shop IDs
- 1: BeautyShop (Hà Nội)
- 2: SkincareShop (TP.HCM)
- 3: MakeupShop (Đà Nẵng)
- 4: CosmeticShop (Cần Thơ)

### Product IDs
- 1-5: Shop 1 products
- 6-10: Shop 2 products
- 11-15: Shop 3 products
- 16-20: Shop 4 products
