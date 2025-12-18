import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Checking Staff Role Permissions ===\n');

  // Get staff role with permissions
  const staffRole = await prisma.role.findUnique({
    where: { name: 'staff' },
    include: {
      rolePermissions: {
        include: {
          permission: true,
        },
      },
    },
  });

  if (!staffRole) {
    console.log('❌ Staff role NOT found in database!');
    return;
  }

  console.log(`✅ Staff role found (ID: ${staffRole.id})`);
  console.log(`\nStaff role has ${staffRole.rolePermissions?.length || 0} permissions:`);
  
  if (staffRole.rolePermissions && staffRole.rolePermissions.length > 0) {
    staffRole.rolePermissions.forEach((rp) => {
      console.log(`  - ${rp.permission.name}`);
    });
  } else {
    console.log('  ⚠️  NO PERMISSIONS assigned to staff role!');
  }

  // Check if view_dashboard permission exists
  const viewDashboardPerm = staffRole.rolePermissions?.find(
    (rp) => rp.permission.name === 'view_dashboard'
  );
  
  console.log('\n=== Checking view_dashboard permission ===');
  if (viewDashboardPerm) {
    console.log('✅ Staff role HAS view_dashboard permission');
  } else {
    console.log('❌ Staff role DOES NOT have view_dashboard permission!');
  }

  // Now check a sample staff user to see if they have permissions
  console.log('\n=== Checking sample staff user permissions ===');
  
  const staffUsers = await prisma.users.findMany({
    where: { role_id: staffRole.id },
    take: 2,
    include: {
      userPermissions: {
        include: {
          permission: true,
        },
      },
    },
  });

  if (staffUsers.length === 0) {
    console.log('No staff users found in database.');
  } else {
    for (const user of staffUsers) {
      console.log(`\nUser: ${user.email} (ID: ${user.id})`);
      console.log(`  User has ${user.userPermissions?.length || 0} permissions:`);
      
      if (user.userPermissions && user.userPermissions.length > 0) {
        user.userPermissions.forEach((up) => {
          console.log(`    - ${up.permission.name}`);
        });
      } else {
        console.log('    ⚠️  NO PERMISSIONS in userpermission table!');
      }
    }
  }
}

main()
  .catch((e) => {
    console.error('Error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
