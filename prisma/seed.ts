// prisma/seed.ts
import { PrismaClient, skin_type } from '@prisma/client';
import { faker } from '@faker-js/faker/locale/vi';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// --- DEFINITIONS FROM ENUMS (Copied to ensure standalone execution) ---

enum Role {
  USER = 'user',
  SELLER = 'seller',
  ADMIN = 'admin',
  STAFF = 'staff',
}

enum Permission {
  // USER PERMISSIONS (role_id: 1)
  ADD_TO_CART = 'add_to_cart',
  CHECKOUT = 'checkout',
  CREATE_COMMENT = 'create_comment',
  CREATE_POST = 'create_post',
  CREATE_REVIEW = 'create_review',
  CREATE_SHOP = 'create_shop',
  DELETE_COMMENT = 'delete_comment',
  DELETE_POST = 'delete_post',
  EDIT_COMMENT = 'edit_comment',
  EDIT_POST = 'edit_post',
  EDIT_PROFILE = 'edit_profile',
  MANAGE_ADDRESSES = 'manage_addresses',
  TOGGLE_FOLLOW = 'toggle_follow',
  TOGGLE_LIKE = 'toggle_like',
  VIEW_ORDERS = 'view_orders',
  VIEW_PRODUCTS = 'view_products',

  // SELLER PERMISSIONS (role_id: 2)
  CHAT_WITH_CUSTOMER = 'chat_with_customer',
  CREATE_PRODUCT = 'create_product',
  DELETE_PRODUCT = 'delete_product',
  EDIT_PRODUCT = 'edit_product',
  EDIT_PROFILE_SHOP = 'edit_profile_shop',
  MANAGE_ORDERS = 'manage_orders',
  MANAGE_SHOP_STAFF = 'manage_shop_staff',
  TRY_ON_TESTER = 'try_on_tester',
  UPDATE_PRODUCT = 'update_product',
  VIEW_SHOP_DASHBOARD = 'view_shop_dashboard',
  // Added from file analysis
  MANAGE_SHOP_ADMIN = 'manage_shop_admin', // Note: Found in RolePermissions
  MANAGE_PRODUCT = 'manage_product',

  // ADMIN PERMISSIONS (role_id: 3)
  CREATE_USER = 'create_user',
  DELETE_USER = 'delete_user',
  MANAGE_BRANDS = 'manage_brands',
  MANAGE_CATEGORYS = 'manage_categorys',
  MANAGE_COUPONS = 'manage_coupons',
  MANAGE_PERMISSIONS = 'manage_permissions',
  MANAGE_PRODUCT_CATEGORIES = 'manage_product_categories',
  MANAGE_ROLES = 'manage_roles',
  MANAGE_USERS = 'manage_users',
  MODERATE_POSTS = 'moderate_posts',
  MODERATE_PRODUCTS = 'moderate_products',
  UPDATE_USER = 'update_user',
  VIEW_SYSTEM_LOGS = 'view_system_logs',
  VIEW_USERS = 'view_users',
}

