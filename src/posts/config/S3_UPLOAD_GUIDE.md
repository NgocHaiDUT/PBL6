# Hướng dẫn sử dụng S3 Upload cho Posts

## Cấu hình

File config: `src/posts/config/s3-post.config.ts`

Hỗ trợ 2 storage drivers:
- **local**: Lưu file vào thư mục `uploads/` (mặc định)
- **s3**: Upload lên Amazon S3

## Environment Variables

Thêm vào file `.env`:

```bash
# Storage driver: 'local' hoặc 's3'
STORAGE_DRIVER=s3

# AWS S3 Configuration (chỉ cần khi STORAGE_DRIVER=s3)
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_S3_BUCKET_NAME=your-bucket-name
```

## Các Config có sẵn

### 1. `s3PostCoverConfig` - Upload ảnh bìa post
- **File types**: jpg, jpeg, png, gif, heic, heif, webp
- **Max size**: 10MB
- **Max files**: 1
- **Storage**: `postimages/` (S3) hoặc `uploads/postimages/` (local)

### 2. `s3PostVideoConfig` - Upload video
- **File types**: mp4, mov, avi, mkv, webm
- **Max size**: 100MB
- **Max files**: 1
- **Storage**: `videos/` (S3) hoặc `uploads/videos/` (local)

### 3. `s3PostMediaConfig` - Upload nhiều ảnh/video
- **File types**: Cả ảnh và video
- **Max size**: 100MB per file
- **Max files**: 10
- **Storage**: Tự động phân loại (postimages/ hoặc videos/)

## Cách sử dụng trong Controller

### Ví dụ 1: Upload ảnh bìa post

```typescript
import { Controller, Post, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { s3PostCoverConfig } from './config/s3-post.config';

@Controller('posts')
export class PostsController {
  
  @Post(':id/cover')
  @UseInterceptors(FileInterceptor('file', s3PostCoverConfig))
  async uploadCover(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // S3: file.location chứa S3 URL
    // Local: file.path chứa đường dẫn local
    const imageUrl = file.location || `/uploads/postimages/${file.filename}`;
    
    return {
      message: 'Cover image uploaded successfully',
      url: imageUrl,
    };
  }
}
```

### Ví dụ 2: Upload video

```typescript
import { s3PostVideoConfig } from './config/s3-post.config';

@Post(':id/video')
@UseInterceptors(FileInterceptor('file', s3PostVideoConfig))
async uploadVideo(
  @Param('id') id: string,
  @UploadedFile() file: Express.Multer.File,
) {
  const videoUrl = file.location || `/uploads/videos/${file.filename}`;
  
  return {
    message: 'Video uploaded successfully',
    url: videoUrl,
  };
}
```

### Ví dụ 3: Upload nhiều media (ảnh + video)

```typescript
import { FilesInterceptor } from '@nestjs/platform-express';
import { s3PostMediaConfig, getPostFileUrl } from './config/s3-post.config';

@Post(':id/media')
@UseInterceptors(FilesInterceptor('files', 10, s3PostMediaConfig))
async uploadMedia(
  @Param('id') id: string,
  @UploadedFiles() files: Express.Multer.File[],
) {
  const mediaUrls = files.map(file => {
    // S3: file.location
    // Local: sử dụng helper function
    if (file.location) {
      return file.location; // S3 URL
    } else {
      const type = file.mimetype.startsWith('video/') ? 'video' : 'image';
      return getPostFileUrl(file.filename, type);
    }
  });
  
  return {
    message: 'Media uploaded successfully',
    urls: mediaUrls,
  };
}
```

## Helper Functions

### `getPostFileUrl(filename: string, type: 'image' | 'video'): string`

Tự động tạo URL đúng cho cả S3 và local storage.

```typescript
import { getPostFileUrl } from './config/s3-post.config';

// Tạo URL cho ảnh
const imageUrl = getPostFileUrl('123456.jpg', 'image');
// S3: https://bucket.s3.region.amazonaws.com/postimages/123456.jpg
// Local: /uploads/postimages/123456.jpg

// Tạo URL cho video
const videoUrl = getPostFileUrl('123456.mp4', 'video');
// S3: https://bucket.s3.region.amazonaws.com/videos/123456.mp4
// Local: /uploads/videos/123456.mp4
```

### `generateS3Url(bucketName: string, region: string, key: string): string`

Tạo S3 URL trực tiếp.

```typescript
import { generateS3Url } from './config/s3-post.config';

const url = generateS3Url('my-bucket', 'ap-southeast-1', 'postimages/photo.jpg');
// https://my-bucket.s3.ap-southeast-1.amazonaws.com/postimages/photo.jpg
```

### `parseS3Key(s3Url: string): string | null`

Parse S3 key từ full URL.

```typescript
import { parseS3Key } from './config/s3-post.config';

const key = parseS3Key('https://bucket.s3.region.amazonaws.com/postimages/photo.jpg');
// 'postimages/photo.jpg'
```

## Cập nhật Service để sử dụng S3

### Ví dụ: Update Post Service

```typescript
import { getPostFileUrl } from './config/s3-post.config';

@Injectable()
export class PostsService {
  
  async updateCoverImage(postId: number, file: Express.Multer.File) {
    // Lấy URL (tự động xử lý S3 hoặc local)
    const coverUrl = file.location || getPostFileUrl(file.filename, 'image');
    
    // Cập nhật database
    await this.prisma.posts.update({
      where: { id: postId },
      data: { cover_url: coverUrl },
    });
    
    return { message: 'Cover updated', coverUrl };
  }
  
  async updateVideo(postId: number, file: Express.Multer.File) {
    const videoUrl = file.location || getPostFileUrl(file.filename, 'video');
    
    await this.prisma.posts.update({
      where: { id: postId },
      data: { video_url: videoUrl },
    });
    
    return { message: 'Video updated', videoUrl };
  }
}
```

## Migration từ Local sang S3

1. **Cập nhật .env**:
   ```bash
   STORAGE_DRIVER=s3
   AWS_REGION=ap-southeast-1
   AWS_ACCESS_KEY_ID=xxx
   AWS_SECRET_ACCESS_KEY=xxx
   AWS_S3_BUCKET_NAME=your-bucket
   ```

2. **Không cần thay đổi code**: Config tự động chuyển đổi

3. **Upload file cũ lên S3** (optional):
   - Sử dụng AWS CLI hoặc script để migrate files từ `uploads/` lên S3
   - Cập nhật URLs trong database

## Lưu ý

1. **File naming**: Files được đặt tên với pattern `{postId}_{timestamp}.{ext}`
2. **Directories**: 
   - Images: `postimages/`
   - Videos: `videos/`
3. **S3 Permissions**: Đảm bảo bucket có public read access hoặc sử dụng signed URLs
4. **File size limits**: Có thể điều chỉnh trong config nếu cần
5. **CORS**: Nếu upload từ frontend, cần config CORS cho S3 bucket

## Testing

```bash
# Upload ảnh bìa
curl -X POST http://localhost:3000/posts/123/cover \
  -F "file=@image.jpg" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Upload video
curl -X POST http://localhost:3000/posts/123/video \
  -F "file=@video.mp4" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Upload nhiều files
curl -X POST http://localhost:3000/posts/123/media \
  -F "files=@image1.jpg" \
  -F "files=@image2.jpg" \
  -F "files=@video.mp4" \
  -H "Authorization: Bearer YOUR_TOKEN"
```
