# Auth Module

## Overview

This module handles user authentication and authorization. It supports local (email/password) registration and login, social logins (Google, Facebook), password management, and permission-based access control using JWT.

## Features

-   **Local Authentication**: Register and log in using email and password.
-   **Social Login**: Authenticate using Google and Facebook OAuth2.
-   **Password Management**:
    -   Forgot Password: Send a new temporary password via email.
    -   Change Password: Allows an authenticated user to change their password.
    -   First-Time Password Change: Forces users to change their temporary password after initial registration.
-   **JWT Generation**: Creates a JSON Web Token (JWT) upon successful login, containing user ID, email, role, and permissions.
-   **Authorization**:
    -   `AuthGuard('jwt')`: Protects routes, ensuring a valid JWT is present.
    -   `PermissionsGuard`: Checks if the authenticated user has the required permissions to access a specific endpoint.

## Workflow

1.  **Registration (`POST /auth/register`)**:
    -   A user registers with an email.
    -   The system generates a random temporary password and sends it to the user's email.
    -   A new user record is created in the database with the `firstlogin` flag set to `true`.
    -   The user is assigned the default "user" role and associated permissions.

2.  **Login (`POST /auth/login`)**:
    -   The user logs in with their email and password.
    -   The service validates the credentials.
    -   If successful, it generates a JWT containing a payload like `{ sub: user.id, email: user.email }`.
    -   The response includes the `access_token`, user details, and a `requiresPasswordChange` flag if `firstlogin` is `true`.

3.  **Social Login (`GET /auth/google`, `GET /auth/facebook`)**:
    -   The user is redirected to the respective social provider's OAuth screen.
    -   After authorization, the provider calls back to `/auth/[provider]/callback`.
    -   The strategy (`GoogleStrategy` or `FacebookStrategy`) finds or creates a user based on the social profile's email.
    -   A JWT is generated, and the user is redirected to the frontend URL (`http://localhost:5173/auth/callback?access_token=...`).

4.  **Authenticated Requests**:
    -   For protected routes, the client must include the JWT in the `Authorization` header: `Authorization: Bearer <your_token>`.
    -   The `JwtStrategy` automatically validates the token, fetches the user from the database along with their role and permissions.
    -   It attaches a `user` object to the request, e.g., `{ userId, email, role, permissions: ['create_post', 'edit_profile'] }`.

5.  **Authorization (`@UseGuards(PermissionsGuard)`)**:
    -   Endpoints decorated with `@RequirePermissions('permission_name')` use the `PermissionsGuard`.
    -   The guard checks if the `permissions` array on `req.user` contains all the required permissions.
    -   If permissions are not met, it throws a `403 Forbidden` error.

## API Endpoints

---

### Register a New User

-   **Endpoint:** `POST /auth/register`
-   **Description:** Creates a new user account and sends a temporary password to their email.
-   **Request Body:**
    ```json
    {
      "email": "newuser@example.com",
      "full_name": "New User",
      "phone": "0123456789"
    }
    ```
-   **Response:**
    -   **Success (201):**
        ```json
        {
          "success": true,
          "message": "Đăng ký thành công,mật khẩu được gửi về email của bạn"
        }
        ```
    -   **Error (400):** If email already exists.
        ```json
        {
          "success": false,
          "message": "Email đã được sử dụng"
        }
        ```

---

### Log In

-   **Endpoint:** `POST /auth/login`
-   **Description:** Authenticates a user and returns a JWT.
-   **Request Body:**
    ```json
    {
      "email": "user@example.com",
      "password": "your_password"
    }
    ```
-   **Response:**
    -   **Success (200):**
        ```json
        {
          "success": true,
          "message": "Đăng nhập thành công",
          "user": {
            "id": 1,
            "email": "user@example.com",
            "full_name": "Test User",
            "role": { "name": "user" }
          },
          "requiresPasswordChange": false,
          "access_token": "ey..."
        }
        ```

---

### Forgot Password

-   **Endpoint:** `POST /auth/forgot-password`
-   **Description:** Sends a new temporary password to the user's email.
-   **Request Body:**
    ```json
    {
      "email": "user@example.com"
    }
    ```
-   **Response:**
    -   **Success (200):**
        ```json
        {
          "success": true,
          "message": "Mật khẩu mới đã được gửi đến email của bạn"
        }
        ```

---

### Change Password

-   **Endpoint:** `POST /auth/change-password`
-   **Description:** Allows a logged-in user to change their password.
-   **Auth:** Required (JWT).
-   **Request Body:**
    ```json
    {
      "userid": 1,
      "currentPassword": "old_password",
      "newPassword": "new_strong_password"
    }
    ```
-   **Response:**
    -   **Success (200):**
        ```json
        {
          "success": true,
          "message": "Đổi mật khẩu thành công"
        }
        ```

---

### Change Password (First Time)

-   **Endpoint:** `POST /auth/change-password-first-time`
-   **Description:** Allows a user to set a new password after their initial registration.
-   **Request Body:**
    ```json
    {
      "userId": 1,
      "newPassword": "new_strong_password"
    }
    ```
-   **Response:**
    -   **Success (200):**
        ```json
        {
          "success": true,
          "message": "Đổi mật khẩu thành công"
        }
        ```

---

### Google & Facebook Login

-   **Endpoint (Initiate):** `GET /auth/google` or `GET /auth/facebook`
-   **Description:** Redirects the user to the social provider's login page.
-   **Endpoint (Callback):** `GET /auth/google/callback` or `GET /auth/facebook/callback`
-   **Description:** Handles the response from the social provider, creates/logs in the user, and redirects to the frontend with an `access_token` in the URL query parameters.
