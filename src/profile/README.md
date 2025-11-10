# Profile Module

## Overview

This module is responsible for managing user profiles and the profiles of shops associated with users. It allows users to view and update their personal information and provides the workflow for a user to create and manage a shop.

## Features

-   **User Profile Management**: Allows authenticated users to view and update their personal information, such as full name, phone number, and avatar.
-   **Permission Viewing**: Allows an authenticated user to see a list of their assigned permissions.
-   **Shop Creation**: A user with the appropriate permission (`create_shop`) can create a new shop. This process also upgrades the user's role to "seller" and grants them a new set of permissions.
-   **Shop Profile Management**: A shop owner or authorized staff can update the shop's public profile, including its logo, banner, phone number, and description.

## Workflow

1.  **User Profile**: An authenticated user can fetch their profile data via `GET /profile`. They can update their name, phone, or avatar using the respective `POST /profile/update-*` endpoints. The user's ID is always derived from their JWT token.
2.  **Shop Creation**:
    -   A standard user account has the `create_shop` permission by default.
    -   The user sends a `POST` request to `/profile/create-shop` with the shop's details and images.
    -   The service creates the new shop and assigns the user as its owner.
    -   The user's role is upgraded from "user" to "seller".
    -   The user's permissions are updated: they are granted a full set of seller permissions (e.g., `create_product`, `manage_orders`), and the initial `create_shop` permission is revoked to prevent them from creating more than one shop.
3.  **Shop Management**: Once a user is a seller, they can use the `POST /profile/update-*-shop` endpoints to manage their shop's profile. Access to these endpoints requires the `edit_profile_shop` permission.

---

## 1. User Profile APIs

### Get Current User's Profile

-   **Endpoint:** `GET /profile`
-   **Description:** Retrieves the profile of the currently authenticated user.
-   **Auth:** Required (JWT).

### Get Current User's Permissions

-   **Endpoint:** `GET /profile/permission`
-   **Description:** Retrieves a list of permission names for the authenticated user.
-   **Auth:** Required (JWT).
-   **Response:** `["create_post", "edit_profile", "create_shop"]`

### Get Public Profile by ID

-   **Endpoint:** `GET /profile/:id`
-   **Description:** Retrieves public profile information for any user by their ID.
-   **Auth:** Not Required.

### Update Full Name

-   **Endpoint:** `POST /profile/update-fullname`
-   **Description:** Updates the full name of the authenticated user.
-   **Auth:** Required (JWT).
-   **Request Body:** `{ "fullName": "New Full Name" }`

### Update Phone Number

-   **Endpoint:** `POST /profile/update-phone`
-   **Description:** Updates the phone number of the authenticated user.
-   **Auth:** Required (JWT).
-   **Request Body:** `{ "phone": "0987654321" }`

### Update Avatar

-   **Endpoint:** `POST /profile/update-avatar`
-   **Description:** Updates the avatar of the authenticated user.
-   **Auth:** Required (JWT).
-   **Request:** `multipart/form-data` with a single `file` field.

---

## 2. Shop Profile APIs

### Create a New Shop

-   **Endpoint:** `POST /profile/create-shop`
-   **Description:** Creates a new shop and upgrades the user to a "seller" role. Requires `create_shop` permission.
-   **Auth:** Required (JWT).
-   **Request:** `multipart/form-data` with the following fields:
    -   `shop_name` (string)
    -   `slug` (string)
    -   `description` (string)
    -   `phone` (string)
    -   `email` (string)
    -   `logo` (file, optional)
    -   `banner` (file, optional)
-   **Response:** `{ "message": "Tạo cửa hàng thành công" }`

### Get User's Shop

-   **Endpoint:** `POST /profile/get-shop`
-   **Description:** Retrieves the shop profile associated with a user ID (as either owner or staff).
-   **Auth:** Not Required.
-   **Request Body:** `{ "userid": "1" }`

### Update Shop Profile

-   **Endpoints:**
    -   `POST /profile/update-logo-shop`
    -   `POST /profile/update-banner-shop`
    -   `POST /profile/update-phone-shop`
    -   `POST /profile/update-email-shop`
    -   `POST /profile/update-description-shop`
-   **Description:** Updates various parts of a shop's profile. Requires `edit_profile_shop` permission.
-   **Auth:** Required (JWT).
-   **Request:**
    -   For logo/banner: `multipart/form-data` with `shopid` and `file` fields.
    -   For others: `application/json` with `shopid` and the relevant data field (e.g., `phone`, `email`).
