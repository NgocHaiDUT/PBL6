import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3UploadService } from './s3-upload.service';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcrypt';
import { getAllPermissions } from '../auth/constants/Permission.enum';
import {
  getAllRoles,
  RolePermissions,
  Role,
} from '../auth/constants/Role.enum';

@Injectable()
export class DataInitService implements OnModuleInit {
  private readonly logger = new Logger(DataInitService.name);

  // Cache URL maps để tránh upload lại nhiều lần
  private brandLogoUrlMap: Map<string, string> = new Map();
  private productImageUrlMap: Map<string, string> = new Map();
  private avatarUrlMap: Map<string, string> = new Map();
  private shopLogoUrlMap: Map<string, string> = new Map();
  private shopBannerUrlMap: Map<string, string> = new Map();
  private postImageUrlMap: Map<string, string> = new Map();

  constructor(
    private prisma: PrismaService,
    private s3UploadService: S3UploadService,
  ) { }

  async onModuleInit() {
    this.logger.log('DataInitService module initialized');
    await this.seedData();
  }

  async seedData() {
    try {
      // ✅ LUÔN seed roles & permissions trước (cần thiết cho register/add staff)
      await this.seedRoles();
      await this.seedPermissions();
      await this.seedRolePermissions();

      // Check xem đã có dữ liệu chưa - nếu có rồi thì không cần upload và seed phần còn lại
      const existingBrands = await this.prisma.brands.count();
      if (existingBrands > 0) {
        this.logger.log('✅ Roles & Permissions đã sync, dữ liệu khác đã tồn tại');
        return;
      }

      // Chỉ upload ảnh khi thực sự cần seed data mới
      try {
        this.logger.log('🚀 Bắt đầu seed dữ liệu mới...');
        await this.uploadAllImagesToS3();
      } catch (uploadError) {
        this.logger.warn('⚠️  Không thể upload ảnh lên S3, sẽ dùng đường dẫn local:', uploadError.message);
        this.logger.warn('💡 Kiểm tra AWS credentials trong file .env hoặc folder uploads có file không');
      }

      await this.seedBrands();
      await this.seedCategorys();
      await this.seedAdminUser();
      await this.seedUsers(); // Create regular users for testing
      await this.seedShops();
      await this.seedProducts();
      await this.seedCoupons();

      // Seed social/community features
      await this.seedReviews();
      await this.seedWishlists();
      await this.seedFollows();
      await this.seedPosts();
      await this.seedLikes();
      await this.seedComments();
      await this.seedSavedPosts();

      // Seed addresses and orders (previously moved to API) so DB has order/address data
      await this.seedAddresses();
      // Optional: shop addresses file can also be seeded if present
      try {
        await this.seedShopAddresses();
      } catch (e) {
        // ignore if shop_addresses file not present or creation fails
      }
      await this.seedOrders();
      // Create order coupons and shipment logs based on created orders/shipments
      await this.seedOrderCoupons();
      await this.seedShipmentLogs();

      this.logger.log('✅ Dữ liệu khởi tạo cơ bản thành công!');
      this.logger.log('📝 Gọi các API riêng để tạo data có foreign key.');
    } catch (error) {
      this.logger.error('❌ Lỗi khi tạo dữ liệu:', error);
    }
  }

  /**
   * Upload tất cả ảnh từ folder uploads lên S3
   */
  async uploadAllImagesToS3() {
    this.logger.log('=== BẮT ĐẦU UPLOAD TẤT CẢ ẢNH LÊN S3 ===');

    // Upload brands
    this.brandLogoUrlMap = await this.s3UploadService.uploadBrandLogos();

    // Upload products
    this.productImageUrlMap = await this.s3UploadService.uploadProductImages();

    // Upload avatars
    this.avatarUrlMap = await this.s3UploadService.uploadAvatars();

    // Upload shop logos
    this.shopLogoUrlMap = await this.s3UploadService.uploadShopLogos();

    // Upload shop banners
    this.shopBannerUrlMap = await this.s3UploadService.uploadShopBanners();

    // Upload post images
    this.postImageUrlMap = await this.s3UploadService.uploadPostImages();

    const totalUploaded = this.brandLogoUrlMap.size +
      this.productImageUrlMap.size +
      this.avatarUrlMap.size +
      this.shopLogoUrlMap.size +
      this.shopBannerUrlMap.size +
      this.postImageUrlMap.size;

    this.logger.log('=== HOÀN THÀNH UPLOAD TẤT CẢ ẢNH LÊN S3 ===');
    this.logger.log(`✅ Tổng số ảnh đã upload: ${totalUploaded}`);

    if (totalUploaded === 0) {
      this.logger.warn('⚠️  Không có ảnh nào được upload. Kiểm tra folder uploads/');
    }
  }

  /**
   * Convert local path to S3 URL
   * Nếu không có S3 URL (chưa upload), trả về local path
   */
  private convertToS3Url(localPath: string): string {
    if (!localPath) return '';

    // Parse local path: /uploads/brands/logo.png -> brands/logo.png
    const match = localPath.match(/\/uploads\/([^/]+)\/(.+)/);
    if (!match) return localPath;

    const [, folder, fileName] = match;

    // Tìm trong map tương ứng
    let urlMap: Map<string, string> | null = null;
    if (folder === 'brands') urlMap = this.brandLogoUrlMap;
    else if (folder === 'products') urlMap = this.productImageUrlMap;
    else if (folder === 'avatars') urlMap = this.avatarUrlMap;
    else if (folder === 'logoshops') urlMap = this.shopLogoUrlMap;
    else if (folder === 'bannershops') urlMap = this.shopBannerUrlMap;
    else if (folder === 'postimages') urlMap = this.postImageUrlMap;

    // Nếu có trong map, dùng S3 URL
    if (urlMap && urlMap.has(fileName)) {
      return urlMap.get(fileName)!;
    }

    // Nếu có AWS config, generate S3 URL
    if (process.env.AWS_S3_BUCKET_NAME && process.env.AWS_ACCESS_KEY_ID) {
      return this.s3UploadService.generateS3Url(`${folder}/${fileName}`);
    }

    // Fallback: giữ nguyên local path
    return localPath;
  }

  private async seedBrands() {
    const existingBrands = await this.prisma.brands.count();
    if (existingBrands > 0) {
      this.logger.log('Brands đã tồn tại, không khởi tạo mới');
      return;
    }

    const brandsFilePath = path.join(
      process.cwd(),
      'src',
      'data-init',
      'brands.json',
    );
    const brandsDataRaw = fs.readFileSync(brandsFilePath, 'utf8');
    const brandsData = JSON.parse(brandsDataRaw);

    if (!Array.isArray(brandsData)) {
      this.logger.error('Dữ liệu brands không phải là array');
      return;
    }

    for (const brand of brandsData) {
      // Convert local path to S3 URL
      const s3LogoUrl = this.convertToS3Url(brand.logo_url);

      await this.prisma.brands.create({
        data: {
          name: brand.name,
          slug: brand.slug,
          logo_url: s3LogoUrl,
          created_at: new Date(),
        },
      });
    }

    this.logger.log(`Đã tạo ${brandsData.length} thương hiệu thành công`);
  }

