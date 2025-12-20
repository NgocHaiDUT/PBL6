// Check user 4 shop status
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUser4Shop() {
    console.log('Checking user 4 shop status...\n');

    const user = await prisma.users.findUnique({
        where: { id: 4 },
        select: { id: true, email: true, full_name: true, role_id: true },
    });

    console.log('User 4:', user);

    const ownedShop = await prisma.shops.findFirst({
        where: { owner_id: 4 },
    });

    console.log('\nOwned shop:', ownedShop);

    const staffShops = await prisma.shop_staffs.findMany({
        where: { user_id: 4 },
        include: { shop: true },
    });

    console.log('\nStaff shops:', staffShops);

    await prisma.$disconnect();
}

checkUser4Shop();
