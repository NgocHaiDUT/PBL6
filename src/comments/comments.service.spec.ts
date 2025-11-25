import { Test, TestingModule } from '@nestjs/testing';
import { CommentsService } from './comments.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('CommentsService', () => {
  let service: CommentsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    posts: {
      findUnique: jest.fn(),
    },
    comments: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createCommentDto = {
      target_type: 'post',
      target_id: 1,
      content: 'Test comment',
    };
    const userId = 1;

    it('should create a comment successfully', async () => {
      const mockPost = { id: 1, title: 'Test Post' };
      const mockComment = {
        id: 1,
        ...createCommentDto,
        user_id: userId,
        created_at: new Date(),
        parent_id: null,
        user: {
          id: 1,
          full_name: 'Test User',
          email: 'test@test.com',
          avatar_url: null,
        },
      };

      mockPrismaService.posts.findUnique.mockResolvedValue(mockPost);
      mockPrismaService.comments.create.mockResolvedValue(mockComment);

      const result = await service.create(createCommentDto, userId);

      expect(prismaService.posts.findUnique).toHaveBeenCalledWith({
        where: { id: createCommentDto.target_id },
      });
      expect(prismaService.comments.create).toHaveBeenCalledWith({
        data: { ...createCommentDto, user_id: userId },
        include: {
          user: {
            select: {
              id: true,
              full_name: true,
              email: true,
              avatar_url: true,
            },
          },
        },
      });
      expect(result).toEqual(mockComment);
    });

    it('should throw NotFoundException when target post does not exist', async () => {
      mockPrismaService.posts.findUnique.mockResolvedValue(null);

      await expect(service.create(createCommentDto, userId)).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaService.posts.findUnique).toHaveBeenCalledWith({
        where: { id: createCommentDto.target_id },
      });
    });

    it('should throw NotFoundException when parent comment does not exist', async () => {
      const createCommentWithParentDto = {
        ...createCommentDto,
        parent_id: 999,
      };
      const mockPost = { id: 1, title: 'Test Post' };

      mockPrismaService.posts.findUnique.mockResolvedValue(mockPost);
      mockPrismaService.comments.findUnique.mockResolvedValue(null);

      await expect(
        service.create(createCommentWithParentDto, userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    const queryDto = {
      target_type: 'post',
      target_id: 1,
      page: 1,
      limit: 20,
    };

    it('should return paginated comments', async () => {
      const mockComments = [
        {
          id: 1,
          target_type: 'post',
          target_id: 1,
          content: 'Test comment',
          user_id: 1,
          parent_id: null,
          created_at: new Date(),
          user: {
            id: 1,
            full_name: 'Test User',
            email: 'test@test.com',
            avatar_url: null,
          },
        },
      ];
      const totalCount = 1;

      mockPrismaService.comments.findMany.mockResolvedValue(mockComments);
      mockPrismaService.comments.count
        .mockResolvedValueOnce(totalCount) // For total count
        .mockResolvedValueOnce(0); // For replies count

      const result = await service.findAll(queryDto);

      expect(result).toEqual({
        data: expect.arrayContaining([
          expect.objectContaining({
            ...mockComments[0],
            replies_count: 0,
          }),
        ]),
        total: totalCount,
        page: 1,
        limit: 20,
        total_pages: 1,
      });
    });
  });

  describe('findOne', () => {
    it('should return a comment with replies', async () => {
      const commentId = 1;
      const mockComment = {
        id: commentId,
        content: 'Test comment',
        user: {
          id: 1,
          full_name: 'Test User',
          email: 'test@test.com',
          avatar_url: null,
        },
      };
      const mockReplies = [
        {
          id: 2,
          parent_id: commentId,
          content: 'Test reply',
          user: {
            id: 2,
            full_name: 'Another User',
            email: 'test2@test.com',
            avatar_url: null,
          },
        },
      ];

      mockPrismaService.comments.findUnique.mockResolvedValue(mockComment);
      mockPrismaService.comments.findMany.mockResolvedValue(mockReplies);

      const result = await service.findOne(commentId);

      expect(result).toEqual({
        ...mockComment,
        replies: mockReplies,
      });
    });

    it('should throw NotFoundException when comment does not exist', async () => {
      const commentId = 999;
      mockPrismaService.comments.findUnique.mockResolvedValue(null);

      await expect(service.findOne(commentId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const commentId = 1;
    const updateCommentDto = { content: 'Updated content' };
    const userId = 1;

    it('should update a comment successfully', async () => {
      const existingComment = {
        id: commentId,
        user_id: userId,
        content: 'Original content',
      };
      const updatedComment = { ...existingComment, ...updateCommentDto };

      mockPrismaService.comments.findUnique.mockResolvedValue(existingComment);
      mockPrismaService.comments.update.mockResolvedValue(updatedComment);

      const result = await service.update(commentId, updateCommentDto, userId);

      expect(result).toEqual(updatedComment);
    });

    it('should throw NotFoundException when comment does not exist', async () => {
      mockPrismaService.comments.findUnique.mockResolvedValue(null);

      await expect(
        service.update(commentId, updateCommentDto, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when user tries to update someone else's comment", async () => {
      const existingComment = {
        id: commentId,
        user_id: 2,
        content: 'Original content',
      };
      mockPrismaService.comments.findUnique.mockResolvedValue(existingComment);

      await expect(
        service.update(commentId, updateCommentDto, userId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    const commentId = 1;
    const userId = 1;

    it('should delete a comment and its replies successfully', async () => {
      const existingComment = { id: commentId, user_id: userId };

      mockPrismaService.comments.findUnique.mockResolvedValue(existingComment);
      mockPrismaService.comments.deleteMany.mockResolvedValue({ count: 2 });
      mockPrismaService.comments.delete.mockResolvedValue(existingComment);

      await service.remove(commentId, userId);

      expect(prismaService.comments.deleteMany).toHaveBeenCalledWith({
        where: { parent_id: commentId },
      });
      expect(prismaService.comments.delete).toHaveBeenCalledWith({
        where: { id: commentId },
      });
    });

    it('should throw NotFoundException when comment does not exist', async () => {
      mockPrismaService.comments.findUnique.mockResolvedValue(null);

      await expect(service.remove(commentId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw ForbiddenException when user tries to delete someone else's comment", async () => {
      const existingComment = { id: commentId, user_id: 2 };
      mockPrismaService.comments.findUnique.mockResolvedValue(existingComment);

      await expect(service.remove(commentId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getReplies', () => {
    it('should return replies for a comment', async () => {
      const commentId = 1;
      const parentComment = { id: commentId, content: 'Parent comment' };
      const mockReplies = [
        {
          id: 2,
          parent_id: commentId,
          content: 'Reply 1',
          user: {
            id: 1,
            full_name: 'User 1',
            email: 'user1@test.com',
            avatar_url: null,
          },
        },
        {
          id: 3,
          parent_id: commentId,
          content: 'Reply 2',
          user: {
            id: 2,
            full_name: 'User 2',
            email: 'user2@test.com',
            avatar_url: null,
          },
        },
      ];

      mockPrismaService.comments.findUnique.mockResolvedValue(parentComment);
      mockPrismaService.comments.findMany.mockResolvedValue(mockReplies);

      const result = await service.getReplies(commentId);

      expect(result).toEqual(mockReplies);
    });

    it('should throw NotFoundException when parent comment does not exist', async () => {
      const commentId = 999;
      mockPrismaService.comments.findUnique.mockResolvedValue(null);

      await expect(service.getReplies(commentId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
