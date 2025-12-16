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
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FilesInterceptor } from '@nestjs/platform-express';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { QueryMessagesDto } from './dto/query-messages.dto';
import { QueryConversationsDto } from './dto/query-conversations.dto';
import { getMulterOptions } from '../config/storage.config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('messages')
@UseGuards(JwtAuthGuard) // ✅ Require JWT for all endpoints
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post('conversations')
  @UseGuards(JwtAuthGuard)
  createConversation(
    @Body() createConversationDto: CreateConversationDto,
    @Req() req: any,
  ) {
    return this.messagesService.createConversation(
      req.user.userId,
      createConversationDto,
    );
  }

  @Get('conversations')
  @UseGuards(JwtAuthGuard)
  getUserConversations(
    @Query() queryDto: QueryConversationsDto,
    @Req() req: any,
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.messagesService.getUserConversations(userId, queryDto);
  }

  @Get('conversations/:id')
  @UseGuards(JwtAuthGuard)
  getConversation(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.user?.sub || req.user?.userId;
    return this.messagesService.getConversationById(id, userId);
  }

  @Post('conversations/find-or-create/:otherUserId')
  @UseGuards(JwtAuthGuard)
  findOrCreateConversation(
    @Param('otherUserId', ParseIntPipe) otherUserId: number,
    @Req() req: any,
  ) {
    return this.messagesService.findOrCreateConversation(
      req.user.userId,
      otherUserId,
    );
  }

  @Post('conversations/shop/:shopId')
  @UseGuards(JwtAuthGuard)
  findOrCreateShopConversation(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Req() req: any,
  ) {
    const userId = req.user?.sub || req.user?.userId;
    console.log('📞 [findOrCreateShopConversation] userId from JWT:', userId);
    console.log('📞 [findOrCreateShopConversation] shopId from param:', shopId);

    if (!userId || !shopId) {
      throw new Error('Missing userId or shopId');
    }

    return this.messagesService.findOrCreateShopConversation(
      req.user.userId,
      shopId,
    );
  }

  // Gửi tin nhắn từ user
  @Post()
  @UseGuards(JwtAuthGuard)
  sendMessage(@Body() createMessageDto: CreateMessageDto, @Req() req: any) {
    return this.messagesService.sendMessage(req.user.userId, createMessageDto);
  }

  // Gửi tin nhắn từ shop
  @Post('shop/:shopId')
  @UseGuards(JwtAuthGuard)
  sendMessageAsShop(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Body() createMessageDto: CreateMessageDto,
    @Req() req: any,
  ) {
    // Kiểm tra user có quyền quản lý shop này không sẽ được xử lý trong service
    return this.messagesService.sendMessage(
      req.user.userId,
      createMessageDto,
      shopId,
    );
  }

  // Lấy danh sách conversations của shop
  @Get('shop/:shopId/conversations')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('chat_with_customer')
  getShopConversations(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Query() queryDto: QueryConversationsDto,
    @Req() req: any,
  ) {
    return this.messagesService.getShopConversations(
      shopId,
      req.user.userId,
      queryDto,
    );
  }

  // Lấy tin nhắn trong conversation cụ thể của shop
  @Get('shop/:shopId/conversations/:conversationId/messages')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('chat_with_customer')
  getShopConversationMessages(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Query() queryDto: QueryMessagesDto,
    @Req() req: any,
  ) {
    // Verify user có quyền quản lý shop này
    return this.messagesService.getShopMessages(
      shopId,
      conversationId,
      req.user.userId,
      queryDto,
    );
  }

  // Đánh dấu tất cả tin nhắn trong conversation của shop là đã đọc
  @Patch('shop/:shopId/conversations/:conversationId/read-all')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('chat_with_customer')
  markShopConversationAsRead(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Req() req: any,
  ) {
    return this.messagesService.markShopMessagesAsRead(
      shopId,
      conversationId,
      req.user.userId,
    );
  }

  @Get('conversations/:conversationId/messages')
  @UseGuards(JwtAuthGuard)
  getMessages(
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Query() queryDto: QueryMessagesDto,
    @Req() req: any,
  ) {
    return this.messagesService.getMessages(
      conversationId,
      req.user.userId,
      queryDto,
    );
  }

  @Patch(':messageId/read')
  @UseGuards(JwtAuthGuard)
  markMessageAsRead(
    @Param('messageId', ParseIntPipe) messageId: number,
    @Req() req: any,
  ) {
    return this.messagesService.markMessageAsRead(messageId, req.user.userId);
  }

  @Patch('conversations/:conversationId/read-all')
  @UseGuards(JwtAuthGuard)
  markAllMessagesAsRead(
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Req() req: any,
  ) {
    return this.messagesService.markAllMessagesAsRead(
      conversationId,
      req.user.userId,
    );
  }

  @Get('conversations/:conversationId/unread-count')
  @UseGuards(JwtAuthGuard)
  getUnreadCount(
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Req() req: any,
  ) {
    return this.messagesService.getUnreadMessagesCount(
      conversationId,
      req.user.userId,
    );
  }

  @Delete(':messageId')
  @UseGuards(JwtAuthGuard)
  deleteMessage(
    @Param('messageId', ParseIntPipe) messageId: number,
    @Req() req: any,
  ) {
    return this.messagesService.deleteMessage(messageId, req.user.userId);
  }

  // ✅ Upload media files for chat messages
  // Note: Using type 'image' instead of 'media' to prevent dynamicPath (all files go to chat-media folder)
  @Post('upload-media')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      ...getMulterOptions('chat-media', 'image'),
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for videos
      fileFilter: (req, file, cb) => {
        // Accept both images and videos
        const isImage =
          /image\/(jpg|jpeg|png|gif|webp)|application\/octet-stream/.test(
            file.mimetype,
          ) || file.originalname.match(/\.(heic|heif)$/i);
        const isVideo = /video\/(mp4|mov|avi|quicktime|x-matroska)/.test(
          file.mimetype,
        );
        if (isImage || isVideo) {
          cb(null, true);
        } else {
          cb(new Error('Only image or video files are allowed!'), false);
        }
      },
    }),
  )
  async uploadMessageMedia(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Req() req: any,
  ) {
    try {
      console.log(
        '📤 [uploadMessageMedia] Received files:',
        files?.length || 0,
      );
      console.log('📤 [uploadMessageMedia] Request headers:', req.headers);
      console.log('📤 [uploadMessageMedia] Request body:', req.body);

      if (!files || files.length === 0) {
        console.error('❌ [uploadMessageMedia] No files received');
        throw new BadRequestException('No files uploaded');
      }

      const userId = req.user?.sub || req.user?.userId;
      console.log('📤 [uploadMessageMedia] User ID:', userId);

      // Format uploaded files info
      const uploadedFiles = files.map((file: any) => {
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

        // S3: file.location, Local: /uploads/chat-media/
        const urlPath = file.location || `/uploads/chat-media/${file.filename}`;

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

  /**
   * POST /messages/presigned-url - Generate presigned URL for chat media
   * ⚡ FAST: Direct S3 upload for images/videos in chat
   */
  @Post('presigned-url')
  @UseGuards(JwtAuthGuard)
  async generatePresignedUrl(
    @Req() req: any,
    @Body()
    body: {
      fileName: string;
      fileType: string;
      mediaType: 'image' | 'video' | 'audio' | 'file';
    },
  ) {
    const userId = req.user.userId || req.user.sub;

    console.log('🔑 [MessagesController] Generating presigned URL:', {
      userId,
      fileName: body.fileName,
      fileType: body.fileType,
      mediaType: body.mediaType,
    });

    // Validate
    if (!body.fileName || !body.fileType || !body.mediaType) {
      throw new BadRequestException(
        'fileName, fileType, and mediaType are required',
      );
    }

    // Only work with S3
    const storageDriver = process.env.STORAGE_DRIVER || 'local';
    if (storageDriver !== 's3') {
      throw new ForbiddenException(
        'Presigned URL only available for S3 storage',
      );
    }

    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'ap-southeast-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    // Generate unique key
    const timestamp = Date.now();
    const randomId = Math.round(Math.random() * 1e9);
    const extension = body.fileName.split('.').pop();
    let directory = 'chat-media';

    if (body.mediaType === 'image') {
      directory = 'chat-media/images';
    } else if (body.mediaType === 'video') {
      directory = 'chat-media/videos';
    } else if (body.mediaType === 'audio') {
      directory = 'chat-media/audio';
    } else if (body.mediaType === 'file') {
      directory = 'chat-media/files';
    }

    const key = `${directory}/msg-${userId}-${timestamp}-${randomId}.${extension}`;

    // Create presigned URL (valid for 10 minutes)
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: key,
      ContentType: body.fileType,
      Metadata: {
        userId: userId.toString(),
        uploadedAt: new Date().toISOString(),
      },
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 600 });
    const s3Url = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-southeast-1'}.amazonaws.com/${key}`;

    console.log('✅ [MessagesController] Presigned URL generated');

    return {
      success: true,
      data: {
        uploadUrl,
        s3Url,
        key,
        expiresIn: 600,
      },
    };
  }
}
