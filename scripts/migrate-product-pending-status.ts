import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAndMigrateProducts() {
    console.log('Checking products with pending moderation status...');

    try {
        // First, let's check the current distribution
        const products = await prisma.$queryRaw`
      SELECT moderation_status, COUNT(*) as count 
      FROM products 
      GROUP BY moderation_status
    `;

        console.log('Current product moderation status distribution:');
        console.log(products);

        // Update all 'pending' products to 'approved'
        const result = await prisma.$executeRaw`
      UPDATE products 
      SET moderation_status = 'approved' 
      WHERE moderation_status = 'pending'
    `;

        console.log(`\nUpdated ${result} products from 'pending' to 'approved'`);

        // Check distribution again
        const productsAfter = await prisma.$queryRaw`
      SELECT moderation_status, COUNT(*) as count 
      FROM products 
      GROUP BY moderation_status
    `;

        console.log('\nProduct moderation status distribution after migration:');
        console.log(productsAfter);
    } catch (error) {
        console.error('Error during migration:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkAndMigrateProducts();
