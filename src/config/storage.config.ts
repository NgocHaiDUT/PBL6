import { S3Client } from '@aws-sdk/client-s3';
import { diskStorage } from 'multer';
import multerS3 from 'multer-s3';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';

const storageDriver = process.env.STORAGE_DRIVER || 'local';

// S3 client setup (only if using S3)
let s3;
if (storageDriver === 's3') {
  s3 = new S3Client({
    region: process.env.AWS_REGION,
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

const getStorage = (directory: string) => {
  if (storageDriver === 's3') {
    return multerS3({
      s3: s3,
      bucket: process.env.AWS_S3_BUCKET_NAME!,
      metadata: function (req, file, cb) {
        cb(null, { fieldName: file.fieldname });
      },
      key: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = extname(file.originalname);
        cb(null, `${directory}/${uniqueSuffix}${extension}`);
      }
    });
  } else {
    // local storage
    const localDirectory = `uploads/${directory}`;
    createUploadDir(localDirectory);
    return diskStorage({
      destination: (req, file, cb) => {
        cb(null, localDirectory);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = extname(file.originalname);
        cb(null, `${uniqueSuffix}${extension}`);
      },
    });
  }
};

// Unified Multer Options
export const getMulterOptions = (directory: string) => ({
  storage: getStorage(directory),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/) || file.originalname.match(/\.(heic|heif)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});