  private async seedCategorys() {
    const existcategory = await this.prisma.categories.count();
    if (existcategory > 0) {
      this.logger.log('Dữ liệu danh mục sản phẩm đã tồn tại');
      return;
    }

    const categoryFilePath = path.join(
      process.cwd(),
      'src',
      'data-init',
      'categorys.json',
    );
    const categoryRaw = fs.readFileSync(categoryFilePath, 'utf8');
    const categoryData = JSON.parse(categoryRaw);

    if (!Array.isArray(categoryData)) {
      this.logger.error('Dữ liệu categories không phải là array');
      return;
    }

    for (const parentCategory of categoryData) {
      const createdParent = await this.prisma.categories.create({
        data: {
          name: parentCategory.name,
          slug: parentCategory.slug,
          parent_id: null,
          created_at: new Date(),
        },
      });

      if (parentCategory.children && Array.isArray(parentCategory.children)) {
        for (const childCategory of parentCategory.children) {
          await this.prisma.categories.create({
            data: {
              name: childCategory.name,
              slug: childCategory.slug,
              parent_id: createdParent.id,
              created_at: new Date(),
            },
          });
        }
      }
    }

    this.logger.log(
      `Đã tạo ${categoryData.length} danh mục cha và các danh mục con thành công`,
    );
  }

  private async seedRoles() {
    const allRoles = getAllRoles();

    const existing = await this.prisma.role.findMany({
      select: { name: true },
    });
    const existingNames = existing.map((r) => r.name);

    const missingRoles = allRoles.filter((r) => !existingNames.includes(r));

    if (missingRoles.length === 0) {
      this.logger.log('Tất cả roles đã tồn tại, không có role mới để tạo');
      return;
    }

    for (const roleName of missingRoles) {
      await this.prisma.role.create({
        data: {
          name: roleName,
        },
      });
    }

    this.logger.log(
      `Đã tạo ${missingRoles.length} role từ Role.enum: ${missingRoles.join(', ')}`,
    );
  }

  private async seedPermissions() {
    const allPermissions = getAllPermissions();

    const existing = await this.prisma.permission.findMany({
      select: { name: true }
    });
    const existingNames = existing.map(p => p.name);

    const missingPermissions = allPermissions.filter(
      p => !existingNames.includes(p)
    );

    if (missingPermissions.length === 0) {
      this.logger.log('✅ Tất cả permissions đã tồn tại');
      return;
    }

    for (const permissionName of missingPermissions) {
      await this.prisma.permission.create({
        data: { name: permissionName },
      });
    }

    this.logger.log(`✅ Đã tạo ${missingPermissions.length} permission mới: ${missingPermissions.join(', ')}`);
  }

  private async seedRolePermissions() {
    this.logger.log('🔄 Đang sync role-permissions...');

    let totalCreated = 0;

    // Duyệt qua từng role trong RolePermissions mapping
    for (const [roleName, permissions] of Object.entries(RolePermissions)) {
      try {
        // Tìm role trong database theo tên
        const role = await this.prisma.role.findUnique({
          where: { name: roleName },
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        });

        if (!role) {
          this.logger.warn(`Role "${roleName}" không tìm thấy, bỏ qua`);
          continue;
        }

        // Lấy danh sách permissions hiện tại của role
        const existingPermissionNames = role.rolePermissions.map(
          rp => rp.permission.name
        );

        // Tìm permissions thiếu
        const missingPermissions = permissions.filter(
          p => !existingPermissionNames.includes(p)
        );

        if (missingPermissions.length === 0) {
          continue; // Role này đã có đủ permissions
        }

        // Thêm permissions thiếu
        for (const permissionName of missingPermissions) {
          try {
            const permission = await this.prisma.permission.findUnique({
              where: { name: permissionName },
            });

            if (!permission) {
              this.logger.warn(
                `Permission "${permissionName}" không tìm thấy, bỏ qua`,
              );
              continue;
            }

            // Check xem đã tồn tại chưa (tránh duplicate)
            const exists = await this.prisma.rolepermission.findFirst({
              where: {
                role_id: role.id,
                permission_id: permission.id,
              },
            });

            if (!exists) {
              await this.prisma.rolepermission.create({
                data: {
                  role_id: role.id,
                  permission_id: permission.id,
                },
              });
              totalCreated++;
            }
          } catch (error) {
            this.logger.error(
              `Lỗi khi tạo role permission cho role "${roleName}", permission "${permissionName}":`,
              error,
            );
          }
        }

        if (missingPermissions.length > 0) {
          this.logger.log(
            `  ✅ Đã gán ${missingPermissions.length} permissions cho role "${roleName}"`,
          );
        }
      } catch (error) {
        this.logger.error(`Lỗi khi xử lý role "${roleName}":`, error);
      }
    }

    if (totalCreated > 0) {
      this.logger.log(
        `✅ Đã tạo ${totalCreated} liên kết role-permission mới`,
      );
    } else {
      this.logger.log('✅ Tất cả role-permissions đã được cấu hình đúng');
    }
  }

  private async seedAdminUser() {
    try {
      const adminRole = await this.prisma.role.findFirst({
        where: { name: 'admin' },
      });

      if (!adminRole) {
        this.logger.error('❌ Admin role không tồn tại');
        return;
      }

      const existingAdmin = await this.prisma.users.findFirst({
        where: { email: 'admin@pbl6.com' },
      });

      if (existingAdmin) {
        this.logger.log('ℹ️  Admin user đã tồn tại, không tạo mới');
        return;
      }

      const hashedPassword = await bcrypt.hash('123456', 10);

      const adminUser = await this.prisma.users.create({
        data: {
          email: 'admin@pbl6.com',
          password_hash: hashedPassword,
          full_name: 'System Administrator',
          phone: '0999999999',
          role_id: adminRole.id,
          is_active: true,
          firstlogin: false,
          created_at: new Date(),
        },
      });

      this.logger.log('✅ Đã tạo admin user thành công');
      this.logger.log('📧 Email: admin@pbl6.com');
      this.logger.log('🔑 Password: 123456');
    } catch (error) {
      this.logger.error('❌ Lỗi khi tạo admin user:', error);
    }
  }

  private async seedUsers() {
    const existingUsers = await this.prisma.users.count({
      where: {
        email: {
          not: 'admin@pbl6.com',
        },
      },
    });

    if (existingUsers > 0) {
      this.logger.log('Regular users đã tồn tại, không khởi tạo mới');
      return;
    }

    // Fetch user role by name (role name is 'user' not 'customer')
    const userRole = await this.prisma.role.findFirst({
      where: { name: 'user' },
    });

    if (!userRole) {
      this.logger.error('❌ User role không tồn tại');
      return;
    }

    const usersFilePath = path.join(
      process.cwd(),
      'src',
      'data-init',
      'users.json',
    );
    const usersDataRaw = fs.readFileSync(usersFilePath, 'utf8');
    const usersData = JSON.parse(usersDataRaw);

    if (!Array.isArray(usersData)) {
      this.logger.error('Dữ liệu users không phải là array');
      return;
    }

    for (const user of usersData) {
      try {
        const hashedPassword = await bcrypt.hash(user.password, 10);

        // Convert avatar URL if exists
        let avatarUrl = user.avatar_url;
        if (avatarUrl) {
          avatarUrl = this.convertToS3Url(avatarUrl);
        }

        await this.prisma.users.create({
          data: {
            email: user.email,
            password_hash: hashedPassword,
            full_name: user.full_name,
            phone: user.phone,
            avatar_url: avatarUrl,
            role_id: userRole.id,
            is_active: true,
            firstlogin: false,
            created_at: new Date(user.created_at),
            updated_at: new Date(user.updated_at),
          },
        });
      } catch (error) {
        this.logger.error(`Lỗi khi tạo user ${user.email}:`, error);
      }
    }

    this.logger.log(`Đã tạo ${usersData.length} users thành công`);
  }

