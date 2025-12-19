// Script to check admin permissions
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAdminPermissions() {
    try {
        // Find admin user
        const adminRole = await prisma.role.findUnique({
            where: { name: 'admin' },
        });

        if (!adminRole) {
            console.error('❌ Admin role not found!');
            return;
        }

        // Get admin users
        const adminUsers = await prisma.users.findMany({
            where: { role_id: adminRole.id },
            select: {
                id: true,
                email: true,
                full_name: true,
            },
        });

        console.log(`\n📋 Found ${adminUsers.length} admin user(s):\n`);

        for (const user of adminUsers) {
            console.log(`👤 User: ${user.full_name} (${user.email})`);
            console.log(`   ID: ${user.id}\n`);

            // Get user permissions
            const userPermissions = await prisma.userpermission.findMany({
                where: { user_id: user.id },
                include: {
                    permission: true,
                },
            });

            console.log(`   ✅ Permissions (${userPermissions.length}):`);

            const permissionNames = userPermissions.map(up => up.permission.name).sort();

            // Check for important permissions
            const hasModeratePost = permissionNames.includes('moderate_post');
            const hasViewStats = permissionNames.includes('view_moderation_stats');
            const hasDeletePost = permissionNames.includes('delete_post');

            console.log(`   - moderate_post: ${hasModeratePost ? '✅' : '❌'}`);
            console.log(`   - view_moderation_stats: ${hasViewStats ? '✅' : '❌'}`);
            console.log(`   - delete_post: ${hasDeletePost ? '✅' : '❌'}`);

            console.log(`\n   All permissions:`);
            permissionNames.forEach(name => {
                console.log(`   - ${name}`);
            });
            console.log('\n' + '='.repeat(60) + '\n');
        }

        // Check role permissions
        console.log('📋 Admin Role Permissions:\n');
        const rolePermissions = await prisma.rolepermission.findMany({
            where: { role_id: adminRole.id },
            include: {
                permission: true,
            },
        });

        const rolePermNames = rolePermissions.map(rp => rp.permission.name).sort();
        console.log(`Total: ${rolePermNames.length} permissions`);
        rolePermNames.forEach(name => {
            console.log(`- ${name}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkAdminPermissions();
