// Script to make device_id nullable in oauth_login_codes
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function makeDeviceIdNullable() {
    console.log('Making device_id nullable in oauth_login_codes...\n');

    try {
        await prisma.$executeRawUnsafe(`
      ALTER TABLE "oauth_login_codes" 
      ALTER COLUMN "device_id" DROP NOT NULL;
    `);

        console.log('✅ Successfully made device_id nullable!');
        console.log('\n🔄 Please restart your backend server for changes to take effect.');

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

makeDeviceIdNullable();