  private async seedShops() {
    const existingShops = await this.prisma.shops.count();
    if (existingShops > 0) {
      this.logger.log('Shop đã tồn tại, không khởi tạo mới');
      return;
    }

    // Fetch seller role by name
    const sellerRole = await this.prisma.role.findFirst({
      where: { name: 'seller' },
    });

    if (!sellerRole) {
      this.logger.error('❌ Seller role không tồn tại');
      return;
    }

    // --- Shop 1: BeautyShop ---
    const hashedPasswordOwner1 = await bcrypt.hash('123456', 10);
    const owner1 = await this.prisma.users.create({
      data: {
        email: 'owner1@shop.com',
        password_hash: hashedPasswordOwner1,
        full_name: 'BeautyShop Owner',
        phone: '0345671392',
        role_id: sellerRole.id,
        is_active: true,
        firstlogin: false,
      },
    });

    const shop1 = await this.prisma.shops.create({
      data: {
        owner_id: owner1.id,
        name: 'BeautyShop',
        slug: 'beautyshop',
        description: 'Cửa hàng BeautyShop',
        is_verified: true,
        ghn_shop_id: 198073,
      },
    });

    await this.prisma.shop_addresses.create({
      data: {
        shop_id: shop1.id,
        name: 'BeautyShop - Cửa hàng chính',
        phone: '0345671392',
        province: 'Thành phố Hà Nội',
        district: 'Quận Hoàn Kiếm',
        ward: 'Phường Hàng Bạc',
        street: '25 Hàng Bạc',
        is_default: true,
        // GHN IDs for Hà Nội
        ghn_province_id: 201,
        ghn_district_id: 1482,
        ghn_ward_code: '1A0101',
      },
    });
    this.logger.log(
      `Đã tạo shop: ${shop1.name} với owner: ${owner1.full_name}`,
    );

    // --- Shop 2: SkincareShop ---
    const hashedPasswordOwner2 = await bcrypt.hash('123456', 10);
    const owner2 = await this.prisma.users.create({
      data: {
        email: 'owner2@shop.com',
        password_hash: hashedPasswordOwner2,
        full_name: 'SkincareShop Owner',
        phone: '0345671393',
        role_id: sellerRole.id,
        is_active: true,
        firstlogin: false,
      },
    });

    const shop2 = await this.prisma.shops.create({
      data: {
        owner_id: owner2.id,
        name: 'SkincareShop',
        slug: 'skincareshop',
        description: 'Cửa hàng SkincareShop',
        is_verified: true,
        ghn_shop_id: 198074,
      },
    });

    await this.prisma.shop_addresses.create({
      data: {
        shop_id: shop2.id,
        name: 'SkincareShop - Cửa hàng chính',
        phone: '0345671393',
        province: 'Thành phố Hồ Chí Minh',
        district: 'Quận 1',
        ward: 'Phường Bến Nghé',
        street: '123 Nguyễn Huệ',
        is_default: true,
        // GHN IDs for TP.HCM
        ghn_province_id: 202,
        ghn_district_id: 1442,
        ghn_ward_code: '1B0101',
      },
    });
    this.logger.log(
      `Đã tạo shop: ${shop2.name} với owner: ${owner2.full_name}`,
    );

    // --- Shop 3: MakeupShop ---
    const hashedPasswordOwner3 = await bcrypt.hash('123456', 10);
    const owner3 = await this.prisma.users.create({
      data: {
        email: 'owner3@shop.com',
        password_hash: hashedPasswordOwner3,
        full_name: 'MakeupShop Owner',
        phone: '0345671394',
        role_id: sellerRole.id,
        is_active: true,
        firstlogin: false,
      },
    });

    const shop3 = await this.prisma.shops.create({
      data: {
        owner_id: owner3.id,
        name: 'MakeupShop',
        slug: 'makeupshop',
        description: 'Cửa hàng MakeupShop',
        is_verified: true,
        ghn_shop_id: 198075,
      },
    });

    await this.prisma.shop_addresses.create({
      data: {
        shop_id: shop3.id,
        name: 'MakeupShop - Cửa hàng chính',
        phone: '0345671394',
        province: 'Thành phố Đà Nẵng',
        district: 'Quận Hải Châu',
        ward: 'Phường Hải Châu I',
        street: '88 Trần Phú',
        is_default: true,
        // GHN IDs for Đà Nẵng
        ghn_province_id: 203,
        ghn_district_id: 1490,
        ghn_ward_code: '1C0101',
      },
    });
    this.logger.log(
      `Đã tạo shop: ${shop3.name} với owner: ${owner3.full_name}`,
    );

    // --- Shop 4: CosmeticShop ---
    const hashedPasswordOwner4 = await bcrypt.hash('123456', 10);
    const owner4 = await this.prisma.users.create({
      data: {
        email: 'owner4@shop.com',
        password_hash: hashedPasswordOwner4,
        full_name: 'CosmeticShop Owner',
        phone: '0345671395',
        role_id: sellerRole.id,
        is_active: true,
        firstlogin: false,
      },
    });

    const shop4 = await this.prisma.shops.create({
      data: {
        owner_id: owner4.id,
        name: 'CosmeticShop',
        slug: 'cosmeticshop',
        description: 'Cửa hàng CosmeticShop',
        is_verified: true,
        ghn_shop_id: 198076,
      },
    });

    await this.prisma.shop_addresses.create({
      data: {
        shop_id: shop4.id,
        name: 'CosmeticShop - Cửa hàng chính',
        phone: '0345671395',
        province: 'Thành phố Cần Thơ',
        district: 'Quận Ninh Kiều',
        ward: 'Phường Tân An',
        street: '45 Nguyễn Trãi',
        is_default: true,
        // GHN IDs for Cần Thơ
        ghn_province_id: 292,
        ghn_district_id: 2074,
        ghn_ward_code: '1D0101',
      },
    });
    this.logger.log(
      `Đã tạo shop: ${shop4.name} với owner: ${owner4.full_name}`,
    );
  }

