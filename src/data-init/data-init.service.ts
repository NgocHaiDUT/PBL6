import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3UploadService } from './s3-upload.service';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcrypt';

@Injectable()
export class DataInitService implements OnModuleInit {
  private readonly logger = new Logger(DataInitService.name);
  constructor(
    private prisma: PrismaService,
    private s3UploadService: S3UploadService,
  ) {}

  async onModuleInit() {
    this.logger.log('DataInitService module initialized');
    await this.seedData();
  }
  async seedData() {
    try {
      await this.seedBrands();
      await this.seedCategorys();
      await this.seedRoles();
      await this.seedPermissions();
      await this.seedRolePermissions();
      await this.seedAdminUser();
      await this.seedUsers(); // Create regular users for testing
      await this.seedShops();
      await this.seedProducts();
      await this.seedCoupons();
      // await this.seedShopStaffs(); // Moved to API
      // await this.seedCarts(); // Moved to API
      // await this.seedCartItems(); // Moved to API
      // await this.seedAddresses(); // Moved to API
      // await this.seedShopAddresses(); // Moved to API
      // await this.seedOrders(); // Moved to API
      // await this.seedOrderCoupons(); // Moved to API
      // await this.seedShipmentLogs(); // Moved to API

      // await this.uploadBrandLogosIfNeeded();

      this.logger.log('Dữ liệu khởi tạo cơ bản thành công. Gọi các API riêng để tạo data có foreign key.');
    } catch (error) {
      this.logger.error('Lỗi khi tạo dữ liệu : ', error);
    }
  }

