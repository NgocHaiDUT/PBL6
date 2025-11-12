import { Test, TestingModule } from '@nestjs/testing';
import { ShopController } from './shop.controller';
import { ShopService } from './shop.service';
import { after } from 'node:test';

describe('ShopController', () => {
  let controller: ShopController;
  let service : ShopService;

  const mockShopService = {
    addstaff : jest.fn(),
    removestaff : jest.fn(),
    getstaffs : jest.fn(),
    updatestaffpermission : jest.fn(),
    deletestaffpermission : jest.fn(),
    getpermissionstaff : jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShopController],
      providers: [
          {
            provide : ShopService,
            useValue : mockShopService,
          },
        ],
    }).compile();

    controller = module.get<ShopController>(ShopController);
    service = module.get<ShopService>(ShopService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('addstaff', () => {

    it('add staff successfully',async() => {
      const body = {
        userid : 1,
        staffemail : 'staff@example.com',
        shopid : 2,
        is_manager : false
      };

      const expectedResult = { success: true, message: "Thêm nhân viên thành công" };
      mockShopService.addstaff.mockResolvedValue(expectedResult);

      const result = await controller.addStaff(body);

      expect(service.addstaff).toHaveBeenCalledWith(1, 'staff@example.com', 2 , false);
      expect(result).toEqual(expectedResult);

    });

    it('add staff fail', async() => {
      const body = {
        userid : 1,
        staffemail : 'staff@example.com',
        shopid : 2,
        is_manager : false
      };

      const expectedResult = { success: true, message: "Thêm nhân viên thành công" };
      mockShopService.addstaff.mockResolvedValue(expectedResult);

      const result = await controller.addStaff(body);

      expect(service.addstaff).toHaveBeenCalledWith(1, 'staff@example.com', 2 , false);
      expect(result).toEqual(expectedResult);
    })




    

  })
});
