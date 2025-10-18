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

    async uploadBrandLogosToS3(): Promise<void> {
        this.logger.log('Bắt đầu upload brand logos lên S3...');

        const brandLogos = [
            'loreal.png', 'estee-lauder.png', 'mac-cosmetics.png', 'maybelline.png',
            'lancome.png', 'clinique.png', 'dior-beauty.png', 'chanel.png',
            'nars-cosmetics.png', 'urban-decay.png', 'benefit-cosmetics.png',
            'shiseido.png', 'ysl-beauty.png', 'fenty-beauty.png', 'huda-beauty.png',
            'too-faced.png', 'sephora-collection.png', 'kylie-cosmetics.png',
            'glossier.png', 'pat-mcgrath-labs.png', 'bobbi-brown.png', 'kiehls.png',
            'the-body-shop.png', 'nyx-professional-makeup.png', 'revlon.png',
            'clarins.png', 'giorgio-armani-beauty.png', 'givenchy-beauty.png',
            'charlotte-tilbury.png', 'bareminerals.png'
        ];

        for (const logoFile of brandLogos) {
            try {
                const localFilePath = path.join(process.cwd(), 'uploads', 'brands', logoFile);
                
                // Check if file exists locally
                if (!fs.existsSync(localFilePath)) {
                    this.logger.warn(`File không tồn tại: ${localFilePath}`);
                    continue;
                }

                // Read file
                const fileContent = fs.readFileSync(localFilePath);
                
                // Upload to S3
                const uploadParams = {
                    Bucket: process.env.AWS_S3_BUCKET_NAME!,
                    Key: `brands/${logoFile}`,
                    Body: fileContent,
                    ContentType: 'image/png',
                };

                await this.s3Client.send(new PutObjectCommand(uploadParams));
                this.logger.log(`✅ Uploaded: ${logoFile}`);

            } catch (error) {
                this.logger.error(`❌ Lỗi upload ${logoFile}:`, error);
            }
        }

        this.logger.log('Hoàn thành upload brand logos lên S3!');
    }

    generateS3Url(key: string): string {
        const bucketName = process.env.AWS_S3_BUCKET_NAME!;
        const region = process.env.AWS_REGION || 'ap-southeast-7';
        return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
    }
}