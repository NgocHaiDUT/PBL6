import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkShopProducts() {
  try {
    // Get all shops
    const shops = await prisma.shops.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    console.log('\n=== SHOPS ===');
    shops.forEach(shop => {
      console.log(`ID: ${shop.id}, Name: ${shop.name}, Slug: ${shop.slug}`);
    });

    // For each shop, check products
    for (const shop of shops) {
      console.log(`\n=== PRODUCTS FOR SHOP: ${shop.name} (ID: ${shop.id}) ===`);
      
      const allProducts = await prisma.products.findMany({
        where: {
          shop_id: shop.id,
        },
        select: {
          id: true,
          name: true,
          is_published: true,
          shop_id: true,
        },
      });

      console.log(`Total products: ${allProducts.length}`);
      
      const publishedProducts = allProducts.filter(p => p.is_published);
      console.log(`Published products: ${publishedProducts.length}`);
      
      if (allProducts.length > 0) {
        console.log('\nAll products:');
        allProducts.forEach(p => {
          console.log(`  - ID: ${p.id}, Name: ${p.name}, Published: ${p.is_published}`);
        });
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkShopProducts();
