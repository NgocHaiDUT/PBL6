import { Controller, Post, Get } from '@nestjs/common';
import { S3UploadService } from './s3-upload.service';
import { DataInitService } from './data-init.service';

@Controller('data-init')
export class DataInitController {
  constructor(
    private readonly s3UploadService: S3UploadService,
    private readonly dataInitService: DataInitService,
  ) {}

  @Post('upload-brand-logos')
  async uploadBrandLogos() {
    try {
      await this.s3UploadService.uploadBrandLogosToS3();
      return {
        success: true,
        message: 'Brand logos uploaded to S3 successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to upload brand logos',
        error: error.message,
      };
    }
  }

  @Get('brand-logos-status')
  async checkBrandLogosStatus() {
    // Có thể thêm logic kiểm tra xem logos đã được upload chưa
    return {
      message:
        'Use POST /data-init/upload-brand-logos to upload brand logos to S3',
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
