# Hệ Thống Upload Ảnh Lên S3 Cho Data Init

## Tổng Quan

Hệ thống đã được cập nhật để tự động upload tất cả ảnh từ folder `uploads` lên AWS S3 khi khởi tạo dữ liệu. Điều này đảm bảo:

- ✅ Tất cả ảnh được lưu trữ trên S3 (không lưu local)
- ✅ Database lưu đường dẫn S3 URL chính xác
- ✅ Dễ dàng mở rộng và backup
- ✅ Tối ưu hiệu năng khi load ảnh

## Cấu Trúc Thư Mục

```
uploads/
├── avatars/          # Ảnh đại diện người dùng
├── bannershops/      # Banner cửa hàng
├── brands/           # Logo thương hiệu
├── chat-media/       # Media trong chat
├── logoshops/        # Logo cửa hàng
├── postimages/       # Ảnh trong bài viết
├── products/         # Ảnh sản phẩm
└── videos/           # Video
```

## Cấu Hình AWS S3

### 1. Thiết Lập Biến Môi Trường

Thêm vào file `.env`:

```env
AWS_REGION=ap-southeast-7
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_S3_BUCKET_NAME=your-bucket-name
```

### 2. Cấu Hình IAM Policy

Policy cần có quyền:
- `s3:PutObject` - Upload file
- `s3:GetObject` - Đọc file
- `s3:DeleteObject` - Xóa file (optional)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

## Quy Trình Upload

### Tự Động (Khi Khởi Động Server)

Khi server khởi động, `DataInitService` sẽ tự động:

1. **Upload tất cả ảnh lên S3** từ folder `uploads`
2. **Tạo mapping** giữa tên file và S3 URL
3. **Khởi tạo dữ liệu** với S3 URL thay vì đường dẫn local

```typescript
// Tự động chạy khi server khởi động
async seedData() {
  await this.uploadAllImagesToS3(); // Upload trước
  await this.seedBrands();           // Tạo data với S3 URL
  await this.seedProducts();
  // ...
}
```

### Thủ Công (API Endpoints)

Có thể gọi API để seed từng loại data riêng lẻ:

```bash
# Seed brands
POST http://localhost:3000/data-init/brands

# Seed products
POST http://localhost:3000/data-init/products

# Seed users
POST http://localhost:3000/data-init/users

# Seed posts
POST http://localhost:3000/data-init/posts
```

## Các Bảng Đã Có Data Init

### ✅ Đã Có Trước Đây
- `brands` - Thương hiệu
- `categories` - Danh mục
- `users` - Người dùng
- `shops` - Cửa hàng
- `products` - Sản phẩm
- `addresses` - Địa chỉ
- `orders` - Đơn hàng
- `carts` - Giỏ hàng
- `coupons` - Mã giảm giá

### ✨ Mới Thêm
- `reviews` - Đánh giá sản phẩm
- `wishlists` - Danh sách yêu thích
- `follows` - Quan hệ follow giữa users
- `posts` - Bài viết & Stories
- `likes` - Lượt thích bài viết
- `comments` - Bình luận
- `saved_posts` - Bài viết đã lưu

## Cấu Trúc File JSON

### Brands (brands.json)
```json
[
  {
    "name": "L'Oréal",
    "slug": "loreal",
    "logo_url": "/uploads/brands/loreal.png"
  }
]
```

### Products (products.json)
```json
[
  {
    "name": "Kem Chống Nắng SPF 50+",
    "slug": "kem-chong-nang-spf-50",
    "media": [
      {
        "url": "/uploads/products/kem-chong-nang-1.jpg",
        "type": "image",
        "is_primary": true
      }
    ]
  }
]
```

### Posts (posts.json)
```json
[
  {
    "user_id": 1,
    "title": "Routine chăm sóc da",
    "content_md": "# Routine buổi sáng\n...",
    "is_story": false,
    "media": [
      {
        "media_url": "/uploads/postimages/post1.jpg",
        "media_type": "image"
      }
    ],
    "products": [1, 2, 3]
  }
]
```

## S3UploadService API

### Upload Một File
```typescript
const s3Url = await s3UploadService.uploadFile(
  'brands/logo.png',  // local path trong uploads
  'brands/logo.png'   // S3 key
);
```

### Upload Cả Folder
```typescript
const urlMap = await s3UploadService.uploadFolder('brands');
// Returns: Map<fileName, s3Url>
```

### Upload Theo Loại
```typescript
// Brands
await s3UploadService.uploadBrandLogos();

// Products
await s3UploadService.uploadProductImages();

// Avatars
await s3UploadService.uploadAvatars();

// Shop logos
await s3UploadService.uploadShopLogos();

// Shop banners
await s3UploadService.uploadShopBanners();

// Post images
await s3UploadService.uploadPostImages();
```

