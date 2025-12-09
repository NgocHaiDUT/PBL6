import { S3Client } from '@aws-sdk/client-s3';
import multerS3 from 'multer-s3';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';

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
 * Tạo storage cho post media (hỗ trợ cả S3 và local)
 * @param directory - Thư mục lưu trữ: 'postimages' hoặc 'videos'
 */
const getPostStorage = (directory: 'postimages' | 'videos') => {
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
        cb(null, `${directory}/${uniqueSuffix}.${extension}`);
      },
    });
  } else {
    // Local storage
    const localDirectory = `uploads/${directory}`;
    createUploadDir(localDirectory);
    return diskStorage({
      destination: (req, file, cb) => {
        cb(null, localDirectory);
      },
      filename: (req, file, cb) => {
        const timestamp = Date.now();
        const ext = extname(file.originalname);
        const filename = `${timestamp}${ext}`;
        cb(null, filename);
      },
    });
  }
};

/**
 * Cấu hình cho cover image upload (ảnh bìa post)
 */
export const s3PostCoverConfig = {
  storage: getPostStorage('postimages'),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.match(/\/(jpg|jpeg|png|gif|heic|heif|webp)$/)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for post cover!'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1,
  },
};

/**
 * Cấu hình cho video upload
 */
export const s3PostVideoConfig = {
  storage: getPostStorage('videos'),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.match(/\/(mp4|mov|avi|mkv|webm)$/)) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB cho video
    files: 1,
  },
};

/**
 * Tạo storage động cho media (hỗ trợ cả ảnh và video)
 */
const getPostMediaStorage = () => {
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
        const directory = file.mimetype.startsWith('video/') ? 'videos' : 'postimages';
        cb(null, `${directory}/${uniqueSuffix}.${extension}`);
      },
    });
  } else {
    // Local storage với phân loại động
    return diskStorage({
      destination: (req, file, cb) => {
        const directory = file.mimetype.startsWith('video/') ? 'uploads/videos' : 'uploads/postimages';
        createUploadDir(directory);
        cb(null, directory);
      },
      filename: (req, file, cb) => {
        const timestamp = Date.now();
        const ext = extname(file.originalname);
        const filename = `${timestamp}${ext}`;
        cb(null, filename);
      },
    });
  }
};

/**
 * Cấu hình cho additional media upload (nhiều ảnh/video)
 * Hỗ trợ cả ảnh và video trong cùng một upload
 */
export const s3PostMediaConfig = {
  storage: getPostMediaStorage(),
  fileFilter: (req, file, cb) => {
    const allowedImageTypes = /\/(jpg|jpeg|png|gif|heic|heif|webp)$/;
    const allowedVideoTypes = /\/(mp4|mov|avi|mkv|webm)$/;
    
    if (file.mimetype.match(allowedImageTypes) || file.mimetype.match(allowedVideoTypes)) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB (cho cả ảnh và video)
    files: 10, // Tối đa 10 files
    fields: 20, // Số lượng fields tối đa
    fieldSize: 100 * 1024 * 1024, // 100MB per field
    fieldNameSize: 100, // Độ dài tên field
    headerPairs: 2000, // Số lượng header pairs
  },
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
 * Helper function để lấy file URL (S3 hoặc local)
 * S3: Trả về full URL (https://bucket.s3.region.amazonaws.com/key)
 * Local: Trả về relative path (videos/filename hoặc postimages/filename)
 */
export const getPostFileUrl = (file: Express.Multer.File): string => {
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
    // Local: file.path chứa uploads/videos/xxx hoặc uploads/postimages/xxx
    // Chuyển thành format: videos/filename hoặc postimages/filename
    const isVideo = file.mimetype.startsWith('video/');
    const directory = isVideo ? 'videos' : 'postimages';
    return `${directory}/${file.filename}`;
  }
};

/**
 * Helper function để lấy file URL từ filename (backward compatibility)
 */
export const getPostFileUrlLegacy = (filename: string, type: 'image' | 'video'): string => {
  const directory = type === 'video' ? 'videos' : 'postimages';
  if (storageDriver === 's3') {
    const bucketName = process.env.AWS_S3_BUCKET_NAME!;
    const region = process.env.AWS_REGION || 'ap-southeast-1';
    return generateS3Url(bucketName, region, `${directory}/${filename}`);
  } else {
    return `${directory}/${filename}`;
  }
};
