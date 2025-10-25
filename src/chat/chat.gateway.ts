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
              }
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
        formattedMessages = conversation.messages.map(msg => ({
          id: msg.id,
          senderId: msg.sender_id,
          receiverId: data.targetId === msg.sender_id ? data.openerId : data.targetId,
          content: msg.content,
          createdAt: msg.created_at.toISOString(),
          sharedPostId: (msg as any).post_id, // ✅ Include shared post ID
          messageType: (msg as any).message_type, // ✅ Include message type  
          sender: {
            Id: msg.sender?.id,
            Fullname: msg.sender?.full_name || 'Unknown User',
            Avatar: msg.sender?.avatar_url,
          }
        }));
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