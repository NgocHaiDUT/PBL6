import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DeliveryService } from '../delivery/delivery.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { CreateShopAddressDto } from './dto/create-shop-address.dto';
import { UpdateShopAddressDto } from './dto/update-shop-address.dto';

@Injectable()
export class AddressService {
  constructor(
    private prisma: PrismaService,
    private deliveryService: DeliveryService,
  ) {}

  // ==================== HELPER METHODS ====================

  private async resolveGHNLocationNames(
    ghn_province_id?: number,
    ghn_district_id?: number,
    ghn_ward_code?: string,
  ): Promise<{ province?: string; district?: string; ward?: string }> {
    const result: { province?: string; district?: string; ward?: string } = {};

    if (!ghn_province_id || !ghn_district_id || !ghn_ward_code) {
      return result;
    }

    try {
      const provinces = await this.deliveryService.getProvinces();
      const foundProvince = provinces.find(
        (p) => p.ProvinceID === ghn_province_id,
      );
      if (foundProvince) result.province = foundProvince.ProvinceName;

      const districts = await this.deliveryService.getDistricts(ghn_province_id);
      const foundDistrict = districts.find(
        (d) => d.DistrictID === ghn_district_id,
      );
      if (foundDistrict) result.district = foundDistrict.DistrictName;

      const wards = await this.deliveryService.getWards(ghn_district_id);
      const foundWard = wards.find((w) => w.WardCode === ghn_ward_code);
      if (foundWard) result.ward = foundWard.WardName;
    } catch (error) {
      throw new BadRequestException(
        'Failed to validate address with GHN. Please check the provided location IDs.',
      );
    }

    return result;
  }

  // ==================== USER ADDRESS METHODS ====================

  async addUserAddress(userId: number, dto: CreateAddressDto) {
    let officialProvinceName = dto.province;
    let officialDistrictName = dto.district;
    let officialWardName = dto.ward;

    if (dto.ghn_province_id && dto.ghn_district_id && dto.ghn_ward_code) {
      const resolvedNames = await this.resolveGHNLocationNames(
        dto.ghn_province_id,
        dto.ghn_district_id,
        dto.ghn_ward_code,
      );
      if (resolvedNames.province) officialProvinceName = resolvedNames.province;
      if (resolvedNames.district) officialDistrictName = resolvedNames.district;
      if (resolvedNames.ward) officialWardName = resolvedNames.ward;
    }

    // If this is set as default, unset other defaults
    if (dto.is_default) {
      await this.prisma.addresses.updateMany({
        where: { user_id: userId, is_default: true },
        data: { is_default: false },
      });
    }

    const address = await this.prisma.addresses.create({
      data: {
        user_id: userId,
        label: dto.label || '',
        recipient: dto.receiver_name,
        phone: dto.phone,
        province: officialProvinceName,
        district: officialDistrictName,
        ward: officialWardName,
        street: dto.street,
        is_default: dto.is_default || false,
        ghn_province_id: dto.ghn_province_id,
        ghn_district_id: dto.ghn_district_id,
        ghn_ward_code: dto.ghn_ward_code,
      },
    });

    return {
      message: 'Thêm địa chỉ nhận hàng thành công',
      data: address,
    };
  }

