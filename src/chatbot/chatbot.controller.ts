import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ChatbotService } from './chatbot.service';
import { ChatDto } from './dto/chat.dto';

@ApiTags('Chatbot')
@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbot: ChatbotService) {}

  @Post('send')
  @HttpCode(200)
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Gửi tin nhắn tới Coze bot (yêu cầu JWT)' })
  @ApiResponse({ status: 200, description: 'Trả lời từ bot' })
  async send(@Body() dto: ChatDto, @Req() req: any) {
    const userId = req?.user?.userId || req?.user?.sub;
    const result = await this.chatbot.sendMessage(dto, userId);
    return { success: true, data: result };
  }

  @Get('sessions')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Danh sách phiên chatbot của user hiện tại' })
  async sessions(@Req() req: any) {
    const userId = req?.user?.userId || req?.user?.sub;
    const data = await this.chatbot.listSessions(userId);
    return { success: true, data };
  }

  @Get('sessions/:id/messages')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Lấy danh sách tin nhắn của một phiên' })
  async messages(@Param('id') id: string, @Req() req: any) {
    const sessionId = parseInt(id, 10);
    const userId = req?.user?.userId || req?.user?.sub;
    const data = await this.chatbot.getMessages(sessionId, userId);
    return { success: true, data };
  }
}