  async uploadBrandLogosIfNeeded() {
    try {
      const localBrandPath = path.join(process.cwd(), 'uploads', 'brands');
      if (fs.existsSync(localBrandPath)) {
        this.logger.log('Bắt đầu upload brand logos lên S3...');
        await this.s3UploadService.uploadBrandLogosToS3();
      } else {
        this.logger.log(
          'Không tìm thấy thư mục brand logos local, bỏ qua upload S3',
        );
      }
    } catch (error) {
      this.logger.error('Lỗi khi upload brand logos:', error);
    }
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
      await this.prisma.brands.create({
        data: {
          name: brand.name,
          slug: brand.slug,
          logo_url: brand.logo_url,
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
    const existingRoles = await this.prisma.role.count();
    if (existingRoles > 0) {
      this.logger.log('Role đã tồn tại không tạo mới');
      return;
    }

    const rolesFilePath = path.join(
      process.cwd(),
      'src',
      'data-init',
      'roles.json',
    );
    const rolesDataRaw = fs.readFileSync(rolesFilePath, 'utf8');
    const rolesData = JSON.parse(rolesDataRaw);

    if (!Array.isArray(rolesData)) {
      this.logger.log('Dữ liệu role không phải array');
      return;
    }

    for (const role of rolesData) {
      await this.prisma.role.create({
        data: {
          name: role.name,
        },
      });
    }

    this.logger.log(`Đã tạo ${rolesData.length} role`);
  }

  private async seedPermissions() {
    const existPermissions = await this.prisma.permission.count();
    if (existPermissions > 0) {
      this.logger.log('Dữ liệu permission đã tồn tại, không khởi tạo');
      return;
    }

    const permissionsFilePath = path.join(
      process.cwd(),
      'src',
      'data-init',
      'permissions.json',
    );
    const permissionsDataRaw = fs.readFileSync(permissionsFilePath, 'utf8');
    const permissionsData = JSON.parse(permissionsDataRaw);

    if (!Array.isArray(permissionsData)) {
      this.logger.log('Dữ liệu permission không phải là array');
      return;
    }

    for (const permission of permissionsData) {
      await this.prisma.permission.create({
        data: { name: permission.name },
      });
    }

    this.logger.log(`Đã tạo ${permissionsData.length} permission`);
  }

  private async seedRolePermissions() {
    const existingRolePermissions = await this.prisma.rolepermission.count();
    if (existingRolePermissions > 0) {
      this.logger.log('Role permissions đã tồn tại, không khởi tạo mới');
      return;
    }

    const rolePermissionsFilePath = path.join(
      process.cwd(),
      'src',
      'data-init',
      'role_permissions.json',
    );
    const rolePermissionsDataRaw = fs.readFileSync(
      rolePermissionsFilePath,
      'utf8',
    );
    const rolePermissionsData = JSON.parse(rolePermissionsDataRaw);

    if (!Array.isArray(rolePermissionsData)) {
      this.logger.error('Dữ liệu role permissions không phải là array');
      return;
    }

    for (const rolePermission of rolePermissionsData) {
      try {
        const permission = await this.prisma.permission.findUnique({
          where: { name: rolePermission.permission_name },
        });

        if (!permission) {
          this.logger.warn(
            `Permission "${rolePermission.permission_name}" không tìm thấy, bỏ qua`,
          );
          continue;
        }

        const role = await this.prisma.role.findUnique({
          where: { id: rolePermission.role_id },
        });

        if (!role) {
          this.logger.warn(
            `Role với ID ${rolePermission.role_id} không tìm thấy, bỏ qua`,
          );
          continue;
        }

        await this.prisma.rolepermission.create({
          data: {
            role_id: rolePermission.role_id,
            permission_id: permission.id,
          },
        });
      } catch (error) {
        this.logger.error(
          `Lỗi khi tạo role permission cho role_id ${rolePermission.role_id}, permission ${rolePermission.permission_name}:`,
          error,
        );
      }
    }

    this.logger.log(
      `Đã tạo ${rolePermissionsData.length} liên kết role-permission thành công`,
    );
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

      const hashedPassword = await bcrypt.hash('Admin@123456', 10);

      const adminUser = await this.prisma.users.create({
        data: {
          email: 'admin@pbl6.com',
          password_hash: hashedPassword,
          full_name: 'System Administrator',
          phone: '0999999999',
          role_id: adminRole.id,
          is_active: true,
          created_at: new Date(),
        },
      });

      this.logger.log('✅ Đã tạo admin user thành công');
      this.logger.log('📧 Email: admin@pbl6.com');
      this.logger.log('🔑 Password: Admin@123456');
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
        await this.prisma.users.create({
          data: {
            email: user.email,
            password_hash: hashedPassword,
            full_name: user.full_name,
            phone: user.phone,
            role_id: user.role_id,
            is_active: true,
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

    // --- Shop 1: BeautyShop ---
    const owner1 = await this.prisma.users.create({
      data: {
        email: 'owner1@shop.com',
        password_hash: '$2b$10$example',
        full_name: 'BeautyShop Owner',
        phone: '0345671392',
        is_active: true,
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
        name: 'BeautyShop',
        phone: '0345671392',
        province: 'Đà Nẵng',
        district: 'Liên Chiểu',
        ward: 'Hoà Hiệp Nam',
        street: '541 Nguyễn Lương Bằng',
        is_default: true,
        // Placeholder GHN IDs
        ghn_province_id: 203,
        ghn_district_id: 1530,
        ghn_ward_code: '40502',
      },
    });
    this.logger.log(
      `Đã tạo shop: ${shop1.name} với owner: ${owner1.full_name}`,
    );

    // --- Shop 2: SkincareShop ---
    const owner2 = await this.prisma.users.create({
      data: {
        email: 'owner2@shop.com',
        password_hash: '$2b$10$example',
        full_name: 'SkincareShop Owner',
        phone: '0345671392',
        is_active: true,
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
        name: 'SkincareShop',
        phone: '0345671392',
        province: 'Đà Nẵng',
        district: 'Hải Châu',
        ward: 'Hải Châu 1',
        street: '95 Hùng Vương',
        is_default: true,
        // Placeholder GHN IDs
        ghn_province_id: 203,
        ghn_district_id: 1526,
        ghn_ward_code: '40103',
      },
    });
    this.logger.log(
      `Đã tạo shop: ${shop2.name} với owner: ${owner2.full_name}`,
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
            is_published: productData.is_published,
            moderation_status: productData.moderation_status,
            avg_rating: productData.avg_rating,
            review_count: productData.total_reviews,
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
            await this.prisma.product_media.create({
              data: {
                product_id: product.id,
                url: mediaData.url,
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

      // Lấy danh sách products từ DB để map ID
      const productsInDB = await this.prisma.products.findMany({
        where: { shop_id: 2 },
        orderBy: { id: 'asc' },
        select: { id: true, name: true },
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
          this.logger.error(`Lỗi khi tạo cart cho user ${cart.user_id}:`, error);
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
}