  async updateUserAddress(
    addressId: number,
    userId: number,
    dto: UpdateAddressDto,
  ) {
    // Check if address exists and belongs to user
    const existingAddress = await this.prisma.addresses.findUnique({
      where: { id: addressId },
    });

    if (!existingAddress) {
      throw new NotFoundException('Địa chỉ không tồn tại');
    }

    if (existingAddress.user_id !== userId) {
      throw new ForbiddenException('Bạn không có quyền cập nhật địa chỉ này');
    }

    const dataToUpdate: any = {};
    if (dto.label !== undefined) dataToUpdate.label = dto.label;
    if (dto.receiver_name !== undefined) dataToUpdate.recipient = dto.receiver_name;
    if (dto.phone !== undefined) dataToUpdate.phone = dto.phone;
    if (dto.street !== undefined) dataToUpdate.street = dto.street;

    // Handle GHN location resolution
    if (dto.ghn_province_id && dto.ghn_district_id && dto.ghn_ward_code) {
      const resolvedNames = await this.resolveGHNLocationNames(
        dto.ghn_province_id,
        dto.ghn_district_id,
        dto.ghn_ward_code,
      );
      dataToUpdate.province = resolvedNames.province || dto.province;
      dataToUpdate.district = resolvedNames.district || dto.district;
      dataToUpdate.ward = resolvedNames.ward || dto.ward;
      dataToUpdate.ghn_province_id = dto.ghn_province_id;
      dataToUpdate.ghn_district_id = dto.ghn_district_id;
      dataToUpdate.ghn_ward_code = dto.ghn_ward_code;
    } else {
      if (dto.province !== undefined) dataToUpdate.province = dto.province;
      if (dto.district !== undefined) dataToUpdate.district = dto.district;
      if (dto.ward !== undefined) dataToUpdate.ward = dto.ward;
    }

    // Handle is_default flag
    if (dto.is_default !== undefined) {
      if (dto.is_default) {
        // Unset other defaults for this user
        await this.prisma.addresses.updateMany({
          where: { user_id: userId, is_default: true, id: { not: addressId } },
          data: { is_default: false },
        });
      }
      dataToUpdate.is_default = dto.is_default;
    }

    const updatedAddress = await this.prisma.addresses.update({
      where: { id: addressId },
      data: dataToUpdate,
    });

    return {
      message: 'Cập nhật địa chỉ nhận hàng thành công',
      data: updatedAddress,
    };
  }

  async deleteUserAddress(addressId: number, userId: number) {
    // Check if address exists and belongs to user
    const existingAddress = await this.prisma.addresses.findUnique({
      where: { id: addressId },
    });

    if (!existingAddress) {
      throw new NotFoundException('Địa chỉ không tồn tại');
    }

    if (existingAddress.user_id !== userId) {
      throw new ForbiddenException('Bạn không có quyền xóa địa chỉ này');
    }

    await this.prisma.addresses.delete({
      where: { id: addressId },
    });

    return { message: 'Xóa địa chỉ thành công' };
  }

  async getUserAddresses(userId: number) {
    return this.prisma.addresses.findMany({
      where: { user_id: userId },
      orderBy: [{ is_default: 'desc' }, { created_at: 'desc' }],
    });
  }

  // ==================== SHOP ADDRESS METHODS ====================

  async addShopAddress(userId: number, dto: CreateShopAddressDto) {
    // Verify user owns the shop or is a manager
    const shop = await this.prisma.shops.findUnique({
      where: { id: dto.shop_id },
      include: {
        shop_staffs: {
          where: { user_id: userId },
        },
      },
    });

    if (!shop) {
      throw new NotFoundException('Shop không tồn tại');
    }

    const isOwner = shop.owner_id === userId;
    const isManager = shop.shop_staffs.some((staff) => staff.is_manager);

    // Check if user has manage_shop_address permission
    let hasManageAddressPermission = false;
    if (!isOwner && !isManager) {
      const staffMember = shop.shop_staffs.find(staff => staff.user_id === userId);
      if (staffMember) {
        const userPermissions = await this.prisma.userpermission.findMany({
          where: { user_id: userId },
          include: { permission: true },
        });
        hasManageAddressPermission = userPermissions.some(
          (up) => up.permission.name === 'manage_shop_address',
        );
      }
    }

    if (!isOwner && !isManager && !hasManageAddressPermission) {
      throw new ForbiddenException(
        'Bạn không có quyền thêm địa chỉ cho shop này',
      );
    }

    let officialProvinceName = dto.province;
    let officialDistrictName = dto.district;
    let officialWardName = dto.ward;

    if (dto.ghn_province_id && dto.ghn_district_id && dto.ghn_ward_code) {
      const resolvedNames = await this.resolveGHNLocationNames(
        dto.ghn_province_id,
        dto.ghn_district_id,
        dto.ghn_ward_code,
      );
      if (resolvedNames.province) officialProvinceName = resolvedNames.province;
      if (resolvedNames.district) officialDistrictName = resolvedNames.district;
      if (resolvedNames.ward) officialWardName = resolvedNames.ward;
    }

    // If this is set as default, unset other defaults
    if (dto.is_default) {
      await this.prisma.shop_addresses.updateMany({
        where: { shop_id: dto.shop_id, is_default: true },
        data: { is_default: false },
      });
    }

    const address = await this.prisma.shop_addresses.create({
      data: {
        shop_id: dto.shop_id,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        province: officialProvinceName,
        district: officialDistrictName,
        ward: officialWardName,
        street: dto.street,
        is_default: dto.is_default || false,
        ghn_province_id: dto.ghn_province_id,
        ghn_district_id: dto.ghn_district_id,
        ghn_ward_code: dto.ghn_ward_code,
      },
    });

    return {
      message: 'Thêm địa chỉ shop thành công',
      data: address,
    };
  }

