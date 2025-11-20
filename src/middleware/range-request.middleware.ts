import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Middleware để xử lý HTTP Range Requests cho video streaming
 * iOS yêu cầu điều này để phát video
 */
@Injectable()
export class RangeRequestMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Chỉ xử lý requests đến /uploads/videos/
    if (!req.url.startsWith('/uploads/videos/') && !req.url.includes('.mp4') && !req.url.includes('.mov')) {
      return next();
    }

    const range = req.headers.range;
    
    // Nếu không có Range header, serve file bình thường
    if (!range) {
      return next();
    }

    // Lấy đường dẫn file từ URL
    const filePath = path.join(process.cwd(), req.url);
    
    // Kiểm tra file có tồn tại không
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File not found');
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;

    // Parse Range header: "bytes=0-1023"
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;

    // Validate range
    if (start >= fileSize || end >= fileSize) {
      res.status(416).set({
        'Content-Range': `bytes */${fileSize}`
      });
      return res.end();
    }

    // Create read stream for the requested range
    const file = fs.createReadStream(filePath, { start, end });

    // Set proper headers for partial content (HTTP 206)
    res.status(206).set({
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize.toString(),
      'Content-Type': req.url.endsWith('.mp4') ? 'video/mp4' : 'video/quicktime',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length',
    });

    // Stream video chunk
    file.pipe(res);
  }
}
