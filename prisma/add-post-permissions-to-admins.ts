// Script to add post management permissions to admin users
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addPostPermissionsToAdmins() {
    console.log('Adding post management permissions to admin users...\n');

    try {
        // Find admin role
        const adminRole = await prisma.role.findUnique({
            where: { name: 'admin' },
        });

        if (!adminRole) {
            console.error('❌ Admin role not found!');
            return;
        }

        // Find the three permissions
        const permissions = await Promise.all([
            prisma.permission.findUnique({ where: { name: 'create_post' } }),
            prisma.permission.findUnique({ where: { name: 'edit_post' } }),
            prisma.permission.findUnique({ where: { name: 'delete_post' } }),
        ]);

        const [createPost, editPost, deletePost] = permissions;

        if (!createPost || !editPost || !deletePost) {
            console.error('❌ Some permissions not found!');
            return;
        }

        console.log('✓ Found all permissions\n');

        // Add to role
        for (const perm of [createPost, editPost, deletePost]) {
            await prisma.rolepermission.upsert({
                where: {
                    role_id_permission_id: {
                        role_id: adminRole.id,
                        permission_id: perm.id,
                    },
                },
                update: {},
                create: {
                    role_id: adminRole.id,
                    permission_id: perm.id,
                },
            });
            console.log(`✓ Added ${perm.name} to admin role`);
        }

        // Find all admin users
        const adminUsers = await prisma.users.findMany({
            where: { role_id: adminRole.id },
        });

        console.log(`\n✓ Found ${adminUsers.length} admin user(s)\n`);

        // Add to each admin user
        for (const user of adminUsers) {
            for (const perm of [createPost, editPost, deletePost]) {
                await prisma.userpermission.upsert({
                    where: {
                        user_id_permission_id: {
                            user_id: user.id,
                            permission_id: perm.id,
                        },
                    },
                    update: {},
                    create: {
                        user_id: user.id,
                        permission_id: perm.id,
                    },
                });
            }
            console.log(`✓ Added permissions to user: ${user.email}`);
        }

        console.log('\n✅ Done! Admin users now have post management permissions.');
        console.log('   - create_post');
        console.log('   - edit_post');
        console.log('   - delete_post');

    } catch (error) {
        console.error('Error:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

addPostPermissionsToAdmins();
