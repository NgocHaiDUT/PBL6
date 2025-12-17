import { Test, TestingModule } from '@nestjs/testing';
import { MakeupController } from './makeup.controller';
import { MakeupService } from './makeup.service';

describe('MakeupController', () => {
  let controller: MakeupController;
  let service: MakeupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MakeupController],
      providers: [
        {
          provide: MakeupService,
          useValue: { recommendProductsBySkintone: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<MakeupController>(MakeupController);
    service = module.get<MakeupService>(MakeupService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should recommend products', async () => {
    const mockProducts = [{ id: 1, name: 'Product 1' }];
    jest.spyOn(service, 'recommendProductsBySkintone').mockResolvedValue(mockProducts);

    const result = await controller.recommendProducts('fair');
    expect(result).toEqual({ success: true, data: mockProducts });
  });
});
