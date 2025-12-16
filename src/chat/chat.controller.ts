import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { getMulterOptions, getFileUrl } from '../config/storage.config';

@Controller('chat')
export class ChatController {
  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', getMulterOptions('chat_media', 'media')),
  )
  uploadFile(@UploadedFile() file: any) {
    const fileUrl = getFileUrl(file, 'chat_media');
    return {
      success: true,
      message: 'File uploaded successfully',
      data: {
        url: fileUrl,
        mimetype: file.mimetype,
        size: file.size,
      },
    };
  }
}
