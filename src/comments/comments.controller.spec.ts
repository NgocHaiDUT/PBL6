import { Test, TestingModule } from '@nestjs/testing';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CommentsController', () => {
  let controller: CommentsController;
  let service: CommentsService;

  const mockCommentsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getReplies: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentsController],
      providers: [
        {
          provide: CommentsService,
          useValue: mockCommentsService,
        },
      ],
    }).compile();

    controller = module.get<CommentsController>(CommentsController);
    service = module.get<CommentsService>(CommentsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a comment', async () => {
      const createCommentDto = {
        target_type: 'post',
        target_id: 1,
        content: 'Test comment',
      };
      const mockRequest = { user: { id: 1 } };
      const expectedResult = { id: 1, ...createCommentDto, user_id: 1 };

      mockCommentsService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createCommentDto, mockRequest);

      expect(service.create).toHaveBeenCalledWith(createCommentDto, 1);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findAll', () => {
    it('should return paginated comments', async () => {
      const queryDto = {
        target_type: 'post',
        target_id: 1,
        page: 1,
        limit: 20,
      };
      const expectedResult = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        total_pages: 0,
      };

      mockCommentsService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(queryDto);

      expect(service.findAll).toHaveBeenCalledWith(queryDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findOne', () => {
    it('should return a comment by id', async () => {
      const commentId = 1;
      const expectedResult = { id: commentId, content: 'Test comment' };

      mockCommentsService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(commentId);

      expect(service.findOne).toHaveBeenCalledWith(commentId);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('update', () => {
    it('should update a comment', async () => {
      const commentId = 1;
      const updateCommentDto = { content: 'Updated comment' };
      const mockRequest = { user: { id: 1 } };
      const expectedResult = { id: commentId, ...updateCommentDto };

      mockCommentsService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(
        commentId,
        updateCommentDto,
        mockRequest,
      );

      expect(service.update).toHaveBeenCalledWith(
        commentId,
        updateCommentDto,
        1,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('remove', () => {
    it('should delete a comment', async () => {
      const commentId = 1;
      const mockRequest = { user: { id: 1 } };

      mockCommentsService.remove.mockResolvedValue(undefined);

      await controller.remove(commentId, mockRequest);

      expect(service.remove).toHaveBeenCalledWith(commentId, 1);
    });
  });

  describe('getReplies', () => {
    it('should return replies for a comment', async () => {
      const commentId = 1;
      const expectedReplies = [
        { id: 2, parent_id: commentId, content: 'Reply' },
      ];

      mockCommentsService.getReplies.mockResolvedValue(expectedReplies);

      const result = await controller.getReplies(commentId);

      expect(service.getReplies).toHaveBeenCalledWith(commentId);
      expect(result).toEqual(expectedReplies);
    });
  });
});
