import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Cấp permission view_shop_tutorial cho tất cả staff users...\n');

  // Get permission
  const tutorialPerm = await prisma.permission.findUnique({
    where: { name: 'view_shop_tutorial' },
  });

  if (!tutorialPerm) {
    console.log('❌ Không tìm thấy permission view_shop_tutorial');
    console.log('⚠️  Chạy script add-tutorial-permission.ts trước!');
    return;
  }

  // Get all staff users (role = staff)
  const staffRole = await prisma.role.findUnique({
    where: { name: 'staff' },
  });

  if (!staffRole) {
    console.log('❌ Không tìm thấy role staff');
    return;
  }

  const staffUsers = await prisma.users.findMany({
    where: { role_id: staffRole.id },
    select: { id: true, email: true, full_name: true },
  });

  console.log(`📋 Tìm thấy ${staffUsers.length} staff users\n`);

  let granted = 0;

  for (const user of staffUsers) {
    // Check if already has permission
    const existing = await prisma.userpermission.findUnique({
      where: {
        user_id_permission_id: {
          user_id: user.id,
          permission_id: tutorialPerm.id,
        },
      },
    });

    if (!existing) {
      await prisma.userpermission.create({
        data: {
          user_id: user.id,
          permission_id: tutorialPerm.id,
        },
      });
      console.log(`✅ Granted to: ${user.full_name} (${user.email})`);
      granted++;
    } else {
      console.log(`ℹ️  Already has: ${user.full_name} (${user.email})`);
    }
  }

  console.log(`\n✅ Hoàn thành! Đã cấp permission cho ${granted} staff users`);
}

main()
  .catch((e) => {
    console.error('❌ Lỗi:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
