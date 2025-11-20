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

const getStorage = (directory: string, dynamicPath: boolean = false) => {
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
        // ✅ Phân chia video/image cho S3
        const actualDirectory = dynamicPath && file.mimetype.startsWith('video/') 
          ? 'videos' 
          : directory;
        cb(null, `${actualDirectory}/${uniqueSuffix}${extension}`);
      }
    });
  } else {
    // local storage
    return diskStorage({
      destination: (req, file, cb) => {
        // ✅ Phân chia video vào uploads/videos, image vào uploads/postimages
        let localDirectory;
        if (dynamicPath && file.mimetype.startsWith('video/')) {
          localDirectory = 'uploads/videos';
        } else {
          localDirectory = `uploads/${directory}`;
        }
        createUploadDir(localDirectory);
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
const allowedMimeTypes = {
  image: /image\/(jpg|jpeg|png|gif|webp)|application\/octet-stream/, // heic/heif can be octet-stream
  video: /video\/(mp4|mov|avi|quicktime|x-matroska)/,
};

const fileValidators = {
  image: {
    filter: (req, file, cb) => {
      const isImage = allowedMimeTypes.image.test(file.mimetype) || file.originalname.match(/\.(heic|heif)$/i);
      if (isImage) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed! (.jpg, .jpeg, .png, .gif, .webp, .heic, .heif)'), false);
      }
    },
    limit: 10 * 1024 * 1024, // 10MB
  },
  video: {
    filter: (req, file, cb) => {
      if (allowedMimeTypes.video.test(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only video files are allowed! (.mp4, .mov, .avi, .mkv)'), false);
      }
    },
    limit: 50 * 1024 * 1024, // 50MB
  },
  media: {
    filter: (req, file, cb) => {
      const isImage = allowedMimeTypes.image.test(file.mimetype) || file.originalname.match(/\.(heic|heif)$/i);
      const isVideo = allowedMimeTypes.video.test(file.mimetype);
      if (isImage || isVideo) {
        cb(null, true);
      } else {
        cb(new Error('Only image or video files are allowed!'), false);
      }
    },
    limit: 50 * 1024 * 1024, // Use the larger limit for mixed media
  }
};

export const getMulterOptions = (
  directory: string,
  type: 'image' | 'video' | 'media' = 'image'
) => {
  const validator = fileValidators[type];
  if (!validator) {
    throw new Error(`Invalid type specified for getMulterOptions: ${type}`);
  }
  
  // ✅ Sử dụng dynamicPath=true cho type='media' để phân chia video/image
  const useDynamicPath = type === 'media';
  
  return {
    storage: getStorage(directory, useDynamicPath),
    fileFilter: validator.filter,
    limits: {
      fileSize: validator.limit,
    },
  };
};

