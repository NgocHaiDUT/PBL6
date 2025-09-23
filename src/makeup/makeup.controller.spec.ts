import { Test, TestingModule } from '@nestjs/testing';
import { MakeupController } from './makeup.controller';
import { MakeupService } from './makeup.service';

describe('MakeupController', () => {
  let controller: MakeupController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MakeupController],
      providers: [
        {
          provide: MakeupService,
          useValue: { callPythonMakeup: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<MakeupController>(MakeupController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
