import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { QueryMessagesDto } from './dto/query-messages.dto';
import { QueryConversationsDto } from './dto/query-conversations.dto';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  // Tạo cuộc hội thoại mới
  async createConversation(
    userId: number,
    createConversationDto: CreateConversationDto,
  ) {
    const { participant_ids, shop_id, type } = createConversationDto;

    // Nếu là chat với shop
    if (shop_id) {
      return this.findOrCreateShopConversation(userId, shop_id);
    }

    // Chat với users
    const participants = participant_ids || [];
    
    // Kiểm tra user có trong danh sách participants không
    if (!participants.includes(userId)) {
      participants.push(userId);
    }

    // Kiểm tra nếu là conversation private (2 người) đã tồn tại chưa
    if (type === 'private' && participants.length === 2) {
      const existingConversation = await this.prisma.conversations.findFirst({
        where: {
          type: 'private',
          participants: {
            every: {
              user_id: { in: participants },
              entity_type: 'user',
            },
          },
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  full_name: true,
                  avatar_url: true,
                },
              },
            },
          },
        },
      });

      if (
        existingConversation &&
        existingConversation.participants.length === 2
      ) {
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
              },
            },
          },
        },
      },
    });

    // Thêm participants (users only)
    await this.prisma.conversation_participants.createMany({
      data: participants.map((participantId) => ({
        conversation_id: conversation.id,
        user_id: participantId,
        entity_type: 'user',
        role: participantId === userId ? 'admin' : 'member',
      })),
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
              user_id: userId,
              entity_type: 'user',
            },
          },
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
                },
              },
              shop: {
                select: {
                  id: true,
                  name: true,
                  logo_url: true,
                }
              },
            },
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
                },
              },
              sender_shop: {
                select: {
                  id: true,
                  name: true,
                  logo_url: true,
                }
              },
            },
          },
        },
      }),
      this.prisma.conversations.count({
        where: {
          participants: {
            some: {
              user_id: userId,
              entity_type: 'user',
            },
          },
        },
      }),
    ]);

    // Thêm thông tin unread count cho mỗi conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conversation) => {
        const unreadCount = await this.getUnreadMessagesCount(
          conversation.id,
          userId,
        );

        return {
          ...conversation,
          unread_count: unreadCount,
          last_message: conversation.messages[0] || null,
          messages: undefined, // Remove messages array from response
        };
      }),
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
            user_id: userId,
            entity_type: 'user',
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                full_name: true,
                avatar_url: true,
              },
            },
            shop: {
              select: {
                id: true,
                name: true,
                logo_url: true,
              }
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException(
        'Conversation not found or you do not have access',
      );
    }

    return conversation;
  }

  // Lấy danh sách conversations của shop
  async getShopConversations(shopId: number, userId: number, queryDto: QueryConversationsDto) {
    // Kiểm tra user có quyền truy cập shop này không
    // 1. Kiểm tra xem user có phải là owner của shop không
    const shop = await this.prisma.shops.findFirst({
      where: {
        id: shopId,
        owner_id: userId,
      }
    });

    // 2. Nếu không phải owner, kiểm tra xem có phải là staff không
    if (!shop) {
      const shopStaff = await this.prisma.shop_staffs.findFirst({
        where: {
          shop_id: shopId,
          user_id: userId,
        }
      });

      if (!shopStaff) {
        throw new ForbiddenException('You do not have access to this shop');
      }
    }

    const { page = 1, limit = 10 } = queryDto;
    const skip = (page - 1) * limit;

    const [conversations, total] = await Promise.all([
      this.prisma.conversations.findMany({
        where: {
          participants: {
            some: {
              shop_id: shopId,
              entity_type: 'shop'
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
              },
              shop: {
                select: {
                  id: true,
                  name: true,
                  logo_url: true,
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
              },
              sender_shop: {
                select: {
                  id: true,
                  name: true,
                  logo_url: true,
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
              shop_id: shopId,
              entity_type: 'shop'
            }
          }
        }
      })
    ]);

    // Thêm thông tin unread count cho mỗi conversation
    // Note: Shop không có message_reads, chỉ user mới có
    const conversationsWithInfo = conversations.map(conversation => {
      return {
        ...conversation,
        last_message: conversation.messages[0] || null,
        messages: undefined // Remove messages array from response
      };
    });

    return {
      data: conversationsWithInfo,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Lấy chi tiết tin nhắn
  async getMessageById(messageId: number) {
    const message = await this.prisma.messages.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    return message;
  }

  // Gửi tin nhắn (từ user hoặc shop)
  async sendMessage(userId: number, createMessageDto: CreateMessageDto, shopId?: number) {
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
                { user_id: sender_id, entity_type: 'user' },
                { user_id: receiver_id, entity_type: 'user' }
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

    // Nếu gửi từ shop, kiểm tra user có quyền quản lý shop không
    if (shopId) {
      // Kiểm tra user có phải là owner của shop không
      const shop = await this.prisma.shops.findFirst({
        where: {
          id: shopId,
          owner_id: userId,
        }
      });

      // Nếu không phải owner, kiểm tra có phải là staff không
      if (!shop) {
        const shopStaff = await this.prisma.shop_staffs.findFirst({
          where: {
            shop_id: shopId,
            user_id: userId,
          }
        });

        if (!shopStaff) {
          throw new ForbiddenException('You do not have permission to send messages as this shop');
        }
      }
    }

    // Xác định sender type và sender id
    const senderType = shopId ? 'shop' : 'user';
    const senderId = shopId || userId;

    // Kiểm tra quyền gửi tin nhắn trong conversation này
    const participant = await this.prisma.conversation_participants.findFirst({
      where: {
        conversation_id: finalConversationId,
        ...(shopId 
          ? { shop_id: shopId, entity_type: 'shop' }
          : { user_id: sender_id || userId, entity_type: 'user' }
        )
      }
    });

    if (!participant) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }

    // Tạo tin nhắn
    const message = await this.prisma.messages.create({
      data: {
        conversation_id: finalConversationId,
        sender_id: shopId ? null : sender_id || userId,
        sender_shop_id: shopId || null,
        sender_type: senderType,
        content,
        post_id: postId, // ✅ Include postId
        type: messageType, // ✅ Include messageType as enum
      },
      include: {
        sender: {
          select: {
            id: true,
            full_name: true,
            avatar_url: true,
          },
        },
        sender_shop: {
          select: {
            id: true,
            name: true,
            logo_url: true,
          }
        },
      },
    });

    // Tự động đánh dấu là đã đọc cho người gửi (chỉ với user)
    if (!shopId) {
      await this.prisma.message_reads.create({
        data: {
          message_id: message.id,
          user_id: sender_id || userId
        }
      });
    }

    return message;
  }

  // Lấy tin nhắn trong cuộc hội thoại
  async getMessages(
    conversationId: number,
    userId: number,
    queryDto: QueryMessagesDto,
  ) {
    const { page, limit = 30, cursor, before, after } = queryDto;

    // Kiểm tra user có quyền xem tin nhắn không
    const participant = await this.prisma.conversation_participants.findFirst({
      where: {
        conversation_id: conversationId,
        user_id: userId,
      },
    });

    if (!participant) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }

    // Cursor-based pagination (tối ưu cho infinite scroll)
    if (cursor || before || after) {
      const whereCondition: any = {
        conversation_id: conversationId,
      };

      // Load tin nhắn cũ hơn (scroll lên - load history)
      if (before) {
        whereCondition.id = { lt: before };
      }
      // Load tin nhắn mới hơn (scroll xuống - load new messages)
      else if (after) {
        whereCondition.id = { gt: after };
      }
      // Load từ cursor
      else if (cursor) {
        whereCondition.id = { lte: cursor };
      }

      const messages = await this.prisma.messages.findMany({
        where: whereCondition,
        take: limit + 1, // Lấy thêm 1 để kiểm tra hasMore
        orderBy: { id: 'desc' }, // Sử dụng ID thay vì created_at cho consistency
        include: {
          sender: {
            select: {
              id: true,
              full_name: true,
              avatar_url: true,
            }
          },
          sender_shop: {
            select: {
              id: true,
              name: true,
              logo_url: true,
            }
          },
          message_reads: {
            select: {
              user_id: true,
              read_at: true,
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

      const hasMore = messages.length > limit;
      const data = hasMore ? messages.slice(0, limit) : messages;

      return {
        data: data.reverse(), // Reverse để tin nhắn cũ nhất ở đầu, mới nhất ở cuối
        cursor: {
          next: hasMore ? data[data.length - 1]?.id : null,
          previous: data.length > 0 ? data[0]?.id : null,
          hasMore,
        },
      };
    }

    // Offset-based pagination (fallback hoặc cho phân trang cổ điển)
    const skip = page ? (page - 1) * limit : 0;

    const [messages, total] = await Promise.all([
      this.prisma.messages.findMany({
        where: {
          conversation_id: conversationId,
        },
        skip,
        take: limit,
        orderBy: { id: 'desc' },
        include: {
          sender: {
            select: {
              id: true,
              full_name: true,
              avatar_url: true,
            },
          },
          sender_shop: {
            select: {
              id: true,
              name: true,
              logo_url: true,
            }
          },
          message_reads: {
            select: {
              user_id: true,
              read_at: true,
              user: {
                select: {
                  id: true,
                  full_name: true,
                  avatar_url: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.messages.count({
        where: {
          conversation_id: conversationId,
        },
      }),
    ]);

    return {
      data: messages.reverse(),
      pagination: {
        page: page || 1,
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
            participants: true,
          },
        },
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Kiểm tra user có quyền đánh dấu đã đọc không
    const isParticipant = message.conversation.participants.some(
      (p) => p.user_id === userId,
    );

    if (!isParticipant) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }

    // Kiểm tra đã đánh dấu đọc chưa
    const existingRead = await this.prisma.message_reads.findUnique({
      where: {
        message_id_user_id: {
          message_id: messageId,
          user_id: userId,
        },
      },
    });

    if (existingRead) {
      return { message: 'Message already marked as read' };
    }

    // Đánh dấu đã đọc
    await this.prisma.message_reads.create({
      data: {
        message_id: messageId,
        user_id: userId,
      },
    });

    return { message: 'Message marked as read' };
  }

  // Đánh dấu tất cả tin nhắn trong conversation là đã đọc
  async markAllMessagesAsRead(conversationId: number, userId: number) {
    // Kiểm tra user có quyền không
    const participant = await this.prisma.conversation_participants.findFirst({
      where: {
        conversation_id: conversationId,
        user_id: userId,
      },
    });

    if (!participant) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }

    // Lấy tất cả tin nhắn chưa đọc
    const unreadMessages = await this.prisma.messages.findMany({
      where: {
        conversation_id: conversationId,
        NOT: {
          message_reads: {
            some: {
              user_id: userId,
            },
          },
        },
      },
      select: { id: true },
    });

    if (unreadMessages.length === 0) {
      return { message: 'No unread messages' };
    }

    // Đánh dấu tất cả là đã đọc
    await this.prisma.message_reads.createMany({
      data: unreadMessages.map((message) => ({
        message_id: message.id,
        user_id: userId,
      })),
    });

    return {
      message: 'All messages marked as read',
      marked_count: unreadMessages.length,
    };
  }

  // Đếm số tin nhắn chưa đọc trong conversation
  async getUnreadMessagesCount(
    conversationId: number,
    userId: number,
  ): Promise<number> {
    return this.prisma.messages.count({
      where: {
        conversation_id: conversationId,
        sender_id: {
          not: userId // Không đếm tin nhắn của chính mình
        },
        NOT: {
          message_reads: {
            some: {
              user_id: userId,
            },
          },
        },
      },
    });
  }

  // Tìm kiếm cuộc hội thoại với user khác
  async findOrCreateConversation(userId: number, otherUserId: number) {
    console.log(`🔍 [findOrCreateConversation] Finding conversation between users ${userId} and ${otherUserId}`);
    
    if (userId === otherUserId) {
      throw new BadRequestException('Cannot create conversation with yourself');
    }

    // Tìm conversation private đã tồn tại
    const existingConversation = await this.prisma.conversations.findFirst({
      where: {
        type: 'private',
        participants: {
          every: {
            user_id: { in: [userId, otherUserId] },
            entity_type: 'user'
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
    try {
      // Tìm tất cả conversations private của userId
      const userConversations = await this.prisma.conversations.findMany({
        where: {
          type: 'private',
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

      console.log(`📋 [findOrCreateConversation] Found ${userConversations.length} conversations for user ${userId}`);

      // Tìm conversation có đúng 2 participants: userId và otherUserId
      const existingConversation = userConversations.find(conv => {
        if (conv.participants.length !== 2) return false;
        const participantIds = conv.participants.map(p => p.user_id).sort();
        const targetIds = [userId, otherUserId].sort();
        return participantIds[0] === targetIds[0] && participantIds[1] === targetIds[1];
      });

      if (existingConversation) {
        console.log(`✅ [findOrCreateConversation] Found existing conversation:`, existingConversation.id);
        return existingConversation;
      }

      // Tạo conversation mới
      console.log(`➕ [findOrCreateConversation] Creating new conversation`);
      return this.createConversation(userId, {
        participant_ids: [otherUserId],
        type: 'private'
      });
    } catch (error) {
      console.error('❌ [findOrCreateConversation] Error:', error);
      throw error;
    }
  }

  // Tìm hoặc tạo conversation với shop
  async findOrCreateShopConversation(userId: number, shopId: number) {
    // Kiểm tra shop có tồn tại không
    const shop = await this.prisma.shops.findUnique({
      where: { id: shopId },
      select: { id: true, name: true, logo_url: true }
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    // Tìm conversation user-shop đã tồn tại
    const existingConversation = await this.prisma.conversations.findFirst({
      where: {
        type: 'user_shop',
        AND: [
          {
            participants: {
              some: {
                user_id: userId,
                entity_type: 'user'
              }
            }
          },
          {
            participants: {
              some: {
                shop_id: shopId,
                entity_type: 'shop'
              }
            }
          }
        ]
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
            },
            shop: {
              select: {
                id: true,
                name: true,
                logo_url: true,
              }
            }
          }
        }
      }
    });

    if (existingConversation) {
      return existingConversation;
    }

    // Tạo conversation mới
    const conversation = await this.prisma.conversations.create({
      data: {
        type: 'user_shop',
      }
    });

    // Thêm user và shop vào participants
    await this.prisma.conversation_participants.createMany({
      data: [
        {
          conversation_id: conversation.id,
          user_id: userId,
          entity_type: 'user',
          role: 'member'
        },
        {
          conversation_id: conversation.id,
          shop_id: shopId,
          entity_type: 'shop',
          role: 'member'
        }
      ]
    });

    // Lấy conversation với đầy đủ thông tin
    return this.prisma.conversations.findUnique({
      where: { id: conversation.id },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                full_name: true,
                avatar_url: true,
              }
            },
            shop: {
              select: {
                id: true,
                name: true,
                logo_url: true,
              }
            }
          }
        }
      }
    });
  }

  // Xóa tin nhắn (chỉ người gửi mới có thể xóa)
  async deleteMessage(messageId: number, userId: number) {
    const message = await this.prisma.messages.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.sender_id !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    // Xóa message reads trước
    await this.prisma.message_reads.deleteMany({
      where: { message_id: messageId },
    });

    // Xóa message
    await this.prisma.messages.delete({
      where: { id: messageId },
    });

    return { message: 'Message deleted successfully' };
  }
}