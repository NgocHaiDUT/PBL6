// Script to add moderation permissions to existing admin users
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addModerationPermissions() {
    console.log('Adding moderation permissions to admin users...');

    try {
        // 1. Find or create the permissions
        const moderatePostPerm = await prisma.permission.upsert({
            where: { name: 'moderate_post' },
            update: {},
            create: { name: 'moderate_post' },
        });

        const viewModerationStatsPerm = await prisma.permission.upsert({
            where: { name: 'view_moderation_stats' },
            update: {},
            create: { name: 'view_moderation_stats' },
        });

        console.log('✓ Permissions created/found');

        // 2. Find admin role
        const adminRole = await prisma.role.findUnique({
            where: { name: 'admin' },
        });

        if (!adminRole) {
            console.error('Admin role not found!');
            return;
        }

        // 3. Add permissions to admin role (if not already added)
        await prisma.rolepermission.upsert({
            where: {
                role_id_permission_id: {
                    role_id: adminRole.id,
                    permission_id: moderatePostPerm.id,
                },
            },
            update: {},
            create: {
                role_id: adminRole.id,
                permission_id: moderatePostPerm.id,
            },
        });

        await prisma.rolepermission.upsert({
            where: {
                role_id_permission_id: {
                    role_id: adminRole.id,
                    permission_id: viewModerationStatsPerm.id,
                },
            },
            update: {},
            create: {
                role_id: adminRole.id,
                permission_id: viewModerationStatsPerm.id,
            },
        });

        console.log('✓ Permissions added to admin role');

        // 4. Find all admin users
        const adminUsers = await prisma.users.findMany({
            where: { role_id: adminRole.id },
        });

        console.log(`Found ${adminUsers.length} admin user(s)`);

        // 5. Add permissions to each admin user
        for (const user of adminUsers) {
            await prisma.userpermission.upsert({
                where: {
                    user_id_permission_id: {
                        user_id: user.id,
                        permission_id: moderatePostPerm.id,
                    },
                },
                update: {},
                create: {
                    user_id: user.id,
                    permission_id: moderatePostPerm.id,
                },
            });

            await prisma.userpermission.upsert({
                where: {
                    user_id_permission_id: {
                        user_id: user.id,
                        permission_id: viewModerationStatsPerm.id,
                    },
                },
                update: {},
                create: {
                    user_id: user.id,
                    permission_id: viewModerationStatsPerm.id,
                },
            });

            console.log(`✓ Permissions added to user: ${user.email}`);
        }

        console.log('\n✅ Migration completed successfully!');
        console.log('Admin users now have moderation permissions.');
    } catch (error) {
        console.error('Error:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

addModerationPermissions()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
