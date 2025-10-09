import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';

// Tạo các thư mục upload nếu chưa tồn tại
const createUploadDir = (dir: string) => {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
};

// Storage cho cover images
export const coverImageStorage = diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/postimages';
    createUploadDir(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const postId = req.params.id;
    const timestamp = Date.now();
    const ext = extname(file.originalname);
    const filename = `cover_${postId}_${timestamp}${ext}`;
    cb(null, filename);
  },
});

// Storage cho videos
export const videoStorage = diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/videos';
    createUploadDir(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const postId = req.params.id;
    const timestamp = Date.now();
    const ext = extname(file.originalname);
    const filename = `video_${postId}_${timestamp}${ext}`;
    cb(null, filename);
  },
});

// Storage cho additional media
export const mediaStorage = diskStorage({
  destination: (req, file, cb) => {
    // Phân loại theo loại file
    const uploadDir = file.mimetype.startsWith('video/') 
      ? 'uploads/videos' 
      : 'uploads/postimages';
    createUploadDir(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const postId = req.params.id;
    const timestamp = Date.now();
    const ext = extname(file.originalname);
    const prefix = file.mimetype.startsWith('video/') ? 'video' : 'image';
    const filename = `${prefix}_${postId}_${timestamp}${ext}`;
    cb(null, filename);
  },
});

// File filter
export const imageFileFilter = (req: any, file: any, cb: any) => {
  if (file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/) || file.originalname.match(/\.(heic|heif)$/i)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

export const videoFileFilter = (req: any, file: any, cb: any) => {
  if (file.mimetype.match(/\/(mp4|avi|mov|wmv|flv|webm)$/)) {
    cb(null, true);
  } else {
    cb(new Error('Only video files are allowed!'), false);
  }
};

export const mediaFileFilter = (req: any, file: any, cb: any) => {
  if (file.mimetype.match(/\/(jpg|jpeg|png|gif|webp|mp4|avi|mov|wmv|flv|webm)$/) || file.originalname.match(/\.(heic|heif)$/i)) {
    cb(null, true);
  } else {
    cb(new Error('Only image and video files are allowed!'), false);
  }
};