  async updateShopAddress(
    addressId: number,
    userId: number,
    dto: UpdateShopAddressDto,
  ) {
    // Check if address exists
    const existingAddress = await this.prisma.shop_addresses.findUnique({
      where: { id: addressId },
      include: {
        shop: {
          include: {
            shop_staffs: {
              where: { user_id: userId },
            },
          },
        },
      },
    });

    if (!existingAddress) {
      throw new NotFoundException('Địa chỉ shop không tồn tại');
    }

    // Check permissions
    const isOwner = existingAddress.shop.owner_id === userId;
    const isManager = existingAddress.shop.shop_staffs.some(
      (staff) => staff.is_manager,
    );

    // Check if user has manage_shop_address permission
    let hasManageAddressPermission = false;
    if (!isOwner && !isManager) {
      const staffMember = existingAddress.shop.shop_staffs.find(staff => staff.user_id === userId);
      if (staffMember) {
        const userPermissions = await this.prisma.userpermission.findMany({
          where: { user_id: userId },
          include: { permission: true },
        });
        hasManageAddressPermission = userPermissions.some(
          (up) => up.permission.name === 'manage_shop_address',
        );
      }
    }

    if (!isOwner && !isManager && !hasManageAddressPermission) {
      throw new ForbiddenException(
        'Bạn không có quyền cập nhật địa chỉ shop này',
      );
    }

    const dataToUpdate: any = {};
    if (dto.name !== undefined) dataToUpdate.name = dto.name;
    if (dto.phone !== undefined) dataToUpdate.phone = dto.phone;
    if (dto.email !== undefined) dataToUpdate.email = dto.email;
    if (dto.street !== undefined) dataToUpdate.street = dto.street;

    // Handle GHN location resolution
    if (dto.ghn_province_id && dto.ghn_district_id && dto.ghn_ward_code) {
      const resolvedNames = await this.resolveGHNLocationNames(
        dto.ghn_province_id,
        dto.ghn_district_id,
        dto.ghn_ward_code,
      );
      dataToUpdate.province = resolvedNames.province || dto.province;
      dataToUpdate.district = resolvedNames.district || dto.district;
      dataToUpdate.ward = resolvedNames.ward || dto.ward;
      dataToUpdate.ghn_province_id = dto.ghn_province_id;
      dataToUpdate.ghn_district_id = dto.ghn_district_id;
      dataToUpdate.ghn_ward_code = dto.ghn_ward_code;
    } else {
      if (dto.province !== undefined) dataToUpdate.province = dto.province;
      if (dto.district !== undefined) dataToUpdate.district = dto.district;
      if (dto.ward !== undefined) dataToUpdate.ward = dto.ward;
    }

    // Handle is_default flag
    if (dto.is_default !== undefined) {
      if (dto.is_default) {
        // Unset other defaults for this shop
        await this.prisma.shop_addresses.updateMany({
          where: {
            shop_id: existingAddress.shop_id,
            is_default: true,
            id: { not: addressId },
          },
          data: { is_default: false },
        });
      }
      dataToUpdate.is_default = dto.is_default;
    }

    const updatedAddress = await this.prisma.shop_addresses.update({
      where: { id: addressId },
      data: dataToUpdate,
    });

    return {
      message: 'Cập nhật địa chỉ shop thành công',
      data: updatedAddress,
    };
  }

