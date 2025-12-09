# Address API Documentation

API để quản lý địa chỉ của người dùng (user) và cửa hàng (shop).

## Các Endpoint

### 🔵 User Address Endpoints

#### 1. Thêm địa chỉ mới cho user
```
POST /address/user/add
```
**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "label": "Nhà riêng",
  "receiver_name": "Nguyễn Văn A",
  "phone": "0123456789",
  "province": "Thành phố Hồ Chí Minh",
  "district": "Quận 1",
  "ward": "Phường Bến Nghé",
  "street": "123 Đường Lê Lợi",
  "is_default": true,
  "ghn_province_id": 202,
  "ghn_district_id": 1442,
  "ghn_ward_code": "21012"
}
```

**Response:**
```json
{
  "message": "Thêm địa chỉ nhận hàng thành công",
  "data": {
    "id": 1,
    "user_id": 123,
    "label": "Nhà riêng",
    "recipient": "Nguyễn Văn A",
    "phone": "0123456789",
    "province": "Thành phố Hồ Chí Minh",
    "district": "Quận 1",
    "ward": "Phường Bến Nghé",
    "street": "123 Đường Lê Lợi",
    "is_default": true,
    "ghn_province_id": 202,
    "ghn_district_id": 1442,
    "ghn_ward_code": "21012",
    "created_at": "2025-12-07T10:00:00.000Z"
  }
}
```

#### 2. Cập nhật địa chỉ của user
```
PUT /address/user/update/:id
```
**Headers:** `Authorization: Bearer <token>`

**Params:** `id` - ID của địa chỉ cần cập nhật

**Body:** (Tất cả các field đều optional)
```json
{
  "label": "Văn phòng",
  "receiver_name": "Nguyễn Văn B",
  "phone": "0987654321",
  "province": "Hà Nội",
  "district": "Quận Ba Đình",
  "ward": "Phường Điện Biên",
  "street": "456 Đường Hoàng Diệu",
  "is_default": false,
  "ghn_province_id": 201,
  "ghn_district_id": 1484,
  "ghn_ward_code": "1A0203"
}
```

**Response:**
```json
{
  "message": "Cập nhật địa chỉ nhận hàng thành công",
  "data": { /* updated address object */ }
}
```

#### 3. Lấy tất cả địa chỉ của user hiện tại
```
GET /address/user/all
```
**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
[
  {
    "id": 1,
    "user_id": 123,
    "label": "Nhà riêng",
    "recipient": "Nguyễn Văn A",
    "phone": "0123456789",
    "province": "Thành phố Hồ Chí Minh",
    "district": "Quận 1",
    "ward": "Phường Bến Nghé",
    "street": "123 Đường Lê Lợi",
    "is_default": true,
    "ghn_province_id": 202,
    "ghn_district_id": 1442,
    "ghn_ward_code": "21012",
    "created_at": "2025-12-07T10:00:00.000Z"
  }
]
```

#### 4. Lấy tất cả địa chỉ theo user ID
```
GET /address/user/:userId
```
**Headers:** `Authorization: Bearer <token>`

**Params:** `userId` - ID của user

**Response:** Tương tự endpoint 3

#### 5. Xóa địa chỉ của user
```
DELETE /address/user/delete/:id
```
**Headers:** `Authorization: Bearer <token>`

**Params:** `id` - ID của địa chỉ cần xóa

**Response:**
```json
{
  "message": "Xóa địa chỉ thành công"
}
```

---

### 🟢 Shop Address Endpoints

