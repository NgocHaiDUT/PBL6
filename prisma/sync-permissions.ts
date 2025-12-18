import { PrismaClient } from '@prisma/client';
import { Permission } from '../src/auth/constants/Permission.enum';
import { Role, RolePermissions } from '../src/auth/constants/Role.enum';

const prisma = new PrismaClient();

// Mapping từ ID trong DB sang Enum Role như bạn cung cấp
const RoleIdMapping: Record<number, Role> = {
  1: Role.ADMIN,
  2: Role.USER,
  3: Role.SELLER,
  4: Role.STAFF,
};

async function main() {
  console.log('🚀 Bắt đầu quá trình đồng bộ hóa hệ thống quyền hạn...');

  try {
    // 1. Dọn dẹp dữ liệu cũ
    console.log('🧹 Đang dọn dẹp các bảng liên kết...');
    await prisma.rolepermission.deleteMany({});
    await prisma.userpermission.deleteMany({});
    await prisma.permission.deleteMany({});
    
    // 2. Khởi tạo lại bảng Permission từ Enum
    const allPermissions = Object.values(Permission);
    console.log(`📦 Đang nạp ${allPermissions.length} quyền mới vào DB...`);
    await prisma.permission.createMany({
      data: allPermissions.map(name => ({ name })),
      skipDuplicates: true,
    });

    // Lấy lại Map [Tên Quyền -> ID] để sử dụng sau này
    const dbPermissions = await prisma.permission.findMany();
    const permMap = new Map(dbPermissions.map(p => [p.name, p.id]));

    // 3. Đảm bảo các Role tồn tại và khớp với ID mong muốn
    console.log('🎭 Đang đồng bộ hóa bảng Role...');
    for (const [idStr, roleEnum] of Object.entries(RoleIdMapping)) {
      const id = parseInt(idStr);
      await prisma.role.upsert({
        where: { id: id },
        update: { name: roleEnum },
        create: { id: id, name: roleEnum },
      });
    }

    // 4. Thiết lập RolePermission chuẩn (Mapping giữa Role và Quyền)
    console.log('🔗 Đang thiết lập bảng RolePermission...');
    for (const [roleIdStr, roleEnum] of Object.entries(RoleIdMapping)) {
      const roleId = parseInt(roleIdStr);
      const permsForRole = RolePermissions[roleEnum] || [];
      
      const rolePermData = permsForRole
        .map(pName => ({
          role_id: roleId,
          permission_id: permMap.get(pName)!
        }))
        .filter(item => item.permission_id !== undefined);

      if (rolePermData.length > 0) {
        await prisma.rolepermission.createMany({ data: rolePermData });
      }
    }

    // 5. QUAN TRỌNG: Phục hồi bảng UserPermission dựa trên Role của User
    // Duyệt qua tất cả User có role_id hợp lệ
    console.log('👥 Đang quét danh sách người dùng để gán lại quyền...');
    const allUsers = await prisma.users.findMany({
      where: { 
        role_id: { in: Object.keys(RoleIdMapping).map(Number) },
        is_deleted: false 
      },
      select: { id: true, role_id: true }
    });

    console.log(`🔄 Đang nạp lại quyền cho ${allUsers.length} người dùng...`);
    
    // Chuẩn bị dữ liệu nạp hàng loạt (bulk insert)
    const userPermissionEntries: { user_id: number, permission_id: number }[] = [];

    for (const user of allUsers) {
      if (user.role_id && RoleIdMapping[user.role_id]) {
        const roleEnum = RoleIdMapping[user.role_id];
        const permsForRole = RolePermissions[roleEnum] || [];
        
        permsForRole.forEach(pName => {
          const pId = permMap.get(pName);
          if (pId) {
            userPermissionEntries.push({
              user_id: user.id,
              permission_id: pId
            });
          }
        });
      }
    }

    // Nạp dữ liệu vào bảng userpermission
    if (userPermissionEntries.length > 0) {
      // Chia nhỏ mảng nếu số lượng bản ghi quá lớn (tránh giới hạn của Postgres)
      const chunkSize = 5000;
      for (let i = 0; i < userPermissionEntries.length; i += chunkSize) {
        const chunk = userPermissionEntries.slice(i, i + chunkSize);
        await prisma.userpermission.createMany({
          data: chunk,
          skipDuplicates: true
        });
      }
    }

    console.log('✨ Hoàn tất! Hệ thống Role, Permission và UserPermission đã đồng bộ.');

  } catch (error) {
    console.error('❌ Lỗi:', error);
    throw error;
  }
}

main()
  .catch((e) => process.exit(1))
  .finally(async () => await prisma.$disconnect());