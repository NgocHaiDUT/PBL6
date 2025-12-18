import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Shop permissions hợp lệ (từ Permission enum backend)
const validShopPermissions = [
  'manage_shop_staff',
  'edit_profile_shop',
  'manage_product',
  'manage_order',
  'view_dashboard',
  'chat_with_customer',
  'try_on_tester',
  'manage_shop_setting',
];

async function main() {
  console.log('🔄 Bắt đầu cleanup staff permissions...\n');

  // Get all staff users
  const staffUsers = await prisma.shop_staffs.findMany({
    include: {
      user: {
        select: {
          id: true,
          email: true,
          full_name: true,
          role: { select: { name: true } },
        },
      },
    },
  });

  console.log(`📋 Tìm thấy ${staffUsers.length} staffs\n`);

  for (const staff of staffUsers) {
    const user = staff.user;
    console.log(`👤 Processing: ${user.full_name} (${user.email})`);
    console.log(`   Role: ${user.role?.name || 'N/A'}, Is Manager: ${staff.is_manager}`);

    // Get current permissions
    const currentPerms = await prisma.userpermission.findMany({
      where: { user_id: user.id },
      include: { permission: { select: { name: true } } },
    });

    console.log(`   Current permissions: ${currentPerms.map(p => p.permission.name).join(', ')}`);

    // Filter out non-shop permissions
    const invalidPerms = currentPerms.filter(
      (p) => !validShopPermissions.includes(p.permission.name)
    );

    if (invalidPerms.length > 0) {
      console.log(`   🗑️  Removing ${invalidPerms.length} invalid permissions:`);
      for (const perm of invalidPerms) {
        console.log(`      - ${perm.permission.name}`);
        await prisma.userpermission.delete({
          where: {
            user_id_permission_id: {
              user_id: user.id,
              permission_id: perm.permission_id,
            },
          },
        });
      }
    }

    // For non-manager staffs, add default shop permissions if they have none
    if (!staff.is_manager) {
      const remainingPerms = currentPerms.filter((p) =>
        validShopPermissions.includes(p.permission.name)
      );

      if (remainingPerms.length === 0) {
        console.log(`   ⚠️  Staff has no shop permissions, adding defaults...`);
        
        // Add basic permissions for staff: manage_order, view_dashboard
        const defaultPerms = ['manage_order', 'view_dashboard'];
        
        for (const permName of defaultPerms) {
          const permission = await prisma.permission.findUnique({
            where: { name: permName },
          });

          if (permission) {
            await prisma.userpermission.create({
              data: {
                user_id: user.id,
                permission_id: permission.id,
              },
            });
            console.log(`      ✅ Added: ${permName}`);
          }
        }
      }
    }

    console.log('');
  }

  console.log('✅ Hoàn thành cleanup staff permissions!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
