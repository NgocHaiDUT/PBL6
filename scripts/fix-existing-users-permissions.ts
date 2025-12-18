import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixExistingUsersPermissions() {
  console.log('🔧 Fixing permissions for existing users...\n');

  // Get all roles with their permissions
  const roles = await prisma.role.findMany({
    include: {
      rolePermissions: {
        include: {
          permission: true
        }
      }
    }
  });

  const roleMap = new Map(roles.map(r => [r.name, r]));

  // Get all users grouped by role
  const allUsers = await prisma.users.findMany({
    where: {
      role_id: { not: null }
    },
    include: {
      role: true,
      userPermissions: {
        include: {
          permission: true
        }
      }
    }
  });

  console.log(`Found ${allUsers.length} users to check\n`);

  let updatedCount = 0;

  for (const user of allUsers) {
    if (!user.role) continue;

    const roleData = roleMap.get(user.role.name);
    if (!roleData) {
      console.log(`⚠️  Role '${user.role.name}' not found for user ${user.email}`);
      continue;
    }

    // Get expected permissions for this role
    const expectedPermissions = roleData.rolePermissions.map(rp => rp.permission.name);
    const currentPermissions = user.userPermissions.map(up => up.permission.name);

    // Find missing permissions
    const missingPermissions = expectedPermissions.filter(
      p => !currentPermissions.includes(p)
    );

    if (missingPermissions.length === 0) {
      console.log(`✅ ${user.email} (${user.role.name}) - Already has all permissions`);
      continue;
    }

    console.log(`🔄 ${user.email} (${user.role.name}) - Adding ${missingPermissions.length} permissions:`);
    console.log(`   Missing: ${missingPermissions.join(', ')}`);

    // Add missing permissions
    for (const permName of missingPermissions) {
      const permission = await prisma.permission.findUnique({
        where: { name: permName }
      });

      if (permission) {
        // Check if already exists (avoid duplicates)
        const existing = await prisma.userpermission.findUnique({
          where: {
            user_id_permission_id: {
              user_id: user.id,
              permission_id: permission.id
            }
          }
        });

        if (!existing) {
          await prisma.userpermission.create({
            data: {
              user_id: user.id,
              permission_id: permission.id
            }
          });
        }
      }
    }

    updatedCount++;
  }

  console.log(`\n✅ Updated ${updatedCount} users with missing permissions`);
}

fixExistingUsersPermissions()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
