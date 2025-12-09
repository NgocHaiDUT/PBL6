-- Script SQL để kiểm tra data sau khi seed
-- Copy và chạy trong database client (pgAdmin, DBeaver, etc.)

-- 1. Kiểm tra số lượng records trong các bảng
SELECT 
  'brands' as table_name, COUNT(*) as count FROM brands
UNION ALL
SELECT 'categories', COUNT(*) FROM categories
UNION ALL
SELECT 'roles', COUNT(*) FROM role
UNION ALL
SELECT 'permissions', COUNT(*) FROM permission
UNION ALL
SELECT 'role_permissions', COUNT(*) FROM role_permission
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'shops', COUNT(*) FROM shops
UNION ALL
SELECT 'shop_staffs', COUNT(*) FROM shop_staffs
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'product_variants', COUNT(*) FROM product_variants
UNION ALL
SELECT 'product_media', COUNT(*) FROM product_media
UNION ALL
SELECT 'coupons', COUNT(*) FROM coupons
UNION ALL
SELECT 'addresses', COUNT(*) FROM addresses
UNION ALL
SELECT 'shop_addresses', COUNT(*) FROM shop_addresses
UNION ALL
SELECT 'carts', COUNT(*) FROM carts
UNION ALL
SELECT 'cart_items', COUNT(*) FROM cart_items
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'order_items', COUNT(*) FROM order_items
UNION ALL
SELECT 'payments', COUNT(*) FROM payments
UNION ALL
SELECT 'shipments', COUNT(*) FROM shipments
ORDER BY table_name;

-- 2. Kiểm tra users và roles
SELECT 
  u.id,
  u.email,
  u.full_name,
  r.name as role_name
FROM users u
LEFT JOIN role r ON u.role_id = r.id
ORDER BY u.id;

-- 3. Kiểm tra shops và owners
SELECT 
  s.id,
  s.name as shop_name,
  s.status,
  u.full_name as owner_name,
  u.email as owner_email
FROM shops s
LEFT JOIN users u ON s.owner_id = u.id
ORDER BY s.id;

-- 4. Kiểm tra shop staffs
SELECT 
  ss.id,
  s.name as shop_name,
  u.full_name as staff_name,
  u.email as staff_email,
  ss.is_manager
FROM shop_staffs ss
LEFT JOIN shops s ON ss.shop_id = s.id
LEFT JOIN users u ON ss.user_id = u.id
ORDER BY ss.shop_id, ss.is_manager DESC;

-- 5. Kiểm tra products
SELECT 
  p.id,
  p.name as product_name,
  s.name as shop_name,
  b.name as brand_name,
  COUNT(DISTINCT pv.id) as variant_count,
  COUNT(DISTINCT pm.id) as media_count
FROM products p
LEFT JOIN shops s ON p.shop_id = s.id
LEFT JOIN brands b ON p.brand_id = b.id
LEFT JOIN product_variants pv ON p.id = pv.product_id
LEFT JOIN product_media pm ON p.id = pm.product_id
GROUP BY p.id, p.name, s.name, b.name
ORDER BY p.id;

-- 6. Kiểm tra addresses (user addresses)
SELECT 
  a.id,
  u.full_name as user_name,
  a.label,
  a.recipient,
  a.phone,
  CONCAT(a.street, ', ', a.ward, ', ', a.district, ', ', a.province) as full_address,
  a.is_default
FROM addresses a
LEFT JOIN users u ON a.user_id = u.id
ORDER BY a.user_id, a.is_default DESC;

-- 7. Kiểm tra shop addresses
SELECT 
  sa.id,
  s.name as shop_name,
  sa.name as address_name,
  sa.phone,
  CONCAT(sa.street, ', ', sa.ward, ', ', sa.district, ', ', sa.province) as full_address,
  sa.is_default
FROM shop_addresses sa
LEFT JOIN shops s ON sa.shop_id = s.id
ORDER BY sa.shop_id, sa.is_default DESC;

-- 8. Kiểm tra carts và cart items
SELECT 
  c.id as cart_id,
  u.full_name as user_name,
  COUNT(ci.id) as item_count,
  SUM(ci.quantity * ci.price_snapshot) as total_value
FROM carts c
LEFT JOIN users u ON c.user_id = u.id
LEFT JOIN cart_items ci ON c.id = ci.cart_id
GROUP BY c.id, u.full_name
ORDER BY c.id;

-- 9. Kiểm tra orders với chi tiết
SELECT 
  o.id,
  u.full_name as customer_name,
  s.name as shop_name,
  o.status,
  o.payment_status,
  o.total_amount,
  COUNT(oi.id) as item_count,
  p.provider as payment_provider,
  p.status as payment_status_detail,
  sh.status as shipment_status
FROM orders o
LEFT JOIN users u ON o.user_id = u.id
LEFT JOIN shops s ON o.shop_id = s.id
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN payments p ON o.id = p.order_id
LEFT JOIN shipments sh ON o.id = sh.order_id
GROUP BY o.id, u.full_name, s.name, o.status, o.payment_status, o.total_amount, 
         p.provider, p.status, sh.status
ORDER BY o.id;

-- 10. Expected counts (sau khi seed đầy đủ)
/*
Expected results:
- brands: 11 records
- categories: 29 records (8 parent + 21 children)
- roles: 3 records (Admin, Shop Owner, Customer)
- permissions: ~20+ records
- users: 4+ records (1 admin + 3 test users)
- shops: 1+ records
- shop_staffs: 4 records
- products: 10 records
- product_variants: 20 records (2 per product)
- addresses: 15 records
- shop_addresses: 3 records
- carts: 3 records
- cart_items: 15 records
- orders: 10 records
- order_items: 30+ records
- payments: 10 records
- shipments: 10 records
*/
