import { S3Client } from '@aws-sdk/client-s3';
import multerS3 from 'multer-s3';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { BadRequestException } from '@nestjs/common';

const storageDriver = process.env.STORAGE_DRIVER || 'local';

// S3 client setup (only if using S3)
let s3: S3Client;
if (storageDriver === 's3') {
  s3 = new S3Client({
    region: process.env.AWS_REGION || 'ap-southeast-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

// Helper for local storage
const createUploadDir = (dir: string) => {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
};

/**
 * Tạo storage cho story media (hỗ trợ cả S3 và local)
 * Tự động phân loại image/video vào thư mục riêng
 */
const getStoryStorage = () => {
  if (storageDriver === 's3') {
    return multerS3({
      s3: s3,
      bucket: process.env.AWS_S3_BUCKET_NAME!,
      metadata: function (req, file, cb) {
        cb(null, { fieldName: file.fieldname });
      },
      key: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const extension = file.originalname.split('.').pop();
        // Tự động phân loại theo MIME type
        const directory = file.mimetype.startsWith('video/') ? 'stories/videos' : 'stories/images';
        cb(null, `${directory}/story-${uniqueSuffix}.${extension}`);
      },
    });
  } else {
    // Local storage với phân loại động
    return diskStorage({
      destination: (req, file, cb) => {
        const directory = file.mimetype.startsWith('video/') 
          ? 'uploads/stories/videos' 
          : 'uploads/stories/images';
        createUploadDir(directory);
        cb(null, directory);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        cb(null, `story-${uniqueSuffix}${ext}`);
      },
    });
  }
};

/**
 * Cấu hình cho story media upload
 * Hỗ trợ cả ảnh và video (max 30s)
 */
export const s3StoryMediaConfig = {
  storage: getStoryStorage(),
  fileFilter: (req, file, cb) => {
    console.log('📋 [s3StoryConfig] File filter check:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });

    const allowedImageTypes = /\/(jpg|jpeg|png|gif|heic|heif|webp)$/i;
    const allowedVideoTypes = /\/(mp4|mov|avi|mkv|webm|quicktime|x-msvideo|x-matroska)$/i;
    
    if (file.mimetype.match(allowedImageTypes)) {
      console.log('✅ [s3StoryConfig] Image file accepted');
      cb(null, true);
    } else if (file.mimetype.match(allowedVideoTypes)) {
      console.log('✅ [s3StoryConfig] Video file accepted');
      cb(null, true);
    } else {
      console.error('❌ [s3StoryConfig] File rejected - Invalid MIME type:', file.mimetype);
      cb(
        new BadRequestException(
          `Invalid file type: ${file.mimetype}. Only image (JPEG, PNG, GIF, WebP) and video (MP4, MOV, AVI, WebM) files are allowed for stories!`,
        ),
        false,
      );
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max (for videos)
    files: 1, // Story chỉ 1 media file
  },
};

/**
 * File size limits for validation
 */
export const STORY_IMAGE_MAX_SIZE = 10 * 1024 * 1024; // 10MB for images
export const STORY_VIDEO_MAX_SIZE = 50 * 1024 * 1024; // 50MB for videos
export const STORY_VIDEO_MAX_DURATION = 30; // 30 seconds max

/**
 * Helper function để lấy story file URL (S3 hoặc local)
 * S3: Trả về full URL (https://bucket.s3.region.amazonaws.com/key)
 * Local: Trả về relative path (stories/images/filename hoặc stories/videos/filename)
 */
export const getStoryFileUrl = (file: Express.Multer.File): string => {
  if (storageDriver === 's3') {
    // S3: Trả về full URL
    const fileKey = (file as any).key;
    const fileLocation = (file as any).location;
    
    // Ưu tiên dùng location, nếu không có thì build từ key
    if (fileLocation) {
      return fileLocation;
    } else if (fileKey) {
      const bucketName = process.env.AWS_S3_BUCKET_NAME!;
      const region = process.env.AWS_REGION || 'ap-southeast-1';
      return `https://${bucketName}.s3.${region}.amazonaws.com/${fileKey}`;
    }
    return fileKey; // Fallback
  } else {
    // Local: file.path chứa uploads/stories/videos/xxx hoặc uploads/stories/images/xxx
    // Chuyển thành format: stories/videos/filename hoặc stories/images/filename
    const isVideo = file.mimetype.startsWith('video/');
    const directory = isVideo ? 'stories/videos' : 'stories/images';
    return `${directory}/${file.filename}`;
  }
};

/**
 * Helper function để tạo S3 URL trực tiếp
 */
export const generateS3Url = (
  bucketName: string,
  region: string,
  key: string,
): string => {
  return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
};

/**
 * Helper function để parse S3 key từ full URL
 */
export const parseS3Key = (s3Url: string): string | null => {
  const match = s3Url.match(
    /https:\/\/[^\/]+\.s3\.[^\/]+\.amazonaws\.com\/(.+)/,
  );
  return match ? match[1] : null;
};

/**
 * Get storage driver type
 */
export const getStorageDriver = (): string => {
  return storageDriver;
};
