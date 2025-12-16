import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { ChatDto } from './dto/chat.dto';

@Injectable()
export class ChatbotService {
  private readonly COZE_API_URL = process.env.COZE_API_URL || 'https://api.coze.com/v3/chat';
  private readonly BOT_ID = process.env.COZE_BOT_ID;
  private readonly API_KEY = process.env.COZE_API_KEY;

  constructor(
    private readonly prisma: PrismaService,
    private readonly http: HttpService,
  ) {}

  async sendMessage(dto: ChatDto, userId: number) {
    if (!this.BOT_ID || !this.API_KEY) {
      throw new HttpException('Thiếu cấu hình COZE_BOT_ID hoặc COZE_API_KEY', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    let session = null as null | { id: number; user_id: number | null; coze_conversation_id: string | null; title: string | null };
    let cozeConvId: string | null = null;

    if (dto.sessionId) {
      session = await this.prisma.chatbot_sessions.findUnique({
        where: { id: dto.sessionId },
        select: { id: true, user_id: true, coze_conversation_id: true, title: true },
      });
      if (!session) throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
      if (session.user_id !== userId) throw new HttpException('Unauthorized access to session', HttpStatus.FORBIDDEN);
      cozeConvId = session.coze_conversation_id;
    } else {
      // Tạo title từ message đầu tiên (tối đa 50 ký tự)
      const autoTitle = dto.message.length > 50 ? dto.message.substring(0, 47) + '...' : dto.message;
      session = await this.prisma.chatbot_sessions.create({
        data: {
          user_id: userId,
          title: autoTitle,
        },
        select: { id: true, user_id: true, coze_conversation_id: true, title: true },
      });
    }

    // Lưu tin nhắn của user trước để audit
    await this.prisma.chatbot_messages.create({
      data: {
        session_id: session.id,
        sender: 'user',
        content: dto.message,
      },
    });

    try {
      const headers = {
        Authorization: `Bearer ${this.API_KEY}`,
        'Content-Type': 'application/json',
      };

      // BƯỚC 1: Gửi tin nhắn (Khởi tạo chat)
      const payload: any = {
        bot_id: this.BOT_ID,
        user_id: userId.toString(),
        stream: false,
        auto_save_history: true,
        additional_messages: [
          {
            role: 'user',
            content: dto.message,
            content_type: 'text',
          },
        ],
      };

      if (cozeConvId) payload.conversation_id = cozeConvId;

      const { data: initData } = await firstValueFrom(this.http.post(this.COZE_API_URL, payload, { headers }));

      if (initData?.code !== 0) {
        throw new Error(initData?.msg || 'Coze API error');
      }

      const chatId = initData?.data?.id;
      const newCozeConvId = initData?.data?.conversation_id;
      const initialStatus = initData?.data?.status;

      if (!chatId || !newCozeConvId) {
        throw new Error('Missing chat_id or conversation_id from Coze response');
      }

      // Cập nhật conversation_id vào session nếu cần
      if (newCozeConvId && newCozeConvId !== session.coze_conversation_id) {
        await this.prisma.chatbot_sessions.update({
          where: { id: session.id },
          data: { coze_conversation_id: newCozeConvId },
        });
        cozeConvId = newCozeConvId;
      }

      // BƯỚC 2: Polling - Đợi bot xử lý xong
      let status = initialStatus;
      const retrieveUrl = `https://api.coze.com/v3/chat/retrieve?chat_id=${chatId}&conversation_id=${newCozeConvId}`;
      const maxRetries = 60; // Tối đa 60 lần (60 giây)
      let retries = 0;

      while (status !== 'completed' && status !== 'failed' && retries < maxRetries) {
        await this.sleep(1000); // Đợi 1 giây
        const { data: checkData } = await firstValueFrom(this.http.get(retrieveUrl, { headers }));
        
        if (checkData?.code !== 0) {
          throw new Error(checkData?.msg || 'Polling error');
        }

        status = checkData?.data?.status;
        retries++;
      }

      if (status === 'failed') {
        const errorMsg = initData?.data?.last_error?.msg || 'Bot xử lý thất bại';
        throw new Error(errorMsg);
      }

      if (status !== 'completed') {
        throw new Error('Bot timeout - không phản hồi sau 60 giây');
      }

      // BƯỚC 3: Lấy tin nhắn trả về
      const messagesUrl = `https://api.coze.com/v3/chat/message/list?chat_id=${chatId}&conversation_id=${newCozeConvId}`;
      const { data: msgData } = await firstValueFrom(this.http.get(messagesUrl, { headers }));

      if (msgData?.code !== 0) {
        throw new Error(msgData?.msg || 'Failed to fetch messages');
      }

      // Lọc lấy câu trả lời của bot (type=answer, role=assistant)
      let botText = '...';
      const messages = msgData?.data || [];
      const answer = messages.find((m: any) => m?.type === 'answer' && m?.role === 'assistant');
      if (answer?.content) {
        botText = answer.content;
      }

      // Lưu tin nhắn bot
      await this.prisma.chatbot_messages.create({
        data: {
          session_id: session.id,
          sender: 'bot',
          content: botText,
        },
      });

      return {
        sessionId: session.id,
        cozeConversationId: cozeConvId,
        chatId: chatId,
        botResponse: botText,
      };
    } catch (err) {
      console.error('Coze API Error:', err);
      // Lưu lỗi vào message bot để debug
      await this.prisma.chatbot_messages.create({
        data: {
          session_id: session.id,
          sender: 'bot',
          content: 'Xin lỗi, hiện không thể kết nối AI.',
        },
      });
      throw new HttpException('Lỗi kết nối AI', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async listSessions(userId: number) {
    return this.prisma.chatbot_sessions.findMany({
      where: { user_id: userId },
      orderBy: { updated_at: 'desc' },
      select: { id: true, user_id: true, coze_conversation_id: true, title: true, created_at: true, updated_at: true },
    });
  }

  async getMessages(sessionId: number, userId: number) {
    const session = await this.prisma.chatbot_sessions.findUnique({ 
      where: { id: sessionId }, 
      select: { id: true, user_id: true } 
    });
    if (!session) throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
    if (session.user_id !== userId) throw new HttpException('Unauthorized access to session', HttpStatus.FORBIDDEN);
    return this.prisma.chatbot_messages.findMany({
      where: { session_id: sessionId },
      orderBy: { created_at: 'asc' },
    });
  }
}
