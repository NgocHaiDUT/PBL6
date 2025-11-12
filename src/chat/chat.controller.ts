import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

@Controller('chat')
export class ChatController {
  @Post('upload-media')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const mediaType = req.body.mediaType || 'files';
          let uploadPath = './uploads/chat-media';
          
          if (mediaType === 'image') {
            uploadPath = './uploads/chat-images';
          } else if (mediaType === 'video') {
            uploadPath = './uploads/chat-videos';
          }

          // Create directory if it doesn't exist
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }

          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
      },
    }),
  )
  async uploadMedia(
    @UploadedFile() file: Express.Multer.File,
    @Body('userId') userId: string,
    @Body('mediaType') mediaType: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // ✅ Trả về relative path thay vì full URL
    // Frontend sẽ tự động thêm API_BASE_URL khi hiển thị
    let mediaPath = file.path.replace(/\\/g, '/').replace('./', '');
    
    console.log('📤 [ChatController] Media uploaded:', {
      originalPath: file.path,
      relativePath: mediaPath,
      fileName: file.originalname,
      size: file.size,
    });

    return {
      success: true,
      data: {
        url: `/${mediaPath}`, // Relative path: /uploads/chat-media/...
        type: mediaType,
        fileName: file.originalname,
        fileSize: file.size,
      },
    };
  }
}
