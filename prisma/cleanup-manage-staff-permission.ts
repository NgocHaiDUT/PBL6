import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleanup: Xóa manage_shop_staff khỏi staff users\n');

  // Lấy permission manage_shop_staff
  const managePerm = await prisma.permission.findUnique({
    where: { name: 'manage_shop_staff' },
  });

  if (!managePerm) {
    console.log('❌ Không tìm thấy permission manage_shop_staff');
    return;
  }

  // Lấy tất cả staff users (role = staff)
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

  let cleaned = 0;

  for (const user of staffUsers) {
    // Kiểm tra xem user có permission manage_shop_staff không
    const hasPerm = await prisma.userpermission.findUnique({
      where: {
        user_id_permission_id: {
          user_id: user.id,
          permission_id: managePerm.id,
        },
      },
    });

    if (hasPerm) {
      await prisma.userpermission.delete({
        where: {
          user_id_permission_id: {
            user_id: user.id,
            permission_id: managePerm.id,
          },
        },
      });
      console.log(`✅ Removed manage_shop_staff from: ${user.full_name} (${user.email})`);
      cleaned++;
    }
  }

  console.log(`\n✅ Hoàn thành! Đã xóa permission từ ${cleaned} staff users`);
  
  if (cleaned === 0) {
    console.log('ℹ️  Không có staff nào có permission manage_shop_staff (tốt!)');
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
