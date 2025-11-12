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

  constructor(private prisma: PrismaService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    client.emit('connected', { 
      message: 'Connected to chat server',
      clientId: client.id 
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join')
  handleJoin(@MessageBody() userId: number, @ConnectedSocket() client: Socket) {
    client.join(`${userId}`);
    this.logger.log(`User ${userId} joined room`);
    client.emit('joined', { userId, message: 'Successfully joined chat' });
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() data: { senderId: number; receiverId: number; content: string; postId?: number; messageType?: string },

    @ConnectedSocket() client: Socket,
  ) {
    try {
      this.logger.log(`Message from ${data.senderId} to ${data.receiverId}: ${data.content}`);

      // 1. Find existing conversation between two users
      const conversations = await this.prisma.conversations.findMany({
        where: {
          type: 'private'
        },
        include: {
          participants: true
        }
      });

      let conversation = conversations.find(conv => {
        const userIds = conv.participants.map(p => p.user_id).sort();
        const targetIds = [data.senderId, data.receiverId].sort();
        return userIds.length === 2 && 
               userIds[0] === targetIds[0] && 
               userIds[1] === targetIds[1];
      });

      if (!conversation) {
        // Create new conversation
        conversation = await this.prisma.conversations.create({
          data: {
            type: 'private',
            participants: {
              create: [
                { user_id: data.senderId },
                { user_id: data.receiverId }
              ]
            }
          },
          include: {
            participants: true
          }
        });
      }

      // 2. Create message
      const message = await this.prisma.messages.create({
        data: {
          conversation_id: conversation.id,
          sender_id: data.senderId,
          content: data.content,
          post_id: data.postId, // ✅ Include postId
          message_type: data.messageType, // ✅ Include messageType
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

      // Debug log để kiểm tra dữ liệu
      this.logger.log(`Created message with data:`, {
        id: message.id,
        post_id: (message as any).post_id,
        message_type: (message as any).message_type,
        postId: data.postId,
        messageType: data.messageType
      });

      // 3. Format message for frontend
      const formattedMessage = {
        id: message.id,
        senderId: message.sender_id,
        receiverId: data.receiverId,
        content: message.content,
        createdAt: message.created_at.toISOString(),
        sharedPostId: (message as any).post_id || null, // ✅ Include shared post ID
        messageType: (message as any).message_type || null, // ✅ Include message type
        sender: {
          Id: message.sender?.id || message.sender_id,
          Fullname: message.sender?.full_name || 'Unknown User',
          Avatar: message.sender?.avatar_url || null,
        }
      };

      // Debug log để kiểm tra formatted message
      this.logger.log(`Formatted message:`, {
        sharedPostId: formattedMessage.sharedPostId,
        messageType: formattedMessage.messageType,
        originalPostId: data.postId,
        originalMessageType: data.messageType
      });

      // 4. Send message to both users
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

  @SubscribeMessage('openChat')
  async handleOpenChat(
    @MessageBody() data: { openerId: number; targetId: number },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      if (!data || !data.openerId || !data.targetId) return;

      this.logger.log(`User ${data.openerId} opening chat with ${data.targetId}`);

      // 1. Get target user info
      const targetUser = await this.prisma.users.findUnique({
        where: { id: data.targetId },
        select: {
          id: true,
          full_name: true,
          avatar_url: true,
        }
      });

      if (!targetUser) {
        client.emit('chatOpened', {
          success: false,
          error: 'Target user not found',
        });
        return;
      }

      // 2. Find conversation between users
      const conversations = await this.prisma.conversations.findMany({
        where: {
          type: 'private'
        },
        include: {
          participants: true,
          messages: {
            orderBy: { created_at: 'asc' },
            include: {
              sender: {
                select: {
                  id: true,
                  full_name: true,
                  avatar_url: true,
                }
              },
              message_reactions: true,
              message_media: true, // ✅ Include media files
            }
          }
        }
      });

      const conversation = conversations.find(conv => {
        const userIds = conv.participants.map(p => p.user_id).sort();
        const targetIds = [data.openerId, data.targetId].sort();
        return userIds.length === 2 && 
               userIds[0] === targetIds[0] && 
               userIds[1] === targetIds[1];
      });

      // 3. Format messages
      let formattedMessages: any[] = [];
      if (conversation) {
        formattedMessages = conversation.messages.map(msg => {
          // ✅ Debug log raw reactions from database
          this.logger.log(`🔍 Message ${msg.id} raw message_reactions from DB:`, msg.message_reactions);
          
          // Group reactions by emoji
          const reactionsGrouped = (msg.message_reactions || []).reduce((acc, r) => {
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

          const formattedMessage = {
            id: msg.id,
            senderId: msg.sender_id,
            receiverId: data.targetId === msg.sender_id ? data.openerId : data.targetId,
            content: msg.content,
            createdAt: msg.created_at.toISOString(),
            sharedPostId: (msg as any).post_id, // ✅ Include shared post ID
            messageType: (msg as any).message_type, // ✅ Include message type
            reactions: formattedReactions, // ✅ Include reactions
            mediaFiles: mediaFiles, // ✅ Include media files
            sender: {
              Id: msg.sender?.id,
              Fullname: msg.sender?.full_name || 'Unknown User',
              Avatar: msg.sender?.avatar_url,
            }
          };
          
          // ✅ Debug final formatted message
          this.logger.log(`✉️ Final formatted message ${msg.id}:`, JSON.stringify(formattedMessage, null, 2));
          
          return formattedMessage;
        });
      }

      // 4. Notify target user (optional)
      this.server.to(`${data.targetId}`).emit('openChat', { 
        from: data.openerId, 
        user: {
          Id: targetUser.id,
          Fullname: targetUser.full_name || 'Unknown User',
          Avatar: targetUser.avatar_url,
        }
      });

      // 5. Send conversation to opener
      // ✅ Debug log before emitting
      this.logger.log(`📤 Emitting conversation to user ${data.openerId} with ${formattedMessages.length} messages`);
      if (formattedMessages.length > 0) {
        const firstMsg = formattedMessages[0];
        this.logger.log(`📤 First message sample:`, JSON.stringify(firstMsg, null, 2));
      }
      
      client.emit('conversation', { 
        with: {
          Id: targetUser.id,
          Fullname: targetUser.full_name || 'Unknown User',
          Avatar: targetUser.avatar_url,
        }, 
        messages: formattedMessages 
      });

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
    @MessageBody() data: { userId: number; partnerId: number },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      this.logger.log(`User ${data.userId} marked conversation with ${data.partnerId} as read`);
      
      // Find conversation
      const conversations = await this.prisma.conversations.findMany({
        where: {
          type: 'private'
        },
        include: {
          participants: true,
          messages: true
        }
      });

      const conversation = conversations.find(conv => {
        const userIds = conv.participants.map(p => p.user_id).sort();
        const targetIds = [data.userId, data.partnerId].sort();
        return userIds.length === 2 && 
               userIds[0] === targetIds[0] && 
               userIds[1] === targetIds[1];
      });

      if (conversation) {
        // Mark all messages as read for this user
        const messageIds = conversation.messages.map(m => m.id);
        
        // Create message reads (skip if already exists)
        for (const messageId of messageIds) {
          await this.prisma.message_reads.upsert({
            where: {
              message_id_user_id: {
                message_id: messageId,
                user_id: data.userId
              }
            },
            create: {
              message_id: messageId,
              user_id: data.userId,
            },
            update: {
              read_at: new Date()
            }
          });
        }
      }

      // Notify partner that messages have been read
      this.server.to(`${data.partnerId}`).emit('conversationMarkedRead', {
        userId: data.userId,
        partnerId: data.partnerId,
      });

      // Confirm to sender
      client.emit('conversationReadConfirmed', {
        partnerId: data.partnerId,
        message: 'Conversation marked as read',
      });

    } catch (error) {
      this.logger.error('Error marking conversation as read:', error);
    }
  }

  @SubscribeMessage('getOnlineUsers')
  handleGetOnlineUsers(@ConnectedSocket() client: Socket) {
    const rooms = this.server.sockets.adapter.rooms;
    const onlineUserIds: number[] = [];
    
    for (const [roomName] of rooms) {
      if (/^\d+$/.test(roomName)) {
        onlineUserIds.push(parseInt(roomName));
      }
    }
    
    client.emit('onlineUsers', onlineUserIds);
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
      receiverId: number; 
      content?: string; 
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
      this.logger.log(`User ${data.senderId} sending message with media to ${data.receiverId}`);

      // 1. Find or create conversation
      const conversations = await this.prisma.conversations.findMany({
        where: { type: 'private' },
        include: { participants: true }
      });

      let conversation = conversations.find(conv => {
        const userIds = conv.participants.map(p => p.user_id).sort();
        const targetIds = [data.senderId, data.receiverId].sort();
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
                { user_id: data.senderId },
                { user_id: data.receiverId }
              ]
            }
          },
          include: { participants: true }
        });
      }

      // 2. Determine message type
      const messageType = data.mediaFiles.length > 0 
        ? (data.mediaFiles[0].type === 'image' ? 'image' : data.mediaFiles[0].type === 'video' ? 'video' : 'file')
        : 'text';

      // 3. Create message
      const message = await this.prisma.messages.create({
        data: {
          conversation_id: conversation.id,
          sender_id: data.senderId,
          content: data.content || '',
          message_type: messageType,
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
        senderId: message.sender_id,
        receiverId: data.receiverId,
        content: message.content,
        createdAt: message.created_at.toISOString(),
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
        sender: {
          Id: message.sender?.id,
          Fullname: message.sender?.full_name || 'Unknown User',
          Avatar: message.sender?.avatar_url,
        }
      };

      // 6. Send to both users
      this.server.to(`${data.senderId}`).emit('newMessage', formattedMessage);
      this.server.to(`${data.receiverId}`).emit('newMessage', formattedMessage);

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