import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class S3UploadService {
  private readonly logger = new Logger(S3UploadService.name);
  private s3Client: S3Client;

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'ap-southeast-7',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }

  /**
   * Upload một file từ local lên S3
   * @param localPath - Đường dẫn file local (tương đối từ thư mục uploads)
   * @param s3Key - Key của file trên S3 (vd: brands/logo.png)
   * @returns S3 URL của file đã upload
   */
  async uploadFile(localPath: string, s3Key: string): Promise<string | null> {
    try {
      const fullLocalPath = path.join(process.cwd(), 'uploads', localPath);

      if (!fs.existsSync(fullLocalPath)) {
        this.logger.warn(`File không tồn tại: ${fullLocalPath}`);
        return null;
      }

      const fileContent = fs.readFileSync(fullLocalPath);
      const ext = path.extname(localPath).toLowerCase();
      
      let contentType = 'application/octet-stream';
      if (['.jpg', '.jpeg'].includes(ext)) contentType = 'image/jpeg';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.gif') contentType = 'image/gif';
      else if (ext === '.webp') contentType = 'image/webp';
      else if (ext === '.mp4') contentType = 'video/mp4';

      const uploadParams = {
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: s3Key,
        Body: fileContent,
        ContentType: contentType,
      };

      await this.s3Client.send(new PutObjectCommand(uploadParams));
      const s3Url = this.generateS3Url(s3Key);
      
      return s3Url;
    } catch (error) {
      this.logger.error(`❌ Lỗi upload ${localPath}:`, error);
      return null;
    }
  }

  /**
   * Upload tất cả file trong một thư mục lên S3
   * @param folderName - Tên thư mục trong uploads (vd: brands, products)
   * @returns Map<fileName, s3Url>
   */
  async uploadFolder(folderName: string): Promise<Map<string, string>> {
    this.logger.log(`Bắt đầu upload thư mục ${folderName} lên S3...`);
    const resultMap = new Map<string, string>();
    
    const folderPath = path.join(process.cwd(), 'uploads', folderName);
    
    if (!fs.existsSync(folderPath)) {
      this.logger.warn(`Thư mục không tồn tại: ${folderPath}`);
      return resultMap;
    }

    const files = fs.readdirSync(folderPath);
    
    for (const file of files) {
      const localPath = path.join(folderName, file);
      const s3Key = `${folderName}/${file}`;
      const s3Url = await this.uploadFile(localPath, s3Key);
      
      if (s3Url) {
        resultMap.set(file, s3Url);
        this.logger.log(`✅ Uploaded: ${file} -> ${s3Url}`);
      }
    }

    this.logger.log(`Hoàn thành upload ${resultMap.size}/${files.length} files từ ${folderName}!`);
    return resultMap;
  }

  /**
   * Upload tất cả ảnh brand logos
   */
  async uploadBrandLogos(): Promise<Map<string, string>> {
    return this.uploadFolder('brands');
  }

  /**
   * Upload tất cả ảnh products
   */
  async uploadProductImages(): Promise<Map<string, string>> {
    return this.uploadFolder('products');
  }

  /**
   * Upload tất cả ảnh avatars
   */
  async uploadAvatars(): Promise<Map<string, string>> {
    return this.uploadFolder('avatars');
  }

  /**
   * Upload tất cả ảnh logo shops
   */
  async uploadShopLogos(): Promise<Map<string, string>> {
    return this.uploadFolder('logoshops');
  }

  /**
   * Upload tất cả ảnh banner shops
   */
  async uploadShopBanners(): Promise<Map<string, string>> {
    return this.uploadFolder('bannershops');
  }

  /**
   * Upload tất cả ảnh post images
   */
  async uploadPostImages(): Promise<Map<string, string>> {
    return this.uploadFolder('postimages');
  }

  /**
   * Tạo S3 URL từ key
   */
  generateS3Url(key: string): string {
    const bucketName = process.env.AWS_S3_BUCKET_NAME!;
    const region = process.env.AWS_REGION || 'ap-southeast-7';
    return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
  }

  /**
   * Convert đường dẫn local sang S3 URL
   * Vd: /uploads/brands/logo.png -> https://bucket.s3.region.amazonaws.com/brands/logo.png
   */
  convertLocalPathToS3Url(localPath: string, urlMap: Map<string, string>): string | null {
    // Extract filename from path
    const fileName = path.basename(localPath);
    return urlMap.get(fileName) || null;
  }
}
