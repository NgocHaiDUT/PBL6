import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Kiểm tra shop staffs...\n');

  const staffs = await prisma.shop_staffs.findMany({
    include: {
      user: {
        select: {
          id: true,
          email: true,
          full_name: true,
        },
      },
      shop: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  console.log(`📋 Tổng số staffs: ${staffs.length}\n`);

  for (const staff of staffs) {
    console.log(`👤 ${staff.user.full_name} (${staff.user.email})`);
    console.log(`   Shop: ${staff.shop.name} (ID: ${staff.shop_id})`);
    console.log(`   Is Manager: ${staff.is_manager}`);

    // Get user permissions
    const userPerms = await prisma.userpermission.findMany({
      where: { user_id: staff.user.id },
      include: { permission: { select: { name: true } } },
    });

    console.log(`   Permissions (${userPerms.length}):`);
    userPerms.forEach((p) => {
      console.log(`     - ${p.permission.name}`);
    });
    console.log('');
  }
}

main()
  .catch((e) => {
    console.error('❌ Lỗi:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
