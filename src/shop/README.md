# Shop Module

## Overview

This module is dedicated to shop administration, focusing specifically on managing staff members and their permissions. It allows shop owners or managers to add and remove staff, and to control their access to various shop-related functions by assigning granular permissions.

## Features

-   **Staff Management**: Add or remove users as staff members for a shop.
-   **Permission Control**: Grant or revoke specific permissions for each staff member.
-   **Role Management**: Automatically assigns the "staff" role to users when they are added to a shop and reverts them to the "user" role if they are removed from their last staff position.
-   **Access Control**: All actions are protected, requiring the user performing the action to be the shop owner or a manager with the `manage_shop_staff` permission.

## Workflow

1.  **Adding Staff**:
    -   A shop owner (or a manager) sends a `POST` request to `/shop/staff` with the email of the user they want to add.
    -   The service verifies that the requesting user has the authority to manage staff.
    -   It finds the user by email and creates a `shop_staffs` record, linking the user to the shop.
    -   The new staff member's user role is set to "staff", and they are granted a default set of staff-level permissions.

2.  **Managing Permissions**:
    -   The shop owner/manager can then grant additional permissions to the staff member (e.g., `update_order_status`, `moderate_reviews`) by sending a `POST` request to `/shop/staff/permissions`.
    -   Permissions can also be revoked via `DELETE /shop/staff/permissions`.

3.  **Removing Staff**:
    -   The owner/manager sends a `DELETE` request to `/shop/staff` with the staff member's email.
    -   The service removes the `shop_staffs` record.
    -   It then checks if the user is a staff member of any other shop. If not, it revokes all their staff-related permissions and changes their role back to "user".

## API Endpoints

---

### Add Staff to Shop

-   **Endpoint:** `POST /shop/staff`
-   **Description:** Adds a user as a staff member to a shop.
-   **Auth:** Required (JWT). The user must be the shop owner or a manager with `manage_shop_staff` permission.
-   **Request Body:**
    ```json
    {
      "userid": 1, // ID of the user performing the action (owner/manager)
      "staffemail": "new.staff@example.com",
      "shopid": 1,
      "is_manager": false // Optional, defaults to false
    }
    ```
-   **Response:** `{ "success": true, "message": "Thêm nhân viên thành công" }`

---

### Remove Staff from Shop

-   **Endpoint:** `DELETE /shop/staff`
-   **Description:** Removes a staff member from a shop.
-   **Auth:** Required (JWT). The user must be the shop owner or a manager.
-   **Request Body:**
    ```json
    {
      "userid": 1, // ID of the user performing the action
      "staffemail": "staff.to.remove@example.com",
      "shopid": 1
    }
    ```
-   **Response:** `{ "success": true, "message": "Xóa nhân viên thành công" }`

---

### Get All Staff for a Shop

-   **Endpoint:** `GET /shop/:shopid/staffs`
-   **Description:** Retrieves a list of all staff members for a given shop.
-   **Auth:** Not required, but typically accessed by authenticated users.
-   **Params:**
    -   `shopid` (number): The ID of the shop.
-   **Response:** An array of staff members with their user details.

---

### Update Staff Permissions

-   **Endpoint:** `POST /shop/staff/permissions`
-   **Description:** Grants one or more permissions to a staff member.
-   **Auth:** Required (JWT). The user must be the shop owner or a manager.
-   **Request Body:**
    ```json
    {
      "userid": 1,
      "staffemail": "staff.member@example.com",
      "shopid": 1,
      "permissions": ["update_order_status", "moderate_reviews"]
    }
    ```
-   **Response:** `{ "success": true, "message": "Cập nhật quyền nhân viên thành công" }`

---

### Get Staff Permissions

-   **Endpoint:** `GET /shop/:shopid/staff/:staffemail/permissions`
-   **Description:** Retrieves a list of permission names for a specific staff member of a shop.
-   **Auth:** Not required.
-   **Params:**
    -   `shopid` (number): The ID of the shop.
    -   `staffemail` (string): The email of the staff member.
-   **Response:** `["view_shop_orders", "update_order_status"]`

---

### Delete Staff Permissions

-   **Endpoint:** `DELETE /shop/staff/permissions`
-   **Description:** Revokes one or more permissions from a staff member.
-   **Auth:** Required (JWT). The user must be the shop owner or a manager.
-   **Request Body:**
    ```json
    {
      "userid": 1,
      "staffemail": "staff.member@example.com",
      "shopid": 1,
      "permissions": ["moderate_reviews"]
    }
    ```
-   **Response:** `{ "success": true, "message": "Đã xóa 1 quyền của nhân viên", "deleted_count": 1 }`
