import { Test, TestingModule } from '@nestjs/testing';
import { MakeupService } from './makeup.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MakeupService', () => {
  let service: MakeupService;
  let prismaServiceMock: Partial<PrismaService>;

  beforeEach(async () => {
    prismaServiceMock = {
      products: {
        findMany: jest.fn(),
      } as any,
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MakeupService,
        { provide: PrismaService, useValue: prismaServiceMock },
      ],
    }).compile();

    service = module.get<MakeupService>(MakeupService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should recommend products by skintone', async () => {
    const mockProducts = [{
      id: 1,
      name: 'Product 1',
      avg_rating: 4.5,
      product_variants: [{ shade_hex: '#FF0000' }],
      product_categories: [{ category: { name: 'Son thỏi' } }],
      brand: {},
      product_media: [],
    }];
    jest.spyOn(prismaServiceMock.products, 'findMany').mockResolvedValue(mockProducts);

    const result = await service.recommendProductsBySkintone('fair');
    expect(result).toHaveLength(1);
  });
});
