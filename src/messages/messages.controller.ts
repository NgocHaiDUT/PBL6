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
import { AuthGuard } from '@nestjs/passport';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { QueryMessagesDto } from './dto/query-messages.dto';
import { QueryConversationsDto } from './dto/query-conversations.dto';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post('conversations')
  @UseGuards(AuthGuard('jwt'))
  createConversation(
    @Body() createConversationDto: CreateConversationDto,
    @Req() req: any,
  ) {
    return this.messagesService.createConversation(req.user.userId, createConversationDto);
  }

  @Get('conversations')
  @UseGuards(AuthGuard('jwt'))
  getUserConversations(
    @Query() queryDto: QueryConversationsDto,
    @Req() req: any,
  ) {
    return this.messagesService.getUserConversations(req.user.userId, queryDto);
  }

  @Get('conversations/:id')
  @UseGuards(AuthGuard('jwt'))
  getConversation(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    return this.messagesService.getConversationById(id, req.user.userId);
  }

  @Post('conversations/find-or-create/:otherUserId')
  @UseGuards(AuthGuard('jwt'))
  findOrCreateConversation(
    @Param('otherUserId', ParseIntPipe) otherUserId: number,
    @Req() req: any,
  ) {
    return this.messagesService.findOrCreateConversation(req.user.userId, otherUserId);
  }

  @Post('conversations/shop/:shopId')
  @UseGuards(AuthGuard('jwt'))
  findOrCreateShopConversation(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Req() req: any,
  ) {
    return this.messagesService.findOrCreateShopConversation(req.user.userId, shopId);
  }

  // Gửi tin nhắn từ user
  @Post()
  @UseGuards(AuthGuard('jwt'))
  sendMessage(
    @Body() createMessageDto: CreateMessageDto,
    @Req() req: any,
  ) {
    return this.messagesService.sendMessage(req.user.userId, createMessageDto);
  }

  // Gửi tin nhắn từ shop
  @Post('shop/:shopId')
  @UseGuards(AuthGuard('jwt'))
  sendMessageAsShop(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Body() createMessageDto: CreateMessageDto,
    @Req() req: any,
  ) {
    // Kiểm tra user có quyền quản lý shop này không sẽ được xử lý trong service
    return this.messagesService.sendMessage(req.user.userId, createMessageDto, shopId);
  }

  // Lấy danh sách conversations của shop
  @Get('shop/:shopId/conversations')
  @UseGuards(AuthGuard('jwt'))
  getShopConversations(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Query() queryDto: QueryConversationsDto,
    @Req() req: any,
  ) {
    return this.messagesService.getShopConversations(shopId, req.user.userId, queryDto);
  }

  @Get('conversations/:conversationId/messages')
  @UseGuards(AuthGuard('jwt'))
  getMessages(
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Query() queryDto: QueryMessagesDto,
    @Req() req: any,
  ) {
    return this.messagesService.getMessages(conversationId, req.user.userId, queryDto);
  }

  @Patch(':messageId/read')
  @UseGuards(AuthGuard('jwt'))
  markMessageAsRead(
    @Param('messageId', ParseIntPipe) messageId: number,
    @Req() req: any,
  ) {
    return this.messagesService.markMessageAsRead(messageId, req.user.userId);
  }

  @Patch('conversations/:conversationId/read-all')
  @UseGuards(AuthGuard('jwt'))
  markAllMessagesAsRead(
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Req() req: any,
  ) {
    return this.messagesService.markAllMessagesAsRead(conversationId, req.user.userId);
  }

  @Get('conversations/:conversationId/unread-count')
  @UseGuards(AuthGuard('jwt'))
  getUnreadCount(
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Req() req: any,
  ) {
    return this.messagesService.getUnreadMessagesCount(conversationId, req.user.userId);
  }

  @Delete(':messageId')
  @UseGuards(AuthGuard('jwt'))
  deleteMessage(
    @Param('messageId', ParseIntPipe) messageId: number,
    @Req() req: any,
  ) {
    return this.messagesService.deleteMessage(messageId, req.user.userId);
  }
}