  async deleteShopAddress(addressId: number, userId: number) {
    // Check if address exists
    const existingAddress = await this.prisma.shop_addresses.findUnique({
      where: { id: addressId },
      include: {
        shop: {
          include: {
            shop_staffs: {
              where: { user_id: userId },
            },
          },
        },
      },
    });

    if (!existingAddress) {
      throw new NotFoundException('Địa chỉ shop không tồn tại');
    }

    // Check permissions
    const isOwner = existingAddress.shop.owner_id === userId;
    const isManager = existingAddress.shop.shop_staffs.some(
      (staff) => staff.is_manager,
    );

    // Check if user has manage_shop_address permission
    let hasManageAddressPermission = false;
    if (!isOwner && !isManager) {
      const staffMember = existingAddress.shop.shop_staffs.find(staff => staff.user_id === userId);
      if (staffMember) {
        const userPermissions = await this.prisma.userpermission.findMany({
          where: { user_id: userId },
          include: { permission: true },
        });
        hasManageAddressPermission = userPermissions.some(
          (up) => up.permission.name === 'manage_shop_address',
        );
      }
    }

    if (!isOwner && !isManager && !hasManageAddressPermission) {
      throw new ForbiddenException('Bạn không có quyền xóa địa chỉ shop này');
    }

    await this.prisma.shop_addresses.delete({
      where: { id: addressId },
    });

    return { message: 'Xóa địa chỉ shop thành công' };
  }

  async getShopAddresses(shopId: number) {
    return this.prisma.shop_addresses.findMany({
      where: { shop_id: shopId },
      orderBy: [{ is_default: 'desc' }, { created_at: 'desc' }],
    });
  }

  // ==================== ADMIN METHODS ====================

  /**
   * Admin: Update user address without ownership check
   */
  async adminUpdateUserAddress(addressId: number, dto: UpdateAddressDto) {
    const existingAddress = await this.prisma.addresses.findUnique({
      where: { id: addressId },
    });

    if (!existingAddress) {
      throw new NotFoundException('Địa chỉ không tồn tại');
    }

    const dataToUpdate: any = {};
    if (dto.label !== undefined) dataToUpdate.label = dto.label;
    if (dto.receiver_name !== undefined) dataToUpdate.recipient = dto.receiver_name;
    if (dto.phone !== undefined) dataToUpdate.phone = dto.phone;
    if (dto.street !== undefined) dataToUpdate.street = dto.street;

    // Handle GHN location resolution
    if (dto.ghn_province_id && dto.ghn_district_id && dto.ghn_ward_code) {
      const resolvedNames = await this.resolveGHNLocationNames(
        dto.ghn_province_id,
        dto.ghn_district_id,
        dto.ghn_ward_code,
      );
      dataToUpdate.province = resolvedNames.province || dto.province;
      dataToUpdate.district = resolvedNames.district || dto.district;
      dataToUpdate.ward = resolvedNames.ward || dto.ward;
      dataToUpdate.ghn_province_id = dto.ghn_province_id;
      dataToUpdate.ghn_district_id = dto.ghn_district_id;
      dataToUpdate.ghn_ward_code = dto.ghn_ward_code;
    } else {
      if (dto.province !== undefined) dataToUpdate.province = dto.province;
      if (dto.district !== undefined) dataToUpdate.district = dto.district;
      if (dto.ward !== undefined) dataToUpdate.ward = dto.ward;
    }

    // Handle is_default flag
    if (dto.is_default !== undefined) {
      if (dto.is_default) {
        await this.prisma.addresses.updateMany({
          where: { 
            user_id: existingAddress.user_id, 
            is_default: true, 
            id: { not: addressId } 
          },
          data: { is_default: false },
        });
      }
      dataToUpdate.is_default = dto.is_default;
    }

    const updatedAddress = await this.prisma.addresses.update({
      where: { id: addressId },
      data: dataToUpdate,
    });

    return {
      message: 'Admin: Cập nhật địa chỉ nhận hàng thành công',
      data: updatedAddress,
    };
  }

  /**
   * Admin: Delete user address without ownership check
   */
  async adminDeleteUserAddress(addressId: number) {
    const existingAddress = await this.prisma.addresses.findUnique({
      where: { id: addressId },
    });

    if (!existingAddress) {
      throw new NotFoundException('Địa chỉ không tồn tại');
    }

    await this.prisma.addresses.delete({
      where: { id: addressId },
    });

    return { message: 'Admin: Xóa địa chỉ thành công' };
  }

