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
  /** Người dùng thông thường (role_id: 1) */
  USER = 'user',

  /** Người bán - Chủ shop (role_id: 2) */
  SELLER = 'seller',

  /** Quản trị viên hệ thống (role_id: 3) */
  ADMIN = 'admin',

  /** Nhân viên shop (role_id: 4) */
  STAFF = 'staff',
}

/**
 * Default permissions cho mỗi role
 * Đây là mapping chuẩn giữa role và permissions từ database backup
 * 
 * Lưu ý: Đây là permissions MẶC ĐỊNH. Trong database có thể tùy chỉnh
 * thêm/bớt permissions cho từng user cụ thể thông qua bảng role_permissions
 */
export const RolePermissions: Record<Role, Permission[]> = {
  // ===== USER (role_id: 1) =====
  [Role.USER]: [
    Permission.ADD_TO_CART,
    Permission.CHECKOUT,
    Permission.CREATE_COMMENT,
    Permission.CREATE_POST,
    Permission.CREATE_REVIEW,
    Permission.CREATE_SHOP,
    Permission.DELETE_COMMENT,
    Permission.DELETE_POST,
    Permission.EDIT_COMMENT,
    Permission.EDIT_POST,
    Permission.EDIT_PROFILE,
    Permission.MANAGE_ADDRESSES,
    Permission.TOGGLE_FOLLOW,
    Permission.TOGGLE_LIKE,
    Permission.VIEW_ORDERS,
    Permission.VIEW_PRODUCTS,
  ],

  // ===== SELLER (role_id: 2) =====
  [Role.SELLER]: [
    Permission.CHAT_WITH_CUSTOMER,
    Permission.CREATE_PRODUCT,
    Permission.DELETE_PRODUCT,
    Permission.EDIT_PRODUCT,
    Permission.EDIT_PROFILE_SHOP,
    Permission.MANAGE_ORDERS,
    Permission.MANAGE_SHOP_STAFF,
    Permission.TRY_ON_TESTER,
    Permission.UPDATE_PRODUCT,
    Permission.VIEW_PRODUCTS,
    Permission.VIEW_SHOP_DASHBOARD,
    Permission.MANAGE_SHOP_ADMIN,
    Permission.MANAGE_PRODUCT
  ],

  // ===== ADMIN (role_id: 3) =====
  [Role.ADMIN]: [
    Permission.CREATE_PRODUCT,
    Permission.CREATE_USER,
    Permission.DELETE_PRODUCT,
    Permission.DELETE_USER,
    Permission.EDIT_PRODUCT,
    Permission.MANAGE_BRANDS,
    Permission.MANAGE_CATEGORYS,
    Permission.MANAGE_COUPONS,
    Permission.MANAGE_ORDERS,
    Permission.MANAGE_PERMISSIONS,
    Permission.MANAGE_PRODUCT_CATEGORIES,
    Permission.MANAGE_ROLES,
    Permission.MANAGE_SHOP_STAFF,
    Permission.MANAGE_USERS,
    Permission.MODERATE_POSTS,
    Permission.MODERATE_PRODUCTS,
    Permission.UPDATE_PRODUCT,
    Permission.UPDATE_USER,
    Permission.VIEW_PRODUCTS,
    Permission.VIEW_SHOP_DASHBOARD,
    Permission.VIEW_SYSTEM_LOGS,
    Permission.VIEW_USERS,
    Permission.MANAGE_SHOP_ADMIN,
    Permission.MANAGE_PRODUCT
  ],

  // ===== STAFF (role_id: 4) =====
  // Note: Staff permissions sẽ được inherit từ SELLER hoặc custom
  [Role.STAFF]: [
    Permission.CHAT_WITH_CUSTOMER,
    Permission.MANAGE_ORDERS,
    Permission.VIEW_SHOP_DASHBOARD,
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
    description: 'Người dùng thông thường, có thể mua sắm và tương tác với nội dung',
    color: '#3b82f6', // blue
    icon: '👤',
    permissionCount: RolePermissions[Role.USER].length,
  },

  [Role.SELLER]: {
    displayName: 'Người bán',
    description: 'Chủ shop, quản lý sản phẩm, nhân viên và hoạt động kinh doanh',
    color: '#10b981', // green
    icon: '🏪',
    permissionCount: RolePermissions[Role.SELLER].length,
  },

  [Role.ADMIN]: {
    displayName: 'Quản trị viên',
    description: 'Quản lý toàn bộ hệ thống, users, roles, permissions và dữ liệu',
    color: '#ef4444', // red
    icon: '👑',
    permissionCount: RolePermissions[Role.ADMIN].length,
  },

  [Role.STAFF]: {
    displayName: 'Nhân viên',
    description: 'Nhân viên shop, hỗ trợ quản lý cửa hàng và chăm sóc khách hàng',
    color: '#f59e0b', // amber
    icon: '👔',
    permissionCount: RolePermissions[Role.STAFF].length,
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

/**
 * Mapping role_id từ database (để tương thích với backup)
 */
export const RoleIdMapping = {
  1: Role.ADMIN,
  2: Role.USER,
  3: Role.SELLER,
  4: Role.STAFF,
} as const;
