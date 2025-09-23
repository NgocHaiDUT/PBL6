import { Test, TestingModule } from '@nestjs/testing';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

describe('PostsController', () => {
  let controller: PostsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostsController],
      providers: [
        {
          provide: PostsService,
          useValue: {
            createPost: jest.fn(),
            getPosts: jest.fn(),
            getPostById: jest.fn(),
            updatePost: jest.fn(),
            deletePost: jest.fn(),
            likePost: jest.fn(),
            unlikePost: jest.fn(),
            addComment: jest.fn(),
            getComments: jest.fn(),
            deleteComment: jest.fn(),
            likeComment: jest.fn(),
            unlikeComment: jest.fn(),
            getCommentLikes: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PostsController>(PostsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