  /**
   * Admin: Add shop address without ownership check
   */
  async adminAddShopAddress(
    shopId: number,
    dto: Omit<CreateShopAddressDto, 'shop_id'>,
  ) {
    const shop = await this.prisma.shops.findUnique({
      where: { id: shopId },
    });

    if (!shop) {
      throw new NotFoundException('Shop không tồn tại');
    }

    let officialProvinceName = dto.province;
    let officialDistrictName = dto.district;
    let officialWardName = dto.ward;

    if (dto.ghn_province_id && dto.ghn_district_id && dto.ghn_ward_code) {
      const resolvedNames = await this.resolveGHNLocationNames(
        dto.ghn_province_id,
        dto.ghn_district_id,
        dto.ghn_ward_code,
      );
      if (resolvedNames.province) officialProvinceName = resolvedNames.province;
      if (resolvedNames.district) officialDistrictName = resolvedNames.district;
      if (resolvedNames.ward) officialWardName = resolvedNames.ward;
    }

    if (dto.is_default) {
      await this.prisma.shop_addresses.updateMany({
        where: { shop_id: shopId, is_default: true },
        data: { is_default: false },
      });
    }

    const address = await this.prisma.shop_addresses.create({
      data: {
        shop_id: shopId,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        province: officialProvinceName,
        district: officialDistrictName,
        ward: officialWardName,
        street: dto.street,
        is_default: dto.is_default || false,
        ghn_province_id: dto.ghn_province_id,
        ghn_district_id: dto.ghn_district_id,
        ghn_ward_code: dto.ghn_ward_code,
      },
    });

    return {
      message: 'Admin: Thêm địa chỉ shop thành công',
      data: address,
    };
  }

  /**
   * Admin: Update shop address without ownership check
   */
  async adminUpdateShopAddress(
    addressId: number,
    dto: UpdateShopAddressDto,
  ) {
    const existingAddress = await this.prisma.shop_addresses.findUnique({
      where: { id: addressId },
    });

    if (!existingAddress) {
      throw new NotFoundException('Địa chỉ shop không tồn tại');
    }

    const dataToUpdate: any = {};
    if (dto.name !== undefined) dataToUpdate.name = dto.name;
    if (dto.phone !== undefined) dataToUpdate.phone = dto.phone;
    if (dto.email !== undefined) dataToUpdate.email = dto.email;
    if (dto.street !== undefined) dataToUpdate.street = dto.street;

    // Handle GHN location resolution
    if (dto.ghn_province_id && dto.ghn_district_id && dto.ghn_ward_code) {
      const resolvedNames = await this.resolveGHNLocationNames(
        dto.ghn_province_id,
        dto.ghn_district_id,
        dto.ghn_ward_code,
      );
      dataToUpdate.province = resolvedNames.province || dto.province;
      dataToUpdate.district = resolvedNames.district || dto.district;
      dataToUpdate.ward = resolvedNames.ward || dto.ward;
      dataToUpdate.ghn_province_id = dto.ghn_province_id;
      dataToUpdate.ghn_district_id = dto.ghn_district_id;
      dataToUpdate.ghn_ward_code = dto.ghn_ward_code;
    } else {
      if (dto.province !== undefined) dataToUpdate.province = dto.province;
      if (dto.district !== undefined) dataToUpdate.district = dto.district;
      if (dto.ward !== undefined) dataToUpdate.ward = dto.ward;
    }

    // Handle is_default flag
    if (dto.is_default !== undefined) {
      if (dto.is_default) {
        await this.prisma.shop_addresses.updateMany({
          where: {
            shop_id: existingAddress.shop_id,
            is_default: true,
            id: { not: addressId },
          },
          data: { is_default: false },
        });
      }
      dataToUpdate.is_default = dto.is_default;
    }

    const updatedAddress = await this.prisma.shop_addresses.update({
      where: { id: addressId },
      data: dataToUpdate,
    });

    return {
      message: 'Admin: Cập nhật địa chỉ shop thành công',
      data: updatedAddress,
    };
  }

  /**
   * Admin: Delete shop address without ownership check
   */
  async adminDeleteShopAddress(addressId: number) {
    const existingAddress = await this.prisma.shop_addresses.findUnique({
      where: { id: addressId },
    });

    if (!existingAddress) {
      throw new NotFoundException('Địa chỉ shop không tồn tại');
    }

    await this.prisma.shop_addresses.delete({
      where: { id: addressId },
    });

    return { message: 'Admin: Xóa địa chỉ shop thành công' };
  }
}
