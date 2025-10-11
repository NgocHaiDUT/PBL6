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

// Cấu hình cho avatar upload
export const s3AvatarConfig = {
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET_NAME!,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = file.originalname.split('.').pop();
      cb(null, `avatars/${uniqueSuffix}.${extension}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.match(/\/(jpg|jpeg|png|gif|heic|heif|webp)$/)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for avatar!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1,
  },
};

// Cấu hình cho logo shop upload
export const s3LogoShopConfig = {
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET_NAME!,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = file.originalname.split('.').pop();
      cb(null, `logoshops/${uniqueSuffix}.${extension}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.match(/\/(jpg|jpeg|png|gif|heic|heif|webp)$/)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for logo!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1,
  },
};

// Cấu hình cho banner shop upload
export const s3BannerShopConfig = {
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET_NAME!,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = file.originalname.split('.').pop();
      cb(null, `bannershops/${uniqueSuffix}.${extension}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.match(/\/(jpg|jpeg|png|gif|heic|heif|webp)$/)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for banner!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1,
  },
};

// Cấu hình cho create shop upload (logo + banner)
export const s3CreateShopConfig = {
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET_NAME!,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = file.originalname.split('.').pop();
      
      // Chọn thư mục dựa trên fieldname
      const folder = file.fieldname === 'logo' ? 'logoshops' : 'bannershops';
      cb(null, `${folder}/${uniqueSuffix}.${extension}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.match(/\/(jpg|jpeg|png|gif|heic|heif|webp)$/)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 2, // Tối đa 2 files (logo + banner)
  },
};

// Helper function để tạo S3 URL trực tiếp (không cần CloudFront)
export const generateS3Url = (bucketName: string, region: string, key: string): string => {
  return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
};

// Helper function để parse S3 key từ full URL
export const parseS3Key = (s3Url: string): string | null => {
  const match = s3Url.match(/https:\/\/[^\/]+\.s3\.[^\/]+\.amazonaws\.com\/(.+)/);
  return match ? match[1] : null;
};