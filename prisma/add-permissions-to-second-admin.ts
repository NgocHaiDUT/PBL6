// Script to add permissions to admin@pbl6.com
import { PrismaClient } from '@prisma/client';
import { Permission } from '../src/auth/constants/Permission.enum';
import { Role, RolePermissions } from '../src/auth/constants/Role.enum';

const prisma = new PrismaClient();

async function addPermissionsToSecondAdmin() {
    console.log('Adding permissions to admin@pbl6.com...\n');

    try {
        // Find the second admin user
        const adminUser = await prisma.users.findUnique({
            where: { email: 'admin@pbl6.com' },
        });

        if (!adminUser) {
            console.error('❌ User admin@pbl6.com not found!');
            return;
        }

        console.log(`✓ Found user: ${adminUser.full_name} (ID: ${adminUser.id})\n`);

        // Get all admin permissions from Role.enum.ts
        const adminPermissions = RolePermissions[Role.ADMIN];

        console.log(`Adding ${adminPermissions.length} permissions...\n`);

        let added = 0;
        let skipped = 0;

        for (const permName of adminPermissions) {
            // Find permission
            const permission = await prisma.permission.findUnique({
                where: { name: permName },
            });

            if (!permission) {
                console.log(`⚠️  Permission ${permName} not found in database, skipping...`);
                continue;
            }

            // Check if already exists
            const existing = await prisma.userpermission.findUnique({
                where: {
                    user_id_permission_id: {
                        user_id: adminUser.id,
                        permission_id: permission.id,
                    },
                },
            });

            if (existing) {
                skipped++;
                continue;
            }

            // Add permission
            await prisma.userpermission.create({
                data: {
                    user_id: adminUser.id,
                    permission_id: permission.id,
                },
            });

            console.log(`✓ Added: ${permName}`);
            added++;
        }

        console.log(`\n✅ Done!`);
        console.log(`   Added: ${added} permissions`);
        console.log(`   Skipped: ${skipped} (already exists)`);
        console.log(`\n🔑 User admin@pbl6.com now has full admin permissions!`);

    } catch (error) {
        console.error('Error:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

addPermissionsToSecondAdmin();
