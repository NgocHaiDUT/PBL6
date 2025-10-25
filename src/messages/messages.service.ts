import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { QueryMessagesDto } from './dto/query-messages.dto';
import { QueryConversationsDto } from './dto/query-conversations.dto';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  // Tạo cuộc hội thoại mới
  async createConversation(userId: number, createConversationDto: CreateConversationDto) {
    const { participant_ids, type } = createConversationDto;

    // Kiểm tra user có trong danh sách participants không
    if (!participant_ids.includes(userId)) {
      participant_ids.push(userId);
    }

    // Kiểm tra nếu là conversation private (2 người) đã tồn tại chưa
    if (type === 'private' && participant_ids.length === 2) {
      const existingConversation = await this.prisma.conversations.findFirst({
        where: {
          type: 'private',
          participants: {
            every: {
              user_id: { in: participant_ids }
            }
          }
        },
        include: {
          participants: {
            include: {
              user: {
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

      if (existingConversation && existingConversation.participants.length === 2) {
        return existingConversation;
      }
    }

    // Tạo conversation mới
    const conversation = await this.prisma.conversations.create({
      data: {
        type,
      },
      include: {
        participants: {
          include: {
            user: {
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

    // Thêm participants
    await this.prisma.conversation_participants.createMany({
      data: participant_ids.map(participantId => ({
        conversation_id: conversation.id,
        user_id: participantId,
        role: participantId === userId ? 'admin' : 'member'
      }))
    });

    // Lấy conversation với participants đã được thêm
    return this.getConversationById(conversation.id, userId);
  }

  // Lấy danh sách cuộc hội thoại của user
  async getUserConversations(userId: number, queryDto: QueryConversationsDto) {
    const { page = 1, limit = 10 } = queryDto;
    const skip = (page - 1) * limit;

    const [conversations, total] = await Promise.all([
      this.prisma.conversations.findMany({
        where: {
          participants: {
            some: {
              user_id: userId
            }
          }
        },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  full_name: true,
                  avatar_url: true,
                }
              }
            }
          },
          messages: {
            take: 1,
            orderBy: { created_at: 'desc' },
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
      }),
      this.prisma.conversations.count({
        where: {
          participants: {
            some: {
              user_id: userId
            }
          }
        }
      })
    ]);

    // Thêm thông tin unread count cho mỗi conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conversation) => {
        const unreadCount = await this.getUnreadMessagesCount(conversation.id, userId);
        
        return {
          ...conversation,
          unread_count: unreadCount,
          last_message: conversation.messages[0] || null,
          messages: undefined // Remove messages array from response
        };
      })
    );

    return {
      data: conversationsWithUnread,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Lấy chi tiết cuộc hội thoại
  async getConversationById(conversationId: number, userId: number) {
    const conversation = await this.prisma.conversations.findFirst({
      where: {
        id: conversationId,
        participants: {
          some: {
            user_id: userId
          }
        }
      },
      include: {
        participants: {
          include: {
            user: {
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

    if (!conversation) {
      throw new NotFoundException('Conversation not found or you do not have access');
    }

    return conversation;
  }

  // Gửi tin nhắn
  async sendMessage(userId: number, createMessageDto: CreateMessageDto) {
    const { conversation_id, sender_id, receiver_id, content, postId, messageType } = createMessageDto;
    
    let finalConversationId = conversation_id;
    
    // If conversation_id not provided, find or create conversation using sender_id and receiver_id
    if (!finalConversationId && sender_id && receiver_id) {
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
        const targetIds = [sender_id, receiver_id].sort();
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
                { user_id: sender_id },
                { user_id: receiver_id }
              ]
            }
          },
          include: {
            participants: true
          }
        });
      }
      
      finalConversationId = conversation.id;
    }

    if (!finalConversationId) {
      throw new BadRequestException('Either conversation_id or both sender_id and receiver_id must be provided');
    }

    // Kiểm tra user có quyền gửi tin nhắn trong conversation này không
    const participant = await this.prisma.conversation_participants.findFirst({
      where: {
        conversation_id: finalConversationId,
        user_id: sender_id || userId
      }
    });

    if (!participant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    // Tạo tin nhắn
    const message = await this.prisma.messages.create({
      data: {
        conversation_id: finalConversationId,
        sender_id: sender_id || userId,
        content,
        post_id: postId, // ✅ Include postId
        message_type: messageType // ✅ Include messageType
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

    // Tự động đánh dấu là đã đọc cho người gửi
    await this.prisma.message_reads.create({
      data: {
        message_id: message.id,
        user_id: sender_id || userId
      }
    });

    return message;
  }

  // Lấy tin nhắn trong cuộc hội thoại
  async getMessages(conversationId: number, userId: number, queryDto: QueryMessagesDto) {
    const { page = 1, limit = 20 } = queryDto;
    const skip = (page - 1) * limit;

    // Kiểm tra user có quyền xem tin nhắn không
    const participant = await this.prisma.conversation_participants.findFirst({
      where: {
        conversation_id: conversationId,
        user_id: userId
      }
    });

    if (!participant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    const [messages, total] = await Promise.all([
      this.prisma.messages.findMany({
        where: {
          conversation_id: conversationId
        },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          sender: {
            select: {
              id: true,
              full_name: true,
              avatar_url: true,
            }
          },
          message_reads: {
            include: {
              user: {
                select: {
                  id: true,
                  full_name: true,
                  avatar_url: true,
                }
              }
            }
          }
        }
      }),
      this.prisma.messages.count({
        where: {
          conversation_id: conversationId
        }
      })
    ]);

    return {
      data: messages.reverse(), // Reverse để hiển thị tin nhắn mới nhất ở cuối
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Đánh dấu tin nhắn là đã đọc
  async markMessageAsRead(messageId: number, userId: number) {
    // Kiểm tra tin nhắn có tồn tại không
    const message = await this.prisma.messages.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          include: {
            participants: true
          }
        }
      }
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Kiểm tra user có quyền đánh dấu đã đọc không
    const isParticipant = message.conversation.participants.some(
      p => p.user_id === userId
    );

    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    // Kiểm tra đã đánh dấu đọc chưa
    const existingRead = await this.prisma.message_reads.findUnique({
      where: {
        message_id_user_id: {
          message_id: messageId,
          user_id: userId
        }
      }
    });

    if (existingRead) {
      return { message: 'Message already marked as read' };
    }

    // Đánh dấu đã đọc
    await this.prisma.message_reads.create({
      data: {
        message_id: messageId,
        user_id: userId
      }
    });

    return { message: 'Message marked as read' };
  }

  // Đánh dấu tất cả tin nhắn trong conversation là đã đọc  
  async markAllMessagesAsRead(conversationId: number, userId: number) {
    // Kiểm tra user có quyền không
    const participant = await this.prisma.conversation_participants.findFirst({
      where: {
        conversation_id: conversationId,
        user_id: userId
      }
    });

    if (!participant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    // Lấy tất cả tin nhắn chưa đọc
    const unreadMessages = await this.prisma.messages.findMany({
      where: {
        conversation_id: conversationId,
        NOT: {
          message_reads: {
            some: {
              user_id: userId
            }
          }
        }
      },
      select: { id: true }
    });

    if (unreadMessages.length === 0) {
      return { message: 'No unread messages' };
    }

    // Đánh dấu tất cả là đã đọc
    await this.prisma.message_reads.createMany({
      data: unreadMessages.map(message => ({
        message_id: message.id,
        user_id: userId
      }))
    });

    return { 
      message: 'All messages marked as read',
      marked_count: unreadMessages.length 
    };
  }

  // Đếm số tin nhắn chưa đọc trong conversation
  async getUnreadMessagesCount(conversationId: number, userId: number): Promise<number> {
    return this.prisma.messages.count({
      where: {
        conversation_id: conversationId,
        NOT: {
          sender_id: userId, // Không đếm tin nhắn của chính mình
          message_reads: {
            some: {
              user_id: userId
            }
          }
        }
      }
    });
  }

  // Tìm kiếm cuộc hội thoại với user khác
  async findOrCreateConversation(userId: number, otherUserId: number) {
    if (userId === otherUserId) {
      throw new BadRequestException('Cannot create conversation with yourself');
    }

    // Tìm conversation private đã tồn tại
    const existingConversation = await this.prisma.conversations.findFirst({
      where: {
        type: 'private',
        participants: {
          every: {
            user_id: { in: [userId, otherUserId] }
          }
        }
      },
      include: {
        participants: {
          include: {
            user: {
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

    if (existingConversation && existingConversation.participants.length === 2) {
      return existingConversation;
    }

    // Tạo conversation mới
    return this.createConversation(userId, {
      participant_ids: [otherUserId],
      type: 'private'
    });
  }

  // Xóa tin nhắn (chỉ người gửi mới có thể xóa)
  async deleteMessage(messageId: number, userId: number) {
    const message = await this.prisma.messages.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.sender_id !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    // Xóa message reads trước
    await this.prisma.message_reads.deleteMany({
      where: { message_id: messageId }
    });

    // Xóa message
    await this.prisma.messages.delete({
      where: { id: messageId }
    });

    return { message: 'Message deleted successfully' };
  }
}