### Generate S3 URL
```typescript
const url = s3UploadService.generateS3Url('brands/logo.png');
// Returns: https://bucket.s3.region.amazonaws.com/brands/logo.png
```

## Convert Local Path to S3 URL

Hệ thống tự động convert đường dẫn local sang S3 URL:

```typescript
// Input:  /uploads/brands/logo.png
// Output: https://bucket.s3.region.amazonaws.com/brands/logo.png

const s3Url = this.convertToS3Url('/uploads/brands/logo.png');
```

## Thêm Ảnh Mới

### 1. Thêm File Vào Folder
```bash
# Thêm ảnh vào folder tương ứng
uploads/products/new-product.jpg
uploads/brands/new-brand.png
```

### 2. Cập Nhật File JSON
```json
{
  "name": "New Product",
  "media": [
    {
      "url": "/uploads/products/new-product.jpg",
      "type": "image"
    }
  ]
}
```

### 3. Chạy Seed
```bash
# Restart server hoặc gọi API
POST http://localhost:3000/data-init/products
```

## Troubleshooting

### Lỗi: "File không tồn tại"
- Kiểm tra file có trong folder `uploads`
- Kiểm tra đường dẫn trong JSON đúng format: `/uploads/folder/file.ext`

### Lỗi: "AWS credentials not found"
- Kiểm tra file `.env` có đầy đủ biến
- Restart server sau khi thay đổi `.env`

### Lỗi: "Access Denied" khi upload
- Kiểm tra IAM policy có quyền `s3:PutObject`
- Kiểm tra bucket name đúng

### Ảnh không hiển thị
- Kiểm tra S3 bucket có public access (nếu cần)
- Kiểm tra CORS configuration của bucket
- Verify URL trong database

## Best Practices

### 1. Đặt Tên File
- Dùng slug format: `kem-chong-nang-1.jpg`
- Không dùng dấu, space: ✗ `Kem Chống Nắng.jpg`
- Dùng số thứ tự: `product-1.jpg`, `product-2.jpg`

### 2. Kích Thước Ảnh
- Products: 800x800px hoặc 1200x1200px
- Brands: 200x200px
- Avatars: 400x400px
- Banners: 1920x600px

### 3. Format
- Ưu tiên: `.jpg` cho photos, `.png` cho logos
- Compress trước khi upload
- Dùng WebP nếu có thể

### 4. Tổ Chức
- Mỗi loại ảnh riêng folder
- Đặt tên có ý nghĩa
- Không mix nhiều loại trong 1 folder

## Mở Rộng

### Thêm Loại Ảnh Mới

1. **Tạo folder trong uploads**
```bash
mkdir uploads/new-type
```

2. **Thêm URL map vào service**
```typescript
private newTypeUrlMap: Map<string, string> = new Map();
```

3. **Thêm upload method**
```typescript
async uploadNewType(): Promise<Map<string, string>> {
  return this.uploadFolder('new-type');
}
```

4. **Gọi trong uploadAllImagesToS3**
```typescript
this.newTypeUrlMap = await this.s3UploadService.uploadNewType();
```

5. **Thêm vào convertToS3Url**
```typescript
else if (folder === 'new-type') urlMap = this.newTypeUrlMap;
```

## Monitoring & Logs

Khi seed data, logs sẽ hiển thị:

```
=== BẮT ĐẦU UPLOAD TẤT CẢ ẢNH LÊN S3 ===
Bắt đầu upload thư mục brands lên S3...
✅ Uploaded: loreal.png -> https://bucket.s3...
✅ Uploaded: maybelline.png -> https://bucket.s3...
Hoàn thành upload 30/30 files từ brands!
=== HOÀN THÀNH UPLOAD TẤT CẢ ẢNH LÊN S3 ===
Tổng số ảnh đã upload: 156
Đã tạo 30 thương hiệu thành công
```

## Performance Tips

- Upload chỉ chạy 1 lần khi khởi động
- URLs được cache trong memory
- Không upload lại file đã có trên S3
- Dùng parallel upload cho nhiều files

## Security

- Không commit AWS credentials vào Git
- Dùng environment variables
- Restrict IAM permissions
- Enable S3 bucket versioning
- Enable CloudFront CDN (optional)

---

## Support

Nếu gặp vấn đề, kiểm tra:
1. Logs trong console
2. File `.env` configuration
3. AWS S3 bucket permissions
4. Network connectivity

**Happy coding! 🚀**
