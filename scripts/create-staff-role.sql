-- Tạo role STAFF và gán permissions
INSERT INTO "role" ("name") 
VALUES ('staff') 
ON CONFLICT ("name") DO NOTHING;

-- Gán permissions cho STAFF role
WITH staff_role AS (
  SELECT id FROM "role" WHERE name = 'staff'
),
permissions AS (
  SELECT id FROM "permission" WHERE name IN (
    'manage_order',
    'chat_with_customer',
    'view_dashboard'
  )
)
INSERT INTO "rolepermission" (role_id, permission_id)
SELECT staff_role.id, permissions.id
FROM staff_role, permissions
ON CONFLICT DO NOTHING;
