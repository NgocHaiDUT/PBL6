# 🖼️ Brand Images Migration Guide

## 🎯 Vấn đề
File `brands.json` có URLs local (`/uploads/brands/...`) nhưng giờ đã chuyển sang S3. Cần cập nhật để sử dụng S3 URLs.

## ✅ Đã làm: Cập nhật brands.json với S3 URLs

```json
// Trước:
"logo_url": "/uploads/brands/loreal.png"

// Sau:
"logo_url": "https://pbl6-bucket.s3.ap-northeast-1.amazonaws.com/brands/loreal.png"
```

## 📋 Các cách xử lý brand images:

### **Cách 1: Upload manual lên S3 (Đơn giản nhất)**

#### Bước 1: Chuẩn bị ảnh brands
```bash
# Tạo thư mục chứa brand logos
mkdir brand-logos
cd brand-logos

# Download hoặc tạo các file logo với tên:
loreal.png
estee-lauder.png
mac-cosmetics.png
maybelline.png
lancome.png
clinique.png
dior-beauty.png
chanel.png
nars-cosmetics.png
urban-decay.png
benefit-cosmetics.png
shiseido.png
ysl-beauty.png
fenty-beauty.png
huda-beauty.png
too-faced.png
sephora-collection.png
kylie-cosmetics.png
glossier.png
pat-mcgrath-labs.png
bobbi-brown.png
kiehls.png
the-body-shop.png
nyx-professional-makeup.png
revlon.png
clarins.png
giorgio-armani-beauty.png
givenchy-beauty.png
charlotte-tilbury.png
bareminerals.png
```

#### Bước 2: Upload lên S3 via AWS CLI
```bash
# Upload tất cả brand logos
aws s3 cp brand-logos/ s3://pbl6-bucket/brands/ --recursive

# Hoặc upload từng file
aws s3 cp loreal.png s3://pbl6-bucket/brands/loreal.png
aws s3 cp estee-lauder.png s3://pbl6-bucket/brands/estee-lauder.png
# ... các file khác
```

#### Bước 3: Verify
```bash
# List files trong S3 bucket
aws s3 ls s3://pbl6-bucket/brands/

# Test truy cập URL
curl https://pbl6-bucket.s3.ap-northeast-1.amazonaws.com/brands/loreal.png
```

### **Cách 2: Upload via S3 Console (GUI)**

1. Đăng nhập AWS Console
2. Vào S3 service
3. Chọn bucket `pbl6-bucket`
4. Tạo folder `brands`
5. Upload các file logo vào folder `brands`
6. Set permissions public read

### **Cách 3: Sử dụng placeholder images (Tạm thời)**

Nếu chưa có ảnh thật, có thể dùng placeholder:

```typescript
// Trong data-init.service.ts, sửa seedBrands()
private async seedBrands() {
    // ... existing code ...
    
    for (const brand of brandsData) {
        // Tạo placeholder URL nếu không có ảnh
        const logoUrl = brand.logo_url || `https://via.placeholder.com/200x200/1a1a1a/ffffff?text=${encodeURIComponent(brand.name)}`;
        
        await this.prisma.brands.create({
            data: {
                name: brand.name,
                slug: brand.slug,
                logo_url: logoUrl,
                created_at: new Date(),
            },
        });
    }
}
```

### **Cách 4: Upload programmatically (Advanced)**

Đã tạo `S3UploadService` để tự động upload. Để sử dụng:

1. **Thêm vào DataInitModule:**
```typescript
// src/data-init/data-init.module.ts
import { S3UploadService } from './s3-upload.service';

@Module({
  providers: [DataInitService, S3UploadService],
  exports: [DataInitService],
})
export class DataInitModule {}
```

2. **Cập nhật DataInitService:**
```typescript
// src/data-init/data-init.service.ts
constructor(
  private prisma: PrismaService,
  private s3UploadService: S3UploadService // Thêm này
) {}

async onModuleInit() {
    // Upload brand logos trước khi seed
    await this.s3UploadService.uploadBrandLogosToS3();
    await this.seedData();
}
```

3. **Chạy upload:**
```bash
npm run start
# Service sẽ tự động upload brand logos từ ./uploads/brands/ lên S3
```

## 🔍 Verify setup

### Kiểm tra data seed:
```bash
# Start server
npm run start

# Check logs
# Should see: "Đã tạo 30 thương hiệu thành công"
```

### Test API:
```bash
GET http://localhost:3000/product/all-brands

# Response should have S3 URLs:
{
  "brands": [
    {
      "id": 1,
      "name": "L'Oréal",
      "logo_url": "https://pbl6-bucket.s3.ap-northeast-1.amazonaws.com/brands/loreal.png"
    }
  ]
}
```

### Test brand creation:
```bash
POST http://localhost:3000/product/add-brand
Content-Type: multipart/form-data

Body:
- name: "Test Brand"
- slug: "test-brand"
- file: [image file]

# Should return S3 URL
```

## 🎯 Khuyến nghị

**Cho Development:** Sử dụng **Cách 3** (placeholder) để test nhanh
**Cho Production:** Sử dụng **Cách 1** (manual upload) cho chất lượng tốt

## 📝 Lưu ý

1. **S3 Bucket Policy:** Đảm bảo bucket cho phép public read
2. **File naming:** Tên file phải khớp với slug trong JSON
3. **File format:** Khuyến nghị PNG cho logos (trong suốt)
4. **File size:** Tối ưu kích thước để load nhanh (< 100KB/logo)

## ✅ Status: READY TO USE

`brands.json` đã được cập nhật với S3 URLs. Chỉ cần upload ảnh lên S3 theo một trong các cách trên!