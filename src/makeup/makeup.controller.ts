// src/makeup/makeup.controller.ts
import { Controller, Post, UseInterceptors, UploadedFile, Res, HttpException, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { MakeupService } from './makeup.service';
import express from 'express';

@Controller('makeup')
export class MakeupController {
  constructor(private readonly makeupService: MakeupService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(), // giữ file trong memory => file.buffer có sẵn
      limits: { fileSize: 5 * 1024 * 1024 }, // giới hạn 5MB (tùy chỉnh)
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
