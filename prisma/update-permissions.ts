import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Bắt đầu cập nhật permissions...');

  // Mapping từ permissions cũ sang mới
  const permissionMigration: Record<string, string> = {
    'create_product': 'manage_product',
    'edit_product': 'manage_product',
    'delete_product': 'manage_product',
  };

  // Step 1: Tạo permissions mới trước nếu chưa có
  const newPermissions = [
    'manage_product',
    'manage_order',
    'view_dashboard',
    'chat_with_customer',
    'try_on_tester',
    'manage_shop_setting',
  ];

  for (const permName of newPermissions) {
    const existing = await prisma.permission.findUnique({
      where: { name: permName },
    });

    if (!existing) {
      await prisma.permission.create({
        data: { name: permName },
      });
      console.log(`✅ Đã tạo permission mới: ${permName}`);
    } else {
      console.log(`ℹ️  Permission đã tồn tại: ${permName}`);
    }
  }

  // Step 2: Migrate user permissions từ cũ sang mới
  for (const [oldPerm, newPerm] of Object.entries(permissionMigration)) {
    const oldPermission = await prisma.permission.findUnique({
      where: { name: oldPerm },
    });

    const newPermission = await prisma.permission.findUnique({
      where: { name: newPerm },
    });

    if (oldPermission && newPermission) {
      // Lấy tất cả users có old permission
      const userPerms = await prisma.userpermission.findMany({
        where: { permission_id: oldPermission.id },
      });

      console.log(`📝 Tìm thấy ${userPerms.length} users có permission '${oldPerm}'`);

      // Migrate sang new permission
      for (const userPerm of userPerms) {
        // Kiểm tra xem user đã có new permission chưa
        const existingNewPerm = await prisma.userpermission.findUnique({
          where: {
            user_id_permission_id: {
              user_id: userPerm.user_id,
              permission_id: newPermission.id,
            },
          },
        });

        if (!existingNewPerm) {
          await prisma.userpermission.create({
            data: {
              user_id: userPerm.user_id,
              permission_id: newPermission.id,
            },
          });
          console.log(`  ✅ Đã thêm '${newPerm}' cho user ${userPerm.user_id}`);
        }

        // Xóa old permission
        await prisma.userpermission.delete({
          where: {
            user_id_permission_id: {
              user_id: userPerm.user_id,
              permission_id: oldPermission.id,
            },
          },
        });
      }

      console.log(`✅ Đã migrate permission: ${oldPerm} → ${newPerm}`);
    }
  }

  // Step 3: Xóa permissions cũ
  const oldPermissions = [
    'create_product',
    'edit_product',
    'delete_product',
    'manage_shop_address',
  ];

  for (const permName of oldPermissions) {
    const perm = await prisma.permission.findUnique({
      where: { name: permName },
    });

    if (perm) {
      // Xóa các liên kết còn lại trong rolepermission
      await prisma.rolepermission.deleteMany({
        where: { permission_id: perm.id },
      });
      
      // Xóa permission
      await prisma.permission.delete({
        where: { id: perm.id },
      });
      console.log(`✅ Đã xóa permission cũ: ${permName}`);
    }
  }

  console.log('✅ Hoàn thành cập nhật permissions!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
