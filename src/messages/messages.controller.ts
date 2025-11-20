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
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { QueryMessagesDto } from './dto/query-messages.dto';
import { QueryConversationsDto } from './dto/query-conversations.dto';
import { getMulterOptions } from '../config/storage.config';

@Controller('messages')
@UseGuards(AuthGuard('jwt')) // ✅ Require JWT for all endpoints
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  // Tạo cuộc hội thoại mới
  @Post('conversations')
  createConversation(
    @Body() createConversationDto: CreateConversationDto,
    @Req() req: any,
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.messagesService.createConversation(userId, createConversationDto);
  }

  // Lấy danh sách cuộc hội thoại của user
  @Get('conversations')
  getUserConversations(
    @Query() queryDto: QueryConversationsDto,
    @Req() req: any,
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.messagesService.getUserConversations(userId, queryDto);
  }

  // Lấy chi tiết cuộc hội thoại
  @Get('conversations/:id')
  getConversation(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.messagesService.getConversationById(id, userId);
  }

  // Tìm hoặc tạo cuộc hội thoại với user khác
  @Post('conversations/find-or-create/:otherUserId')
  async findOrCreateConversation(
    @Param('otherUserId', ParseIntPipe) otherUserId: number,
    @Req() req: any,
  ) {
    const userId = req.user?.sub || req.user?.userId;
    console.log('📞 [findOrCreateConversation] userId from JWT:', userId);
    console.log('📞 [findOrCreateConversation] otherUserId from param:', otherUserId);
    
    if (!userId || !otherUserId) {
      throw new Error('Missing userId or otherUserId');
    }
    
    return this.messagesService.findOrCreateConversation(userId, otherUserId);
  }

  // Gửi tin nhắn
  @Post()
  sendMessage(
    @Body() createMessageDto: CreateMessageDto,
    @Req() req: any,
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.messagesService.sendMessage(userId, createMessageDto);
  }

  // Lấy tin nhắn trong cuộc hội thoại
  @Get('conversations/:conversationId/messages')
  getMessages(
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Query() queryDto: QueryMessagesDto,
    @Req() req: any,
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.messagesService.getMessages(conversationId, userId, queryDto);
  }

  // Đánh dấu tin nhắn là đã đọc
  @Patch(':messageId/read')
  markMessageAsRead(
    @Param('messageId', ParseIntPipe) messageId: number,
    @Req() req: any,
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.messagesService.markMessageAsRead(messageId, userId);
  }

  // Đánh dấu tất cả tin nhắn trong conversation là đã đọc
  @Patch('conversations/:conversationId/read-all')
  markAllMessagesAsRead(
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Req() req: any,
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.messagesService.markAllMessagesAsRead(conversationId, userId);
  }

  // Đếm số tin nhắn chưa đọc trong conversation
  @Get('conversations/:conversationId/unread-count')
  getUnreadCount(
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Req() req: any,
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.messagesService.getUnreadMessagesCount(conversationId, userId);
  }

  // Xóa tin nhắn
  @Delete(':messageId')
  deleteMessage(
    @Param('messageId', ParseIntPipe) messageId: number,
    @Req() req: any,
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.messagesService.deleteMessage(messageId, userId);
  }

  // ✅ Upload media files for chat messages
  // Note: Using type 'image' instead of 'media' to prevent dynamicPath (all files go to chat-media folder)
  @Post('upload-media')
  @UseInterceptors(FilesInterceptor('files', 10, {
    ...getMulterOptions('chat-media', 'image'),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for videos
    fileFilter: (req, file, cb) => {
      // Accept both images and videos
      const isImage = /image\/(jpg|jpeg|png|gif|webp)|application\/octet-stream/.test(file.mimetype) || 
                      file.originalname.match(/\.(heic|heif)$/i);
      const isVideo = /video\/(mp4|mov|avi|quicktime|x-matroska)/.test(file.mimetype);
      if (isImage || isVideo) {
        cb(null, true);
      } else {
        cb(new Error('Only image or video files are allowed!'), false);
      }
    },
  }))
  async uploadMessageMedia(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Req() req: any,
  ) {
    try {
      console.log('📤 [uploadMessageMedia] Received files:', files?.length || 0);
      console.log('📤 [uploadMessageMedia] Request headers:', req.headers);
      console.log('📤 [uploadMessageMedia] Request body:', req.body);
      
      if (!files || files.length === 0) {
        console.error('❌ [uploadMessageMedia] No files received');
        throw new BadRequestException('No files uploaded');
      }

      const userId = req.user?.sub || req.user?.userId;
      console.log('📤 [uploadMessageMedia] User ID:', userId);

      // Format uploaded files info
      const uploadedFiles = files.map((file) => {
        console.log('📎 Processing file:', {
          originalname: file.originalname,
          mimetype: file.mimetype,
          filename: file.filename,
          size: file.size,
          path: file.path,
        });

        const mediaType = file.mimetype.startsWith('image/') 
          ? 'image' 
          : file.mimetype.startsWith('video/') 
          ? 'video' 
          : 'file';

        // ✅ All chat media files are stored in /uploads/chat-media/
        const urlPath = `/uploads/chat-media/${file.filename}`;

        return {
          url: urlPath,
          type: mediaType,
          fileName: file.originalname,
          fileSize: file.size,
        };
      });

      console.log('✅ [uploadMessageMedia] Upload successful:', uploadedFiles);

      return {
        success: true,
        data: uploadedFiles,
      };
    } catch (error) {
      console.error('❌ [uploadMessageMedia] Error:', error);
      console.error('❌ [uploadMessageMedia] Error stack:', error.stack);
      throw new BadRequestException('Failed to upload media files');
    }
  }
}