  private async seedProducts() {
    const existingProducts = await this.prisma.products.count();
    if (existingProducts > 0) {
      this.logger.log('Sản phẩm đã tồn tại, không khởi tạo mới');
      return;
    }

    const productsFilePath = path.join(
      process.cwd(),
      'src',
      'data-init',
      'products.json',
    );
    const productsDataRaw = fs.readFileSync(productsFilePath, 'utf8');
    const productsData = JSON.parse(productsDataRaw);

    if (!Array.isArray(productsData)) {
      this.logger.error('Dữ liệu products không phải là array');
      return;
    }

    for (const productData of productsData) {
      try {
        const product = await this.prisma.products.create({
          data: {
            name: productData.name,
            slug: productData.slug,
            description: productData.description,
            how_to_use: productData.how_to_use,
            is_published: productData.is_published,
            moderation_status: productData.moderation_status,
            avg_rating: productData.avg_rating,
            review_count: productData.review_count,
            brand_id: productData.brand_id,
            shop_id: productData.shop_id,
            created_at: new Date(),
          },
        });

        if (productData.category_id) {
          await this.prisma.product_categories.create({
            data: {
              product_id: product.id,
              category_id: productData.category_id,
            },
          });
        }

        if (productData.variants && Array.isArray(productData.variants)) {
          for (const variantData of productData.variants) {
            await this.prisma.product_variants.create({
              data: {
                product_id: product.id,
                name: variantData.name,
                price: variantData.price,
                compare_at_price: variantData.compare_price,
                sku: variantData.sku,
                stock: variantData.stock_quantity,
                is_active: true,
                shade_hex: variantData.shade_hex || null,
                created_at: new Date(),
                weight: variantData.weight,
                length: variantData.length,
                width: variantData.width,
                height: variantData.height,
              },
            });
          }
        }

        if (productData.media && Array.isArray(productData.media)) {
          for (const mediaData of productData.media) {
            // Convert local path to S3 URL
            const s3MediaUrl = this.convertToS3Url(mediaData.url);

            await this.prisma.product_media.create({
              data: {
                product_id: product.id,
                url: s3MediaUrl,
                type: mediaData.type,
                sort_order: mediaData.is_primary ? 0 : 1,
                created_at: new Date(),
              },
            });
          }
        }

        this.logger.log(`Đã tạo sản phẩm: ${product.name}`);
      } catch (error) {
        this.logger.error(`Lỗi khi tạo sản phẩm ${productData.name}:`, error);
      }
    }

    this.logger.log(`Đã tạo ${productsData.length} sản phẩm thành công`);
  }

  async seedAddresses() {
    try {
      const existingAddresses = await this.prisma.addresses.count();
      if (existingAddresses > 0) {
        this.logger.log('Addresses đã tồn tại, không khởi tạo mới');
        return { success: false, message: 'Addresses đã tồn tại' };
      }

      const addressesFilePath = path.join(
        process.cwd(),
        'src',
        'data-init',
        'addresses.json',
      );
      const addressesDataRaw = fs.readFileSync(addressesFilePath, 'utf8');
      const addressesData = JSON.parse(addressesDataRaw);

      if (!Array.isArray(addressesData)) {
        this.logger.error('Dữ liệu addresses không phải là array');
        return { success: false, message: 'Dữ liệu addresses không hợp lệ' };
      }

      for (const address of addressesData) {
        await this.prisma.addresses.create({
          data: {
            user_id: address.user_id,
            label: address.label,
            recipient: address.recipient,
            phone: address.phone,
            province: address.province,
            district: address.district,
            ward: address.ward,
            street: address.street,
            is_default: address.is_default,
            created_at: new Date(),
          },
        });
      }

      this.logger.log(`Đã tạo ${addressesData.length} địa chỉ thành công`);
      return {
        success: true,
        message: `Đã tạo ${addressesData.length} địa chỉ thành công`,
      };
    } catch (error) {
      this.logger.error('Lỗi khi tạo addresses:', error);
      return {
        success: false,
        message: 'Lỗi khi tạo addresses',
        error: error.message,
      };
    }
  }

  async seedShopAddresses() {
    try {
      const existingShopAddresses = await this.prisma.shop_addresses.count();
      if (existingShopAddresses > 0) {
        this.logger.log('Shop addresses đã tồn tại, không khởi tạo mới');
        return { success: false, message: 'Shop addresses đã tồn tại' };
      }

      const shopAddressesFilePath = path.join(
        process.cwd(),
        'src',
        'data-init',
        'shop_addresses.json',
      );
      const shopAddressesDataRaw = fs.readFileSync(
        shopAddressesFilePath,
        'utf8',
      );
      const shopAddressesData = JSON.parse(shopAddressesDataRaw);

      if (!Array.isArray(shopAddressesData)) {
        this.logger.error('Dữ liệu shop_addresses không phải là array');
        return {
          success: false,
          message: 'Dữ liệu shop_addresses không hợp lệ',
        };
      }

      for (const shopAddress of shopAddressesData) {
        await this.prisma.shop_addresses.create({
          data: {
            shop_id: shopAddress.shop_id,
            name: shopAddress.name,
            phone: shopAddress.phone,
            email: shopAddress.email,
            province: shopAddress.province,
            district: shopAddress.district,
            ward: shopAddress.ward,
            street: shopAddress.street,
            is_default: shopAddress.is_default,
          },
        });
      }

      this.logger.log(
        `Đã tạo ${shopAddressesData.length} địa chỉ shop thành công`,
      );
      return {
        success: true,
        message: `Đã tạo ${shopAddressesData.length} địa chỉ shop thành công`,
      };
    } catch (error) {
      this.logger.error('Lỗi khi tạo shop addresses:', error);
      return {
        success: false,
        message: 'Lỗi khi tạo shop addresses',
        error: error.message,
      };
    }
  }

