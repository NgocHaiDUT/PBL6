import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

// Ensure upload directories exist
const uploadsDir = join(process.cwd(), 'uploads');
const avatarsDir = join(uploadsDir, 'avatars');
const bannersDir = join(uploadsDir, 'bannershops');
const logosDir = join(uploadsDir, 'logoshops');

if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}
if (!existsSync(avatarsDir)) {
  mkdirSync(avatarsDir, { recursive: true });
}
if (!existsSync(bannersDir)) {
  mkdirSync(bannersDir, { recursive: true });
}
if (!existsSync(logosDir)) {
  mkdirSync(logosDir, { recursive: true });
}

// Cấu hình cho avatar upload
export const localAvatarConfig = {
  storage: diskStorage({
    destination: (req, file, cb) => {
      cb(null, avatarsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = extname(file.originalname);
      cb(null, `${uniqueSuffix}${extension}`);
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
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
};

// Cấu hình cho banner upload
export const localBannerConfig = {
  storage: diskStorage({
    destination: (req, file, cb) => {
      cb(null, bannersDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = extname(file.originalname);
      cb(null, `banner-${uniqueSuffix}${extension}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
};

// Cấu hình cho logo upload
export const localLogoConfig = {
  storage: diskStorage({
    destination: (req, file, cb) => {
      cb(null, logosDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = extname(file.originalname);
      cb(null, `logo-${uniqueSuffix}${extension}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
};

// Helper function để tạo URL từ file path
export const getFileUrl = (filename: string, type: 'avatars' | 'bannershops' | 'logoshops' = 'avatars') => {
  if (!filename) return null;
  
  // Nếu đã là full URL, return as is
  if (filename.startsWith('http')) return filename;
  
  // Nếu đã có /uploads prefix, return as is
  if (filename.startsWith('/uploads')) return filename;
  
  // Tạo URL path
  return `/uploads/${type}/${filename}`;
};