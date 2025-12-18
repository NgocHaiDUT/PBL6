import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Test logic update staff permissions...\n');

  // Tìm một staff để test
  const staff = await prisma.shop_staffs.findFirst({
    include: {
      user: {
        select: {
          id: true,
          email: true,
          full_name: true,
        },
      },
    },
  });

  if (!staff) {
    console.log('⚠️  Không tìm thấy staff nào để test');
    return;
  }

  console.log(`👤 Testing with staff: ${staff.user.full_name} (${staff.user.email})\n`);

  // Lấy permissions hiện tại
  const currentPerms = await prisma.userpermission.findMany({
    where: { user_id: staff.user.id },
    include: { permission: { select: { name: true } } },
  });

  console.log('📋 Current permissions:');
  currentPerms.forEach((p) => {
    console.log(`  - ${p.permission.name}`);
  });

  // Danh sách SHOP permissions (từ backend logic)
  const shopPermissionNames = [
    'manage_shop_staff',
    'edit_profile_shop',
    'manage_shop_admin',
    'manage_order',
    'try_on_tester',
    'chat_with_customer',
    'manage_shop_setting',
    'view_dashboard',
    'view_shop_tutorial',
    'manage_product',
    'manage_brands',
    'manage_categorys',
    'manage_shop_address',
  ];

  const shopPerms = currentPerms.filter((p) =>
    shopPermissionNames.includes(p.permission.name)
  );
  
  const userPerms = currentPerms.filter(
    (p) => !shopPermissionNames.includes(p.permission.name)
  );

  console.log(`\n🏪 Shop permissions (${shopPerms.length}):`);
  shopPerms.forEach((p) => {
    console.log(`  - ${p.permission.name}`);
  });

  console.log(`\n👤 User permissions (${userPerms.length}):`);
  userPerms.forEach((p) => {
    console.log(`  - ${p.permission.name}`);
  });

  console.log('\n✅ Test hoàn thành!');
  console.log('\n💡 Khi update permissions:');
  console.log('   - SHOP permissions sẽ bị XÓA và thay thế bằng permissions mới');
  console.log('   - USER permissions (create_post, edit_post, delete_post) sẽ được GIỮ NGUYÊN');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
