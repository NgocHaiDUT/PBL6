// prisma/seed.ts
import { PrismaClient, skin_type } from '@prisma/client';
import { faker } from '@faker-js/faker/locale/vi'; // Sử dụng locale Tiếng Việt

const prisma = new PrismaClient();

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

  // --- 1. Dọn dẹp DB (Tùy chọn) ---
  // Cẩn thận: Xóa toàn bộ dữ liệu cũ
  // Xóa theo thứ tự từ bảng con đến bảng cha để tránh lỗi foreign key constraint

  // Xóa các bảng liên quan đến messages và chat
  await prisma.message_media.deleteMany({});
  await prisma.message_reactions.deleteMany({});
  await prisma.message_reads.deleteMany({});
  await prisma.messages.deleteMany({});
  await prisma.conversation_participants.deleteMany({});
  await prisma.conversations.deleteMany({});

  // Xóa các bảng liên quan đến community
  await prisma.post_tags.deleteMany({});
  await prisma.tags.deleteMany({});
  await prisma.post_products.deleteMany({});
  await prisma.post_media.deleteMany({});
  await prisma.posts.deleteMany({});
  await prisma.comments.deleteMany({});
  await prisma.likes.deleteMany({});
  await prisma.follows.deleteMany({});

  // Xóa các bảng liên quan đến orders
  await prisma.order_coupons.deleteMany({});
  await prisma.shipments.deleteMany({});
  await prisma.payments.deleteMany({});
  await prisma.order_items.deleteMany({});
  await prisma.orders.deleteMany({});
  await prisma.coupons.deleteMany({});

  // Xóa các bảng liên quan đến cart
  await prisma.cart_items.deleteMany({});
  await prisma.carts.deleteMany({});

  // Xóa các bảng liên quan đến products
  await prisma.wishlists.deleteMany({});
  await prisma.reviews.deleteMany({});
  await prisma.tryon_items.deleteMany({});
  await prisma.product_categories.deleteMany({});
  await prisma.product_media.deleteMany({});
  await prisma.product_variants.deleteMany({});
  await prisma.products.deleteMany({});

  // Xóa các bảng liên quan đến AI
  await prisma.recommendations.deleteMany({});
  await prisma.tryon_sessions.deleteMany({});
  await prisma.skin_analyses.deleteMany({});

  // Xóa các bảng admin
  await prisma.audit_logs.deleteMany({});
  await prisma.notifications.deleteMany({});
  await prisma.moderation_logs.deleteMany({});

  // Xóa categories và brands
  await prisma.categories.deleteMany({});
  await prisma.brands.deleteMany({});

  // Xóa shop staffs trước khi xóa shops
  await prisma.shop_staffs.deleteMany({});
  await prisma.shops.deleteMany({});

  // Xóa addresses và auth_identities trước khi xóa users
  await prisma.addresses.deleteMany({});
  await prisma.auth_identities.deleteMany({});

  // Xóa permissions
  await prisma.userpermission.deleteMany({});
  await prisma.rolepermission.deleteMany({});
  await prisma.permission.deleteMany({});
  await prisma.role.deleteMany({});

  // Cuối cùng xóa users
  await prisma.users.deleteMany({});

  // --- 2. Tạo Roles ---
  console.log('Tạo roles...');
  const adminRole = await prisma.role.create({
    data: {
      name: 'admin',
    },
  });

  const userRole = await prisma.role.create({
    data: {
      name: 'user',
    },
  });

  const sellerRole = await prisma.role.create({
    data: {
      name: 'seller',
    },
  });

  // --- 3. Tạo Users (Sellers) ---
  // Cần user có role 'seller' để làm chủ shop (owner_id trong 'shops')
  console.log('Tạo users (sellers)...');
  const seller1 = await prisma.users.create({
    data: {
      email: 'seller1@shop.com',
      password_hash: 'hashed_password',
      full_name: 'Chủ Shop 1',
      role_id: sellerRole.id,
    },
  });

  const seller2 = await prisma.users.create({
    data: {
      email: 'seller2@shop.com',
      password_hash: 'hashed_password',
      full_name: 'Chủ Shop 2',
      role_id: sellerRole.id,
    },
  });

  // --- 4. Tạo Shops ---
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

  // --- 5. Tạo Brands ---
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

  // --- 6. Tạo Categories ---
  // Bảng 'categories' có quan hệ cha-con (parent_id)
  console.log('Tạo categories...');
  
  // Import dữ liệu từ categorys.json
  const fs = require('fs');
  const path = require('path');
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

  // --- 7. Tạo Products từ products.json ---
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

  // --- 8. Tạo 100 sản phẩm faker (bổ sung) ---
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

        // Tạo lồng các bảng liên quan
        product_media: {
          // Thêm media cho sản phẩm
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
          // Thêm biến thể (SKU) cho sản phẩm
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
          // Liên kết sản phẩm với category
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