import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Thêm permission view_shop_tutorial...\n');

  // Thêm permission mới
  const existingPerm = await prisma.permission.findUnique({
    where: { name: 'view_shop_tutorial' },
  });

  if (existingPerm) {
    console.log('ℹ️  Permission view_shop_tutorial đã tồn tại');
  } else {
    await prisma.permission.create({
      data: { name: 'view_shop_tutorial' },
    });
    console.log('✅ Đã tạo permission: view_shop_tutorial');
  }

  // Thêm permission này cho tất cả shop owners
  const owners = await prisma.shops.findMany({
    select: { owner_id: true },
  });

  const tutorialPerm = await prisma.permission.findUnique({
    where: { name: 'view_shop_tutorial' },
  });

  if (tutorialPerm) {
    console.log(`\n📝 Thêm permission cho ${owners.length} shop owners...`);
    
    for (const owner of owners) {
      const existing = await prisma.userpermission.findUnique({
        where: {
          user_id_permission_id: {
            user_id: owner.owner_id,
            permission_id: tutorialPerm.id,
          },
        },
      });

      if (!existing) {
        await prisma.userpermission.create({
          data: {
            user_id: owner.owner_id,
            permission_id: tutorialPerm.id,
          },
        });
        console.log(`  ✅ Added for owner ID: ${owner.owner_id}`);
      }
    }
  }

  console.log('\n✅ Hoàn thành!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