  async seedOrders() {
    try {
      const existingOrders = await this.prisma.orders.count();
      if (existingOrders > 0) {
        this.logger.log('Orders đã tồn tại, không khởi tạo mới');
        return { success: false, message: 'Orders đã tồn tại' };
      }

      // Lấy danh sách products từ DB để map ID (TẤT CẢ SHOPS, không chỉ shop 2!)
      const productsInDB = await this.prisma.products.findMany({
        orderBy: { id: 'asc' },
        select: { id: true, name: true, shop_id: true },
      });

      if (productsInDB.length === 0) {
        this.logger.error(
          'Không tìm thấy products trong DB. Vui lòng chạy seed products trước!',
        );
        return {
          success: false,
          message:
            'Không tìm thấy products. Chạy POST /data-init/products trước!',
        };
      }

      // Tạo map: product_id trong JSON (1,2,3...) -> product_id thực tế trong DB
      const productIdMap = new Map<number, number>();
      productsInDB.forEach((product, index) => {
        productIdMap.set(index + 1, product.id); // JSON dùng 1,2,3... map sang ID thực
      });

      this.logger.log(
        `Product ID mapping: ${JSON.stringify([...productIdMap.entries()])}`,
      );

      const ordersFilePath = path.join(
        process.cwd(),
        'src',
        'data-init',
        'orders.json',
      );
      const ordersDataRaw = fs.readFileSync(ordersFilePath, 'utf8');
      const ordersData = JSON.parse(ordersDataRaw);

      if (!Array.isArray(ordersData)) {
        this.logger.error('Dữ liệu orders không phải là array');
        return { success: false, message: 'Dữ liệu orders không hợp lệ' };
      }

      for (const orderData of ordersData) {
        try {
          // Tạo order
          const order = await this.prisma.orders.create({
            data: {
              user_id: orderData.user_id,
              shop_id: orderData.shop_id,
              status: orderData.status,
              payment_status: orderData.payment_status,
              subtotal_amount: orderData.subtotal_amount,
              discount_amount: orderData.discount_amount,
              shipping_fee: orderData.shipping_fee,
              total_amount: orderData.total_amount,
              shipping_address_id: orderData.shipping_address_id,
              pickup_address_id: orderData.pickup_address_id,
              note: orderData.note,
              created_at: new Date(orderData.created_at),
              updated_at: new Date(orderData.updated_at),
            },
          });

          // Tạo order items với product_id đã được map
          if (orderData.order_items && Array.isArray(orderData.order_items)) {
            for (const item of orderData.order_items) {
              const realProductId = productIdMap.get(item.product_id);
              if (!realProductId) {
                this.logger.warn(
                  `Không tìm thấy product_id mapping cho ${item.product_id}, skip item này`,
                );
                continue;
              }

              // Lấy variant_id thực tế từ product
              const variants = await this.prisma.product_variants.findMany({
                where: { product_id: realProductId },
                orderBy: { id: 'asc' },
              });

              const realVariantId =
                variants[item.variant_id - 1]?.id || variants[0]?.id;
              if (!realVariantId) {
                this.logger.warn(
                  `Không tìm thấy variant cho product ${realProductId}`,
                );
                continue;
              }

              await this.prisma.order_items.create({
                data: {
                  order_id: order.id,
                  product_id: realProductId,
                  variant_id: realVariantId,
                  name_snapshot: item.name_snapshot,
                  variant_snapshot: item.variant_snapshot,
                  unit_price: item.unit_price,
                  quantity: item.quantity,
                  line_total: item.line_total,
                },
              });
            }
          }

          // Tạo payment
          if (orderData.payment) {
            await this.prisma.payments.create({
              data: {
                order_id: order.id,
                provider: orderData.payment.provider,
                amount: orderData.payment.amount,
                status: orderData.payment.status,
                transaction_id: orderData.payment.transaction_id,
                created_at: new Date(orderData.payment.created_at),
              },
            });
          }

          // Tạo shipment
          if (orderData.shipment) {
            await this.prisma.shipments.create({
              data: {
                order_id: order.id,
                status: orderData.shipment.status,
                carrier: orderData.shipment.carrier,
                tracking_number: orderData.shipment.tracking_number,
                shipped_at: orderData.shipment.shipped_at
                  ? new Date(orderData.shipment.shipped_at)
                  : null,
                delivered_at: orderData.shipment.delivered_at
                  ? new Date(orderData.shipment.delivered_at)
                  : null,
                address_snapshot: orderData.shipment.address_snapshot,
                created_at: new Date(),
              },
            });
          }

          this.logger.log(`Đã tạo order #${order.id}`);
        } catch (error) {
          this.logger.error(`Lỗi khi tạo order:`, error);
        }
      }

      this.logger.log(`Đã tạo ${ordersData.length} đơn hàng thành công`);
      return {
        success: true,
        message: `Đã tạo ${ordersData.length} đơn hàng thành công`,
      };
    } catch (error) {
      this.logger.error('Lỗi khi tạo orders:', error);
      return {
        success: false,
        message: 'Lỗi khi tạo orders',
        error: error.message,
      };
    }
  }

  async seedShopStaffs() {
    try {
      const existingStaffs = await this.prisma.shop_staffs.count();
      if (existingStaffs > 0) {
        this.logger.log('Shop staffs đã tồn tại, không khởi tạo mới');
        return { success: false, message: 'Shop staffs đã tồn tại' };
      }

      const shopStaffsFilePath = path.join(
        process.cwd(),
        'src',
        'data-init',
        'shop_staffs.json',
      );
      const shopStaffsDataRaw = fs.readFileSync(shopStaffsFilePath, 'utf8');
      const shopStaffsData = JSON.parse(shopStaffsDataRaw);

      if (!Array.isArray(shopStaffsData)) {
        this.logger.error('Dữ liệu shop_staffs không phải là array');
        return { success: false, message: 'Dữ liệu shop_staffs không hợp lệ' };
      }

      let successCount = 0;
      let errorCount = 0;

      for (const staff of shopStaffsData) {
        try {
          // Kiểm tra xem shop và user có tồn tại không
          const shopExists = await this.prisma.shops.findUnique({
            where: { id: staff.shop_id },
          });
          const userExists = await this.prisma.users.findUnique({
            where: { id: staff.user_id },
          });

          if (!shopExists) {
            this.logger.warn(`Shop ID ${staff.shop_id} không tồn tại, skip`);
            errorCount++;
            continue;
          }
          if (!userExists) {
            this.logger.warn(`User ID ${staff.user_id} không tồn tại, skip`);
            errorCount++;
            continue;
          }

          await this.prisma.shop_staffs.create({
            data: {
              shop_id: staff.shop_id,
              user_id: staff.user_id,
              is_manager: staff.is_manager,
              created_at: new Date(staff.created_at),
            },
          });
          successCount++;
        } catch (error) {
          this.logger.error(`Lỗi khi tạo shop staff:`, error);
          errorCount++;
        }
      }

      this.logger.log(`Đã tạo ${successCount} shop staffs thành công`);
      return {
        success: true,
        message: `Đã tạo ${successCount}/${shopStaffsData.length} shop staffs`,
        successCount,
        errorCount,
      };
    } catch (error) {
      this.logger.error('Lỗi khi tạo shop staffs:', error);
      return {
        success: false,
        message: 'Lỗi khi tạo shop staffs',
        error: error.message,
      };
    }
  }

  private async seedCoupons() {
    const existingCoupons = await this.prisma.coupons.count();
    if (existingCoupons > 0) {
      this.logger.log('Coupons đã tồn tại, không khởi tạo mới');
      return;
    }

    const couponsFilePath = path.join(
      process.cwd(),
      'src',
      'data-init',
      'coupons.json',
    );
    const couponsDataRaw = fs.readFileSync(couponsFilePath, 'utf8');
    const couponsData = JSON.parse(couponsDataRaw);

    if (!Array.isArray(couponsData)) {
      this.logger.error('Dữ liệu coupons không phải là array');
      return;
    }

    for (const coupon of couponsData) {
      try {
        await this.prisma.coupons.create({
          data: {
            code: coupon.code,
            description: coupon.description,
            discount_type: coupon.discount_type,
            discount_value: coupon.discount_value,
            min_subtotal: coupon.min_subtotal,
            usage_limit: coupon.usage_limit,
            used_count: coupon.used_count,
            starts_at: coupon.starts_at ? new Date(coupon.starts_at) : null,
            ends_at: coupon.ends_at ? new Date(coupon.ends_at) : null,
            created_at: new Date(coupon.created_at),
          },
        });
      } catch (error) {
        this.logger.error(`Lỗi khi tạo coupon ${coupon.code}:`, error);
      }
    }

    this.logger.log(`Đã tạo ${couponsData.length} coupons thành công`);
  }

