// src/makeup/makeup.service.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import FormData from 'form-data';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTryonSessionDto, CreateTryonItemDto } from './dto';

@Injectable()
export class MakeupService {
  private readonly makeupUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
  ) {
    this.makeupUrl = process.env.MAKEUP_SERVICE_URL ?? 'http://127.0.0.1:9000/makeup/'; // config via env
  }

  /**
   * Tạo tryon_session và trả về ID của session
   */
  async createTryonSession(userId: number | null, dto: CreateTryonSessionDto, inputImageUrl?: string) {
    const session = await this.prisma.tryon_sessions.create({
      data: {
        user_id: userId,
        device: dto.device,
        input_type: dto.input_type,
        input_image_url: inputImageUrl || dto.input_image_url,
      },
    });

    return {
      session_id: session.id,
    };
  }

  /**
   * Tạo tryon_item cho một session
   */
  async createTryonItem(dto: CreateTryonItemDto) {
    // Kiểm tra session có tồn tại không
    const session = await this.prisma.tryon_sessions.findUnique({
      where: { id: dto.session_id },
    });

    if (!session) {
      throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
    }

    const tryonItem = await this.prisma.tryon_items.create({
      data: {
        session_id: dto.session_id,
        product_id: dto.product_id,
        variant_id: dto.variant_id,
        type: dto.type,
        params_json: dto.params_json ? JSON.stringify(dto.params_json) : null,
      },
    });

    return tryonItem;
  }

  /**
   * Gọi service makeup của Python để xử lý ảnh
   */
  async callPythonMakeup(fileBuffer: Buffer, filename: string, mimetype: string): Promise<Buffer> {
    const form = new FormData();
    // append buffer — FormData accepts buffer + options
    form.append('file', fileBuffer, { filename: filename, contentType: mimetype });

    const headers = form.getHeaders();
    try {
      const resp$ = this.httpService.post(this.makeupUrl, form, {
        headers: headers,
        responseType: 'arraybuffer' as const, // important: get binary data
        timeout: 60000,
      });

      const resp = await lastValueFrom(resp$);
      if (resp.status !== 200) {
        throw new HttpException('Makeup service returned non-200', HttpStatus.BAD_GATEWAY);
      }

      // resp.data is ArrayBuffer / Buffer-like — convert to Buffer
      return Buffer.from(resp.data);
    } catch (err) {
      // cải thiện log / lỗi tuỳ bạn
      throw new HttpException(`Failed to call makeup service: ${err?.message ?? err}`, HttpStatus.BAD_GATEWAY);
    }
  }
}
