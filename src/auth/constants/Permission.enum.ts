/**
 * Permission Enum
 * Tập trung quản lý tất cả các quyền trong hệ thống
 * Sử dụng: Import enum này vào controller và sử dụng với decorator @RequirePermissions()
 * 
 * Example:
 * import { Permission } from '@/auth/constants/Permission.enum';
 * 
 * @RequirePermissions(Permission.VIEW_USERS)
 * async getUsers() { ... }
 */

export enum Permission {
  // ===== USER PERMISSIONS =====
  /** Quản lý người dùng, vai trò và quyền hạn (users, roles, permissions) */
  MANAGE_USERS = 'manage_users',

  // ===== SHOP PERMISSIONS =====
  /** Quản lý nhân viên shop (chỉ chủ shop) */
  MANAGE_SHOP_STAFF = 'manage_shop_staff',

  /** Chỉnh sửa thông tin shop */
  EDIT_PROFILE_SHOP = 'edit_profile_shop',

  /** Quản lý shop (admin level) */
  MANAGE_SHOP_ADMIN = 'manage_shop_admin',

  /** Quản lý đơn hàng */
  MANAGE_ORDER = 'manage_order',

  /** Thử nghiệm tính năng try-on */
  TRY_ON_TESTER = 'try_on_tester',

  /** Chat với khách hàng */
  CHAT_WITH_CUSTOMER = 'chat_with_customer',

  /** Quản lý cài đặt shop */
  MANAGE_SHOP_SETTING = 'manage_shop_setting',

  /** Xem dashboard thống kê */
  VIEW_DASHBOARD = 'view_dashboard',

  /** Xem hướng dẫn/tutorial của shop */
  VIEW_SHOP_TUTORIAL = 'view_shop_tutorial',

  // ===== PRODUCT PERMISSIONS =====
  /** Quản lý sản phẩm (tạo, sửa, xóa) */
  MANAGE_PRODUCT = 'manage_product',

  /** Quản lý thương hiệu (brands) */
  MANAGE_BRANDS = 'manage_brands',

  /** Quản lý danh mục (categories) */
  MANAGE_CATEGORYS = 'manage_categorys',

  // ===== POST PERMISSIONS =====
  /** Tạo bài viết mới */
  CREATE_POST = 'create_post',

  /** Chỉnh sửa bài viết */
  EDIT_POST = 'edit_post',

  /** Xóa bài viết */
  DELETE_POST = 'delete_post',

  /** Kiểm duyệt bài viết (admin) */
  MODERATE_POST = 'moderate_post',

  /** Xem thống kê kiểm duyệt (admin) */
  VIEW_MODERATION_STATS = 'view_moderation_stats',

  // ===== ADDRESS PERMISSIONS =====
  /** Quản lý địa chỉ shop */
  MANAGE_SHOP_ADDRESS = 'manage_shop_address',
}

/**
 * Helper function để lấy tất cả permissions dưới dạng array
 * Hữu ích cho việc validation hoặc seeding database
 */
export const getAllPermissions = (): string[] => {
  return Object.values(Permission);
};

/**
 * Helper function để kiểm tra permission có hợp lệ không
 */
export const isValidPermission = (permission: string): permission is Permission => {
  return Object.values(Permission).includes(permission as Permission);
};

/**
 * Nhóm permissions theo module để dễ quản lý
 */
export const PermissionGroups = {
  USER: [
    Permission.MANAGE_USERS,
  ],

  SHOP: [
    Permission.MANAGE_SHOP_STAFF,
    Permission.EDIT_PROFILE_SHOP,
    Permission.MANAGE_SHOP_ADMIN,
    Permission.MANAGE_ORDER,
    Permission.TRY_ON_TESTER,
    Permission.CHAT_WITH_CUSTOMER,
    Permission.MANAGE_SHOP_SETTING,
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_SHOP_TUTORIAL,
  ],

  PRODUCT: [
    Permission.MANAGE_PRODUCT,
    Permission.MANAGE_BRANDS,
    Permission.MANAGE_CATEGORYS,
  ],

  POST: [
    Permission.CREATE_POST,
    Permission.EDIT_POST,
    Permission.DELETE_POST,
    Permission.MODERATE_POST,
    Permission.VIEW_MODERATION_STATS,
  ],

  ADDRESS: [
    Permission.MANAGE_SHOP_ADDRESS,
  ],
} as const;