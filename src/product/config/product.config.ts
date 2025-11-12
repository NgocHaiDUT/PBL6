import { S3Client } from '@aws-sdk/client-s3';
import multerS3 from 'multer-s3';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';

// Kiểm tra có S3 config không
const hasS3Config = () => {
  return !!(process.env.AWS_ACCESS_KEY_ID && 
           process.env.AWS_SECRET_ACCESS_KEY && 
           process.env.AWS_S3_BUCKET_NAME);
};

// Use S3 or local storage
const USE_S3 = hasS3Config() && process.env.USE_S3 === 'true';

// Tạo các thư mục upload nếu chưa tồn tại
const createUploadDir = (dir: string) => {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
};

// S3 Client (chỉ tạo nếu có config)
let s3: S3Client | undefined;
if (USE_S3) {
  s3 = new S3Client({
    region: process.env.AWS_REGION || 'ap-southeast-7',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

// Brand logo config - S3 hoặc Local
export const brandConfig = USE_S3 && s3 ? {
  // S3 Storage
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET_NAME!,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = file.originalname.split('.').pop();
      cb(null, `brands/${uniqueSuffix}.${extension}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.match(/\/(jpg|jpeg|png|gif|heic|heif|webp)$/)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPG, PNG, GIF, HEIC, HEIF, WebP) are allowed!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  }
} : {
  // Local Storage
  storage: diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = 'uploads/brands';
      createUploadDir(uploadDir);
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const timestamp = Date.now();
      const randomNum = Math.round(Math.random() * 1E9);
      const ext = extname(file.originalname);
      const filename = `brand_${timestamp}_${randomNum}${ext}`;
      cb(null, filename);
    },
  }),
  fileFilter: (req: any, file: any, cb: any) => {
    if (file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/) || 
        file.originalname.match(/\.(heic|heif)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
};

// Product image config - S3 hoặc Local  
export const productConfig = USE_S3 && s3 ? {
  // S3 Storage
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET_NAME!,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = file.originalname.split('.').pop();
      cb(null, `products/${uniqueSuffix}.${extension}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.match(/\/(jpg|jpeg|png|gif|heic|heif|webp)$/)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPG, PNG, GIF, HEIC, HEIF, WebP) are allowed!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  }
} : {
  // Local Storage
  storage: diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = 'uploads/products';
      createUploadDir(uploadDir);
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const timestamp = Date.now();
      const randomNum = Math.round(Math.random() * 1E9);
      const ext = extname(file.originalname);
      const filename = `product_${timestamp}_${randomNum}${ext}`;
      cb(null, filename);
    },
  }),
  fileFilter: (req: any, file: any, cb: any) => {
    if (file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/) || 
        file.originalname.match(/\.(heic|heif)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
};

// Helper functions để generate URL
export const generateProductImageUrl = (filename: string): string => {
  if (USE_S3) {
    return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/products/${filename}`;
  }
  return `/uploads/products/${filename}`;
};

export const generateBrandImageUrl = (filename: string): string => {
  if (USE_S3) {
    return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/brands/${filename}`;
  }
  return `/uploads/brands/${filename}`;
};

// Export storage type for logging
export const STORAGE_TYPE = USE_S3 ? 'S3' : 'LOCAL';
export { USE_S3 };

// Backward compatibility exports
export const s3BrandConfig = brandConfig;
export const s3ProductConfig = productConfig;