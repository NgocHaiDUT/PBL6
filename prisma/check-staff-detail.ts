import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Kiểm tra chi tiết staff nguyenhai842003@gmail.com\n');

  const user = await prisma.users.findUnique({
    where: { email: 'nguyenhai842003@gmail.com' },
    include: {
      role: {
        select: { 
          name: true,
          rolePermissions: {
            include: {
              permission: { select: { name: true } }
            }
          }
        }
      },
      userPermissions: {
        include: {
          permission: { select: { name: true } }
        }
      },
      shop_staffs: {
        include: {
          shop: {
            select: {
              id: true,
              name: true,
              owner_id: true,
            }
          }
        }
      },
      shops: {
        select: {
          id: true,
          name: true,
        }
      }
    }
  });

  if (!user) {
    console.log('❌ Không tìm thấy user');
    return;
  }

  console.log('👤 USER INFO:');
  console.log(`   Email: ${user.email}`);
  console.log(`   Full Name: ${user.full_name}`);
  console.log(`   Role: ${user.role?.name || 'N/A'}`);
  console.log('');

  console.log('🏪 SHOP MEMBERSHIP:');
  if (user.shop_staffs.length > 0) {
    user.shop_staffs.forEach(staff => {
      console.log(`   Shop: ${staff.shop.name} (ID: ${staff.shop_id})`);
      console.log(`   Is Manager: ${staff.is_manager}`);
      console.log(`   Is Owner: ${staff.shop.owner_id === user.id}`);
    });
  } else {
    console.log('   Không là staff của shop nào');
  }

  if (user.shops.length > 0) {
    console.log(`\n   Owns ${user.shops.length} shop(s):`);
    user.shops.forEach(shop => {
      console.log(`     - ${shop.name} (ID: ${shop.id})`);
    });
  }
  console.log('');

  console.log('🔐 ROLE PERMISSIONS (từ role):');
  if (user.role?.rolePermissions && user.role.rolePermissions.length > 0) {
    user.role.rolePermissions.forEach(rp => {
      console.log(`   - ${rp.permission.name}`);
    });
  } else {
    console.log('   (Không có role permissions)');
  }
  console.log('');

  console.log('🎯 USER PERMISSIONS (riêng cho user):');
  if (user.userPermissions && user.userPermissions.length > 0) {
    user.userPermissions.forEach(up => {
      console.log(`   - ${up.permission.name}`);
    });
  } else {
    console.log('   (Không có user permissions)');
  }
  console.log('');

  console.log('📊 TỔNG HỢP:');
  const allPerms = new Set<string>();
  user.role?.rolePermissions?.forEach(rp => allPerms.add(rp.permission.name));
  user.userPermissions?.forEach(up => allPerms.add(up.permission.name));
  
  console.log(`   Total permissions: ${allPerms.size}`);
  console.log('   Permissions list:');
  Array.from(allPerms).sort().forEach(p => {
    console.log(`     - ${p}`);
  });
}

main()
  .catch((e) => {
    console.error('❌ Lỗi:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
