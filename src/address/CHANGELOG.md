# Address Module - Changelog

## Tổng quan thay đổi

Đã cập nhật module Address để hỗ trợ đầy đủ CRUD operations cho cả địa chỉ **user** và **shop**, với permission checking và validation đầy đủ.

---

## Các thay đổi chính

### 1. **DTOs mới**

#### `create-shop-address.dto.ts`
- DTO để tạo địa chỉ shop
- Các field: `shop_id`, `name`, `phone`, `email`, `province`, `district`, `ward`, `street`, `is_default`, GHN IDs

#### `update-shop-address.dto.ts`
- DTO để cập nhật địa chỉ shop
- Tất cả các field đều optional (trừ `addressid`)

---

### 2. **Controller Updates** (`address.controller.ts`)

#### **User Address Endpoints** (Mới)
- `POST /address/user/add` - Thêm địa chỉ user
- `PUT /address/user/update/:id` - Cập nhật địa chỉ user
- `GET /address/user/all` - Lấy tất cả địa chỉ của user hiện tại
- `GET /address/user/:userId` - Lấy địa chỉ theo user ID
- `DELETE /address/user/delete/:id` - Xóa địa chỉ user

#### **Shop Address Endpoints** (Mới)
- `POST /address/shop/add` - Thêm địa chỉ shop
- `PUT /address/shop/update/:id` - Cập nhật địa chỉ shop
- `GET /address/shop/all/:shopId` - Lấy tất cả địa chỉ của shop
- `DELETE /address/shop/delete/:id` - Xóa địa chỉ shop

#### **Legacy Endpoints** (Giữ nguyên để tương thích)
- `POST /address/add-address`
- `POST /address/update-address`
- `GET /address/all-address`
- `POST /address/delete-address`

#### **GHN Endpoints** (Không đổi)
- `GET /address/provinces`
- `GET /address/districts`
- `GET /address/wards`

---

### 3. **Service Updates** (`address.service.ts`)

#### **Helper Methods** (Mới)
```typescript
private async resolveGHNLocationNames(
  ghn_province_id?: number,
  ghn_district_id?: number,
  ghn_ward_code?: string,
): Promise<{ province?: string; district?: string; ward?: string }>
```
- Tái sử dụng logic để resolve tên địa điểm từ GHN API
- Giảm code duplication

#### **User Address Methods** (Mới)
```typescript
async addUserAddress(userId: number, dto: CreateAddressDto)
async updateUserAddress(addressId: number, userId: number, dto: UpdateAddressDto)
async deleteUserAddress(addressId: number, userId: number)
async getUserAddresses(userId: number)
```

**Features:**
- ✅ Ownership validation (user chỉ có thể thao tác với địa chỉ của mình)
- ✅ Auto-unset other default addresses khi set new default
- ✅ GHN location name resolution
- ✅ Proper error handling với `NotFoundException`, `ForbiddenException`
- ✅ Sắp xếp theo `is_default` DESC, `created_at` DESC

#### **Shop Address Methods** (Mới)
```typescript
async addShopAddress(userId: number, dto: CreateShopAddressDto)
async updateShopAddress(addressId: number, userId: number, dto: UpdateShopAddressDto)
async deleteShopAddress(addressId: number, userId: number)
async getShopAddresses(shopId: number)
```

**Features:**
- ✅ Permission checking (chỉ owner hoặc manager có quyền)
- ✅ Auto-unset other default addresses khi set new default
- ✅ GHN location name resolution
- ✅ Proper error handling
- ✅ Sắp xếp theo `is_default` DESC, `created_at` DESC

#### **Legacy Methods** (Refactored)
```typescript
async addaddress(...)
async updateaddress(...)
async deleteaddress(...)
async getaddresses(...)
```
- Giữ nguyên signature để tương thích
- Gọi các methods mới bên trong

---

### 4. **Permission Model**

#### User Addresses
- User chỉ có thể CRUD địa chỉ của chính mình
- Validate ownership qua `userId` từ JWT token

#### Shop Addresses
- Chỉ **owner** hoặc **manager** của shop mới có quyền CRUD
- Validate qua:
  ```typescript
  const isOwner = shop.owner_id === userId;
  const isManager = shop.shop_staffs.some((staff) => staff.is_manager);
  ```

---

### 5. **Database Schema** (Không đổi)

#### `addresses` table (User addresses)
- `user_id` - Foreign key to users
- `recipient`, `phone`, `province`, `district`, `ward`, `street`
- `is_default` - Boolean flag
- GHN fields: `ghn_province_id`, `ghn_district_id`, `ghn_ward_code`

#### `shop_addresses` table (Shop addresses)
- `shop_id` - Foreign key to shops
- `name`, `phone`, `email`, `province`, `district`, `ward`, `street`
- `is_default` - Boolean flag
- GHN fields: `ghn_province_id`, `ghn_district_id`, `ghn_ward_code`

---

## Error Handling

### New Exception Types
- `NotFoundException` - Khi địa chỉ không tồn tại
- `ForbiddenException` - Khi user không có quyền
- `BadRequestException` - Khi GHN validation fails

### Error Messages (Vietnamese)
- "Địa chỉ không tồn tại"
- "Bạn không có quyền cập nhật địa chỉ này"
- "Bạn không có quyền xóa địa chỉ này"
- "Shop không tồn tại"
- "Bạn không có quyền thêm địa chỉ cho shop này"
- "Failed to validate address with GHN..."

---

## Testing Recommendations

### User Address Tests
1. ✅ Add address with valid data
2. ✅ Add address with GHN IDs
3. ✅ Update address (partial update)
4. ✅ Set default address (should unset others)
5. ✅ Delete own address
6. ❌ Update someone else's address (should fail)
7. ❌ Delete someone else's address (should fail)

### Shop Address Tests
1. ✅ Add shop address as owner
2. ✅ Add shop address as manager
3. ❌ Add shop address as regular staff (should fail)
4. ✅ Update shop address with permissions
5. ❌ Update shop address without permissions (should fail)
6. ✅ Delete shop address with permissions
7. ❌ Delete shop address without permissions (should fail)

---

## Migration Guide

### Từ old endpoints sang new endpoints

#### User Addresses
```bash
# Old
POST /address/add-address
POST /address/update-address
GET  /address/all-address
POST /address/delete-address

# New (Recommended)
POST   /address/user/add
PUT    /address/user/update/:id
GET    /address/user/all
DELETE /address/user/delete/:id
```

#### Shop Addresses (Completely New)
```bash
POST   /address/shop/add
PUT    /address/shop/update/:id
GET    /address/shop/all/:shopId
DELETE /address/shop/delete/:id
```

### Breaking Changes
**NONE** - Tất cả old endpoints vẫn hoạt động bình thường!

---

## Documentation

- ✅ API_DOCUMENTATION.md - Chi tiết tất cả endpoints với examples
- ✅ Inline code comments
- ✅ DTOs với validation decorators
- ✅ Error response examples

---

## Files Modified/Created

### Created
- `src/address/dto/create-shop-address.dto.ts`
- `src/address/dto/update-shop-address.dto.ts`
- `src/address/API_DOCUMENTATION.md`
- `src/address/CHANGELOG.md` (this file)

### Modified
- `src/address/address.controller.ts`
- `src/address/address.service.ts`

### Not Changed
- `src/address/dto/create-address.dto.ts`
- `src/address/dto/update-address.dto.ts`
- `src/address/address.module.ts`
- `prisma/schema.prisma`
