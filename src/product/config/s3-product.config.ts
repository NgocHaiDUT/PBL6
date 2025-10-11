import { S3Client } from '@aws-sdk/client-s3';
import * as multerS3 from 'multer-s3';

// Cấu hình S3 client
const s3 = new S3Client({
  region: process.env.AWS_REGION || 'ap-southeast-7',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Cấu hình cho brand logo upload
export const s3BrandConfig = {
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
      cb(new Error('Only image files are allowed for brand logo!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1,
  },
};

// Cấu hình cho product media upload
export const s3ProductMediaConfig = {
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
      cb(new Error('Only image files are allowed for product!'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB cho product images
    files: 5, // Tối đa 5 ảnh product
  },
};

// Helper function để tạo S3 URL trực tiếp
export const generateS3Url = (bucketName: string, region: string, key: string): string => {
  return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
};

// Helper function để parse S3 key từ full URL
export const parseS3Key = (s3Url: string): string | null => {
  const match = s3Url.match(/https:\/\/[^\/]+\.s3\.[^\/]+\.amazonaws\.com\/(.+)/);
  return match ? match[1] : null;
};