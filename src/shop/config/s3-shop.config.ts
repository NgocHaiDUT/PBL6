import { getMulterOptions, getFileUrl } from '../../config/storage.config';

// Shop logo upload config (supports both S3 and local)
export const shopLogoConfig = getMulterOptions('logoshops', 'image');

// Shop cover upload config (supports both S3 and local)
export const shopCoverConfig = getMulterOptions('bannershops', 'image');

// Helper function to get shop image URL
export const getShopLogoUrl = (file: Express.Multer.File): string => {
  return getFileUrl(file, 'logoshops');
};

export const getShopCoverUrl = (file: Express.Multer.File): string => {
  return getFileUrl(file, 'bannershops');
};
