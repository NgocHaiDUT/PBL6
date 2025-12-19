import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function grantStaffPermissions() {
    try {
        console.log('🔍 Checking staff role permissions...');

        // 1. Get staff role
        const staffRole = await prisma.role.findUnique({
            where: { name: 'staff' },
            include: {
                rolePermissions: {
                    include: {
                        permission: true
                    }
                }
            }
        });

        if (!staffRole) {
            console.error('❌ Staff role not found!');
            return;
        }

        console.log(`✅ Found staff role (ID: ${staffRole.id})`);
        console.log(`📋 Current permissions: ${staffRole.rolePermissions.length}`);

        if (staffRole.rolePermissions.length > 0) {
            console.log('Current staff permissions:');
            staffRole.rolePermissions.forEach(rp => {
                console.log(`  - ${rp.permission.name}`);
            });
        }

        // 2. Get all staff users
        const staffUsers = await prisma.users.findMany({
            where: { role_id: staffRole.id },
            select: {
                id: true,
                email: true,
                full_name: true,
                userPermissions: {
                    include: {
                        permission: true
                    }
                }
            }
        });

        console.log(`\n👥 Found ${staffUsers.length} staff users:`);
        staffUsers.forEach(user => {
            console.log(`  - ${user.full_name} (${user.email})`);
            console.log(`    User permissions: ${user.userPermissions.length}`);
            if (user.userPermissions.length > 0) {
                user.userPermissions.forEach(up => {
                    console.log(`      - ${up.permission.name}`);
                });
            }
        });

        // 3. If staff role has no permissions, grant basic seller permissions
        if (staffRole.rolePermissions.length === 0) {
            console.log('\n⚠️  Staff role has no permissions! Granting basic seller permissions...');

            // Get seller permissions
            const sellerPermissions = await prisma.permission.findMany({
                where: {
                    name: {
                        in: [
                            'view_dashboard',
                            'manage_products',
                            'view_orders',
                            'manage_orders',
                            'view_customers',
                            'view_analytics',
                            'manage_promotions',
                            'view_reviews'
                        ]
                    }
                }
            });

            console.log(`📦 Found ${sellerPermissions.length} seller permissions to grant`);

            // Grant to staff role
            const rolePermissions = await prisma.rolepermission.createMany({
                data: sellerPermissions.map(p => ({
                    role_id: staffRole.id,
                    permission_id: p.id
                })),
                skipDuplicates: true
            });

            console.log(`✅ Granted ${rolePermissions.count} permissions to staff role`);

            // Also grant to all staff users
            for (const user of staffUsers) {
                const userPermissions = await prisma.userpermission.createMany({
                    data: sellerPermissions.map(p => ({
                        user_id: user.id,
                        permission_id: p.id
                    })),
                    skipDuplicates: true
                });

                console.log(`✅ Granted ${userPermissions.count} permissions to ${user.full_name}`);
            }
        }

        console.log('\n✅ Done! Staff permissions updated.');
        console.log('🔄 Please refresh the frontend to see changes.');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

grantStaffPermissions();
