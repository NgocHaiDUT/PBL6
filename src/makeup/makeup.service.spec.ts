import { Test, TestingModule } from '@nestjs/testing';
import { MakeupService } from './makeup.service';
import { HttpService } from '@nestjs/axios';

describe('MakeupService', () => {
  let service: MakeupService;
  let httpServiceMock: Partial<HttpService>;

  beforeEach(async () => {
    httpServiceMock = {
      // add methods you use in MakeupService as jest.fn()
      post: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MakeupService,
        { provide: HttpService, useValue: httpServiceMock },
      ],
    }).compile();

    service = module.get<MakeupService>(MakeupService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
