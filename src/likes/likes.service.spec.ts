import { Test, TestingModule } from '@nestjs/testing';
import { LikesService } from './likes.service';
import { PrismaService } from '../prisma/prisma.service';

describe('LikesService', () => {
  let service: LikesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LikesService,
        {
          provide: PrismaService,
          useValue: {
            likes: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              count: jest.fn(),
              delete: jest.fn(),
            },
            posts: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            products: {
              findUnique: jest.fn(),
            },
            comments: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<LikesService>(LikesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});