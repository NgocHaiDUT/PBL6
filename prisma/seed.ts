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

  // --- 2. Tạo Users (Sellers) ---
  // Cần user có role 'seller' để làm chủ shop (owner_id trong 'shops')
  console.log('Tạo users (sellers)...');
  const seller1 = await prisma.users.create({
    data: {
      email: 'seller1@shop.com',
      password_hash: 'hashed_password',
      full_name: 'Chủ Shop 1',
      role: {
        connect: { name: 'seller' }
      }
    },
  });

  const seller2 = await prisma.users.create({
    data: {
      email: 'seller2@shop.com',
      password_hash: 'hashed_password',
      full_name: 'Chủ Shop 2',
      role: {
        connect: { name: 'seller' }
      }
    },
  });

  // --- 3. Tạo Shops ---
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

  // --- 4. Tạo Brands ---
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

  // --- 5. Tạo Categories ---
  // Bảng 'categories' có quan hệ cha-con (parent_id)
  console.log('Tạo categories...');
  const catSkincare = await prisma.categories.create({
    data: {
      name: 'Chăm sóc da',
      slug: 'cham-soc-da',
    },
  });
  const catMakeup = await prisma.categories.create({
    data: {
      name: 'Trang điểm',
      slug: 'trang-diem',
    },
  });

  const subCatNames = {
    skincare: ['Sữa rửa mặt', 'Kem chống nắng', 'Serum', 'Toner'],
    makeup: ['Son môi', 'Kem nền', 'Phấn phủ'],
  };

  const skincareSubCats = await Promise.all(
    subCatNames.skincare.map((name) =>
      prisma.categories.create({
        data: {
          name: name,
          slug: faker.helpers.slugify(name).toLowerCase(),
          parent_id: catSkincare.id,
        },
      })
    )
  );

  const makeupSubCats = await Promise.all(
    subCatNames.makeup.map((name) =>
      prisma.categories.create({
        data: {
          name: name,
          slug: faker.helpers.slugify(name).toLowerCase(),
          parent_id: catMakeup.id,
        },
      })
    )
  );
  const allCategories = [...skincareSubCats, ...makeupSubCats];

  // --- 6. Tạo 100 Products ---
  console.log('Tạo 100 sản phẩm...');
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
            },
            {
              sku: `SKU-${faker.string.alphanumeric(10).toUpperCase()}`,
              name: 'Màu 02 / Size L',
              price: faker.number.int({ min: 100000, max: 1000000 }),
              stock: faker.number.int({ min: 10, max: 100 }),
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