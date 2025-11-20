import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';

// Tạo các thư mục upload nếu chưa tồn tại
const createUploadDir = (dir: string) => {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
};

// Storage cho brand logos
export const localBrandConfig = {
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

// Storage cho product images
export const localProductConfig = {
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

// Helper function để generate URL
export const generateProductImageUrl = (filename: string): string => {
  return `/uploads/products/${filename}`;
};

export const generateBrandImageUrl = (filename: string): string => {
  return `/uploads/brands/${filename}`;
};