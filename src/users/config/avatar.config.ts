import { S3Client } from '@aws-sdk/client-s3';
import multerS3 from 'multer-s3';

// Validate S3 credentials
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_S3_BUCKET_NAME) {
  throw new Error(
    'Missing AWS S3 configuration. Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET_NAME in your .env file'
  );
}

// S3 Client
const s3 = new S3Client({
  region: process.env.AWS_REGION || 'ap-southeast-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Avatar upload config - S3 only
export const avatarConfig = {
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET_NAME!,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const extension = file.originalname.split('.').pop();
      cb(null, `avatars/${uniqueSuffix}.${extension}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.match(/\/(jpg|jpeg|png|gif|heic|heif|webp)$/)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          'Only image files (JPG, PNG, GIF, HEIC, HEIF, WebP) are allowed!',
        ),
        false,
      );
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
};

// Helper để tạo avatar URL từ S3
export const generateAvatarUrl = (file: any): string => {
  // S3: sử dụng location hoặc tạo URL từ key
  return (
    file.location ||
    `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${file.key}`
  );
};