  async seedCarts() {
    try {
      const existingCarts = await this.prisma.carts.count();
      if (existingCarts > 0) {
        this.logger.log('Carts đã tồn tại, không khởi tạo mới');
        return { success: false, message: 'Carts đã tồn tại' };
      }

      const cartsFilePath = path.join(
        process.cwd(),
        'src',
        'data-init',
        'carts.json',
      );
      const cartsDataRaw = fs.readFileSync(cartsFilePath, 'utf8');
      const cartsData = JSON.parse(cartsDataRaw);

      if (!Array.isArray(cartsData)) {
        this.logger.error('Dữ liệu carts không phải là array');
        return { success: false, message: 'Dữ liệu carts không hợp lệ' };
      }

      let successCount = 0;
      let errorCount = 0;

      for (const cart of cartsData) {
        try {
          // Kiểm tra user có tồn tại không
          const userExists = await this.prisma.users.findUnique({
            where: { id: cart.user_id },
          });

          if (!userExists) {
            this.logger.warn(
              `User ID ${cart.user_id} không tồn tại, skip cart này`,
            );
            errorCount++;
            continue;
          }

          await this.prisma.carts.create({
            data: {
              user_id: cart.user_id,
              created_at: new Date(cart.created_at),
              updated_at: new Date(cart.updated_at),
            },
          });
          successCount++;
        } catch (error) {
          this.logger.error(
            `Lỗi khi tạo cart cho user ${cart.user_id}:`,
            error,
          );
          errorCount++;
        }
      }

      this.logger.log(`Đã tạo ${successCount} carts thành công`);
      return {
        success: true,
        message: `Đã tạo ${successCount}/${cartsData.length} carts`,
        successCount,
        errorCount,
      };
    } catch (error) {
      this.logger.error('Lỗi khi tạo carts:', error);
      return {
        success: false,
        message: 'Lỗi khi tạo carts',
        error: error.message,
      };
    }
  }

  async seedCartItems() {
    try {
      const existingCartItems = await this.prisma.cart_items.count();
      if (existingCartItems > 0) {
        this.logger.log('Cart items đã tồn tại, không khởi tạo mới');
        return { success: false, message: 'Cart items đã tồn tại' };
      }

      const cartItemsFilePath = path.join(
        process.cwd(),
        'src',
        'data-init',
        'cart_items.json',
      );
      const cartItemsDataRaw = fs.readFileSync(cartItemsFilePath, 'utf8');
      const cartItemsData = JSON.parse(cartItemsDataRaw);

      if (!Array.isArray(cartItemsData)) {
        this.logger.error('Dữ liệu cart_items không phải là array');
        return { success: false, message: 'Dữ liệu cart_items không hợp lệ' };
      }

      // Get product mapping
      const productsInDB = await this.prisma.products.findMany({
        orderBy: { id: 'asc' },
        select: { id: true },
      });

      if (productsInDB.length === 0) {
        return {
          success: false,
          message: 'Không có products trong DB. Vui lòng seed products trước!',
        };
      }

      const productIdMap = new Map<number, number>();
      productsInDB.forEach((product, index) => {
        productIdMap.set(index + 1, product.id);
      });

      let successCount = 0;
      let errorCount = 0;

      for (const cartItem of cartItemsData) {
        try {
          // Kiểm tra cart có tồn tại không
          const cartExists = await this.prisma.carts.findUnique({
            where: { id: cartItem.cart_id },
          });

          if (!cartExists) {
            this.logger.warn(
              `Cart ID ${cartItem.cart_id} không tồn tại, skip item này`,
            );
            errorCount++;
            continue;
          }

          const realProductId = productIdMap.get(cartItem.product_id);
          if (!realProductId) {
            this.logger.warn(
              `Không tìm thấy product_id mapping cho ${cartItem.product_id}`,
            );
            errorCount++;
            continue;
          }

          // Get variant
          const variants = await this.prisma.product_variants.findMany({
            where: { product_id: realProductId },
            orderBy: { id: 'asc' },
          });

          const realVariantId =
            variants[cartItem.variant_id - 1]?.id || variants[0]?.id;
          if (!realVariantId) {
            this.logger.warn(
              `Không tìm thấy variant cho product ${realProductId}`,
            );
            errorCount++;
            continue;
          }

          await this.prisma.cart_items.create({
            data: {
              cart_id: cartItem.cart_id,
              product_id: realProductId,
              variant_id: realVariantId,
              quantity: cartItem.quantity,
              price_snapshot: cartItem.price_snapshot,
              created_at: new Date(cartItem.created_at),
            },
          });
          successCount++;
        } catch (error) {
          this.logger.error(`Lỗi khi tạo cart item:`, error);
          errorCount++;
        }
      }

      this.logger.log(`Đã tạo ${successCount} cart items thành công`);
      return {
        success: true,
        message: `Đã tạo ${successCount}/${cartItemsData.length} cart items`,
        successCount,
        errorCount,
      };
    } catch (error) {
      this.logger.error('Lỗi khi tạo cart items:', error);
      return {
        success: false,
        message: 'Lỗi khi tạo cart items',
        error: error.message,
      };
    }
  }

  private async seedOrderCoupons() {
    const existingOrderCoupons = await this.prisma.order_coupons.count();
    if (existingOrderCoupons > 0) {
      this.logger.log('Order coupons đã tồn tại, không khởi tạo mới');
      return;
    }

    // Get actual order IDs from database
    const ordersInDB = await this.prisma.orders.findMany({
      orderBy: { id: 'asc' },
      select: { id: true },
    });

    if (ordersInDB.length === 0) {
      this.logger.error('Không có orders trong DB để tạo order_coupons');
      return;
    }

    // Create mapping: index position (1,2,3...) -> actual order_id
    const orderIdMap = new Map<number, number>();
    ordersInDB.forEach((order, index) => {
      orderIdMap.set(index + 1, order.id);
    });

    const orderCouponsFilePath = path.join(
      process.cwd(),
      'src',
      'data-init',
      'order_coupons.json',
    );
    const orderCouponsDataRaw = fs.readFileSync(orderCouponsFilePath, 'utf8');
    const orderCouponsData = JSON.parse(orderCouponsDataRaw);

    if (!Array.isArray(orderCouponsData)) {
      this.logger.error('Dữ liệu order_coupons không phải là array');
      return;
    }

    for (const orderCoupon of orderCouponsData) {
      try {
        const realOrderId = orderIdMap.get(orderCoupon.order_id);
        if (!realOrderId) {
          this.logger.warn(
            `Không tìm thấy order mapping cho order_id ${orderCoupon.order_id}, skip`,
          );
          continue;
        }

        await this.prisma.order_coupons.create({
          data: {
            order_id: realOrderId,
            coupon_id: orderCoupon.coupon_id,
            amount: orderCoupon.amount,
          },
        });
      } catch (error) {
        this.logger.error(
          `Lỗi khi tạo order coupon cho order ${orderCoupon.order_id}:`,
          error,
        );
      }
    }

    this.logger.log(
      `Đã tạo ${orderCouponsData.length} order coupons thành công`,
    );
  }