const RolePermissions: Record<Role, Permission[]> = {
  [Role.USER]: [
    Permission.ADD_TO_CART,
    Permission.CHECKOUT,
    Permission.CREATE_COMMENT,
    Permission.CREATE_POST,
    Permission.CREATE_REVIEW,
    Permission.CREATE_SHOP,
    Permission.DELETE_COMMENT,
    Permission.DELETE_POST,
    Permission.EDIT_COMMENT,
    Permission.EDIT_POST,
    Permission.EDIT_PROFILE,
    Permission.MANAGE_ADDRESSES,
    Permission.TOGGLE_FOLLOW,
    Permission.TOGGLE_LIKE,
    Permission.VIEW_ORDERS,
    Permission.VIEW_PRODUCTS,
  ],
  [Role.SELLER]: [
    Permission.CHAT_WITH_CUSTOMER,
    Permission.CREATE_PRODUCT,
    Permission.DELETE_PRODUCT,
    Permission.EDIT_PRODUCT,
    Permission.EDIT_PROFILE_SHOP,
    Permission.MANAGE_ORDERS,
    Permission.MANAGE_SHOP_STAFF,
    Permission.TRY_ON_TESTER,
    Permission.UPDATE_PRODUCT,
    Permission.VIEW_PRODUCTS,
    Permission.VIEW_SHOP_DASHBOARD,
    Permission.MANAGE_SHOP_ADMIN,
    Permission.MANAGE_PRODUCT
  ],
  [Role.ADMIN]: [
    Permission.CREATE_PRODUCT,
    Permission.CREATE_USER,
    Permission.DELETE_PRODUCT,
    Permission.DELETE_USER,
    Permission.EDIT_PRODUCT,
    Permission.MANAGE_BRANDS,
    Permission.MANAGE_CATEGORYS,
    Permission.MANAGE_COUPONS,
    Permission.MANAGE_ORDERS,
    Permission.MANAGE_PERMISSIONS,
    Permission.MANAGE_PRODUCT_CATEGORIES,
    Permission.MANAGE_ROLES,
    Permission.MANAGE_SHOP_STAFF,
    Permission.MANAGE_USERS,
    Permission.MODERATE_POSTS,
    Permission.MODERATE_PRODUCTS,
    Permission.UPDATE_PRODUCT,
    Permission.UPDATE_USER,
    Permission.VIEW_PRODUCTS,
    Permission.VIEW_SHOP_DASHBOARD,
    Permission.VIEW_SYSTEM_LOGS,
    Permission.VIEW_USERS,
    Permission.MANAGE_SHOP_ADMIN,
    Permission.MANAGE_PRODUCT
  ],
  [Role.STAFF]: [
    Permission.CHAT_WITH_CUSTOMER,
    Permission.MANAGE_ORDERS,
    Permission.VIEW_SHOP_DASHBOARD,
  ],
};

// Hàm lấy một phần tử ngẫu nhiên từ mảng
function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Hàm lấy các giá trị ngẫu nhiên từ Enum
function getRandomSkinType(): skin_type {
  const skinTypes: skin_type[] = [
    'normal',
    'oily',
    'dry',
    'combination',
    'sensitive',
  ];
  return getRandomElement(skinTypes);
}

