// src/makeup/makeup.service.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import FormData from 'form-data';

@Injectable()
export class MakeupService {
  private readonly makeupUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.makeupUrl = process.env.MAKEUP_SERVICE_URL ?? 'http://127.0.0.1:9000/makeup/'; // config via env
  }

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
