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
  // ===== USER PERMISSIONS (role_id: 1) =====
  /** Thêm sản phẩm vào giỏ hàng */
  ADD_TO_CART = 'add_to_cart',

  /** Thanh toán đơn hàng */
  CHECKOUT = 'checkout',

  /** Tạo comment */
  CREATE_COMMENT = 'create_comment',

  /** Tạo bài viết mới */
  CREATE_POST = 'create_post',

  /** Tạo đánh giá sản phẩm */
  CREATE_REVIEW = 'create_review',

  /** Tạo shop mới */
  CREATE_SHOP = 'create_shop',

  /** Xóa comment */
  DELETE_COMMENT = 'delete_comment',

  /** Xóa bài viết */
  DELETE_POST = 'delete_post',

  /** Chỉnh sửa comment */
  EDIT_COMMENT = 'edit_comment',

  /** Chỉnh sửa bài viết */
  EDIT_POST = 'edit_post',

  /** Chỉnh sửa profile cá nhân */
  EDIT_PROFILE = 'edit_profile',

  /** Quản lý địa chỉ giao hàng */
  MANAGE_ADDRESSES = 'manage_addresses',

  /** Theo dõi/Bỏ theo dõi */
  TOGGLE_FOLLOW = 'toggle_follow',

  /** Like/Unlike */
  TOGGLE_LIKE = 'toggle_like',

  /** Xem đơn hàng của mình */
  VIEW_ORDERS = 'view_orders',

  /** Xem danh sách sản phẩm */
  VIEW_PRODUCTS = 'view_products',

  // ===== SELLER PERMISSIONS (role_id: 2) =====
  /** Chat với khách hàng */
  CHAT_WITH_CUSTOMER = 'chat_with_customer',

  /** Tạo sản phẩm mới */
  CREATE_PRODUCT = 'create_product',

  /** Xóa sản phẩm */
  DELETE_PRODUCT = 'delete_product',

  /** Chỉnh sửa sản phẩm */
  EDIT_PRODUCT = 'edit_product',

  /** Chỉnh sửa thông tin shop */
  EDIT_PROFILE_SHOP = 'edit_profile_shop',

  /** Quản lý đơn hàng */
  MANAGE_ORDERS = 'manage_orders',

  /** Quản lý nhân viên shop */
  MANAGE_SHOP_STAFF = 'manage_shop_staff',

  /** Thử nghiệm tính năng try-on */
  TRY_ON_TESTER = 'try_on_tester',

  /** Cập nhật sản phẩm */
  UPDATE_PRODUCT = 'update_product',

  /** Xem dashboard thống kê shop */
  VIEW_SHOP_DASHBOARD = 'view_shop_dashboard',

  // ===== ADMIN PERMISSIONS (role_id: 3) =====
  /** Tạo user mới */
  CREATE_USER = 'create_user',

  /** Xóa user */
  DELETE_USER = 'delete_user',

  /** Quản lý thương hiệu (brands) */
  MANAGE_BRANDS = 'manage_brands',

  /** Quản lý danh mục (categories) */
  MANAGE_CATEGORYS = 'manage_categorys',

  /** Quản lý mã giảm giá (coupons) */
  MANAGE_COUPONS = 'manage_coupons',

  /** Quản lý quyền hạn (permissions) */
  MANAGE_PERMISSIONS = 'manage_permissions',

  /** Quản lý danh mục sản phẩm */
  MANAGE_PRODUCT_CATEGORIES = 'manage_product_categories',

  /** Quản lý vai trò (roles) */
  MANAGE_ROLES = 'manage_roles',

  /** Quản lý người dùng */
  MANAGE_USERS = 'manage_users',

  /** Kiểm duyệt bài viết */
  MODERATE_POSTS = 'moderate_posts',

  /** Kiểm duyệt sản phẩm */
  MODERATE_PRODUCTS = 'moderate_products',

  /** Cập nhật thông tin user */
  UPDATE_USER = 'update_user',

  /** Xem system logs */
  VIEW_SYSTEM_LOGS = 'view_system_logs',

  /** Xem danh sách users */
  VIEW_USERS = 'view_users',

  /** Quản lý shop */
  MANAGE_SHOP_ADMIN = 'manage_shop_admin',
  /** Quản lý sản phẩm */
  MANAGE_PRODUCT = 'manage_product',
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
 * Nhóm permissions theo role để dễ quản lý
 */
export const PermissionGroups = {
  USER: [
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

  SELLER: [
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
  ],

  ADMIN: [
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
  ],
} as const;
