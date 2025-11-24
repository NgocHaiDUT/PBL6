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

  constructor(private messagesService: MessagesService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    client.emit('connected', {
      message: 'Connected to chat server',
      clientId: client.id,
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join')
  handleJoin(@MessageBody() userId: number, @ConnectedSocket() client: Socket) {
    if (!userId) return;
    client.join(`${userId}`);
    this.logger.log(`User ${userId} joined room`);
    client.emit('joined', { userId, message: 'Successfully joined chat' });
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() data: SendMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      this.logger.log(
        `Message from ${data.senderId} to ${data.receiverId}: ${data.content}`,
      );

      // 1. Find or create conversation using MessagesService
      const conversation = await this.messagesService.findOrCreateConversation(
        data.senderId,
        data.receiverId,
      );

      // 2. Create message using MessagesService
      const message = await this.messagesService.sendMessage(data.senderId, {
        conversation_id: conversation.id,
        content: data.content,
        type: data.type,
        payload: data.payload,
      });

      // 3. Format message for frontend
      const formattedMessage = {
        id: message.id,
        conversationId: message.conversation_id,
        senderId: message.sender_id,
        receiverId: data.receiverId, // Keep receiverId for frontend convenience
        content: message.content,
        type: message.type,
        payload: message.payload,
        createdAt: message.created_at.toISOString(),
        sender: {
          id: message.sender.id,
          fullName: message.sender.full_name || 'Unknown User',
          avatarUrl: message.sender.avatar_url,
        },
      };

      // 4. Send message to both users in the conversation
      conversation.participants.forEach((participant) => {
        this.server
          .to(`${participant.user_id}`)
          .emit('newMessage', formattedMessage);
      });

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
            this.server.to(`${p.user_id}`).emit('messageDeleted', {
              messageId: data.messageId,
              conversationId: conversation.id,
            });
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

      // 1. Find or create conversation
      const conversation = await this.messagesService.findOrCreateConversation(
        data.openerId,
        data.targetId,
      );

      // 2. Get conversation messages
      const messageHistory = await this.messagesService.getMessages(
        conversation.id,
        data.openerId,
        { page: 1, limit: 50 }, // Load last 50 messages
      );

      // 3. Get target user info from conversation participants
      const targetUserParticipant = conversation.participants.find(
        (p) => p.user_id === data.targetId,
      );

      if (!targetUserParticipant) {
        throw new Error('Target user not found in conversation');
      }
      const targetUser = targetUserParticipant.user;

      // 4. Format messages for frontend
      const formattedMessages = messageHistory.data.map((msg) => ({
        id: msg.id,
        conversationId: msg.conversation_id,
        senderId: msg.sender_id,
        receiverId:
          data.targetId === msg.sender_id ? data.openerId : data.targetId,
        content: msg.content,
        type: msg.type,
        payload: msg.payload,
        createdAt: msg.created_at.toISOString(),
        sender: {
          id: msg.sender.id,
          fullName: msg.sender.full_name || 'Unknown User',
          avatarUrl: msg.sender.avatar_url,
        },
      }));

      // 5. Send conversation history to opener
      client.emit('conversation', {
        with: {
          id: targetUser.id,
          fullName: targetUser.full_name || 'Unknown User',
          avatarUrl: targetUser.avatar_url,
        },
        messages: formattedMessages,
        pagination: messageHistory.pagination,
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
