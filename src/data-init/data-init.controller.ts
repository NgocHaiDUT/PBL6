import { Controller, Post, Get } from '@nestjs/common';
import { S3UploadService } from './s3-upload.service';
import { DataInitService } from './data-init.service';

@Controller('data-init')
export class DataInitController {
  constructor(
    private readonly s3UploadService: S3UploadService,
    private readonly dataInitService: DataInitService,
  ) {}

  // ============ S3 Upload APIs ============

  @Post('upload-all-images')
  async uploadAllImages() {
    try {
      await this.dataInitService.uploadAllImagesToS3();
      return {
        success: true,
        message: 'All images uploaded to S3 successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to upload images',
        error: error.message,
      };
    }
  }

  @Post('upload-brand-logos')
  async uploadBrandLogos() {
    try {
      const urlMap = await this.s3UploadService.uploadBrandLogos();
      return {
        success: true,
        message: 'Brand logos uploaded to S3 successfully',
        count: urlMap.size,
        files: Array.from(urlMap.keys()),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to upload brand logos',
        error: error.message,
      };
    }
  }

  @Post('upload-products')
  async uploadProductImages() {
    try {
      const urlMap = await this.s3UploadService.uploadProductImages();
      return {
        success: true,
        message: 'Product images uploaded to S3 successfully',
        count: urlMap.size,
        files: Array.from(urlMap.keys()),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to upload product images',
        error: error.message,
      };
    }
  }

  @Post('upload-avatars')
  async uploadAvatars() {
    try {
      const urlMap = await this.s3UploadService.uploadAvatars();
      return {
        success: true,
        message: 'Avatars uploaded to S3 successfully',
        count: urlMap.size,
        files: Array.from(urlMap.keys()),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to upload avatars',
        error: error.message,
      };
    }
  }

  @Post('upload-shop-logos')
  async uploadShopLogos() {
    try {
      const urlMap = await this.s3UploadService.uploadShopLogos();
      return {
        success: true,
        message: 'Shop logos uploaded to S3 successfully',
        count: urlMap.size,
        files: Array.from(urlMap.keys()),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to upload shop logos',
        error: error.message,
      };
    }
  }

  @Post('upload-shop-banners')
  async uploadShopBanners() {
    try {
      const urlMap = await this.s3UploadService.uploadShopBanners();
      return {
        success: true,
        message: 'Shop banners uploaded to S3 successfully',
        count: urlMap.size,
        files: Array.from(urlMap.keys()),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to upload shop banners',
        error: error.message,
      };
    }
  }

  @Post('upload-post-images')
  async uploadPostImages() {
    try {
      const urlMap = await this.s3UploadService.uploadPostImages();
      return {
        success: true,
        message: 'Post images uploaded to S3 successfully',
        count: urlMap.size,
        files: Array.from(urlMap.keys()),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to upload post images',
        error: error.message,
      };
    }
  }

  @Get('upload-status')
  async checkUploadStatus() {
    return {
      message: 'Use POST endpoints to upload images to S3',
      endpoints: {
        all: '/data-init/upload-all-images',
        brands: '/data-init/upload-brand-logos',
        products: '/data-init/upload-products',
        avatars: '/data-init/upload-avatars',
        shopLogos: '/data-init/upload-shop-logos',
        shopBanners: '/data-init/upload-shop-banners',
        postImages: '/data-init/upload-post-images',
      },
    };
  }

  // ============ APIs cho data có foreign key dependencies ============
  
  @Post('shop-staffs')
  async seedShopStaffs() {
    return await this.dataInitService.seedShopStaffs();
  }

  @Post('carts')
  async seedCarts() {
    return await this.dataInitService.seedCarts();
  }

  @Post('cart-items')
  async seedCartItems() {
    return await this.dataInitService.seedCartItems();
  }

  @Post('addresses')
  async seedAddresses() {
    return await this.dataInitService.seedAddresses();
  }

  @Post('shop-addresses')
  async seedShopAddresses() {
    return await this.dataInitService.seedShopAddresses();
  }

  @Post('orders')
  async seedOrders() {
    return await this.dataInitService.seedOrders();
  }
}
