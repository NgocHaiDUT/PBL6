import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addPostPermissionsToSeller() {
  try {
    console.log('\n🔧 Thêm POST permissions cho role SELLER...\n');

    // 1. Tìm role SELLER
    const sellerRole = await prisma.role.findUnique({
      where: { name: 'seller' },
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        }
      }
    });

    if (!sellerRole) {
      console.log('❌ Không tìm thấy role SELLER!');
      return;
    }

    console.log(`✅ Tìm thấy role SELLER (id: ${sellerRole.id})`);
    console.log(`   Hiện có ${sellerRole.rolePermissions.length} permissions`);

    // 2. Tìm các POST permissions
    const postPermissions = await prisma.permission.findMany({
      where: {
        name: {
          in: ['create_post', 'edit_post', 'delete_post']
        }
      }
    });

    console.log(`\n📋 Tìm thấy ${postPermissions.length} POST permissions:`);
    postPermissions.forEach(p => console.log(`   - ${p.name} (id: ${p.id})`));

    // 3. Kiểm tra permission nào chưa có
    const existingPermIds = sellerRole.rolePermissions.map(rp => rp.permission_id);
    const missingPermissions = postPermissions.filter(p => !existingPermIds.includes(p.id));

    if (missingPermissions.length === 0) {
      console.log('\n✅ Role SELLER đã có tất cả POST permissions!');
      return;
    }

    console.log(`\n➕ Cần thêm ${missingPermissions.length} permissions:`);
    missingPermissions.forEach(p => console.log(`   - ${p.name}`));

    // 4. Thêm permissions vào role
    for (const perm of missingPermissions) {
      await prisma.rolepermission.create({
        data: {
          role_id: sellerRole.id,
          permission_id: perm.id
        }
      });
      console.log(`   ✓ Đã thêm: ${perm.name}`);
    }

    console.log('\n✅ Hoàn thành! Role SELLER đã có đầy đủ POST permissions.');
    console.log('\n💡 Lưu ý: Người dùng cần logout và login lại để nhận permissions mới.');

  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addPostPermissionsToSeller();
