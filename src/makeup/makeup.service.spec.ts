import { Test, TestingModule } from '@nestjs/testing';
import { MakeupService } from './makeup.service';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../prisma/prisma.service';

describe('MakeupService', () => {
  let service: MakeupService;
  let httpServiceMock: Partial<HttpService>;
  let prismaServiceMock: Partial<PrismaService>;

  beforeEach(async () => {
    httpServiceMock = {
      // add methods you use in MakeupService as jest.fn()
      post: jest.fn(),
    } as any;

    prismaServiceMock = {
      tryon_sessions: {
        create: jest.fn(),
        findUnique: jest.fn(),
      } as any,
      tryon_items: {
        create: jest.fn(),
      } as any,
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MakeupService,
        { provide: HttpService, useValue: httpServiceMock },
        { provide: PrismaService, useValue: prismaServiceMock },
      ],
    }).compile();

    service = module.get<MakeupService>(MakeupService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
