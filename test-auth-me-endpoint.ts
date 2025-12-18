import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Simulate getCurrentUser function
async function getCurrentUser(userId: number) {
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      full_name: true,
      avatar_url: true,
      phone: true,
      story: true,
      firstlogin: true,
      role: {
        select: {
          id: true,
          name: true,
        },
      },
      userPermissions: {
        select: {
          permission: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!user) return null;

  console.log('\n=== Raw Database Query Result ===');
  console.log('user.userPermissions:', JSON.stringify(user.userPermissions, null, 2));

  const result = {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    avatar_url: user.avatar_url,
    phone: user.phone,
    story: user.story,
    role: user.role?.name || 'user',
    role_id: user.role?.id,
    firstlogin: user.firstlogin,
    is_active: true,
    permissions: user.userPermissions.map((up) => up.permission.name),
  };

  console.log('\n=== Mapped Result ===');
  console.log('permissions:', result.permissions);
  
  return result;
}

async function main() {
  console.log('Testing /auth/me endpoint logic for user ID: 8\n');
  
  const result = await getCurrentUser(8);
  
  console.log('\n=== Final API Response (should be) ===');
  console.log(JSON.stringify({ success: true, user: result }, null, 2));
}

main()
  .catch((e) => {
    console.error('Error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
