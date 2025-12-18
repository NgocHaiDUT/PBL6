// Script để verify và sync permissions trong database với code
import { PrismaClient } from '@prisma/client';
import { getAllPermissions } from '../src/auth/constants/Permission.enum.js';
import { RolePermissions, Role } from '../src/auth/constants/Role.enum.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking permissions in database...\n');

  // 1. Lấy tất cả permissions từ enum
  const allPermissionsFromEnum = getAllPermissions();
  console.log(`📋 Permissions in Enum (${allPermissionsFromEnum.length}):`);
  console.log(allPermissionsFromEnum.join(', '));
  console.log('');

  // 2. Lấy permissions từ database
  const permissionsInDB = await prisma.permission.findMany({
    select: { id: true, name: true },
  });
  console.log(`💾 Permissions in Database (${permissionsInDB.length}):`);
  console.log(permissionsInDB.map(p => p.name).join(', '));
  console.log('');

  // 3. Tìm permissions thiếu
  const permissionNamesInDB = permissionsInDB.map(p => p.name);
  const missingPermissions = allPermissionsFromEnum.filter(
    p => !permissionNamesInDB.includes(p)
  );

  if (missingPermissions.length > 0) {
    console.log(`❌ Missing ${missingPermissions.length} permissions in DB:`);
    console.log(missingPermissions.join(', '));
    console.log('\n🔧 Creating missing permissions...');
    
    for (const permName of missingPermissions) {
      await prisma.permission.create({
        data: { name: permName },
      });
      console.log(`  ✅ Created: ${permName}`);
    }
  } else {
    console.log('✅ All permissions exist in database');
  }
  console.log('');

  // 4. Kiểm tra RolePermissions
  console.log('🔍 Checking role-permission mappings...\n');

  for (const [roleName, permissions] of Object.entries(RolePermissions)) {
    const role = await prisma.role.findUnique({
      where: { name: roleName },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      console.log(`❌ Role "${roleName}" not found in database!`);
      continue;
    }

    const rolePermissionsInDB = role.rolePermissions.map(rp => rp.permission.name);
    const expectedPermissions = permissions;

    console.log(`\n📌 Role: ${roleName.toUpperCase()}`);
    console.log(`  Expected (${expectedPermissions.length}): ${expectedPermissions.join(', ')}`);
    console.log(`  In DB (${rolePermissionsInDB.length}): ${rolePermissionsInDB.join(', ')}`);

    // Tìm permissions thiếu cho role này
    const missingForRole = expectedPermissions.filter(
      p => !rolePermissionsInDB.includes(p)
    );

    if (missingForRole.length > 0) {
      console.log(`  ❌ Missing ${missingForRole.length} permissions: ${missingForRole.join(', ')}`);
      console.log(`  🔧 Adding missing permissions to role...`);

      for (const permName of missingForRole) {
        const permission = await prisma.permission.findUnique({
          where: { name: permName },
        });

        if (permission) {
          await prisma.rolepermission.create({
            data: {
              role_id: role.id,
              permission_id: permission.id,
            },
          });
          console.log(`    ✅ Added: ${permName}`);
        } else {
          console.log(`    ⚠️  Permission "${permName}" not found in DB`);
        }
      }
    } else {
      console.log(`  ✅ All permissions correctly assigned`);
    }

    // Tìm permissions thừa
    const extraPermissions = rolePermissionsInDB.filter(
      (p: string) => !expectedPermissions.includes(p as any)
    );
    if (extraPermissions.length > 0) {
      console.log(`  ⚠️  Extra permissions (should be removed): ${extraPermissions.join(', ')}`);
    }
  }

  console.log('\n\n✅ Verification complete!');
  console.log('\n📊 Summary:');
  console.log(`  Total permissions: ${allPermissionsFromEnum.length}`);
  console.log(`  In database: ${permissionsInDB.length + missingPermissions.length}`);
  console.log(`  Roles checked: ${Object.keys(RolePermissions).length}`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
