import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';

export const avatarMulterConfig = {
  storage: diskStorage({
    destination: (req, file, cb) => {
      const dir = './uploads/avatars';
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
      cb(new Error('Only image files are allowed for avatar!'), false);
    }
  },
  limits: {
    fileSize: 20 * 1024 * 1024, 
    files: 1, 
  },
};

export const logoshopMulterConfig = {
  storage: diskStorage({
    destination: (req, file, cb) => {
      const dir = './uploads/logoshops';
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
      cb(new Error('Only image files are allowed for avatar!'), false);
    }
  },
  limits: {
    fileSize: 20 * 1024 * 1024, 
    files: 1, 
  },
};

export const bannershopMulterConfig = {
  storage: diskStorage({
    destination: (req, file, cb) => {
      const dir = './uploads/bannershops';
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
      cb(new Error('Only image files are allowed for avatar!'), false);
    }
  },
  limits: {
    fileSize: 20 * 1024 * 1024, 
    files: 1, 
  },
};
