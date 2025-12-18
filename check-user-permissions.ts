import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  
  if (!email) {
    console.log('Usage: npx tsx check-user-permissions.ts <email>');
    return;
  }

  console.log(`\n=== Checking permissions for: ${email} ===\n`);

  const user = await prisma.users.findUnique({
    where: { email },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      },
      userPermissions: {
        include: {
          permission: true,
        },
      },
      shop_staffs: {
        include: {
          shop: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    console.log('❌ User not found!');
    return;
  }

  console.log(`User ID: ${user.id}`);
  console.log(`Full Name: ${user.full_name}`);
  console.log(`Role: ${user.role?.name || 'N/A'} (ID: ${user.role_id})`);
  console.log(`\n--- Staff Membership ---`);
  if (user.shop_staffs && user.shop_staffs.length > 0) {
    user.shop_staffs.forEach((s) => {
      console.log(`  Shop: ${s.shop.name} (ID: ${s.shop_id})`);
      console.log(`  Is Manager: ${s.is_manager}`);
    });
  } else {
    console.log('  Not a staff member of any shop');
  }

  console.log(`\n--- Role Permissions (from role table) ---`);
  if (user.role?.rolePermissions && user.role.rolePermissions.length > 0) {
    user.role.rolePermissions.forEach((rp) => {
      console.log(`  - ${rp.permission.name}`);
    });
  } else {
    console.log('  No permissions in role');
  }

  console.log(`\n--- User Permissions (from userpermission table) ---`);
  if (user.userPermissions && user.userPermissions.length > 0) {
    user.userPermissions.forEach((up) => {
      console.log(`  - ${up.permission.name}`);
    });
    
    const hasViewDashboard = user.userPermissions.some(
      (up) => up.permission.name === 'view_dashboard'
    );
    console.log(`\n✅ Has view_dashboard: ${hasViewDashboard ? 'YES' : 'NO'}`);
  } else {
    console.log('  ⚠️ NO PERMISSIONS in userpermission table!');
    console.log('  This is the problem - user should have permissions copied from role');
  }
}

main()
  .catch((e) => {
    console.error('Error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
