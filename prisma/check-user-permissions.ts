import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getUserPermissions(userId: number) {
    try {
        console.log(`🔍 Getting permissions for user ID: ${userId}\n`);

        const user = await prisma.users.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                full_name: true,
                role: {
                    select: {
                        id: true,
                        name: true,
                        rolePermissions: {
                            select: {
                                permission: {
                                    select: {
                                        id: true,
                                        name: true,
                                    },
                                },
                            },
                        },
                    },
                },
                userPermissions: {
                    select: {
                        permission: {
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
            console.error('❌ User not found!');
            return;
        }

        console.log('👤 User Info:');
        console.log(`  ID: ${user.id}`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Name: ${user.full_name}`);
        console.log(`  Role: ${user.role?.name || 'N/A'}\n`);

        // Collect permissions from role
        const rolePermissions = user.role?.rolePermissions?.map(rp => rp.permission.name) || [];
        console.log(`📋 Role Permissions (${rolePermissions.length}):`);
        if (rolePermissions.length > 0) {
            rolePermissions.forEach(p => console.log(`  ✓ ${p}`));
        } else {
            console.log('  (none)');
        }

        // Collect permissions from user
        const userPermissions = user.userPermissions?.map(up => up.permission.name) || [];
        console.log(`\n📋 User-Specific Permissions (${userPermissions.length}):`);
        if (userPermissions.length > 0) {
            userPermissions.forEach(p => console.log(`  ✓ ${p}`));
        } else {
            console.log('  (none)');
        }

        // Combined permissions
        const allPermissions = [...new Set([...rolePermissions, ...userPermissions])];
        console.log(`\n✅ Total Unique Permissions (${allPermissions.length}):`);
        allPermissions.sort().forEach(p => console.log(`  ✓ ${p}`));

        // Return data
        return {
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role?.name,
            },
            rolePermissions,
            userPermissions,
            allPermissions,
        };

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run for user ID 4
getUserPermissions(4);
