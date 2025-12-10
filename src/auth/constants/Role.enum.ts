/**
 * Role Enum và Default Permissions Mapping
 * Định nghĩa các vai trò và quyền mặc định của từng vai trò
 * 
 * Sử dụng:
 * import { Role, RolePermissions, getRolesByPermission } from '@/auth/constants/Role.enum';
 * 
 * Example:
 * const adminPerms = RolePermissions[Role.ADMIN];
 * const rolesWithCreateProduct = getRolesByPermission(Permission.CREATE_PRODUCT);
 */

import { Permission } from './Permission.enum';

export enum Role {
  /** Người dùng thông thường */
  USER = 'user',
  
  /** Người bán - Chủ shop */
  SELLER = 'seller',
  
  /** Quản trị viên hệ thống */
  ADMIN = 'admin',
  
  /** Nhân viên shop */
  STAFF = 'staff',
}

/**
 * Default permissions cho mỗi role
 * Đây là mapping chuẩn giữa role và permissions
 * 
 * Lưu ý: Đây là permissions MẶC ĐỊNH. Trong database có thể tùy chỉnh
 * thêm/bớt permissions cho từng user cụ thể thông qua bảng role_permissions
 */
export const RolePermissions: Record<Role, Permission[]> = {
  [Role.USER]: [
    // Post permissions
    Permission.CREATE_POST,
    Permission.EDIT_POST,
    Permission.DELETE_POST,
  ],

  [Role.SELLER]: [
    // Product permissions
    Permission.CREATE_PRODUCT,
    Permission.EDIT_PRODUCT,
    Permission.DELETE_PRODUCT,
    
    // Shop permissions
    Permission.MANAGE_SHOP_STAFF,
    Permission.EDIT_PROFILE_SHOP,
    Permission.MANAGE_SHOP_ADDRESS,
  ],

  [Role.ADMIN]: [
    // User, Role & Permission management
    Permission.MANAGE_USERS,
    
    // Product management
    Permission.CREATE_PRODUCT,
    Permission.EDIT_PRODUCT,
    Permission.DELETE_PRODUCT,
    Permission.MANAGE_BRANDS,
    Permission.MANAGE_CATEGORYS,
  ],

  [Role.STAFF]: [
    // Shop staff permissions
    Permission.MANAGE_SHOP_STAFF,
  ],
};

/**
 * Helper: Kiểm tra xem một permission có thuộc default của role không
 * 
 * @param role - Role cần kiểm tra
 * @param permission - Permission cần kiểm tra
 * @returns true nếu permission thuộc default của role
 * 
 * @example
 * isPermissionInRole(Role.ADMIN, Permission.VIEW_USERS) // true
 * isPermissionInRole(Role.USER, Permission.VIEW_USERS) // false
 */
export const isPermissionInRole = (role: Role, permission: Permission): boolean => {
  return RolePermissions[role]?.includes(permission) || false;
};

/**
 * Helper: Lấy tất cả permissions của một role
 * 
 * @param role - Role cần lấy permissions
 * @returns Mảng các permissions của role
 * 
 * @example
 * getPermissionsByRole(Role.ADMIN) // [Permission.VIEW_USERS, ...]
 */
export const getPermissionsByRole = (role: Role): Permission[] => {
  return RolePermissions[role] || [];
};

/**
 * Helper: Lấy danh sách roles có permission cụ thể
 * Hữu ích để biết permission này được gán cho role nào
 * 
 * @param permission - Permission cần tìm
 * @returns Mảng các roles có permission này
 * 
 * @example
 * getRolesByPermission(Permission.CREATE_PRODUCT) 
 * // Output: [Role.SELLER, Role.ADMIN]
 */
export const getRolesByPermission = (permission: Permission): Role[] => {
  return Object.entries(RolePermissions)
    .filter(([_, permissions]) => permissions.includes(permission))
    .map(([role]) => role as Role);
};

/**
 * Helper: Lấy tất cả roles dưới dạng array
 */
export const getAllRoles = (): string[] => {
  return Object.values(Role);
};

/**
 * Helper: Kiểm tra role có hợp lệ không
 */
export const isValidRole = (role: string): role is Role => {
  return Object.values(Role).includes(role as Role);
};

/**
 * Metadata về từng role (dùng cho UI/Documentation)
 * Chứa thông tin hiển thị và mô tả cho từng role
 */
export const RoleMetadata = {
  [Role.USER]: {
    displayName: 'Người dùng',
    description: 'Người dùng thông thường, có thể tạo và quản lý bài viết cá nhân',
    color: '#3b82f6', // blue
    icon: '👤',
  },
  
  [Role.SELLER]: {
    displayName: 'Người bán',
    description: 'Chủ shop, quản lý sản phẩm, nhân viên và hoạt động kinh doanh',
    color: '#10b981', // green
    icon: '🏪',
  },
  
  [Role.ADMIN]: {
    displayName: 'Quản trị viên',
    description: 'Quản lý toàn bộ hệ thống, users, roles, permissions và dữ liệu',
    color: '#ef4444', // red
    icon: '👑',
  },
  
  [Role.STAFF]: {
    displayName: 'Nhân viên',
    description: 'Nhân viên shop, hỗ trợ quản lý cửa hàng',
    color: '#f59e0b', // amber
    icon: '👔',
  },
} as const;

/**
 * Nhóm roles theo cấp độ (hierarchy)
 * Hữu ích cho việc kiểm tra quyền kế thừa
 */
export const RoleHierarchy = {
  /** Cấp cao nhất - Toàn quyền */
  HIGHEST: [Role.ADMIN],
  
  /** Cấp trung - Quản lý shop */
  MEDIUM: [Role.SELLER],
  
  /** Cấp thấp - Nhân viên và user */
  LOWEST: [Role.STAFF, Role.USER],
} as const;
