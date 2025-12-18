import { Body, Controller, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ChatbotService } from './chatbot.service';
import { ChatDto } from './dto/chat.dto';

@ApiTags('Chatbot')
@ApiBearerAuth('JWT-auth')
@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbot: ChatbotService) { }

  @Post('send')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Gửi tin nhắn tới Coze bot (yêu cầu JWT)' })
  @ApiResponse({ status: 200, description: 'Trả lời từ bot' })
  async send(@Body() dto: ChatDto, @Req() req: any) {
    const userId = req?.user?.userId || req?.user?.sub;
    const result = await this.chatbot.sendMessage(dto, userId);
    return { success: true, data: result };
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Danh sách phiên chatbot của user hiện tại' })
  async sessions(@Req() req: any) {
    try {
      const userId = req?.user?.userId || req?.user?.sub || req?.user?.id;

      if (!userId) {
        console.error('❌ [Chatbot Sessions] No userId found in request');
        throw new Error('User ID not found in token');
      }
      const data = await this.chatbot.listSessions(userId);
      return { success: true, data };
    } catch (error) {
      console.error('❌ [Chatbot Sessions] Error:', error);
      throw error;
    }
  }

  @Get('sessions/:id/messages')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Lấy danh sách tin nhắn của một phiên' })
  async messages(@Param('id') id: string, @Req() req: any) {
    const sessionId = parseInt(id, 10);
    const userId = req?.user?.userId || req?.user?.sub;
    const data = await this.chatbot.getMessages(sessionId, userId);
    return { success: true, data };
  }
}
