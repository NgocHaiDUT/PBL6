import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkOwnerPermissions() {
  try {
    // Tìm user với role SELLER (chủ shop)
    const sellers = await prisma.users.findMany({
      where: {
        role: { name: 'seller' }
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true
              }
            }
          }
        },
        userPermissions: {
          include: {
            permission: true
          }
        },
        shops: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    console.log(`\n🔍 Tìm thấy ${sellers.length} chủ shop:\n`);

    for (const seller of sellers) {
      console.log(`\n👤 User: ${seller.full_name} (${seller.email})`);
      console.log(`   Shop: ${seller.shops?.[0]?.name || 'N/A'}`);
      console.log(`   Role: ${seller.role?.name || 'N/A'}`);
      
      console.log(`\n   📋 Role Permissions (từ role):`);
      const rolePerms = seller.role?.rolePermissions?.map(rp => rp.permission.name) || [];
      if (rolePerms.length > 0) {
        rolePerms.forEach(perm => console.log(`      ✓ ${perm}`));
      } else {
        console.log('      (Không có)');
      }

      console.log(`\n   📋 User Permissions (cá nhân):`);
      const userPerms = seller.userPermissions?.map(up => up.permission.name) || [];
      if (userPerms.length > 0) {
        userPerms.forEach(perm => console.log(`      ✓ ${perm}`));
      } else {
        console.log('      (Không có)');
      }

      // Kiểm tra các permission post
      const allPerms = [...rolePerms, ...userPerms];
      const hasCreatePost = allPerms.includes('create_post');
      const hasEditPost = allPerms.includes('edit_post');
      const hasDeletePost = allPerms.includes('delete_post');

      console.log(`\n   ❓ POST Permissions:`);
      console.log(`      ${hasCreatePost ? '✅' : '❌'} create_post`);
      console.log(`      ${hasEditPost ? '✅' : '❌'} edit_post`);
      console.log(`      ${hasDeletePost ? '✅' : '❌'} delete_post`);
    }

    // Kiểm tra permission edit_post có tồn tại không
    console.log('\n\n🔍 Kiểm tra permission edit_post trong database:');
    const editPostPerm = await prisma.permission.findFirst({
      where: { name: 'edit_post' }
    });

    if (editPostPerm) {
      console.log(`   ✅ Tìm thấy: id=${editPostPerm.id}, name=${editPostPerm.name}`);
    } else {
      console.log('   ❌ KHÔNG tìm thấy permission "edit_post" trong database!');
    }

    // Kiểm tra các permission liên quan đến post
    console.log('\n📋 Tất cả POST permissions trong database:');
    const postPerms = await prisma.permission.findMany({
      where: {
        name: {
          contains: 'post'
        }
      }
    });
    postPerms.forEach(p => {
      console.log(`   - ${p.name} (id: ${p.id})`);
    });

  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOwnerPermissions();