  private async seedShipmentLogs() {
    const existingShipmentLogs = await this.prisma.shipment_logs.count();
    if (existingShipmentLogs > 0) {
      this.logger.log('Shipment logs đã tồn tại, không khởi tạo mới');
      return;
    }

    // Get actual shipment IDs from database
    const shipmentsInDB = await this.prisma.shipments.findMany({
      orderBy: { id: 'asc' },
      select: { id: true },
    });

    if (shipmentsInDB.length === 0) {
      this.logger.error('Không có shipments trong DB để tạo shipment_logs');
      return;
    }

    // Create mapping: index position (1,2,3...) -> actual shipment_id
    const shipmentIdMap = new Map<number, number>();
    shipmentsInDB.forEach((shipment, index) => {
      shipmentIdMap.set(index + 1, shipment.id);
    });

    const shipmentLogsFilePath = path.join(
      process.cwd(),
      'src',
      'data-init',
      'shipment_logs.json',
    );
    const shipmentLogsDataRaw = fs.readFileSync(shipmentLogsFilePath, 'utf8');
    const shipmentLogsData = JSON.parse(shipmentLogsDataRaw);

    if (!Array.isArray(shipmentLogsData)) {
      this.logger.error('Dữ liệu shipment_logs không phải là array');
      return;
    }

    for (const shipmentLog of shipmentLogsData) {
      try {
        const realShipmentId = shipmentIdMap.get(shipmentLog.shipment_id);
        if (!realShipmentId) {
          this.logger.warn(
            `Không tìm thấy shipment mapping cho shipment_id ${shipmentLog.shipment_id}, skip`,
          );
          continue;
        }

        await this.prisma.shipment_logs.create({
          data: {
            shipment_id: realShipmentId,
            status: shipmentLog.status,
            location_description: shipmentLog.location_description,
            updated_at: new Date(shipmentLog.updated_at),
          },
        });
      } catch (error) {
        this.logger.error(`Lỗi khi tạo shipment log:`, error);
      }
    }

    this.logger.log(
      `Đã tạo ${shipmentLogsData.length} shipment logs thành công`,
    );
  }

  // ==================== SOCIAL/COMMUNITY FEATURES ====================

  private async seedReviews() {
    const existingReviews = await this.prisma.reviews.count();
    if (existingReviews > 0) {
      this.logger.log('Reviews đã tồn tại, không khởi tạo mới');
      return;
    }

    const reviewsFilePath = path.join(
      process.cwd(),
      'src',
      'data-init',
      'reviews.json',
    );

    if (!fs.existsSync(reviewsFilePath)) {
      this.logger.warn('File reviews.json không tồn tại, bỏ qua seed reviews');
      return;
    }

    const reviewsDataRaw = fs.readFileSync(reviewsFilePath, 'utf8');
    const reviewsData = JSON.parse(reviewsDataRaw);

    if (!Array.isArray(reviewsData)) {
      this.logger.error('Dữ liệu reviews không phải là array');
      return;
    }

    // Get product mapping
    const productsInDB = await this.prisma.products.findMany({
      orderBy: { id: 'asc' },
      select: { id: true },
    });

    const productIdMap = new Map<number, number>();
    productsInDB.forEach((product, index) => {
      productIdMap.set(index + 1, product.id);
    });

    for (const review of reviewsData) {
      try {
        const realProductId = productIdMap.get(review.product_id);
        if (!realProductId) {
          this.logger.warn(`Không tìm thấy product_id ${review.product_id}, skip review`);
          continue;
        }

        await this.prisma.reviews.create({
          data: {
            user_id: review.user_id,
            product_id: realProductId,
            rating: review.rating,
            title: review.title,
            content: review.content,
            media_url: review.media_url,
            is_verified_purchase: review.is_verified_purchase,
            created_at: new Date(review.created_at),
          },
        });
      } catch (error) {
        this.logger.error(`Lỗi khi tạo review:`, error);
      }
    }

    this.logger.log(`Đã tạo ${reviewsData.length} reviews thành công`);
  }

  private async seedWishlists() {
    const existingWishlists = await this.prisma.wishlists.count();
    if (existingWishlists > 0) {
      this.logger.log('Wishlists đã tồn tại, không khởi tạo mới');
      return;
    }

    const wishlistsFilePath = path.join(
      process.cwd(),
      'src',
      'data-init',
      'wishlists.json',
    );

    if (!fs.existsSync(wishlistsFilePath)) {
      this.logger.warn('File wishlists.json không tồn tại, bỏ qua seed wishlists');
      return;
    }

    const wishlistsDataRaw = fs.readFileSync(wishlistsFilePath, 'utf8');
    const wishlistsData = JSON.parse(wishlistsDataRaw);

    if (!Array.isArray(wishlistsData)) {
      this.logger.error('Dữ liệu wishlists không phải là array');
      return;
    }

    // Get product mapping
    const productsInDB = await this.prisma.products.findMany({
      orderBy: { id: 'asc' },
      select: { id: true },
    });

    const productIdMap = new Map<number, number>();
    productsInDB.forEach((product, index) => {
      productIdMap.set(index + 1, product.id);
    });

    for (const wishlist of wishlistsData) {
      try {
        const realProductId = productIdMap.get(wishlist.product_id);
        if (!realProductId) {
          this.logger.warn(`Không tìm thấy product_id ${wishlist.product_id}, skip wishlist`);
          continue;
        }

        await this.prisma.wishlists.create({
          data: {
            user_id: wishlist.user_id,
            product_id: realProductId,
            created_at: new Date(wishlist.created_at),
          },
        });
      } catch (error) {
        this.logger.error(`Lỗi khi tạo wishlist:`, error);
      }
    }

    this.logger.log(`Đã tạo ${wishlistsData.length} wishlists thành công`);
  }

  private async seedFollows() {
    const existingFollows = await this.prisma.follows.count();
    if (existingFollows > 0) {
      this.logger.log('Follows đã tồn tại, không khởi tạo mới');
      return;
    }

    const followsFilePath = path.join(
      process.cwd(),
      'src',
      'data-init',
      'follows.json',
    );

    if (!fs.existsSync(followsFilePath)) {
      this.logger.warn('File follows.json không tồn tại, bỏ qua seed follows');
      return;
    }

    const followsDataRaw = fs.readFileSync(followsFilePath, 'utf8');
    const followsData = JSON.parse(followsDataRaw);

    if (!Array.isArray(followsData)) {
      this.logger.error('Dữ liệu follows không phải là array');
      return;
    }

    for (const follow of followsData) {
      try {
        await this.prisma.shop_follows.create({
          data: {
            user_id: follow.user_id,
            shop_id: follow.shop_id,
            created_at: new Date(follow.created_at),
          },
        });
      } catch (error) {
        this.logger.error(`Lỗi khi tạo follow:`, error);
      }
    }

    this.logger.log(`Đã tạo ${followsData.length} follows thành công`);
  }

