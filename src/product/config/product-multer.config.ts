import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';

export const brandMulterConfig = {
  storage: diskStorage({
    destination: (req, file, cb) => {
      const dir = './uploads/brands';
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, uniqueName + extname(file.originalname));
    },
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.match(/\/(jpg|jpeg|png|gif|heic|heif|webp)$/)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for brand!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, 
    files: 1, 
  },
};

export const productMediaMulterConfig = {
  storage: diskStorage({
    destination: (req, file, cb) => {
      const dir = './uploads/products';
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, uniqueName + extname(file.originalname));
    },
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.match(/\/(jpg|jpeg|png|gif|heic|heif|webp)$/)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for product media!'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB for product images
    files: 1,
  },
};
