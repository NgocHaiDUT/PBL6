import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Kiểm tra permissions trong database...\n');

  // Liệt kê tất cả permissions
  const allPermissions = await prisma.permission.findMany({
    orderBy: { name: 'asc' },
  });

  console.log('📋 Tất cả permissions trong database:');
  allPermissions.forEach((p) => {
    console.log(`  - ${p.name} (ID: ${p.id})`);
  });

  console.log(`\n✅ Tổng cộng: ${allPermissions.length} permissions\n`);

  // Kiểm tra users có permissions
  const usersWithPerms = await prisma.userpermission.findMany({
    include: {
      user: { select: { email: true, full_name: true } },
      permission: { select: { name: true } },
    },
    take: 20,
  });

  console.log('👥 Users có permissions:');
  const userPermMap: Record<string, { name: string; perms: string[] }> = {};
  
  for (const up of usersWithPerms) {
    const email = up.user.email;
    if (!userPermMap[email]) {
      userPermMap[email] = { name: up.user.full_name || '', perms: [] };
    }
    userPermMap[email].perms.push(up.permission.name);
  }

  Object.entries(userPermMap).forEach(([email, data]) => {
    console.log(`  ${data.name} (${email}):`);
    console.log(`    Permissions: ${data.perms.join(', ')}`);
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
