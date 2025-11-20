// src/makeup/makeup.controller.ts
import { Controller, Post, UseInterceptors, UploadedFile, Body, Res, HttpException, HttpStatus, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { MakeupService } from './makeup.service';
import { CreateTryonSessionDto, CreateTryonItemDto } from './dto';
import express from 'express';

@Controller('makeup')
export class MakeupController {
  constructor(private readonly makeupService: MakeupService) {}

  /**
   * API tạo tryon_session - trả về session_id
   * POST /makeup/session
   */
  @Post('session')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async createSession(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateTryonSessionDto,
    @Req() req: any,
  ) {
    // Lấy user_id từ request nếu có authentication
    const userId = req.user?.id || null;

    // Nếu có file upload, lưu URL của file (hoặc upload lên S3/storage)
    let inputImageUrl = dto.input_image_url;
    
    if (file) {
      // TODO: Upload file to S3 hoặc lưu local và trả về URL
      // Ví dụ: inputImageUrl = await this.uploadFile(file);
      inputImageUrl = `/uploads/tryon/${Date.now()}_${file.originalname}`;
    }

    const result = await this.makeupService.createTryonSession(userId, dto, inputImageUrl);
    
    return {
      success: true,
      data: result,
    };
  }

  /**
   * API tạo tryon_item cho một session
   * POST /makeup/item
   */
  @Post('item')
  async createItem(@Body() dto: CreateTryonItemDto) {
    const result = await this.makeupService.createTryonItem(dto);
    
    return {
      success: true,
      data: result,
    };
  }

  /**
   * API gọi makeup service (legacy/utility endpoint)
   * POST /makeup/apply
   */
  @Post('apply')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async applyMakeup(@UploadedFile() file: Express.Multer.File, @Res() res: express.Response) {
    if (!file || !file.buffer) {
      throw new HttpException('No file provided', HttpStatus.BAD_REQUEST);
    }

    try {
      // gọi service để chuyển file tới FastAPI
      const resultBuffer = await this.makeupService.callPythonMakeup(file.buffer, file.originalname, file.mimetype);

      // trả về cho client (image/jpeg)
      res.setHeader('Content-Type', 'image/jpeg');
      return res.send(resultBuffer);
    } catch (err) {
      throw new HttpException(err.message || 'Makeup failed', HttpStatus.BAD_GATEWAY);
    }
  }
}
