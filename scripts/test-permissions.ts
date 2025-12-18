import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testPermissions() {
  console.log('🧪 Testing Permissions System\n');

  // 1. Check all permissions exist
  console.log('1️⃣ Checking all permissions...');
  const permissions = await prisma.permission.findMany();
  console.log(`   ✅ Found ${permissions.length} permissions`);
  console.log('   Permissions:', permissions.map(p => p.name).join(', '));

  // 2. Check all roles exist with permissions
  console.log('\n2️⃣ Checking all roles...');
  const roles = await prisma.role.findMany({
    include: {
      rolePermissions: {
        include: {
          permission: true
        }
      }
    }
  });
  
  for (const role of roles) {
    console.log(`   ${role.name}: ${role.rolePermissions.length} permissions`);
    console.log(`      - ${role.rolePermissions.map(rp => rp.permission.name).join(', ')}`);
  }

  // 3. Check a sample user's permissions
  console.log('\n3️⃣ Checking sample user permissions...');
  const sampleUser = await prisma.users.findFirst({
    where: { 
      role: {
        name: 'user'
      }
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

  if (sampleUser) {
    console.log(`   User: ${sampleUser.full_name} (${sampleUser.email})`);
    console.log(`   Role: ${sampleUser.role?.name}`);
    console.log(`   Permissions: ${sampleUser.userPermissions.length}`);
    console.log(`      - ${sampleUser.userPermissions.map(up => up.permission.name).join(', ')}`);
  } else {
    console.log('   ⚠️ No sample user found');
  }

  // 4. Check a seller's permissions
  console.log('\n4️⃣ Checking seller permissions...');
  const seller = await prisma.users.findFirst({
    where: { 
      role: {
        name: 'seller'
      }
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

  if (seller) {
    console.log(`   Seller: ${seller.full_name} (${seller.email})`);
    console.log(`   Role: ${seller.role?.name}`);
    console.log(`   Permissions: ${seller.userPermissions.length}`);
    console.log(`      - ${seller.userPermissions.map(up => up.permission.name).join(', ')}`);
  } else {
    console.log('   ⚠️ No seller found');
  }

  // 5. Check a staff's permissions
  console.log('\n5️⃣ Checking staff permissions...');
  const staff = await prisma.users.findFirst({
    where: { 
      role: {
        name: 'staff'
      }
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

  if (staff) {
    console.log(`   Staff: ${staff.full_name} (${staff.email})`);
    console.log(`   Role: ${staff.role?.name}`);
    console.log(`   Permissions: ${staff.userPermissions.length}`);
    console.log(`      - ${staff.userPermissions.map(up => up.permission.name).join(', ')}`);
  } else {
    console.log('   ⚠️ No staff found');
  }

  console.log('\n✅ Test completed!');
}

testPermissions()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
