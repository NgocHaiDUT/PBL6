import { Test, TestingModule } from '@nestjs/testing';
import { DataInitService } from './data-init.service';

describe('DataInitService', () => {
  let service: DataInitService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataInitService],
    }).compile();

    service = module.get<DataInitService>(DataInitService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
