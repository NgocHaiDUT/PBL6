# 🎯 Tóm Tắt: Data Init API Improvements

## Vấn đề ban đầu

Data init có các data với **hardcoded ID** (user_id, shop_id, etc.) trong file JSON, dẫn đến:
- ❌ Foreign key constraint errors khi seed
- ❌ ID không khớp với database thực tế (auto-increment)
- ❌ Không linh hoạt khi database đã có data

## Giải pháp

### ✅ Tách data seeding thành 2 loại:

#### 1. **Auto Seeding** (khi server khởi động)
Data không phụ thuộc foreign key hoặc có thể tự quản lý:
- Brands, Categories, Roles, Permissions
- Users, Shops, Products, Coupons

#### 2. **Manual Seeding** (via API)
Data có foreign key dependencies - cần gọi theo thứ tự:
1. `POST /data-init/shop-staffs` (depends: users, shops)
2. `POST /data-init/addresses` (depends: users)
3. `POST /data-init/shop-addresses` (depends: shops)
4. `POST /data-init/carts` (depends: users)
5. `POST /data-init/cart-items` (depends: carts, products)
6. `POST /data-init/orders` (depends: all above)

## Các file đã tạo

### 📝 Documentation
- ✅ `API_GUIDE.md` - Hướng dẫn chi tiết về API
- ✅ `QUICK_START.md` - Hướng dẫn nhanh
- ✅ `README.md` - Cập nhật với thông tin mới
- ✅ `verify-data.sql` - SQL queries để kiểm tra data

### 🔧 Scripts
- ✅ `seed-all.ps1` - PowerShell script để seed tất cả (Windows)
- ✅ `seed-all.sh` - Bash script để seed tất cả (Linux/Mac)
- ✅ `postman_collection.json` - Postman collection

### 💻 Code Changes

**data-init.controller.ts:**
- Thêm 5 API endpoints mới cho manual seeding
- Mỗi endpoint có validation và error handling

**data-init.service.ts:**
- Chuyển các private methods sang public async methods
- Thêm validation cho foreign keys
- Return detailed response với successCount/errorCount
- Log chi tiết khi skip records

## Tính năng mới

### 🔍 Foreign Key Validation
Mỗi API check xem foreign key có tồn tại không:
```typescript
const userExists = await this.prisma.users.findUnique({
  where: { id: cart.user_id }
});
if (!userExists) {
  this.logger.warn(`User ID ${cart.user_id} không tồn tại, skip`);
  continue;
}
```

### 📊 Detailed Response
```json
{
  "success": true,
  "message": "Đã tạo 4/4 shop staffs",
  "successCount": 4,
  "errorCount": 0
}
```

### 🔄 Idempotency
Mỗi API check xem data đã tồn tại chưa:
```typescript
const existingCount = await this.prisma.table.count();
if (existingCount > 0) {
  return { success: false, message: 'Data đã tồn tại' };
}
```

## Cách sử dụng

### Option 1: Script tự động (Khuyên dùng)
```powershell
# 1. Start server
npm run start:dev

# 2. Wait 5 seconds

# 3. Run script
.\src\data-init\seed-all.ps1
```

### Option 2: Postman
1. Import `postman_collection.json`
2. Chạy requests theo thứ tự từ 1-6

### Option 3: Manual cURL
```bash
curl -X POST http://localhost:3000/data-init/shop-staffs
curl -X POST http://localhost:3000/data-init/addresses
# ... (xem QUICK_START.md)
```

## Kết quả

- ✅ Không còn foreign key errors
- ✅ Có thể seed từng phần riêng biệt
- ✅ Log chi tiết khi có lỗi
- ✅ Skip records không hợp lệ thay vì crash
- ✅ Easy to debug với response rõ ràng
- ✅ Scripts tự động cho Windows/Linux
- ✅ Documentation đầy đủ

## Testing

Chạy SQL trong `verify-data.sql` để check:
- Số lượng records trong mỗi bảng
- Foreign key relationships đúng
- Data integrity

Expected counts sau khi seed đầy đủ:
- Users: 4 (1 admin + 3 customers)
- Shops: 1
- Shop Staffs: 4
- Products: 10 (with 20 variants)
- Addresses: 15
- Shop Addresses: 3
- Carts: 3 (with 15 items)
- Orders: 10 (with items, payments, shipments)

## Lưu ý

⚠️ **Development only!** Không dùng trong production.

🔒 **Security:** Các API không có authentication guard (đây là development tool).

🗑️ **Reset:** Nếu muốn seed lại, truncate tables theo thứ tự ngược lại hoặc drop database.
