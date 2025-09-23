import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UseGuards,
  Req,
  Patch,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { QueryMessagesDto } from './dto/query-messages.dto';
import { QueryConversationsDto } from './dto/query-conversations.dto';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  // Tạo cuộc hội thoại mới
  @Post('conversations')
  // @UseGuards(JwtAuthGuard) // Uncomment khi có auth guard
  createConversation(
    @Body() createConversationDto: CreateConversationDto,
    @Req() req: any,
  ) {
    // const userId = req.user.id; // Lấy từ JWT token
    const userId = 1; // Mock user ID for now
    return this.messagesService.createConversation(userId, createConversationDto);
  }

  // Lấy danh sách cuộc hội thoại của user
  @Get('conversations')
  // @UseGuards(JwtAuthGuard) // Uncomment khi có auth guard
  getUserConversations(
    @Query() queryDto: QueryConversationsDto,
    @Req() req: any,
  ) {
    // const userId = req.user.id; // Lấy từ JWT token
    const userId = 1; // Mock user ID for now
    return this.messagesService.getUserConversations(userId, queryDto);
  }

  // Lấy chi tiết cuộc hội thoại
  @Get('conversations/:id')
  // @UseGuards(JwtAuthGuard) // Uncomment khi có auth guard
  getConversation(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    // const userId = req.user.id; // Lấy từ JWT token
    const userId = 1; // Mock user ID for now
    return this.messagesService.getConversationById(id, userId);
  }

  // Tìm hoặc tạo cuộc hội thoại với user khác
  @Post('conversations/find-or-create/:otherUserId')
  // @UseGuards(JwtAuthGuard) // Uncomment khi có auth guard
  findOrCreateConversation(
    @Param('otherUserId', ParseIntPipe) otherUserId: number,
    @Req() req: any,
  ) {
    // const userId = req.user.id; // Lấy từ JWT token
    const userId = 1; // Mock user ID for now
    return this.messagesService.findOrCreateConversation(userId, otherUserId);
  }

  // Gửi tin nhắn
  @Post()
  // @UseGuards(JwtAuthGuard) // Uncomment khi có auth guard
  sendMessage(
    @Body() createMessageDto: CreateMessageDto,
    @Req() req: any,
  ) {
    // const userId = req.user.id; // Lấy từ JWT token
    const userId = 1; // Mock user ID for now
    return this.messagesService.sendMessage(userId, createMessageDto);
  }

  // Lấy tin nhắn trong cuộc hội thoại
  @Get('conversations/:conversationId/messages')
  // @UseGuards(JwtAuthGuard) // Uncomment khi có auth guard
  getMessages(
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Query() queryDto: QueryMessagesDto,
    @Req() req: any,
  ) {
    // const userId = req.user.id; // Lấy từ JWT token
    const userId = 1; // Mock user ID for now
    return this.messagesService.getMessages(conversationId, userId, queryDto);
  }

  // Đánh dấu tin nhắn là đã đọc
  @Patch(':messageId/read')
  // @UseGuards(JwtAuthGuard) // Uncomment khi có auth guard
  markMessageAsRead(
    @Param('messageId', ParseIntPipe) messageId: number,
    @Req() req: any,
  ) {
    // const userId = req.user.id; // Lấy từ JWT token
    const userId = 1; // Mock user ID for now
    return this.messagesService.markMessageAsRead(messageId, userId);
  }

  // Đánh dấu tất cả tin nhắn trong conversation là đã đọc
  @Patch('conversations/:conversationId/read-all')
  // @UseGuards(JwtAuthGuard) // Uncomment khi có auth guard
  markAllMessagesAsRead(
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Req() req: any,
  ) {
    // const userId = req.user.id; // Lấy từ JWT token
    const userId = 1; // Mock user ID for now
    return this.messagesService.markAllMessagesAsRead(conversationId, userId);
  }

  // Đếm số tin nhắn chưa đọc trong conversation
  @Get('conversations/:conversationId/unread-count')
  // @UseGuards(JwtAuthGuard) // Uncomment khi có auth guard
  getUnreadCount(
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Req() req: any,
  ) {
    // const userId = req.user.id; // Lấy từ JWT token
    const userId = 1; // Mock user ID for now
    return this.messagesService.getUnreadMessagesCount(conversationId, userId);
  }

  // Xóa tin nhắn
  @Delete(':messageId')
  // @UseGuards(JwtAuthGuard) // Uncomment khi có auth guard
  deleteMessage(
    @Param('messageId', ParseIntPipe) messageId: number,
    @Req() req: any,
  ) {
    // const userId = req.user.id; // Lấy từ JWT token
    const userId = 1; // Mock user ID for now
    return this.messagesService.deleteMessage(messageId, userId);
  }
}
