import { Test, TestingModule } from '@nestjs/testing';
import { ShopService } from './shop.service';
import { PrismaService } from '../prisma/prisma.service';
import { permission } from 'process';

describe('ShopService', () => {
  let service: ShopService;
  let prismaService : PrismaService;
  
  const mockPrismaService = {
    permission : {
      findUnique : jest.fn(),
      findMany : jest.fn(),
    },
    userpermission : {
      findFirst : jest.fn(),
      findMany : jest.fn(),
      createMany : jest.fn(),
      deleteMany : jest.fn(),
    },
    shops : {
      findUnique : jest.fn(),

    },
    shop_staffs : {
      findFirst : jest.fn(),
      findMany : jest.fn(),
      create : jest.fn(),
      deleteMany : jest.fn(),
    },
    users : {
      findUnique : jest.fn(), 
      update : jest.fn(),
    },
    role : {
      findUnique : jest.fn(),
    },
    $transaction : jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopService,
        {
          provide : PrismaService,
          useValue : mockPrismaService,
        }
      ],
    }).compile();

    service = module.get<ShopService>(ShopService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  })

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addstaff', () => {
    const mockUserId = 1;
    const mockStaffEmail = 'staff@gmail.com';
    const mockShopId = 2;
    const mockStaffId = 3;

    it('add staff successfully', async () => {
      mockPrismaService.permission.findUnique.mockResolvedValue( {id : 1});
      mockPrismaService.userpermission.findFirst.mockResolvedValue ( {user_id : mockUserId});

      mockPrismaService.shops.findUnique.mockResolvedValue( {owner_id : mockUserId});

      mockPrismaService.users.findUnique.mockResolvedValue( {
        id : mockUserId,
        email : mockStaffEmail
      });

      mockPrismaService.shop_staffs.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

      mockPrismaService.shops.findUnique(null);

      mockPrismaService.role.findUnique.mockResolvedValue({
          id : 2,
          name : 'staff',
          rolePermissions : [{permission_id : 10}, {permission_id : 11}]
      });

      mockPrismaService.$transaction.mockImplementation( async (callback) => {
        return callback({
          shop_staffs : {create : jest.fn()},
          users : {update : jest.fn()},
          userpermission : {createMany : jest.fn()},
        })
      });

      const result = await service.addstaff(mockUserId,mockStaffEmail,mockShopId,false);

      expect(result).toEqual({success :true, message: "Thêm nhân viên thành công" });

    });

    it('add staff fail if trying to add shop owner',async() => {
      mockPrismaService.permission.findUnique.mockResolvedValue( {id : 1});
      mockPrismaService.userpermission.findFirst.mockResolvedValue ( {user_id : mockUserId});

      mockPrismaService.shops.findUnique.mockResolvedValue( {owner_id : mockUserId});

      mockPrismaService.users.findUnique.mockResolvedValue( {
        id : mockUserId,
        email : mockStaffEmail
      });

      mockPrismaService.shop_staffs.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

      mockPrismaService.shops.findUnique({owner_id : mockStaffId});

      const result = await service.addstaff(mockUserId,mockStaffEmail,mockShopId,false);

      expect(result).toEqual({success :true, message: "Thêm nhân viên thành công" });
    })

    it('add staff fail if user does not have manage_shop_staff', async() =>{
      mockPrismaService.permission.findUnique.mockResolvedValue( {id : 1});

      mockPrismaService.users.findUnique.mockResolvedValue( {
        id : mockUserId,
        email : mockStaffEmail
      });

      mockPrismaService.userpermission.findFirst.mockResolvedValue( null );

      const result = await service.addstaff(mockUserId,mockStaffEmail,mockShopId,false);

      expect(result).toEqual({success: false, message: "Bạn không có quyền thêm nhân viên" });
    });

    it('add staff fail if permission manage_shop_staff does not exist' , async() => {
      mockPrismaService.permission.findUnique.mockResolvedValue( null );

      const result = await service.addstaff(mockUserId,mockStaffEmail,mockShopId,false);

      expect(result).toEqual({success: false, message: "Lỗi hệ thống, quyền manage_shop_staff không tồn tại"});
    });

    it('add staff fail if shop does not exist', async() => {
      mockPrismaService.permission.findUnique.mockResolvedValue( {id : 1});

      mockPrismaService.users.findUnique.mockResolvedValue( {
        id : mockUserId,
        email : mockStaffEmail
      });

      mockPrismaService.userpermission.findFirst.mockResolvedValue ( {user_id : mockUserId});

      mockPrismaService.shops.findUnique.mockResolvedValue( null );

      const result = await service.addstaff(mockUserId,mockStaffEmail,mockShopId,false);

      expect(result).toEqual({success: false, message: "Cửa hàng không tồn tại" });
    });

    it('add staff fail if user is not owner or manager', async() => {
      mockPrismaService.permission.findUnique.mockResolvedValue( {id : 1});

      mockPrismaService.users.findUnique.mockResolvedValue( {
        id : mockUserId,
        email : mockStaffEmail
      });

      mockPrismaService.userpermission.findFirst.mockResolvedValue ( {user_id : mockUserId});

      mockPrismaService.shops.findUnique.mockResolvedValue( {owner_id : 999});

      mockPrismaService.shop_staffs.findFirst
      .mockResolvedValue(null)
      

      const result = await service.addstaff(mockUserId,mockStaffEmail,mockShopId,false);

      expect(result).toEqual({success: false, message: "Bạn không có quyền quản lý cửa hàng này" });
    });

    it('add staff fail if user does not exist', async() => {
      mockPrismaService.permission.findUnique.mockResolvedValue( {id : 1});
      mockPrismaService.users.findUnique.mockResolvedValue( null);

      const result = await service.addstaff(mockUserId,mockStaffEmail,mockShopId,false);

      expect(result).toEqual({success: false, message: "Nhân viên không tồn tại"});
    })

    it('add staff fail if staff is already exists in shop', async() => {
      mockPrismaService.permission.findUnique.mockResolvedValue( {id : 1});
      mockPrismaService.userpermission.findFirst.mockResolvedValue ( {user_id : mockUserId});

      mockPrismaService.shops.findUnique.mockResolvedValue( {owner_id : mockUserId});

      mockPrismaService.users.findUnique.mockResolvedValue( {
        id : mockUserId,
        email : mockStaffEmail
      });

      mockPrismaService.shop_staffs.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({id : 1});

      const result = await service.addstaff(mockUserId,mockStaffEmail,mockShopId,false);

      expect(result).toEqual({ success: false, message: "Người này đã là nhân viên của cửa hàng"});
    });

    it('add staff fail if system does not have role staff', async() => {
      mockPrismaService.permission.findUnique.mockResolvedValue( {id : 1});
      mockPrismaService.userpermission.findFirst.mockResolvedValue ( {user_id : mockUserId});

      mockPrismaService.shops.findUnique.mockResolvedValue( {owner_id : mockUserId});

      mockPrismaService.users.findUnique.mockResolvedValue( {
        id : mockUserId,
        email : mockStaffEmail
      });

      mockPrismaService.shop_staffs.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

      mockPrismaService.shops.findUnique(null);

      mockPrismaService.role.findUnique.mockResolvedValue(null);

      const result = await service.addstaff(mockUserId,mockStaffEmail,mockShopId,false);

      expect(result).toEqual({success: false, message: "Lỗi hệ thống: Không tìm thấy role staff"});
    });

  })

  describe('removestaff', () => {
    const mockUserId = 1;
    const mockStaffemail = "staff@gmail.com";
    const mockShopId = 2;
    const mockStaffId = 3;
    it('remove staff successfully', async() => {
      mockPrismaService.permission.findUnique.mockResolvedValue({id : 1});

      mockPrismaService.userpermission.findFirst.mockResolvedValue({user_id : mockUserId});

      mockPrismaService.shops.findUnique.mockResolvedValue({owner_id : mockUserId});

      mockPrismaService.users.findUnique.mockResolvedValue({
        id : mockStaffId,
        email : mockStaffemail
      });

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          shop_staffs : {
            deleteMany : jest.fn().mockResolvedValue({ count : 1 }),
            findFirst : jest.fn().mockResolvedValue(null),
          },
          role : {
            findUnique : jest.fn().mockResolvedValue({
              id : 1,
              name : 'user',
              rolePermissions : [{permission_id : 5}]
            }),
          },
          users : {
            update : jest.fn(),
          },
          userpermission : {
            deleteMany : jest.fn(),
            createMany : jest.fn()
          }

        });
      });

      const result = await service.removestaff(mockUserId,mockStaffemail,mockShopId);

      expect(result).toEqual({success: true, message: "Xóa nhân viên thành công" });

    });

    it('remove staff fail if system does not have manage_shop_staff', async() => {
      mockPrismaService.permission.findUnique.mockResolvedValue(null);

      const result = await service.removestaff(mockUserId,mockStaffemail,mockShopId);

      expect(result).toEqual({success: false, message: "Lỗi hệ thống, quyền manage_shop_staff không tồn tại"});
    });

    it('remove staff fail if user does not have permission manage_shop_staff', async() => {
      mockPrismaService.permission.findUnique.mockResolvedValue({id : 1});

      mockPrismaService.userpermission.findFirst.mockResolvedValue(null);

      const result = await service.removestaff(mockUserId,mockStaffemail,mockShopId);

      expect(result).toEqual({success: false, message: "Bạn không có quyền xóa nhân viên" });
    });

    it('remove staff fail if shop is not exists',async() => {
      mockPrismaService.permission.findUnique.mockResolvedValue({id : 1});

      mockPrismaService.userpermission.findFirst.mockResolvedValue({user_id : mockUserId});

      mockPrismaService.shops.findUnique.mockResolvedValue(null);

      const result = await service.removestaff(mockUserId,mockStaffemail,mockShopId);

      expect(result).toEqual({success: false, message: "Cửa hàng không tồn tại"});
    });

    it('remove staff fail if staff is not exists', async() => {
      mockPrismaService.permission.findUnique.mockResolvedValue({id : 1});

      mockPrismaService.userpermission.findFirst.mockResolvedValue({user_id : mockUserId});

      mockPrismaService.shops.findUnique.mockResolvedValue({owner_id : mockUserId});

      mockPrismaService.users.findUnique.mockResolvedValue(null);

      const result = await service.removestaff(mockUserId,mockStaffemail,mockShopId);

      expect(result).toEqual({success: false, message: "Nhân viên không tồn tại"});
    });

    it('romeve staff fail if trying to remove shop owner',async() =>{
      mockPrismaService.permission.findUnique.mockResolvedValue({id : 1});

      mockPrismaService.userpermission.findFirst.mockResolvedValue({user_id : mockUserId});

      mockPrismaService.shops.findUnique.mockResolvedValue({owner_id : mockUserId});

      mockPrismaService.users.findUnique.mockResolvedValue({
        id : mockUserId,
        email : mockStaffemail
      });

      const result = await service.removestaff(mockUserId,mockStaffemail,mockShopId);

      expect(result).toEqual({success: false, message: "Không thể xóa chủ cửa hàng" });
    })
    
  });
  
});
