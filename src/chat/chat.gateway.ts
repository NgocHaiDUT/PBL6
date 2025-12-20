import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Injectable } from '@nestjs/common';
import { MessagesService } from '../messages/messages.service';
import { SendMessageDto } from './dto/send-message.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private onlineUsers = new Map<string, number>(); // socketId -> userId
  private onlineShops = new Map<string, number>(); // socketId -> shopId

  constructor(
    private messagesService: MessagesService,
    private prisma: PrismaService,
  ) { }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    client.emit('connected', {
      message: 'Connected to chat server',
      clientId: client.id,
    });
  }

  handleDisconnect(client: Socket) {
    const userId = this.onlineUsers.get(client.id);
    const shopId = this.onlineShops.get(client.id);

    this.logger.log(`Client disconnected: ${client.id} (User: ${userId}, Shop: ${shopId})`);

    // Cleanup and notify
    if (userId) {
      this.onlineUsers.delete(client.id);
      // Check if user has other connections
      const otherConnections = Array.from(this.onlineUsers.values()).includes(userId);
      if (!otherConnections) {
        this.server.emit('userStatusChanged', { userId, status: 'offline' });
      }
    }

    if (shopId) {
      this.onlineShops.delete(client.id);
      const otherConnections = Array.from(this.onlineShops.values()).includes(shopId);
      if (!otherConnections) {
        this.server.emit('shopStatusChanged', { shopId, status: 'offline' });
      }
    }
  }

  @SubscribeMessage('join')
  handleJoin(@MessageBody() userId: number, @ConnectedSocket() client: Socket) {
    if (!userId) return;

    const isAlreadyOnline = Array.from(this.onlineUsers.values()).includes(userId);
    this.onlineUsers.set(client.id, userId);

    client.join(`${userId}`);
    this.logger.log(`User ${userId} joined room`);
    client.emit('joined', { userId, message: 'Successfully joined chat' });

    if (!isAlreadyOnline) {
      this.server.emit('userStatusChanged', { userId, status: 'online' });
    }
  }

  @SubscribeMessage('joinShop')
  handleJoinShop(@MessageBody() data: { shopId: number; userId: number }, @ConnectedSocket() client: Socket) {
    if (!data.shopId || !data.userId) return;

    const isUserAlreadyOnline = Array.from(this.onlineUsers.values()).includes(data.userId);
    const isShopAlreadyOnline = Array.from(this.onlineShops.values()).includes(data.shopId);

    this.onlineUsers.set(client.id, data.userId);
    this.onlineShops.set(client.id, data.shopId);

    // Join shop room for receiving messages
    client.join(`shop_${data.shopId}`);
    // Also join user room for personal notifications
    client.join(`${data.userId}`);

    this.logger.log(`User ${data.userId} joined shop ${data.shopId} room`);
    client.emit('joinedShop', { shopId: data.shopId, message: 'Successfully joined shop chat' });

    if (!isUserAlreadyOnline) {
      this.server.emit('userStatusChanged', { userId: data.userId, status: 'online' });
    }
    if (!isShopAlreadyOnline) {
      this.server.emit('shopStatusChanged', { shopId: data.shopId, status: 'online' });
    }
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() data: {
      senderId: number;
      receiverId: number;
      senderShopId?: number;
      content: string;
      postId?: number;
      sharedProfileId?: number;
      productPayload?: any;
      messageType?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'SHARE_POST' | 'SHARE_PRODUCT' | 'SHARE_PROFILE';
      type?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'SHARE_POST' | 'SHARE_PRODUCT';
      payload?: any;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      this.logger.log(
        `Message from ${data.senderShopId ? `shop ${data.senderShopId}` : `user ${data.senderId}`} to ${data.receiverId}: ${data.content}`,
      );

      // 1. Determine conversation based on sender type
      let conversation: any;

      if (data.senderShopId) {
        // Shop sending to user
        conversation = await this.messagesService.findOrCreateShopConversation(
          data.receiverId, // receiverId is the user
          data.senderShopId,
        );
      } else {
        // Check if receiverId is a shop ID by checking if shop exists
        const shop = await this.prisma.shops.findUnique({
          where: { id: data.receiverId },
          select: { id: true }
        });

        if (shop) {
          // User sending to shop
          conversation = await this.messagesService.findOrCreateShopConversation(
            data.senderId, // User ID
            data.receiverId, // Shop ID
          );
        } else {
          // User sending to user
          conversation = await this.messagesService.findOrCreateConversation(
            data.senderId,
            data.receiverId,
          );
        }
      }

      if (!conversation) {
        throw new Error('Failed to create or find conversation');
      }

      // 2. Determine message type
      let messageType: 'TEXT' | 'IMAGE' | 'VIDEO' | 'SHARE_POST' | 'SHARE_PRODUCT' | 'SHARE_PROFILE' = 'TEXT';

      if (data.postId) {
        messageType = 'SHARE_POST';
      } else if (data.sharedProfileId) {
        messageType = 'SHARE_PROFILE';
      } else if (data.productPayload) {
        messageType = 'SHARE_PRODUCT';
      } else if (data.messageType || data.type) {
        messageType = data.messageType || data.type || 'TEXT';
      }

      // 3. Create message using MessagesService
      const message = await this.messagesService.sendMessage(
        data.senderId,
        {
          conversation_id: conversation.id,
          content: data.content,
          postId: data.postId, // ✅ Include postId
          sharedProfileId: data.sharedProfileId, // ✅ Include sharedProfileId
          messageType: messageType, // ✅ Use enum value
          payload: data.productPayload || data.payload || (data.postId ? { postId: data.postId } : null),
        },
        data.senderShopId // Pass shopId if sending as shop
      );

      // ✅ Load shared profile data if exists
      let sharedProfile: { id: number; full_name: string | null; avatar_url: string | null; bio: string | null } | null = null;
      if (data.sharedProfileId) {
        try {
          const profileUser = await this.prisma.users.findUnique({
            where: { id: data.sharedProfileId },
            select: {
              id: true,
              full_name: true,
              avatar_url: true,
              story: true,
            }
          });
          if (profileUser) {
            sharedProfile = {
              id: profileUser.id,
              full_name: profileUser.full_name,
              avatar_url: profileUser.avatar_url,
              bio: profileUser.story,
            };
          }
        } catch (error) {
          this.logger.error(`Failed to load shared profile ${data.sharedProfileId}:`, error);
        }
      }
      // Debug log
      this.logger.log(`Created message with data:`, {
        id: message.id,
        post_id: data.postId,
        type: message.type,
        senderShopId: data.senderShopId,
      });

      // 4. Format message for frontend
      const formattedMessage = {
        id: message.id,
        conversationId: message.conversation_id,
        conversation_id: message.conversation_id,
        senderId: message.sender_id,
        sender_id: message.sender_id, // ✅ Add snake_case for frontend compatibility
        senderShopId: message.sender_shop_id,
        sender_shop_id: message.sender_shop_id, // ✅ Add snake_case
        senderType: message.sender_type,
        sender_type: message.sender_type, // ✅ Add snake_case
        receiverId: data.receiverId,
        receiver_id: data.receiverId, // ✅ Add snake_case
        content: message.content,
        type: message.type,
        payload: message.payload,
        productPayload: messageType === 'SHARE_PRODUCT' ? message.payload : null, // ✅ Include product payload
        createdAt: message.created_at.toISOString(),
        created_at: message.created_at.toISOString(), // ✅ Add snake_case
        sharedPostId: (message as any).post_id || null, // ✅ Include shared post ID
        post_id: (message as any).post_id || null, // ✅ Add snake_case
        sharedProfileId: (message as any).shared_profile_id || null, // ✅ Include shared profile ID
        shared_profile_id: (message as any).shared_profile_id || null, // ✅ Add snake_case
        sharedProfile: sharedProfile, // ✅ Include shared profile data
        messageType: message.type, // ✅ Use the enum type
        sender: message.sender ? {
          id: message.sender.id,
          fullName: message.sender.full_name || 'Unknown User',
          avatarUrl: message.sender.avatar_url,
        } : message.sender_shop ? {
          id: message.sender_shop.id,
          fullName: message.sender_shop.name,
          avatarUrl: message.sender_shop.logo_url,
        } : {
          Id: message.sender_id,
          Fullname: 'Unknown User',
          Avatar: null,
        }
      };

      // Debug log để kiểm tra formatted message
      this.logger.log(`Formatted message:`, {
        sharedPostId: formattedMessage.sharedPostId,
        messageType: formattedMessage.messageType,
        type: message.type,
        originalPostId: data.postId,
        originalMessageType: data.messageType
      });

      // 4. Send message to all participants in the conversation
      conversation.participants.forEach(participant => {
        if (participant.user_id) {
          this.server
            .to(`${participant.user_id}`)
            .emit('newMessage', formattedMessage);
        }
        // También podríamos enviar a shops si implementamos shop rooms
        if (participant.shop_id) {
          this.server
            .to(`shop_${participant.shop_id}`)
            .emit('newMessage', formattedMessage);
        }
      });

      // 5. Send message to both users
      this.server.to(`${data.senderId}`).emit('newMessage', formattedMessage);
      this.server.to(`${data.receiverId}`).emit('newMessage', formattedMessage);

      // 5. Confirm to sender
      client.emit('messageSent', {
        success: true,
        message: formattedMessage,
      });
    } catch (error) {
      this.logger.error('Error sending message:', error);
      client.emit('messageSent', {
        success: false,
        error: 'Failed to send message',
      });
    }
  }

  @SubscribeMessage('deleteMessage')
  async handleMessageDeletion(
    @MessageBody() data: { messageId: number; userId: number },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      this.logger.log(
        `User ${data.userId} attempting to delete message ${data.messageId}`,
      );

      // Use the service to delete the message
      const result = await this.messagesService.deleteMessage(
        data.messageId,
        data.userId,
      );

      // Find conversation to notify participants
      const message = await this.messagesService.getMessageById(data.messageId); // You might need to create this service method
      if (message) {
        const conversation = await this.messagesService.getConversationById(
          message.conversation_id,
          data.userId,
        );
        if (conversation) {
          // Notify all participants about the deletion
          conversation.participants.forEach((p) => {
            if (p.user_id) {
              this.server.to(`${p.user_id}`).emit('messageDeleted', {
                messageId: data.messageId,
                conversationId: conversation.id,
              });
            }
            if (p.shop_id) {
              this.server.to(`shop_${p.shop_id}`).emit('messageDeleted', {
                messageId: data.messageId,
                conversationId: conversation.id,
              });
            }
          });
        }
      }

      client.emit('messageDeletionResult', { success: true, ...result });
    } catch (error) {
      this.logger.error(`Failed to delete message ${data.messageId}:`, error);
      client.emit('messageDeletionResult', {
        success: false,
        error: error.message,
      });
    }
  }

  @SubscribeMessage('openChat')
  async handleOpenChat(
    @MessageBody() data: { openerId: number; targetId: number },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      if (!data || !data.openerId || !data.targetId) return;

      this.logger.log(
        `User ${data.openerId} opening chat with ${data.targetId}`,
      );

      // ✅ Check if targetId is a shop
      const isShop = await this.prisma.shops.findUnique({
        where: { id: data.targetId },
        select: { id: true, name: true, logo_url: true }
      });

      let conversation: any;
      if (isShop) {
        // Opening chat with shop
        this.logger.log(`User ${data.openerId} opening chat with shop ${data.targetId}`);
        conversation = await this.messagesService.findOrCreateShopConversation(
          data.openerId, // userId
          data.targetId, // shopId
        );
      } else {
        // Opening chat with user
        conversation = await this.messagesService.findOrCreateConversation(
          data.openerId,
          data.targetId,
        );
      }

      if (!conversation) {
        throw new Error('Failed to create or find conversation');
      }

      // 2. Get conversation messages
      const messageHistory = await this.messagesService.getMessages(
        conversation.id,
        data.openerId,
        { page: 1, limit: 50 }, // Load last 50 messages
      );

      // 3. Get target info (user or shop)
      let targetInfo: {
        id: number;
        full_name: string | null;
        avatar_url: string | null;
      };

      if (isShop) {
        targetInfo = {
          id: isShop.id,
          full_name: isShop.name,
          avatar_url: isShop.logo_url,
        };
      } else {
        const targetUser = await this.prisma.users.findUnique({
          where: { id: data.targetId },
          select: {
            id: true,
            full_name: true,
            avatar_url: true,
          },
        });

        if (!targetUser) {
          client.emit('chatOpened', {
            success: false,
            error: 'Target user not found',
          });
          return;
        }
        targetInfo = targetUser;
      }

      // 4. Format messages for frontend
      const formattedMessages = await Promise.all(messageHistory.data.map(async (msg) => {
        // ✅ Debug log raw reactions from database
        this.logger.log(`🔍 Message ${msg.id} raw message_reactions from DB:`, (msg as any).message_reactions);

        // Group reactions by emoji
        const reactionsGrouped = ((msg as any).message_reactions || []).reduce((acc: any, r: any) => {
          if (!acc[r.emoji]) {
            acc[r.emoji] = { emoji: r.emoji, count: 0, users: [] };
          }
          acc[r.emoji].count++;
          acc[r.emoji].users.push(r.user_id);
          return acc;
        }, {} as Record<string, { emoji: string; count: number; users: number[] }>);

        const formattedReactions = Object.values(reactionsGrouped);

        // ✅ Debug log formatted reactions
        this.logger.log(`📊 Message ${msg.id} formatted reactions (${formattedReactions.length}):`, formattedReactions);

        // ✅ Format media files
        const mediaFiles = ((msg as any).message_media || []).map((media: any) => ({
          id: media.id,
          url: media.media_url,
          type: media.media_type,
          fileName: media.file_name,
          fileSize: media.file_size,
          duration: media.duration,
          thumbnailUrl: media.thumbnail_url,
        }));

        this.logger.log(`📎 Message ${msg.id} has ${mediaFiles.length} media files:`, mediaFiles);
        this.logger.log(`📦 Message ${msg.id} payload:`, msg.payload);
        this.logger.log(`� Message ${msg.id} payload type:`, typeof msg.payload);
        this.logger.log(`📦 Message ${msg.id} payload is null:`, msg.payload === null);
        this.logger.log(`�📋 Message ${msg.id} type:`, msg.type);

        // ✅ Enrich payload with story details if STORY_REPLY or product details if SHARE_PRODUCT
        let enrichedPayload = msg.payload;

        // ✅ Enrich product payload for SHARE_PRODUCT
        if (msg.type === 'SHARE_PRODUCT') {
          const payloadData = (msg.payload as any) || {};
          this.logger.log(`🛒 Message ${msg.id} is SHARE_PRODUCT, payload:`, payloadData);

          // ✅ Try to get product_id from payload, or extract from content
          let productId = payloadData.product_id;

          if (productId) {
            this.logger.log(`🔍 Loading product ${payloadData.product_id} from database...`);
            try {
              // Load product from products table with variants and media
              const product = await this.prisma.products.findUnique({
                where: {
                  id: payloadData.product_id,
                },
                include: {
                  brand: {
                    select: {
                      name: true,
                    },
                  },
                  product_variants: {
                    orderBy: {
                      price: 'asc',
                    },
                    take: 1,
                  },
                  product_media: {
                    orderBy: {
                      sort_order: 'asc',
                    },
                    take: 1,
                  },
                },
              });

              this.logger.log(`📦 Product loaded:`, product ? `Found (ID: ${product.id})` : 'Not found');

              if (product) {
                // Get price from first variant, image from first media
                const price = product.product_variants[0]?.price || 0;
                const image = product.product_media[0]?.url || '';

                this.logger.log(`💰 Price: ${price}, 🖼️ Image: ${image}`);

                // Enrich payload with full product data
                enrichedPayload = {
                  product_id: product.id,
                  product_name: product.name,
                  product_price: Number(price), // Convert Decimal to number
                  product_image: image,
                  product_brand: product.brand?.name || 'Unknown Brand',
                  product_description: product.description,
                };
                this.logger.log(`✅ Enriched product payload for message ${msg.id}:`, enrichedPayload);
              }
            } catch (error) {
              this.logger.error(`❌ Failed to load product for message ${msg.id}:`, error);
            }
          } else {
            this.logger.warn(`⚠️ Message ${msg.id} has SHARE_PRODUCT type but no product_id in payload`);
          }
        }

        // ✅ Enrich story payload for STORY_REPLY
        if (msg.type === 'STORY_REPLY' && msg.payload) {
          const payloadData = msg.payload as any;
          if (payloadData.story_id) {
            try {
              // Load story from posts table
              const story = await this.prisma.posts.findFirst({
                where: {
                  id: payloadData.story_id,
                  is_story: true,
                },
                include: {
                  user: {
                    select: {
                      id: true,
                      full_name: true,
                      avatar_url: true,
                    },
                  },
                },
              });

              if (story) {
                // Enrich payload with full story data
                enrichedPayload = {
                  story_id: story.id,
                  story_type: story.story_type,
                  story_media_url: story.media_url,
                  story_thumbnail_url: story.thumbnail_url,
                  story_caption: story.caption,
                  story_owner: {
                    id: story.user.id,
                    full_name: story.user.full_name,
                    avatar_url: story.user.avatar_url,
                  },
                  story_created_at: story.created_at.toISOString(),
                  story_expires_at: story.expires_at?.toISOString(),
                };
                this.logger.log(`✅ Enriched story payload for message ${msg.id}:`, enrichedPayload);
              }
            } catch (error) {
              this.logger.error(`❌ Failed to load story for message ${msg.id}:`, error);
            }
          }
        }

        // ✅ Log before returning to debug
        this.logger.log(`🔍 Message ${msg.id} before return:`, {
          type: msg.type,
          hasPayload: !!msg.payload,
          enrichedPayload: enrichedPayload,
          willSetProductPayload: msg.type === 'SHARE_PRODUCT',
        });

        return {
          id: msg.id,
          conversationId: msg.conversation_id,
          conversation_id: msg.conversation_id, // ✅ Add snake_case
          senderId: msg.sender_id,
          sender_id: msg.sender_id, // ✅ Add snake_case
          senderShopId: msg.sender_shop_id,
          sender_shop_id: msg.sender_shop_id, // ✅ Add snake_case
          senderType: msg.sender_type,
          sender_type: msg.sender_type, // ✅ Add snake_case
          receiverId: data.targetId === msg.sender_id ? data.openerId : data.targetId,
          receiver_id: data.targetId === msg.sender_id ? data.openerId : data.targetId, // ✅ Add snake_case
          content: msg.content,
          type: msg.type,
          payload: enrichedPayload,
          productPayload: msg.type === 'SHARE_PRODUCT' ? enrichedPayload : null, // ✅ Include product payload
          storyPayload: msg.type === 'STORY_REPLY' ? enrichedPayload : null, // ✅ Include story payload
          createdAt: msg.created_at.toISOString(),
          created_at: msg.created_at.toISOString(), // ✅ Add snake_case
          sharedPostId: (msg as any).post_id, // ✅ Include shared post ID
          post_id: (msg as any).post_id, // ✅ Add snake_case
          sharedProfileId: (msg as any).shared_profile_id, // ✅ Include shared profile ID
          shared_profile_id: (msg as any).shared_profile_id, // ✅ Add snake_case
          messageType: msg.type, // ✅ Use 'type' field (enum message_type)
          reactions: formattedReactions, // ✅ Include reactions
          mediaFiles: mediaFiles, // ✅ Include media files
          sender: msg.sender
            ? {
              id: msg.sender.id,
              fullName: msg.sender.full_name || 'Unknown User',
              avatarUrl: msg.sender.avatar_url,
            }
            : msg.sender_shop
              ? {
                id: msg.sender_shop.id,
                fullName: msg.sender_shop.name,
                avatarUrl: msg.sender_shop.logo_url,
              }
              : {
                Id: msg.sender_id,
                Fullname: 'Unknown User',
                Avatar: null,
              }
        };
      }));

      // 4. Notify target user (optional)
      this.server.to(`${data.targetId}`).emit('openChat', {
        from: data.openerId,
        user: {
          Id: targetInfo.id,
          Fullname: targetInfo.full_name || 'Unknown',
          Avatar: targetInfo.avatar_url,
        }
      });

      // ✅ Log formattedMessages to verify productPayload
      const productMessages = formattedMessages.filter(m => m.messageType === 'SHARE_PRODUCT');
      if (productMessages.length > 0) {
        this.logger.log(`🛒 Found ${productMessages.length} product messages in conversation`);
        productMessages.forEach(pm => {
          this.logger.log(`  Message ${pm.id}: hasProductPayload = ${!!pm.productPayload}`);
          if (pm.productPayload) {
            this.logger.log(`  ProductPayload:`, pm.productPayload);
          }
          // ✅ Test JSON serialization
          const serialized = JSON.stringify(pm);
          const deserialized = JSON.parse(serialized);
          this.logger.log(`  After JSON round-trip: hasProductPayload = ${!!deserialized.productPayload}`);
        });
      }

      // 5. Send conversation to opener
      const conversationData = {
        with: {
          Id: targetInfo.id, // ✅ Use uppercase 'Id' to match frontend
          Fullname: targetInfo.full_name || 'Unknown',
          Avatar: targetInfo.avatar_url,
        },
        messages: formattedMessages,
        pagination: {
          total: formattedMessages.length,
          hasMore: false,
        },
      };

      // ✅ Log what we're about to emit
      this.logger.log(`📤 Emitting conversation with ${formattedMessages.length} messages`);
      const productMsgsToEmit = conversationData.messages.filter(m => m.messageType === 'SHARE_PRODUCT');
      if (productMsgsToEmit.length > 0) {
        this.logger.log(`📤 Including ${productMsgsToEmit.length} product messages:`);
        productMsgsToEmit.forEach(pm => {
          this.logger.log(`  Message ${pm.id}: productPayload = ${JSON.stringify(pm.productPayload)}`);
        });
      }

      client.emit('conversation', conversationData);
      client.emit('chatOpened', {
        success: true,
        targetId: data.targetId,
      });
    } catch (error) {
      this.logger.error('Error opening chat:', error);
      client.emit('chatOpened', {
        success: false,
        error: 'Failed to open chat',
      });
    }
  }

  @SubscribeMessage('markConversationRead')
  async handleMarkConversationRead(
    @MessageBody() data: { userId: number; conversationId: number },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      this.logger.log(
        `User ${data.userId} marked conversation ${data.conversationId} as read`,
      );

      await this.messagesService.markAllMessagesAsRead(
        data.conversationId,
        data.userId,
      );

      // Notify other participants that messages have been read
      const conversation = await this.messagesService.getConversationById(
        data.conversationId,
        data.userId,
      );
      const partner = conversation.participants.find(
        (p) => p.user_id !== data.userId,
      );
      if (partner) {
        this.server.to(`${partner.user_id}`).emit('conversationMarkedRead', {
          conversationId: data.conversationId,
          readBy: data.userId,
        });
      }

      // Confirm to sender
      client.emit('conversationReadConfirmed', {
        conversationId: data.conversationId,
        message: 'Conversation marked as read',
      });
    } catch (error) {
      this.logger.error('Error marking conversation as read:', error);
    }
  }

  @SubscribeMessage('getOnlineUsers')
  handleGetOnlineUsers(@ConnectedSocket() client: Socket) {
    const onlineUserIds = Array.from(new Set(this.onlineUsers.values()));
    client.emit('onlineUsers', onlineUserIds);
  }

  @SubscribeMessage('getOnlineShops')
  handleGetOnlineShops(@ConnectedSocket() client: Socket) {
    const onlineShopIds = Array.from(new Set(this.onlineShops.values()));
    client.emit('onlineShops', onlineShopIds);
  }

  // ===== NEW MESSAGE ACTIONS =====

  @SubscribeMessage('reactToMessage')
  async handleReactToMessage(
    @MessageBody() data: { messageId: number; userId: number; emoji: string; receiverId: number },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      this.logger.log(`User ${data.userId} reacting to message ${data.messageId} with ${data.emoji}`);

      // ✅ Check if user already reacted to this message with ANY emoji
      const existingUserReactions = await this.prisma.message_reactions.findMany({
        where: {
          message_id: data.messageId,
          user_id: data.userId,
        }
      });

      // ✅ If user clicked the same emoji they already used, remove it (toggle off)
      const sameEmojiReaction = existingUserReactions.find(r => r.emoji === data.emoji);

      if (sameEmojiReaction) {
        // Remove the same reaction (toggle off)
        await this.prisma.message_reactions.delete({
          where: {
            id: sameEmojiReaction.id
          }
        });
        this.logger.log(`Removed reaction ${data.emoji} from user ${data.userId}`);
      } else {
        // ✅ Remove all existing reactions from this user for this message
        if (existingUserReactions.length > 0) {
          await this.prisma.message_reactions.deleteMany({
            where: {
              message_id: data.messageId,
              user_id: data.userId,
            }
          });
          this.logger.log(`Removed ${existingUserReactions.length} old reactions from user ${data.userId}`);
        }

        // ✅ Add new reaction
        await this.prisma.message_reactions.create({
          data: {
            message_id: data.messageId,
            user_id: data.userId,
            emoji: data.emoji,
          }
        });
        this.logger.log(`Added new reaction ${data.emoji} for user ${data.userId}`);
      }

      // Get all reactions for this message
      const allReactions = await this.prisma.message_reactions.findMany({
        where: { message_id: data.messageId },
        include: {
          message: {
            select: {
              sender_id: true
            }
          }
        }
      });

      // Format reactions grouped by emoji
      const reactionsGrouped = allReactions.reduce((acc, r) => {
        if (!acc[r.emoji]) {
          acc[r.emoji] = { emoji: r.emoji, count: 0, users: [] };
        }
        acc[r.emoji].count++;
        acc[r.emoji].users.push(r.user_id);
        return acc;
      }, {} as Record<string, { emoji: string; count: number; users: number[] }>);

      const formattedReactions = Object.values(reactionsGrouped);

      // ✅ Determine action based on whether reaction was added or removed
      const action = sameEmojiReaction ? 'removed' : 'added';

      // Notify both users
      const responseData = {
        messageId: data.messageId,
        reactions: formattedReactions,
        userId: data.userId,
        emoji: data.emoji,
        action: action,
      };

      this.server.to(`${data.userId}`).emit('messageReactionUpdated', responseData);
      this.server.to(`${data.receiverId}`).emit('messageReactionUpdated', responseData);

      client.emit('reactionConfirmed', {
        success: true,
        messageId: data.messageId,
        reactions: formattedReactions,
      });

    } catch (error) {
      this.logger.error('Error reacting to message:', error);
      client.emit('reactionConfirmed', {
        success: false,
        error: 'Failed to react to message',
      });
    }
  }

  @SubscribeMessage('editMessage')
  async handleEditMessage(
    @MessageBody() data: { messageId: number; userId: number; newContent: string; receiverId: number },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      this.logger.log(`User ${data.userId} editing message ${data.messageId}`);

      // Verify user owns the message
      const message = await this.prisma.messages.findUnique({
        where: { id: data.messageId }
      });

      if (!message || message.sender_id !== data.userId) {
        client.emit('messageEdited', {
          success: false,
          error: 'Unauthorized to edit this message',
        });
        return;
      }

      // Update message
      const updatedMessage = await this.prisma.messages.update({
        where: { id: data.messageId },
        data: {
          content: data.newContent,
          is_edited: true,
          edited_at: new Date(),
        },
        include: {
          sender: {
            select: {
              id: true,
              full_name: true,
              avatar_url: true,
            }
          }
        }
      });

      const formattedMessage = {
        id: updatedMessage.id,
        senderId: updatedMessage.sender_id,
        receiverId: data.receiverId,
        content: updatedMessage.content,
        createdAt: updatedMessage.created_at.toISOString(),
        isEdited: (updatedMessage as any).is_edited,
        editedAt: (updatedMessage as any).edited_at?.toISOString(),
        sender: {
          Id: updatedMessage.sender?.id,
          Fullname: updatedMessage.sender?.full_name || 'Unknown User',
          Avatar: updatedMessage.sender?.avatar_url,
        }
      };

      // Notify both users
      this.server.to(`${data.userId}`).emit('messageUpdated', formattedMessage);
      this.server.to(`${data.receiverId}`).emit('messageUpdated', formattedMessage);

      client.emit('messageEdited', {
        success: true,
        message: formattedMessage,
      });

    } catch (error) {
      this.logger.error('Error editing message:', error);
      client.emit('messageEdited', {
        success: false,
        error: 'Failed to edit message',
      });
    }
  }

  @SubscribeMessage('deleteMessage')
  async handleDeleteMessage(
    @MessageBody() data: { messageId: number; userId: number; receiverId: number; deleteForEveryone?: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      this.logger.log(`User ${data.userId} deleting message ${data.messageId}`);

      // Verify user owns the message
      const message = await this.prisma.messages.findUnique({
        where: { id: data.messageId }
      });

      if (!message || message.sender_id !== data.userId) {
        client.emit('messageDeleted', {
          success: false,
          error: 'Unauthorized to delete this message',
        });
        return;
      }

      if (data.deleteForEveryone) {
        // Soft delete: Mark as deleted
        await this.prisma.messages.update({
          where: { id: data.messageId },
          data: {
            is_deleted: true,
            deleted_at: new Date(),
            content: 'Tin nhắn đã được thu hồi',
          }
        });

        // Notify both users
        const deleteData = {
          messageId: data.messageId,
          deletedForEveryone: true,
        };

        this.server.to(`${data.userId}`).emit('messageDeleted', deleteData);
        this.server.to(`${data.receiverId}`).emit('messageDeleted', deleteData);
      } else {
        // Just delete for sender (client-side only)
        client.emit('messageDeleted', {
          messageId: data.messageId,
          deletedForEveryone: false,
        });
      }

      client.emit('messageDeleteConfirmed', {
        success: true,
        messageId: data.messageId,
      });

    } catch (error) {
      this.logger.error('Error deleting message:', error);
      client.emit('messageDeleteConfirmed', {
        success: false,
        error: 'Failed to delete message',
      });
    }
  }

  @SubscribeMessage('sendMessageWithMedia')
  async handleSendMessageWithMedia(
    @MessageBody() data: {
      senderId: number;
      receiverId?: number;
      shopId?: number;
      conversationId?: number;
      content?: string;
      type?: 'TEXT' | 'IMAGE' | 'VIDEO';
      mediaFiles: Array<{
        url: string;
        type: 'image' | 'video' | 'file';
        fileName?: string;
        fileSize?: number;
        duration?: number;
        thumbnailUrl?: string;
      }>
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // Determine the actual receiver ID (could be user or shop)
      const targetId = data.shopId || data.receiverId;

      if (!targetId) {
        throw new Error('Either receiverId or shopId must be provided');
      }

      this.logger.log(`User ${data.senderId} sending message with media to ${data.shopId ? 'shop' : 'user'} ${targetId}`);

      // 1. Find or create conversation
      let conversation;

      // If conversationId is provided, use it directly
      if (data.conversationId) {
        conversation = await this.prisma.conversations.findUnique({
          where: { id: data.conversationId },
          include: { participants: true }
        });

        if (!conversation) {
          throw new Error(`Conversation ${data.conversationId} not found`);
        }

        this.logger.log(`Using existing conversation ${data.conversationId}`);
      } else {
        // ✅ Check if target is a shop
        const isShop = data.shopId ? await this.prisma.shops.findUnique({
          where: { id: data.shopId },
          select: { id: true }
        }) : null;

        if (isShop) {
          // User sending media to shop
          this.logger.log(`Creating/finding shop conversation for user ${data.senderId} and shop ${data.shopId}`);
          conversation = await this.messagesService.findOrCreateShopConversation(
            data.senderId, // userId
            data.shopId!, // shopId - non-null assertion safe because isShop check confirms it exists
          );
        } else {
          // User sending media to user
          const conversations = await this.prisma.conversations.findMany({
            where: { type: 'private' },
            include: { participants: true }
          });

          conversation = conversations.find(conv => {
            const userIds = conv.participants.map(p => p.user_id).sort();
            const targetIds = [data.senderId, targetId].sort();
            return userIds.length === 2 &&
              userIds[0] === targetIds[0] &&
              userIds[1] === targetIds[1];
          });

          if (!conversation) {
            conversation = await this.prisma.conversations.create({
              data: {
                type: 'private',
                participants: {
                  create: [
                    { user_id: data.senderId, entity_type: 'user' },
                    { user_id: targetId, entity_type: 'user' }
                  ]
                }
              },
              include: { participants: true }
            });
          }
        }
      }

      // 2. Determine message type based on enum message_type
      let messageType: 'TEXT' | 'IMAGE' | 'VIDEO' | 'SHARE_POST' | 'SHARE_PRODUCT' = data.type || 'TEXT';

      // If type not provided, infer from media files
      if (!data.type && data.mediaFiles.length > 0) {
        const firstMediaType = data.mediaFiles[0].type;
        if (firstMediaType === 'image') {
          messageType = 'IMAGE';
        } else if (firstMediaType === 'video') {
          messageType = 'VIDEO';
        }
      }

      // 3. Create message
      const message = await this.prisma.messages.create({
        data: {
          conversation_id: conversation?.id || 0,
          sender_id: data.senderId,
          content: data.content || '',
          type: messageType, // ✅ Use 'type' field with enum value
          sender_type: 'user',
        },
        include: {
          sender: {
            select: {
              id: true,
              full_name: true,
              avatar_url: true,
            }
          }
        }
      });

      // 4. Create message media entries
      const mediaEntries = await Promise.all(
        data.mediaFiles.map(media =>
          this.prisma.message_media.create({
            data: {
              message_id: message.id,
              media_url: media.url,
              media_type: media.type,
              file_name: media.fileName,
              file_size: media.fileSize,
              duration: media.duration,
              thumbnail_url: media.thumbnailUrl,
            }
          })
        )
      );

      // 5. Format message for frontend
      const formattedMessage = {
        id: message.id,
        conversationId: conversation?.id,
        conversation_id: conversation?.id, // ✅ Add snake_case
        senderId: message.sender_id,
        sender_id: message.sender_id, // ✅ Add snake_case for frontend compatibility
        receiverId: targetId,
        receiver_id: targetId, // ✅ Add snake_case
        content: message.content,
        type: messageType,
        createdAt: message.created_at.toISOString(),
        created_at: message.created_at.toISOString(), // ✅ Add snake_case
        messageType: messageType,
        mediaFiles: mediaEntries.map(m => ({
          id: m.id,
          url: m.media_url,
          type: m.media_type,
          fileName: m.file_name,
          fileSize: m.file_size,
          duration: m.duration,
          thumbnailUrl: m.thumbnail_url,
        })),
        sender: message.sender ? {
          id: message.sender.id,
          fullName: message.sender.full_name || 'Unknown User',
          avatarUrl: message.sender.avatar_url,
        } : {
          Id: message.sender_id,
          Fullname: 'Unknown User',
          Avatar: null,
        }
      };

      // 6. Send to both users
      this.server.to(`${data.senderId}`).emit('newMessage', formattedMessage);
      this.server.to(`${targetId}`).emit('newMessage', formattedMessage);

      client.emit('messageSent', {
        success: true,
        message: formattedMessage,
      });

    } catch (error) {
      this.logger.error('Error sending message with media:', error);
      client.emit('messageSent', {
        success: false,
        error: 'Failed to send message with media',
      });
    }
  }

  // Utility methods
  sendMessageToUser(userId: number, event: string, data: any) {
    this.server.to(`${userId}`).emit(event, data);
  }

  broadcastToAll(event: string, data: any) {
    this.server.emit(event, data);
  }

  isUserOnline(userId: number): boolean {
    return this.server.sockets.adapter.rooms.has(`${userId}`);
  }
}
