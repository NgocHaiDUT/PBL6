import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPermissionIssue() {
  try {
    console.log('\n🔍 Kiểm tra permission manage_shop_address:\n');

    // 1. Kiểm tra permission có tồn tại không
    const addressPerm = await prisma.permission.findFirst({
      where: { name: 'manage_shop_address' }
    });

    if (addressPerm) {
      console.log('✅ Permission tồn tại:');
      console.log(`   ID: ${addressPerm.id}`);
      console.log(`   Name: ${addressPerm.name}`);
    } else {
      console.log('❌ Permission KHÔNG tồn tại trong database!');
    }

    // 2. Kiểm tra tất cả shop permissions
    console.log('\n📋 Danh sách tất cả SHOP permissions trong code:');
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

    shopPermissionNames.forEach(name => console.log(`   - ${name}`));

    // 3. Kiểm tra xem có bao nhiêu permission tồn tại trong DB
    const foundPermissions = await prisma.permission.findMany({
      where: { name: { in: shopPermissionNames } },
      select: { id: true, name: true }
    });

    console.log(`\n✅ Tìm thấy ${foundPermissions.length}/${shopPermissionNames.length} permissions trong database:`);
    foundPermissions.forEach(p => console.log(`   ✓ ${p.name} (id: ${p.id})`));

    // 4. Tìm permissions thiếu
    const foundNames = foundPermissions.map(p => p.name);
    const missingPermissions = shopPermissionNames.filter(name => !foundNames.includes(name));

    if (missingPermissions.length > 0) {
      console.log(`\n❌ Thiếu ${missingPermissions.length} permissions:`);
      missingPermissions.forEach(name => console.log(`   ✗ ${name}`));
    } else {
      console.log('\n✅ Tất cả permissions đều tồn tại!');
    }

    // 5. Test với permissions mẫu
    console.log('\n🧪 Test case: Update staff với 6 permissions:');
    const testPermissions = [
      'manage_product',
      'edit_profile_shop',
      'manage_shop_setting',
      'view_shop_tutorial',
      'try_on_tester',
      'manage_shop_address'
    ];

    console.log('   Permissions gửi lên:');
    testPermissions.forEach(p => console.log(`   - ${p}`));

    const testFound = await prisma.permission.findMany({
      where: { name: { in: testPermissions } },
      select: { id: true, name: true }
    });

    console.log(`\n   Tìm thấy ${testFound.length}/${testPermissions.length} permissions:`);
    testFound.forEach(p => console.log(`   ✓ ${p.name}`));

    const testMissing = testPermissions.filter(name => !testFound.map(p => p.name).includes(name));
    if (testMissing.length > 0) {
      console.log('\n   ❌ Không tìm thấy:');
      testMissing.forEach(name => console.log(`   ✗ ${name}`));
    }

  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPermissionIssue();