  private async seedPosts() {
    const existingPosts = await this.prisma.posts.count();
    if (existingPosts > 0) {
      this.logger.log('Posts đã tồn tại, không khởi tạo mới');
      return;
    }

    const postsFilePath = path.join(
      process.cwd(),
      'src',
      'data-init',
      'posts.json',
    );

    if (!fs.existsSync(postsFilePath)) {
      this.logger.warn('File posts.json không tồn tại, bỏ qua seed posts');
      return;
    }

    const postsDataRaw = fs.readFileSync(postsFilePath, 'utf8');
    const postsData = JSON.parse(postsDataRaw);

    if (!Array.isArray(postsData)) {
      this.logger.error('Dữ liệu posts không phải là array');
      return;
    }

    // Get product mapping
    const productsInDB = await this.prisma.products.findMany({
      orderBy: { id: 'asc' },
      select: { id: true },
    });

    const productIdMap = new Map<number, number>();
    productsInDB.forEach((product, index) => {
      productIdMap.set(index + 1, product.id);
    });

    for (const postData of postsData) {
      try {
        // Convert media URLs to S3
        const s3MediaUrl = postData.media_url ? this.convertToS3Url(postData.media_url) : null;

        const post = await this.prisma.posts.create({
          data: {
            user_id: postData.user_id,
            shop_id: postData.shop_id,
            post_type: postData.post_type,
            title: postData.title,
            content_md: postData.content_md,
            moderation_status: postData.moderation_status,
            visibility: postData.visibility,
            view_count: postData.view_count,
            like_count: postData.like_count,
            is_story: postData.is_story,
            story_type: postData.story_type,
            media_url: s3MediaUrl,
            caption: postData.caption,
            duration: postData.duration,
            expires_at: postData.expires_at ? new Date(postData.expires_at) : null,
            created_at: new Date(postData.created_at),
            updated_at: new Date(postData.updated_at),
          },
        });

        // Create post media
        if (postData.media && Array.isArray(postData.media)) {
          for (const media of postData.media) {
            const s3Url = this.convertToS3Url(media.media_url);
            await this.prisma.post_media.create({
              data: {
                post_id: post.id,
                media_url: s3Url,
                media_type: media.media_type,
                sort_order: media.sort_order,
                created_at: new Date(),
              },
            });
          }
        }

        // Create post products
        if (postData.products && Array.isArray(postData.products)) {
          for (const productId of postData.products) {
            const realProductId = productIdMap.get(productId);
            if (realProductId) {
              await this.prisma.post_products.create({
                data: {
                  post_id: post.id,
                  product_id: realProductId,
                },
              });
            }
          }
        }

        this.logger.log(`Đã tạo post #${post.id}`);
      } catch (error) {
        this.logger.error(`Lỗi khi tạo post:`, error);
      }
    }

    this.logger.log(`Đã tạo ${postsData.length} posts thành công`);
  }

  private async seedLikes() {
    const existingLikes = await this.prisma.likes.count();
    if (existingLikes > 0) {
      this.logger.log('Likes đã tồn tại, không khởi tạo mới');
      return;
    }

    const likesFilePath = path.join(
      process.cwd(),
      'src',
      'data-init',
      'likes.json',
    );

    if (!fs.existsSync(likesFilePath)) {
      this.logger.warn('File likes.json không tồn tại, bỏ qua seed likes');
      return;
    }

    const likesDataRaw = fs.readFileSync(likesFilePath, 'utf8');
    const likesData = JSON.parse(likesDataRaw);

    if (!Array.isArray(likesData)) {
      this.logger.error('Dữ liệu likes không phải là array');
      return;
    }

    // Get post mapping
    const postsInDB = await this.prisma.posts.findMany({
      orderBy: { id: 'asc' },
      select: { id: true },
    });

    const postIdMap = new Map<number, number>();
    postsInDB.forEach((post, index) => {
      postIdMap.set(index + 1, post.id);
    });

    for (const like of likesData) {
      try {
        const realPostId = postIdMap.get(like.post_id);
        if (!realPostId) {
          this.logger.warn(`Không tìm thấy post_id ${like.post_id}, skip like`);
          continue;
        }

        await this.prisma.likes.create({
          data: {
            user_id: like.user_id,
            target_type: 'post',
            target_id: realPostId,
            created_at: new Date(like.created_at),
          },
        });
      } catch (error) {
        this.logger.error(`Lỗi khi tạo like:`, error);
      }
    }

    this.logger.log(`Đã tạo ${likesData.length} likes thành công`);
  }

  private async seedComments() {
    const existingComments = await this.prisma.comments.count();
    if (existingComments > 0) {
      this.logger.log('Comments đã tồn tại, không khởi tạo mới');
      return;
    }

    const commentsFilePath = path.join(
      process.cwd(),
      'src',
      'data-init',
      'comments.json',
    );

    if (!fs.existsSync(commentsFilePath)) {
      this.logger.warn('File comments.json không tồn tại, bỏ qua seed comments');
      return;
    }

    const commentsDataRaw = fs.readFileSync(commentsFilePath, 'utf8');
    const commentsData = JSON.parse(commentsDataRaw);

    if (!Array.isArray(commentsData)) {
      this.logger.error('Dữ liệu comments không phải là array');
      return;
    }

    // Get post mapping
    const postsInDB = await this.prisma.posts.findMany({
      orderBy: { id: 'asc' },
      select: { id: true },
    });

    const postIdMap = new Map<number, number>();
    postsInDB.forEach((post, index) => {
      postIdMap.set(index + 1, post.id);
    });

    // Create comments in order (parent first, then children)
    const commentIdMap = new Map<number, number>(); // JSON id -> DB id

    for (const comment of commentsData) {
      try {
        const realPostId = postIdMap.get(comment.post_id);
        if (!realPostId) {
          this.logger.warn(`Không tìm thấy post_id ${comment.post_id}, skip comment`);
          continue;
        }

        let realParentId: number | null = null;
        if (comment.parent_id) {
          const mappedParentId = commentIdMap.get(comment.parent_id);
          if (!mappedParentId) {
            this.logger.warn(`Không tìm thấy parent comment ${comment.parent_id}, skip`);
            continue;
          }
          realParentId = mappedParentId;
        }

        const createdComment = await this.prisma.comments.create({
          data: {
            target_type: 'post',
            target_id: realPostId,
            user_id: comment.user_id,
            parent_id: realParentId,
            content: comment.content,
            created_at: new Date(comment.created_at),
          },
        });

        // Store mapping for child comments
        const jsonCommentId = commentsData.indexOf(comment) + 1;
        commentIdMap.set(jsonCommentId, createdComment.id);
      } catch (error) {
        this.logger.error(`Lỗi khi tạo comment:`, error);
      }
    }

    this.logger.log(`Đã tạo ${commentsData.length} comments thành công`);
  }

  private async seedSavedPosts() {
    const existingSavedPosts = await this.prisma.saved_posts.count();
    if (existingSavedPosts > 0) {
      this.logger.log('Saved posts đã tồn tại, không khởi tạo mới');
      return;
    }

    const savedPostsFilePath = path.join(
      process.cwd(),
      'src',
      'data-init',
      'saved_posts.json',
    );

    if (!fs.existsSync(savedPostsFilePath)) {
      this.logger.warn('File saved_posts.json không tồn tại, bỏ qua seed saved_posts');
      return;
    }

    const savedPostsDataRaw = fs.readFileSync(savedPostsFilePath, 'utf8');
    const savedPostsData = JSON.parse(savedPostsDataRaw);

    if (!Array.isArray(savedPostsData)) {
      this.logger.error('Dữ liệu saved_posts không phải là array');
      return;
    }

    // Get post mapping
    const postsInDB = await this.prisma.posts.findMany({
      orderBy: { id: 'asc' },
      select: { id: true },
    });

    const postIdMap = new Map<number, number>();
    postsInDB.forEach((post, index) => {
      postIdMap.set(index + 1, post.id);
    });

    for (const savedPost of savedPostsData) {
      try {
        const realPostId = postIdMap.get(savedPost.post_id);
        if (!realPostId) {
          this.logger.warn(`Không tìm thấy post_id ${savedPost.post_id}, skip saved_post`);
          continue;
        }

        await this.prisma.saved_posts.create({
          data: {
            user_id: savedPost.user_id,
            post_id: realPostId,
            created_at: new Date(savedPost.created_at),
          },
        });
      } catch (error) {
        this.logger.error(`Lỗi khi tạo saved_post:`, error);
      }
    }

    this.logger.log(`Đã tạo ${savedPostsData.length} saved posts thành công`);
  }
}