async function main() {
  console.log('Bắt đầu seeding...');

  // --- 1. Dọn dẹp DB ---
  console.log('Dọn dẹp DB...');
  await prisma.message_media.deleteMany({});
  await prisma.message_reactions.deleteMany({});
  await prisma.message_reads.deleteMany({});
  await prisma.messages.deleteMany({});
  await prisma.conversation_participants.deleteMany({});
  await prisma.conversations.deleteMany({});

  await prisma.post_tags.deleteMany({});
  await prisma.tags.deleteMany({});
  await prisma.post_products.deleteMany({});
  await prisma.post_media.deleteMany({});
  await prisma.posts.deleteMany({});
  await prisma.comments.deleteMany({});
  await prisma.likes.deleteMany({});
  await prisma.follows.deleteMany({});

  await prisma.order_coupons.deleteMany({});
  await prisma.shipments.deleteMany({});
  await prisma.payments.deleteMany({});
  await prisma.order_items.deleteMany({});
  await prisma.orders.deleteMany({});
  await prisma.coupons.deleteMany({});

  await prisma.cart_items.deleteMany({});
  await prisma.carts.deleteMany({});

  await prisma.wishlists.deleteMany({});
  await prisma.reviews.deleteMany({});
  await prisma.tryon_items.deleteMany({});
  await prisma.product_categories.deleteMany({});
  await prisma.product_media.deleteMany({});
  await prisma.product_variants.deleteMany({});
  await prisma.products.deleteMany({});

  await prisma.recommendations.deleteMany({});
  await prisma.tryon_sessions.deleteMany({});
  await prisma.skin_analyses.deleteMany({});

  await prisma.audit_logs.deleteMany({});
  await prisma.notifications.deleteMany({});
  await prisma.moderation_logs.deleteMany({});

  await prisma.categories.deleteMany({});
  await prisma.brands.deleteMany({});

  await prisma.shop_staffs.deleteMany({});
  await prisma.shops.deleteMany({});

  await prisma.addresses.deleteMany({});
  await prisma.auth_identities.deleteMany({});

  await prisma.userpermission.deleteMany({});
  await prisma.rolepermission.deleteMany({});
  await prisma.permission.deleteMany({});
  await prisma.role.deleteMany({});
  await prisma.users.deleteMany({});

  // --- 2. Tạo Roles ---
  console.log('Tạo roles...');
  const rolesMap = new Map<Role, number>();
  for (const roleName of Object.values(Role)) {
    const role = await prisma.role.create({
      data: { name: roleName },
    });
    rolesMap.set(roleName, role.id);
  }

  // --- 3. Tạo Permissions ---
  console.log('Tạo permissions...');
  const permissionsMap = new Map<Permission, number>();
  for (const permName of Object.values(Permission)) {
    // Sử dụng upsert để tránh lỗi nếu chạy lại mà không xóa
    const perm = await prisma.permission.upsert({
      where: { name: permName },
      update: {},
      create: { name: permName },
    });
    permissionsMap.set(permName, perm.id);
  }

  // --- 4. Map Permissions to Roles (RolePermission) ---
  console.log('Mapping permissions to roles...');
  for (const role of Object.keys(RolePermissions) as Role[]) {
    const roleId = rolesMap.get(role);
    if (!roleId) continue;

    const perms = RolePermissions[role];
    for (const perm of perms) {
      const permId = permissionsMap.get(perm);
      if (!permId) {
        console.warn(`Permission ${perm} not found in map for role ${role}`);
        continue;
      }

      await prisma.rolepermission.create({
        data: {
          role_id: roleId,
          permission_id: permId,
        },
      });
    }
  }

  // --- 5. Tạo Users (Sellers + Admin) ---
  console.log('Tạo users...');
  const adminRoleId = rolesMap.get(Role.ADMIN);
  const sellerRoleId = rolesMap.get(Role.SELLER);
  const userRoleId = rolesMap.get(Role.USER);

  if (!adminRoleId || !sellerRoleId || !userRoleId) {
    throw new Error('Không tìm thấy role ID cần thiết');
  }

  // Tạo Admin
  const adminUser = await prisma.users.create({
    data: {
      email: 'admin@system.com',
      password_hash: 'hashed_password',
      full_name: 'Super Admin',
      role_id: adminRoleId,
    },
  });

  // Tạo 2 Seller (Owner 2 shop)
  const seller1 = await prisma.users.create({
    data: {
      email: 'seller1@shop.com',
      password_hash: 'hashed_password',
      full_name: 'Chủ Shop 1 (My Pham Auth)',
      role_id: sellerRoleId,
    },
  });

  const seller2 = await prisma.users.create({
    data: {
      email: 'seller2@shop.com',
      password_hash: 'hashed_password',
      full_name: 'Chủ Shop 2 (Skincare Viet)',
      role_id: sellerRoleId,
    },
  });

  // --- 6. Tạo UserPermissions (Gán full permission của role cho user cụ thể) ---
  // Yêu cầu: "thêm các userpermission cho hai shop và 1 admin"
  console.log('Tạo UserPermissions...');

  const assignPermissionsToUser = async (userId: number, role: Role) => {
    const perms = RolePermissions[role];
    for (const perm of perms) {
      const permId = permissionsMap.get(perm);
      if (permId) {
        await prisma.userpermission.create({
          data: {
            user_id: userId,
            permission_id: permId,
          },
        });
      }
    }
  };

  await assignPermissionsToUser(adminUser.id, Role.ADMIN);
  await assignPermissionsToUser(seller1.id, Role.SELLER);
  await assignPermissionsToUser(seller2.id, Role.SELLER);


  // --- 7. Tạo Shops ---
  console.log('Tạo shops...');
  const shop1 = await prisma.shops.create({
    data: {
      owner_id: seller1.id,
      name: 'Mỹ Phẩm Auth Store',
      slug: 'my-pham-auth-store',
      description: 'Chuyên hàng mỹ phẩm chính hãng.',
      is_verified: true,
    },
  });

  const shop2 = await prisma.shops.create({
    data: {
      owner_id: seller2.id,
      name: 'Skincare Việt',
      slug: 'skincare-viet',
      description: 'Skincare cho người Việt.',
      is_verified: true,
    },
  });
  const shops = [shop1, shop2];

  // --- 8. Tạo Brands ---
  console.log('Tạo brands...');
  const brandNames = ['L\'Oréal', 'Innisfree', 'CeraVe', 'La Roche-Posay', 'Some By Mi'];
  const brands = await Promise.all(
    brandNames.map((name) =>
      prisma.brands.create({
        data: {
          name: name,
          slug: faker.helpers.slugify(name).toLowerCase(),
          logo_url: faker.image.urlLoremFlickr({ category: 'logo' }),
        },
      })
    )
  );

  // --- 9. Tạo Categories ---
  console.log('Tạo categories...');

  const categoryFilePath = path.join(__dirname, '..', 'src', 'data-init', 'categorys.json');
  const categoryDataRaw = fs.readFileSync(categoryFilePath, 'utf8');
  const categoryData = JSON.parse(categoryDataRaw);

  const allCategories: any[] = [];

  for (const parentCategory of categoryData) {
    const createdParent = await prisma.categories.create({
      data: {
        name: parentCategory.name,
        slug: parentCategory.slug,
        parent_id: null,
      },
    });

    allCategories.push(createdParent);

    if (parentCategory.children && Array.isArray(parentCategory.children)) {
      for (const childCategory of parentCategory.children) {
        const createdChild = await prisma.categories.create({
          data: {
            name: childCategory.name,
            slug: childCategory.slug,
            parent_id: createdParent.id,
          },
        });
        allCategories.push(createdChild);
      }
    }
  }

  // --- 10. Tạo Products từ products.json ---
  console.log('Tạo sản phẩm từ products.json...');
  const productsFilePath = path.join(__dirname, '..', 'src', 'data-init', 'products.json');
  const productsDataRaw = fs.readFileSync(productsFilePath, 'utf8');
  const productsData = JSON.parse(productsDataRaw);

  if (Array.isArray(productsData)) {
    for (const productData of productsData) {
      try {
        const product = await prisma.products.create({
          data: {
            name: productData.name,
            slug: productData.slug,
            description: productData.description,
            how_to_use: productData.how_to_use,
            skin_type_compat: productData.skin_type_compat || 'normal',
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
          await prisma.product_categories.create({
            data: {
              product_id: product.id,
              category_id: productData.category_id,
            },
          });
        }

        if (productData.variants && Array.isArray(productData.variants)) {
          for (const variantData of productData.variants) {
            await prisma.product_variants.create({
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
            await prisma.product_media.create({
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
      } catch (error) {
        console.log(`Lỗi tạo sản phẩm ${productData.name}:`, error);
      }
    }
  }

  // --- 11. Tạo 100 sản phẩm faker ---
  console.log('Tạo 100 sản phẩm faker bổ sung...');
  for (let i = 0; i < 100; i++) {
    const randomShop = getRandomElement(shops);
    const randomBrand = getRandomElement(brands);
    const randomCategory = getRandomElement(allCategories);
    const randomSkinType = getRandomSkinType();
    const productName = faker.commerce.productName();

    await prisma.products.create({
      data: {
        shop_id: randomShop.id,
        brand_id: randomBrand.id,
        name: productName,
        slug: faker.helpers.slugify(productName).toLowerCase() + '-' + faker.string.uuid(),
        description: faker.commerce.productDescription(),
        how_to_use: faker.lorem.paragraph(),
        skin_type_compat: randomSkinType,
        is_published: true,
        avg_rating: faker.number.float({ min: 3.5, max: 5, fractionDigits: 1 }),
        review_count: faker.number.int({ min: 5, max: 200 }),

        product_media: {
          create: [
            {
              url: faker.image.urlLoremFlickr({
                category: 'beauty',
                width: 640,
                height: 480,
              }),
              type: 'image',
              sort_order: 0,
            },
            {
              url: faker.image.urlLoremFlickr({
                category: 'cosmetics',
                width: 640,
                height: 480,
              }),
              type: 'image',
              sort_order: 1,
            },
          ],
        },

        product_variants: {
          create: [
            {
              sku: `SKU-${faker.string.alphanumeric(10).toUpperCase()}`,
              name: 'Màu 01 / Size M',
              price: faker.number.int({ min: 100000, max: 1000000 }),
              stock: faker.number.int({ min: 10, max: 100 }),
              shade_hex: faker.helpers.maybe(() => faker.color.rgb(), { probability: 0.5 }) || null,
            },
            {
              sku: `SKU-${faker.string.alphanumeric(10).toUpperCase()}`,
              name: 'Màu 02 / Size L',
              price: faker.number.int({ min: 100000, max: 1000000 }),
              stock: faker.number.int({ min: 10, max: 100 }),
              shade_hex: faker.helpers.maybe(() => faker.color.rgb(), { probability: 0.5 }) || null,
            },
          ],
        },

        product_categories: {
          create: [
            {
              category_id: randomCategory.id,
            },
          ],
        },
      },
    });
  }

  console.log('Seeding hoàn tất!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });