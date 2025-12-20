# Tóm tắt các thay đổi API Product

## Các API mới được thêm vào

### 1. DELETE /products/brands/:brandId
- **Mô tả**: Xóa brand (thương hiệu)
- **Quyền**: Yêu cầu `manage_brands` permission
- **Kiểm tra**: 
  - Brand có tồn tại không
  - Brand có đang được sử dụng bởi sản phẩm nào không
- **Response**:
  - Success: `{ success: true, message: 'Xóa thương hiệu thành công' }`
  - Error: `{ success: false, message: 'Không thể xóa thương hiệu đang được sử dụng bởi sản phẩm' }`

### 2. DELETE /products/categories/:categoryId
- **Mô tả**: Xóa category (danh mục)
- **Quyền**: Yêu cầu `manage_categorys` permission
- **Kiểm tra**:
  - Category có tồn tại không
  - Category có danh mục con không
  - Category có đang được sử dụng bởi sản phẩm nào không
- **Response**:
  - Success: `{ success: true, message: 'Xóa danh mục thành công' }`
  - Error: `{ success: false, message: 'Không thể xóa danh mục có danh mục con' }`
  - Error: `{ success: false, message: 'Không thể xóa danh mục đang được sử dụng bởi sản phẩm' }`

## Thay đổi API hiện có

### DELETE /products/:productId
- **Thay đổi**: Chỉ **admin** mới có thể xóa sản phẩm
- **Trước đây**: Shop owner hoặc staff có quyền `manage_product` có thể xóa
- **Bây giờ**: Chỉ user có `role.name === 'admin'` mới có thể xóa
- **Quyền**: Vẫn yêu cầu `manage_product` permission
- **Kiểm tra**:
  - Sản phẩm có tồn tại không
  - User có phải là admin không
  - Sản phẩm có đơn hàng nào không (không thể xóa nếu có đơn hàng)
- **Response**:
  - Success: `{ success: true, message: 'Xóa sản phẩm thành công' }`
  - Error: `{ success: false, message: 'Chỉ admin mới có quyền xóa sản phẩm' }`
  - Error: `{ success: false, message: 'Không thể xóa sản phẩm đã có đơn hàng. Bạn có thể ẩn sản phẩm thay vì xóa.' }`

## Files đã chỉnh sửa

1. **src/product/product.service.ts**
   - Thêm method `deleteBrand(userid, id)`
   - Thêm method `deleteCategory(userid, id)`
   - Chỉnh sửa method `deleteProduct(product_id, user_id)` để chỉ admin mới có thể xóa

2. **src/product/product.controller.ts**
   - Thêm endpoint `DELETE /products/brands/:brandId`
   - Thêm endpoint `DELETE /products/categories/:categoryId`
   - Cập nhật documentation cho endpoint `DELETE /products/:productId`

## Cách test

### Test xóa brand
```bash
# Với admin user
DELETE http://localhost:3000/products/brands/1
Authorization: Bearer <admin_token>

# Response thành công
{
  "success": true,
  "message": "Xóa thương hiệu thành công"
}

# Response lỗi khi brand đang được sử dụng
{
  "success": false,
  "message": "Không thể xóa thương hiệu đang được sử dụng bởi sản phẩm"
}
```

### Test xóa category
```bash
# Với admin user
DELETE http://localhost:3000/products/categories/1
Authorization: Bearer <admin_token>

# Response thành công
{
  "success": true,
  "message": "Xóa danh mục thành công"
}

# Response lỗi khi category có danh mục con
{
  "success": false,
  "message": "Không thể xóa danh mục có danh mục con"
}
```

### Test xóa product (chỉ admin)
```bash
# Với admin user
DELETE http://localhost:3000/products/123
Authorization: Bearer <admin_token>

# Response thành công
{
  "success": true,
  "message": "Xóa sản phẩm thành công"
}

# Response lỗi khi không phải admin
{
  "success": false,
  "message": "Chỉ admin mới có quyền xóa sản phẩm"
}

# Response lỗi khi sản phẩm có đơn hàng
{
  "success": false,
  "message": "Không thể xóa sản phẩm đã có đơn hàng. Bạn có thể ẩn sản phẩm thay vì xóa."
}
```

## Lưu ý

1. **Quyền admin**: Để test các API này, bạn cần đảm bảo user có:
   - `role.name === 'admin'` (cho xóa product)
   - Permission `manage_brands` (cho xóa brand)
   - Permission `manage_categorys` (cho xóa category)

2. **Kiểm tra trước khi xóa**: Tất cả các API xóa đều kiểm tra xem entity có đang được sử dụng không trước khi xóa để tránh lỗi foreign key constraint.

3. **Soft delete vs Hard delete**: Hiện tại đang sử dụng hard delete. Nếu cần soft delete, có thể thêm field `is_deleted` và `deleted_at` vào các bảng.