#### 1. Thêm địa chỉ mới cho shop
```
POST /address/shop/add
```
**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "shop_id": 5,
  "name": "Kho hàng chính",
  "phone": "0123456789",
  "email": "warehouse@shop.com",
  "province": "Thành phố Hồ Chí Minh",
  "district": "Quận 1",
  "ward": "Phường Bến Nghé",
  "street": "123 Đường Lê Lợi",
  "is_default": true,
  "ghn_province_id": 202,
  "ghn_district_id": 1442,
  "ghn_ward_code": "21012"
}
```

**Response:**
```json
{
  "message": "Thêm địa chỉ shop thành công",
  "data": {
    "id": 1,
    "shop_id": 5,
    "name": "Kho hàng chính",
    "phone": "0123456789",
    "email": "warehouse@shop.com",
    "province": "Thành phố Hồ Chí Minh",
    "district": "Quận 1",
    "ward": "Phường Bến Nghé",
    "street": "123 Đường Lê Lợi",
    "is_default": true,
    "ghn_province_id": 202,
    "ghn_district_id": 1442,
    "ghn_ward_code": "21012",
    "created_at": "2025-12-07T10:00:00.000Z"
  }
}
```

**Note:** User phải là owner hoặc manager của shop mới có quyền thêm địa chỉ.

#### 2. Cập nhật địa chỉ của shop
```
PUT /address/shop/update/:id
```
**Headers:** `Authorization: Bearer <token>`

**Params:** `id` - ID của địa chỉ shop cần cập nhật

**Body:** (Tất cả các field đều optional)
```json
{
  "name": "Kho hàng phụ",
  "phone": "0987654321",
  "email": "warehouse2@shop.com",
  "province": "Hà Nội",
  "district": "Quận Ba Đình",
  "ward": "Phường Điện Biên",
  "street": "456 Đường Hoàng Diệu",
  "is_default": false,
  "ghn_province_id": 201,
  "ghn_district_id": 1484,
  "ghn_ward_code": "1A0203"
}
```

**Response:**
```json
{
  "message": "Cập nhật địa chỉ shop thành công",
  "data": { /* updated shop address object */ }
}
```

#### 3. Lấy tất cả địa chỉ của shop theo shop ID
```
GET /address/shop/all/:shopId
```
**Headers:** `Authorization: Bearer <token>`

**Params:** `shopId` - ID của shop

**Response:**
```json
[
  {
    "id": 1,
    "shop_id": 5,
    "name": "Kho hàng chính",
    "phone": "0123456789",
    "email": "warehouse@shop.com",
    "province": "Thành phố Hồ Chí Minh",
    "district": "Quận 1",
    "ward": "Phường Bến Nghé",
    "street": "123 Đường Lê Lợi",
    "is_default": true,
    "ghn_province_id": 202,
    "ghn_district_id": 1442,
    "ghn_ward_code": "21012",
    "created_at": "2025-12-07T10:00:00.000Z"
  }
]
```

#### 4. Xóa địa chỉ của shop
```
DELETE /address/shop/delete/:id
```
**Headers:** `Authorization: Bearer <token>`

**Params:** `id` - ID của địa chỉ shop cần xóa

**Response:**
```json
{
  "message": "Xóa địa chỉ shop thành công"
}
```

**Note:** User phải là owner hoặc manager của shop mới có quyền xóa địa chỉ.

---

### 📍 GHN Endpoints (Lấy thông tin tỉnh/thành, quận/huyện, phường/xã)

#### 1. Lấy danh sách tỉnh/thành phố
```
GET /address/provinces
```

**Response:**
```json
[
  {
    "ProvinceID": 202,
    "ProvinceName": "Thành phố Hồ Chí Minh",
    "Code": "SG"
  }
]
```

#### 2. Lấy danh sách quận/huyện theo tỉnh
```
GET /address/districts?province_id=202
```

**Query Params:**
- `province_id` (required): ID của tỉnh/thành phố

**Response:**
```json
[
  {
    "DistrictID": 1442,
    "DistrictName": "Quận 1",
    "ProvinceID": 202
  }
]
```

#### 3. Lấy danh sách phường/xã theo quận
```
GET /address/wards?district_id=1442
```

**Query Params:**
- `district_id` (required): ID của quận/huyện

**Response:**
```json
[
  {
    "WardCode": "21012",
    "WardName": "Phường Bến Nghé",
    "DistrictID": 1442
  }
]
```

---

### 🔄 Legacy Endpoints (Deprecated - Tương thích ngược)

Các endpoint sau vẫn hoạt động nhưng nên sử dụng các endpoint mới ở trên:

- `POST /address/add-address` → Sử dụng `POST /address/user/add`
- `POST /address/update-address` → Sử dụng `PUT /address/user/update/:id`
- `GET /address/all-address` → Sử dụng `GET /address/user/all`
- `POST /address/delete-address` → Sử dụng `DELETE /address/user/delete/:id`

---

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Failed to validate address with GHN. Please check the provided location IDs.",
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
  "message": "Bạn không có quyền cập nhật địa chỉ này",
  "error": "Forbidden"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Địa chỉ không tồn tại",
  "error": "Not Found"
}
```

---

## Notes

1. **GHN Integration**: Khi cung cấp `ghn_province_id`, `ghn_district_id`, và `ghn_ward_code`, hệ thống sẽ tự động lấy tên chính thức từ GHN API.

2. **Default Address**: Khi set `is_default: true`, tất cả các địa chỉ khác của user/shop sẽ tự động được set thành `is_default: false`.

3. **Permissions**:
   - User chỉ có thể CRUD địa chỉ của chính mình
   - Chỉ owner hoặc manager của shop mới có thể CRUD địa chỉ shop

4. **Ordering**: Địa chỉ được sắp xếp theo `is_default` (DESC) rồi đến `created_at` (DESC).

---

## Ví dụ sử dụng

### Thêm địa chỉ user
```bash
curl -X POST http://localhost:3000/address/user/add \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "label": "Nhà riêng",
    "receiver_name": "Nguyễn Văn A",
    "phone": "0123456789",
    "province": "Thành phố Hồ Chí Minh",
    "district": "Quận 1",
    "ward": "Phường Bến Nghé",
    "street": "123 Đường Lê Lợi",
    "is_default": true,
    "ghn_province_id": 202,
    "ghn_district_id": 1442,
    "ghn_ward_code": "21012"
  }'
```

### Cập nhật địa chỉ
```bash
curl -X PUT http://localhost:3000/address/user/update/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "label": "Văn phòng",
    "is_default": false
  }'
```

### Lấy danh sách địa chỉ
```bash
curl -X GET http://localhost:3000/address/user/all \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Xóa địa chỉ
```bash
curl -X DELETE http://localhost:3000/address/user/delete/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
