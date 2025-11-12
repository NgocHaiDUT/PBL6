# Frontend Integration Documentation

This document provides a summary of all backend modules and their API endpoints for easy frontend integration.

---

# Address Module

## Overview

This module manages user shipping addresses. It allows authenticated users to create, view, update, and delete their personal addresses.

## Features

- Add a new shipping address for a user.
- Update an existing address.
- Retrieve all addresses for the currently logged-in user.
- Delete a specific address.
- Store GHN-specific location IDs (`ghn_province_id`, `ghn_district_id`, `ghn_ward_code`) for integration with the shipping provider.

## Workflow

1.  A user must be authenticated (provide a valid JWT) to access any of the endpoints.
2.  The user's ID is automatically extracted from the JWT token for all operations.
3.  When adding or updating an address, the user can provide GHN location IDs, which are used by the Order module to calculate shipping fees and create shipping orders.
4.  Users can have multiple addresses, but can designate one as the default shipping address.

## API Endpoints

All endpoints require authentication.

---

### Add a New Address

-   **Endpoint:** `POST /address/add-address`
-   **Description:** Creates a new shipping address for the logged-in user.
-   **Auth:** Required (JWT).
-   **Request Body:**
    ```json
    {
      "label": "Home",
      "receiver_name": "John Doe",
      "phone": "0987654321",
      "province": "Hà Nội",
      "district": "Quận Ba Đình",
      "ward": "Phường Phúc Xá",
      "street": "123 Trần Phú",
      "is_default": true,
      "ghn_province_id": 201,
      "ghn_district_id": 1442,
      "ghn_ward_code": "20101"
    }
    ```
-   **Response:**
    -   **Success (200):**
        ```json
        {
          "message": "Thêm địa chỉ nhận hàng thành công"
        }
        ```

---

### Update an Existing Address

-   **Endpoint:** `POST /address/update-address`
-   **Description:** Updates the details of an existing address. All fields are optional.
-   **Auth:** Required (JWT).
-   **Request Body:**
    ```json
    {
      "addressid": 1,
      "label": "Work Office",
      "phone": "0123456789"
    }
    ```
-   **Response:**
    -   **Success (200):**
        ```json
        {
          "message": "Cập nhật địa chỉ nhận hàng thành công"
        }
        ```

---

### Get All Addresses

-   **Endpoint:** `GET /address/all-address`
-   **Description:** Retrieves a list of all addresses associated with the logged-in user.
-   **Auth:** Required (JWT).
-   **Request:** (No body, params, or query needed)
-   **Response:**
    -   **Success (200):**
        ```json
        [
          {
            "id": 1,
            "user_id": 1,
            "label": "Home",
            "recipient": "John Doe",
            "phone": "0987654321",
            "province": "Hà Nội",
            "district": "Quận Ba Đình",
            "ward": "Phường Phúc Xá",
            "street": "123 Trần Phú",
            "is_default": true,
            "created_at": "2025-11-10T12:00:00.000Z",
            "ghn_province_id": 201,
            "ghn_district_id": 1442,
            "ghn_ward_code": "20101"
          }
        ]
        ```

---

### Delete an Address

-   **Endpoint:** `POST /address/delete-address`
-   **Description:** Deletes a specific address by its ID.
-   **Auth:** Required (JWT).
-   **Request Body:**
    ```json
    {
      "addressid": 1
    }
    ```
-   **Response:**
    -   **Success (200):**
        ```json
        {
          "message": "Xoá địa chỉ thành công"
        }
        ```

---

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

---

# Chat Module

## Overview

This module provides real-time chat functionality using WebSockets (`socket.io`). It allows users to engage in private, one-on-one conversations. The module handles message delivery, persistence, and media uploads.

## Features

-   **Real-Time Messaging**: Instant message delivery between users using WebSockets.
-   **Private Conversations**: Manages one-on-one chats between two users.
-   **Message History**: Loads previous messages when a chat is opened.
-   **Message Persistence**: Saves all messages to the database via the `MessagesService`.
-   **Media Uploads**: Provides a REST endpoint to upload images and videos, which can then be shared in chats.
-   **Read Status**: Allows clients to mark conversations as read.
-   **Online Status**: Basic functionality to check if a user is connected to the chat server.

## Workflow

1.  **Connection**: A client establishes a WebSocket connection to the server.
2.  **Joining a Room**: Upon connection, the client must emit a `join` event with their unique `userId`. This subscribes them to a private room, allowing them to receive targeted messages.
3.  **Opening a Chat**: To view a conversation, the client emits an `openChat` event with their ID (`openerId`) and the other user's ID (`targetId`). The server responds with the conversation history via the `conversation` event.
4.  **Sending a Message**: 
    -   If the message contains media (image/video), the client first uploads the file to the `POST /chat/upload` REST endpoint to get a URL.
    -   The client then emits a `sendMessage` event to the server with the sender's ID, receiver's ID, and the message content (which can be text or the URL of the uploaded media).
5.  **Message Delivery**: 
    -   The server receives the `sendMessage` event, saves the message to the database, and then broadcasts a `newMessage` event to the private rooms of both the sender and the receiver.
    -   All connected clients for both users will receive the new message in real-time.

## WebSocket Events

The primary interaction with this module is through WebSocket events.

---

### `join` (Client to Server)

-   **Event:** `join`
-   **Description:** Subscribes the client to a private room based on their user ID. This is mandatory for receiving messages.
-   **Payload:** `userId: number` (The ID of the currently logged-in user).
-   **Response Event:** `joined`
    -   **Payload:** `{ userId: number, message: string }`

---

### `openChat` (Client to Server)

-   **Event:** `openChat`
-   **Description:** Requests the message history for a conversation between two users.
-   **Payload:** `{ openerId: number, targetId: number }`
-   **Response Event:** `conversation`
    -   **Payload:**
        ```json
        {
          "with": {
            "id": 2,
            "fullName": "Jane Doe",
            "avatarUrl": "/uploads/avatars/jane.jpg"
          },
          "messages": [
            {
              "id": 1,
              "conversationId": 1,
              "senderId": 2,
              "content": "Hello!",
              "createdAt": "2025-11-10T10:00:00.000Z",
              "sender": { "id": 2, "fullName": "Jane Doe", "avatarUrl": "..." }
            }
          ],
          "pagination": { "page": 1, "limit": 50, "total": 1, "pages": 1 }
        }
        ```

---

### `sendMessage` (Client to Server)

-   **Event:** `sendMessage`
-   **Description:** Sends a new message to another user.
-   **Payload (`SendMessageDto`):**
    ```json
    {
      "senderId": 1,
      "receiverId": 2,
      "content": "This is a test message.",
      "type": "TEXT", // "TEXT", "IMAGE", "VIDEO", etc.
      "payload": {} // Optional metadata
    }
    ```
-   **Response Event:** `messageSent` (confirms to the sender that the message was processed).
-   **Broadcast Event:** `newMessage` (sent to both sender and receiver).
    -   **Payload:** The full message object, including sender details.

---

### `markConversationRead` (Client to Server)

-   **Event:** `markConversationRead`
-   **Description:** Marks all messages in a conversation as read by the user.
-   **Payload:** `{ userId: number, conversationId: number }`
-   **Response Event:** `conversationReadConfirmed` (to the sender).
-   **Broadcast Event:** `conversationMarkedRead` (to the other participant).

---

### `deleteMessage` (Client to Server)

-   **Event:** `deleteMessage`
-   **Description:** Requests the deletion of a message. The user must be the sender of the message.
-   **Payload:** `{ messageId: number, userId: number }`
-   **Broadcast Event:** `messageDeleted` (sent to all participants in the conversation).
    -   **Payload:** `{ messageId: number, conversationId: number }`

## REST API Endpoints

---

### Upload Chat Media

-   **Endpoint:** `POST /chat/upload`
-   **Description:** Uploads a single image or video file for use in chat messages.
-   **Auth:** Required (JWT).
-   **Request:** `multipart/form-data` with a single field `file`.
-   **Response:**
    -   **Success (201):**
        ```json
        {
          "success": true,
          "message": "File uploaded successfully",
          "data": {
            "url": "https://your-s3-bucket.s3.amazonaws.com/chat_media/1678886400000-123456789.jpg",
            "mimetype": "image/jpeg",
            "size": 123456
          }
        }
        ```

---

# Comments Module

## Overview

This module manages all functionality related to comments and replies on various targets, such as posts and products. It's designed to be highly flexible, supporting both fully nested comment trees and paginated top-level comments.

## Features

-   **Nested Replies**: Supports deeply nested parent-child comment relationships.
-   **Flexible Fetching**: A powerful query endpoint that can return either a fully nested comment tree or a paginated list of top-level comments.
-   **Like Integration**: Automatically fetches the like count for each comment and indicates if the current user has liked it.
-   **Notification Integration**: Notifies the content owner or parent comment owner when a new comment or reply is made.
-   **Permission Control**: Users can only update or delete their own comments.

## Fetching Strategies for Frontend

The main `GET /comments` endpoint offers two primary strategies for fetching data, controlled by the `include_replies` query parameter.

1.  **Nested Tree (`include_replies=true`)**
    -   **Use Case:** Ideal for loading an entire comment section at once.
    -   **Behavior:** The API returns a paginated list of **top-level comments only**. Each of these comment objects contains a `replies` array, which in turn contains reply objects, which can also have their own `replies` array, and so on. This provides a complete, ready-to-render data structure.

2.  **Paginated Top-Level (`include_replies=false` or omitted)**
    -   **Use Case:** Best for performance when a post has many comments, allowing for "load more" functionality on the main comment feed.
    -   **Behavior:** The API returns a paginated list of **top-level comments only**. Each comment object will **not** contain a `replies` array, but it will have a `replies_count` property. The frontend can use this count to display a "View X replies" button, which can then fetch the replies using the `GET /comments/:id/replies` endpoint.

## API Endpoints

---

### 1. Get Comments for a Target

-   **Endpoint:** `GET /comments`
-   **Description:** The primary, flexible endpoint to retrieve comments for a target (like a post or product).
-   **Auth:** Optional. Providing a `user_id` (or being authenticated) is required to get the correct `is_liked` status on comments.
-   **Query Parameters:**
    -   `target_type` (string, required): The type of content, e.g., `'post'`.
    -   `target_id` (number, required): The ID of the content item.
    -   `include_replies` (boolean, optional): If `true`, returns a nested tree. Defaults to `false`.
    -   `user_id` (number, optional): The ID of the current user to determine `is_liked` status.
    -   `page` (number, optional): Page number for top-level comments.
    -   `limit` (number, optional): Items per page.
-   **Success Response (200) - Nested (`include_replies=true`):**
    ```json
    {
      "data": [
        {
          "id": 1,
          "content": "This is a top-level comment.",
          "user": { "id": 2, "full_name": "Jane Doe" },
          "likes_count": 5,
          "is_liked": false,
          "replies": [
            {
              "id": 3,
              "content": "This is a reply to the first comment.",
              "user": { "id": 3, "full_name": "Sam Smith" },
              "likes_count": 1,
              "is_liked": true,
              "replies": []
            }
          ]
        }
      ],
      "total": 1, "page": 1, "limit": 20, "total_pages": 1
    }
    ```
-   **Success Response (200) - Paginated (`include_replies=false`):**
    ```json
    {
      "data": [
        {
          "id": 1,
          "content": "This is a top-level comment.",
          "user": { "id": 2, "full_name": "Jane Doe" },
          "likes_count": 5,
          "is_liked": false,
          "replies_count": 1
        }
      ],
      "total": 1, "page": 1, "limit": 20, "total_pages": 1
    }
    ```

---

### 2. Create a Comment or Reply

-   **Endpoint:** `POST /comments`
-   **Description:** Creates a new top-level comment or a reply to an existing comment.
-   **Auth:** Required (JWT).
-   **Request Body:**
    -   To create a top-level comment, `parent_id` should be `null` or omitted.
    -   To reply to an existing comment, provide its ID in `parent_id`.
    ```json
    {
      "target_type": "post",
      "target_id": 15,
      "content": "This is a great post!",
      "parent_id": null
    }
    ```
-   **Response (201):** The newly created comment object.
    ```json
    {
      "id": 4,
      "user_id": 1,
      "target_type": "post",
      "target_id": 15,
      "content": "This is a great post!",
      "parent_id": null,
      "created_at": "2025-11-10T15:00:00.000Z",
      "user": { "id": 1, "full_name": "You", "avatar_url": "..." }
    }
    ```

---

### 3. Get Replies for a Comment

-   **Endpoint:** `GET /comments/:id/replies`
-   **Description:** A dedicated endpoint to get all direct (first-level) replies for a specific parent comment.
-   **Auth:** Not Required.
-   **Params:**
    -   `id` (number): The ID of the parent comment.
-   **Response (200):** An array of comment objects.

---

### 4. Update a Comment

-   **Endpoint:** `PATCH /comments/:id`
-   **Description:** Updates the content of a comment. Only the author of the comment can perform this action.
-   **Auth:** Required (JWT).
-   **Params:**
    -   `id` (number): The ID of the comment to update.
-   **Request Body:**
    ```json
    {
      "content": "I have updated my thoughts on this."
    }
    ```
-   **Response (200):** The updated comment object.

---

### 5. Delete a Comment

-   **Endpoint:** `DELETE /comments/:id`
-   **Description:** Deletes a comment and all of its nested replies. Only the author can perform this action.
-   **Auth:** Required (JWT).
-   **Params:**
    -   `id` (number): The ID of the comment to delete.
-   **Response (204):** No Content.

---

# Data Initialization Module

## Overview

This module is a development utility designed to seed the database with initial master data. It is not intended for use in a production environment or by end-users. Its primary purpose is to set up a fresh database with necessary data for the application to run correctly.

## Features

-   **Database Seeding**: Populates the database with initial data for:
    -   Brands (`brands.json`)
    -   Product Categories (`categorys.json`)
    -   User Roles (`roles.json`)
    -   Permissions (`permissions.json`)
    -   Role-Permission Mappings (`role_permissions.json`)
    -   A sample Shop and Owner
    -   Sample Products (`products.json`)
-   **Idempotent**: The seeding process checks if data already exists in the tables before inserting, preventing duplicate entries on subsequent runs.
-   **S3 Asset Upload**: Includes a utility service and an endpoint to upload brand logos from a local directory (`uploads/brands`) to the configured AWS S3 bucket.

## Workflow & Usage

### Database Seeding

The main functionality of this module is executed via a command line script, not through a standard API endpoint.

1.  **Prepare Data**: The data to be seeded is stored in JSON files located in the `src/data-init/` directory.
2.  **Run the Seed Script**: To populate the database, run the following npm script from the project's root directory:
    ```bash
    npm run seed
    ```
3.  **Process**: 
    -   This command executes the `seed.ts` file.
    -   The script bootstraps a standalone NestJS application context to gain access to the application's services.
    -   It retrieves an instance of `DataInitService` and calls the `seedData()` method.
    -   The service then reads the JSON files and systematically creates records in the database, logging its progress to the console.

### S3 Brand Logo Upload

This module also provides a manual way to upload brand logos to your S3 bucket, which is useful for initial environment setup.

-   **Endpoint:** `POST /data-init/upload-brand-logos`
-   **Description:** Reads all PNG files from the local `uploads/brands` directory and uploads them to the `brands/` folder in the configured S3 bucket.
-   **Auth:** None. This is a development utility.
-   **Request:** (No body needed)
-   **Response:**
    -   **Success (201):**
        ```json
        {
          "success": true,
          "message": "Brand logos uploaded to S3 successfully"
        }
        ```
    -   **Error:**
        ```json
        {
          "success": false,
          "message": "Failed to upload brand logos",
          "error": "Error message details..."
        }
        ```

---

# Follows Module

## Overview

This module manages the social graph of the application by handling "follow" relationships between users. It allows users to follow and unfollow each other, view follower/following lists, and get follow-related statistics.

## Features

-   **Follow/Unfollow**: Allows a user to follow or unfollow another user.
-   **Toggle Functionality**: A convenient endpoint to toggle the follow state, creating or deleting the relationship as needed.
-   **List Followers/Following**: Retrieve paginated lists of users who are followers or are being followed.
-   **Follower Statistics**: Get the total count of followers and following for any user.
-   **Notification Integration**: Sends a notification to a user when someone new follows them.
-   **Self-Follow Prevention**: Users cannot follow themselves.

## Workflow

1.  **Authentication**: A user must be authenticated to follow others. The follower's ID is typically extracted from the JWT token. For demonstration, some endpoints may accept a `user_id` in the request body.
2.  **Toggling a Follow**: The primary user action is to "toggle" a follow. A client sends a request to `POST /follows/toggle/:followingId`.
    -   The service checks if a `follows` record exists between the follower (current user) and the `followingId` (target user).
    -   If a record **does not exist**, it creates one (the user follows the target). A notification is sent to the target user.
    -   If a record **exists**, it deletes it (the user unfollows the target).
3.  **Viewing Connections**: The system can query the `follows` table to generate lists of "followers" (users who follow a specific user) or "following" (users a specific user follows).

## API Endpoints

---

### Toggle Follow/Unfollow

-   **Endpoint:** `POST /follows/toggle/:followingId`
-   **Description:** The primary endpoint for following or unfollowing a user. It checks the current state and reverses it.
-   **Auth:** Required (JWT). The follower's ID is taken from the token. A `user_id` can be passed in the body for testing.
-   **Params:**
    -   `followingId` (number): The ID of the user to follow/unfollow.
-   **Request Body (Optional):**
    ```json
    {
      "user_id": 1
    }
    ```
-   **Response:**
    -   **Success (200):**
        ```json
        {
          "following": true, // or false if the user just unfollowed
          "followers_count": 151
        }
        ```

---

### Get Follower/Following Lists

-   **Endpoint:** `GET /follows`
-   **Description:** Retrieves a paginated list of either a user's followers or the users they are following.
-   **Auth:** Not required.
-   **Query Parameters:**
    -   `user_id` (number, required): The ID of the user to query.
    -   `type` (string, required): Must be either `"followers"` or `"following"`.
    -   `page` (number, optional): The page number for pagination (default: 1).
    -   `limit` (number, optional): The number of items per page (default: 20).
-   **Response:**
    -   **Success (200):** A paginated response containing user details.
        ```json
        {
          "data": [
            {
              "follower_id": 2,
              "following_id": 1,
              "created_at": "2025-11-10T12:00:00.000Z",
              "follower": {
                "id": 2,
                "full_name": "Jane Doe",
                "email": "jane@example.com",
                "avatar_url": "/uploads/avatars/jane.jpg"
              }
            }
          ],
          "total": 1,
          "page": 1,
          "limit": 20,
          "total_pages": 1
        }
        ```

---

### Get Follow Statistics

-   **Endpoint:** `GET /follows/stats/:userId`
-   **Description:** Retrieves the number of followers and following for a specific user. It can also indicate if the current user is following them.
-   **Auth:** Optional.
-   **Params:**
    -   `userId` (number): The ID of the user whose stats are being requested.
-   **Query Parameters:**
    -   `currentUserId` (number, optional): The ID of the user viewing the stats. If provided, the response will include an `is_following` flag.
-   **Response:**
    -   **Success (200):**
        ```json
        {
          "user_id": 2,
          "followers_count": 150,
          "following_count": 75,
          "is_following": true // Only present if currentUserId is provided
        }
        ```

---

# GHN (Giao Hàng Nhanh) Integration Module

## Overview

This module serves as a secure proxy and wrapper around the official Giao Hàng Nhanh (GHN) API. It abstracts the direct API calls, allowing the frontend to interact with GHN services through our backend. This approach protects the API token and provides a consistent interface for all shipping-related functionalities.

## Environment Variables

This module requires the following environment variables to be set in the project's `.env` file:

```
GHN_API_TOKEN="your_ghn_api_token"
GHN_API_URL="https://dev-online-gateway.ghn.vn/shiip/public-api/v2"
```

## Important Note on `shopId`

Many order management endpoints require a `shopId` to be passed as a query parameter. This ID is the **GHN Shop ID** (`ghn_shop_id` from the `shops` table), which is obtained automatically when a shop's default address is created via the `ShopAddressModule`. **It is not the internal shop ID.**

---

## 1. Location Data Endpoints

These endpoints are used to fetch administrative location data required for addresses and shipping calculations.

### Get Provinces

-   **Endpoint:** `GET /ghn/provinces`
-   **Description:** Retrieves a list of all provinces and their IDs from GHN.
-   **Response (200):**
    ```json
    [
      {
        "ProvinceID": 201,
        "ProvinceName": "Hà Nội",
        "CountryID": 1,
        "Code": "HN",
        "NameExtension": ["Hà Nội"],
        "IsEnable": 1,
        "RegionID": 2,
        "UpdatedBy": 1,
        "CreatedAt": "2022-08-01T00:00:00Z",
        "UpdatedAt": "2022-08-01T00:00:00Z",
        "CanUseCod": true,
        "Status": 1
      }
    ]
    ```

### Get Districts

-   **Endpoint:** `GET /ghn/districts`
-   **Description:** Retrieves a list of districts for a given province.
-   **Query Parameters:**
    -   `province_id` (number, required): The `ProvinceID` from the Get Provinces endpoint.
-   **Response (200):**
    ```json
    [
      {
        "DistrictID": 1442,
        "ProvinceID": 201,
        "DistrictName": "Quận Ba Đình",
        "Code": "BD",
        "Type": 2,
        "SupportType": 3,
        "NameExtension": ["Ba Đình"],
        "IsEnable": 1,
        "Status": 1
      }
    ]
    ```

### Get Wards

-   **Endpoint:** `GET /ghn/wards`
-   **Description:** Retrieves a list of wards for a given district.
-   **Query Parameters:**
    -   `district_id` (number, required): The `DistrictID` from the Get Districts endpoint.
-   **Response (200):**
    ```json
    [
      {
        "WardCode": "20101",
        "WardName": "Phường Phúc Xá",
        "DistrictID": 1442,
        "NameExtension": ["Phúc Xá"],
        "IsEnable": 1,
        "CanUpdateCOD": true,
        "Status": 1
      }
    ]
    ```

---

## 2. Shipping Calculation Endpoints

### Get Available Services

-   **Endpoint:** `POST /ghn/services`
-   **Description:** Gets the available shipping service packages for a given route.
-   **Request Body:**
    ```json
    {
      "shop_id": 12345, // GHN Shop ID
      "from_district": 1442,
      "to_district": 1444
    }
    ```
-   **Response (200):**
    ```json
    [
        {
            "service_id": 53320,
            "short_name": "Nhanh",
            "service_type_id": 2
        }
    ]
    ```

### Calculate Shipping Fee

-   **Endpoint:** `POST /ghn/calculate-fee`
-   **Description:** Calculates the shipping fee for a potential order.
-   **Request Body (`CalculateFeeDto`):**
    ```json
    {
      "from_district_id": 1442,
      "from_ward_code": "20101",
      "to_district_id": 1444,
      "to_ward_code": "20301",
      "service_id": 53320,
      "height": 10,
      "length": 20,
      "width": 15,
      "weight": 500,
      "insurance_value": 250000,
      "cod_amount": 250000
    }
    ```
-   **Response (200):**
    ```json
    {
      "total": 25000,
      "service_fee": 25000,
      "insurance_fee": 0,
      "pick_station_fee": 0,
      "coupon_value": 0,
      "r2s_fee": 0
    }
    ```

---

## 3. Order Management Endpoints

### Create Shipping Order

-   **Endpoint:** `POST /ghn/create-order`
-   **Description:** Creates a new shipping order on the GHN platform.
-   **Query Parameters:**
    -   `shopId` (number, required): The shop's `ghn_shop_id`.
-   **Request Body (`CreateOrderDto`):**
    ```json
    {
      "payment_type_id": 2,
      "note": "Please call before delivery",
      "required_note": "KHONGCHOXEMHANG",
      "from_name": "My Shop",
      "from_phone": "0987654321",
      "from_address": "123 Le Loi",
      "from_ward_name": "Phường Bến Nghé",
      "from_district_name": "Quận 1",
      "from_province_name": "TP.HCM",
      "to_name": "John Doe",
      "to_phone": "0123456789",
      "to_address": "456 Nguyen Hue",
      "to_ward_name": "Phường Bến Thành",
      "to_district_name": "Quận 1",
      "to_province_name": "TP.HCM",
      "cod_amount": 275000,
      "content": "My Awesome Product",
      "weight": 500,
      "length": 20,
      "width": 15,
      "height": 10,
      "service_type_id": 2,
      "items": [
        {
          "name": "My Awesome Product",
          "quantity": 1,
          "price": 250000
        }
      ]
    }
    ```
-   **Response (200):**
    ```json
    {
      "order_code": "GXYZ123ABC",
      "total_fee": "25000",
      "expected_delivery_time": "2025-11-12T22:00:00Z"
    }
    ```

### Get Shipping Order Detail

-   **Endpoint:** `GET /ghn/order/:orderCode`
-   **Description:** Retrieves detailed information about a specific shipping order.
-   **Params:**
    -   `orderCode` (string): The GHN order code (e.g., `GXYZ123ABC`).
-   **Response (200):** A full order detail object from GHN.

### Cancel Shipping Order

-   **Endpoint:** `POST /ghn/cancel-order`
-   **Description:** Cancels one or more shipping orders.
-   **Query Parameters:**
    -   `shopId` (number, required): The shop's `ghn_shop_id`.
-   **Request Body:**
    ```json
    {
      "order_codes": ["GXYZ123ABC"]
    }
    ```
-   **Response (200):**
    ```json
    [
        {
            "order_code": "GXYZ123ABC",
            "result": true,
            "message": "Success"
        }
    ]
    ```

---

# Likes Module

## Overview

This module handles the "like" functionality for various content types within the application, such as posts, comments, and products. It provides a simple way to track user engagement.

## Features

-   **Toggle Like/Unlike**: A single endpoint to handle both liking and unliking an item.
-   **Like Statistics**: Provides the total number of likes for an item and indicates whether the current user has liked it.
-   **Notification Integration**: Automatically sends a notification to the content creator when their post or comment is liked.
-   **Optimized Counts**: Automatically updates a denormalized `like_count` on the `posts` table for efficient retrieval.

## Workflow

1.  **Authentication**: A user must be authenticated (provide a valid JWT) to like or unlike content. The user's ID is extracted from the token.
2.  **Liking an Item**: The frontend calls `POST /likes/toggle/:targetType/:targetId`.
3.  **Backend Process**: 
    -   The service checks if a "like" record from the user already exists for the target item.
    -   If it **exists**, the record is deleted (unlike).
    -   If it **does not exist**, a new record is created (like), and a notification is sent to the content owner.
4.  **Response**: The backend responds with the new like status (`liked`: true/false) and the updated total like count, allowing the frontend to update the UI accurately.

## API Endpoints

---

### Toggle Like/Unlike

-   **Endpoint:** `POST /likes/toggle/:targetType/:targetId`
-   **Description:** The primary endpoint for a user to like or unlike an item. This is the only endpoint needed for the like button functionality.
-   **Auth:** Required (JWT).
-   **Params:**
    -   `targetType` (string): The type of content being liked. Must be one of `post`, `comment`, or `product`.
    -   `targetId` (number): The ID of the content item.
-   **Request Body (Optional):**
    -   A `userId` can be passed for testing, but in production, it's taken from the JWT.
    ```json
    {
      "userId": 1
    }
    ```
-   **Response (200):**
    ```json
    {
      "liked": true,
      "total_likes": 26
    }
    ```

---

### Get Like Statistics

-   **Endpoint:** `GET /likes/stats/:targetType/:targetId`
-   **Description:** Retrieves the total like count for an item and checks if the current user has liked it. Useful for initial page load.
-   **Auth:** Optional. If a `userId` is provided via query or a JWT is present, `user_liked` will be accurate.
-   **Params:**
    -   `targetType` (string): The type of content (`post`, `comment`, `product`).
    -   `targetId` (number): The ID of the content item.
-   **Query Parameters:**
    -   `userId` (number, optional): The ID of the user to check the like status for. If omitted, the check is based on the authenticated user (if any).
-   **Response (200):**
    ```json
    {
      "target_type": "post",
      "target_id": 15,
      "total_likes": 26,
      "user_liked": true
    }
    ```

---

### Get Users Who Liked an Item

-   **Endpoint:** `GET /likes`
-   **Description:** Retrieves a paginated list of users who have liked a specific item.
-   **Auth:** Not Required.
-   **Query Parameters:**
    -   `target_type` (string, required): The type of content.
    -   `target_id` (number, required): The ID of the content item.
    -   `page` (number, optional): Page number for pagination (default: 1).
    -   `limit` (number, optional): Items per page (default: 20).
-   **Response (200):**
    ```json
    {
      "data": [
        {
          "id": 101,
          "user_id": 2,
          "target_type": "post",
          "target_id": 15,
          "created_at": "2025-11-10T12:30:00.000Z",
          "user": {
            "id": 2,
            "full_name": "Jane Doe",
            "email": "jane@example.com",
            "avatar_url": "/uploads/avatars/jane.jpg"
          }
        }
      ],
      "total": 1,
      "page": 1,
      "limit": 20,
      "total_pages": 1
    }
    ```

---

# Makeup Module

## Overview

This module acts as a proxy service to an external Python-based AI service. Its purpose is to receive an uploaded image, forward it to the AI service for virtual makeup application, and return the processed image directly to the client.

## Features

-   **Image Upload**: Accepts a single image file from the client.
-   **AI Service Proxy**: Forwards the uploaded image to a configured Python backend (e.g., a FastAPI server) for processing.
-   **Processed Image Response**: Returns the resulting image with makeup applied directly as a binary image response.

## Dependencies

-   **External Python Service**: This module is non-functional without the corresponding Python AI service. The URL for this service must be configured in the `.env` file.
    ```
    # URL for the Python makeup service
    MAKEUP_SERVICE_URL=http://127.0.0.1:9000/makeup/
    ```

## Workflow

1.  **Client Request**: The client sends a `POST` request to the `/makeup` endpoint with an image file included in a `multipart/form-data` payload.
2.  **File Reception**: The `MakeupController` receives the image file in memory.
3.  **Service Call**: The controller passes the image buffer to the `MakeupService`.
4.  **Proxy to Python**: The `MakeupService` creates a new `multipart/form-data` request and sends the image buffer to the Python service URL defined in the environment variables.
5.  **AI Processing**: The Python service receives the image, applies the virtual makeup effect, and sends back the processed image as a binary response (e.g., `image/jpeg`).
6.  **Response to Client**: The `MakeupService` receives the binary data from the Python service and returns it to the `MakeupController`. The controller then sets the `Content-Type` header to `image/jpeg` and sends the image data back to the client, which can be rendered directly in a browser or mobile app.

## API Endpoints

---

### Apply Virtual Makeup

-   **Endpoint:** `POST /makeup`
-   **Description:** Uploads an image, sends it to the AI backend for makeup application, and returns the resulting image.
-   **Auth:** Not Required.
-   **Request:**
    -   **Type:** `multipart/form-data`
    -   **Field:** `file` - The image file to be processed.
-   **Response:**
    -   **Success (200):**
        -   **Headers:** `Content-Type: image/jpeg`
        -   **Body:** The binary data of the processed JPEG image.
    -   **Error (400):** If no file is provided.
    -   **Error (502 Bad Gateway):** If the request to the external Python service fails.

---

# Messages Module

## Overview

This module provides the foundational REST API for the application's messaging system. It is responsible for creating and managing conversations, persisting messages, and handling read statuses.

**Note:** While this module provides the core data management via a REST API, the real-time communication (sending and receiving messages instantly) is handled by the `ChatModule` using WebSockets. This module is primarily used for fetching initial data, like conversation lists and message history.

## Features

-   **Conversation Management**: Create private (1-on-1) or group conversations.
-   **Find or Create**: A convenient endpoint to start a 1-on-1 chat without checking if a conversation already exists.
-   **Message History**: Retrieve paginated message history for any conversation.
-   **Read Status**: Endpoints to mark messages as read and get unread counts.
-   **Data Persistence**: Saves all conversations and messages to the database.

## API Endpoints

---

### 1. Get User's Conversations

-   **Endpoint:** `GET /messages/conversations`
-   **Description:** Retrieves a paginated list of all conversations the current user is a part of.
-   **Auth:** Required (JWT).
-   **Query Parameters:**
    -   `userId` (number, optional): The ID of the user. In production, this is taken from the JWT.
    -   `page` (number, optional): Page number for pagination (default: 1).
    -   `limit` (number, optional): Items per page (default: 10).
-   **Response (200):**
    ```json
    {
      "data": [
        {
          "id": 1,
          "type": "private",
          "created_at": "2025-11-10T10:00:00.000Z",
          "participants": [
            { "user_id": 1, "user": { "id": 1, "full_name": "You", "avatar_url": "..." } },
            { "user_id": 2, "user": { "id": 2, "full_name": "Jane Doe", "avatar_url": "..." } }
          ],
          "unread_count": 2,
          "last_message": {
            "id": 123,
            "content": "See you then!",
            "created_at": "2025-11-10T12:30:00.000Z",
            "sender": { "id": 2, "full_name": "Jane Doe", "avatar_url": "..." }
          }
        }
      ],
      "pagination": { "page": 1, "limit": 10, "total": 1, "pages": 1 }
    }
    ```

---

### 2. Find or Create a Private Conversation

-   **Endpoint:** `POST /messages/conversations/find-or-create/:otherUserId`
-   **Description:** The primary way to start a 1-on-1 chat. It finds an existing private conversation with the other user or creates a new one if none exists.
-   **Auth:** Required (JWT).
-   **Params:**
    -   `otherUserId` (number): The ID of the user you want to chat with.
-   **Request Body (Optional):**
    -   `userId` can be passed for testing.
    ```json
    {
      "userId": 1
    }
    ```
-   **Response (200 or 201):** The full conversation object.
    ```json
    {
      "id": 1,
      "type": "private",
      "created_at": "2025-11-10T10:00:00.000Z",
      "participants": [
        { "user_id": 1, "user": { "id": 1, "full_name": "You", "avatar_url": "..." } },
        { "user_id": 2, "user": { "id": 2, "full_name": "Jane Doe", "avatar_url": "..." } }
      ]
    }
    ```

---

### 3. Get Messages in a Conversation

-   **Endpoint:** `GET /messages/conversations/:conversationId/messages`
-   **Description:** Retrieves a paginated history of messages for a specific conversation.
-   **Auth:** Required (JWT).
-   **Params:**
    -   `conversationId` (number): The ID of the conversation.
-   **Query Parameters:**
    -   `page` (number, optional): Page number (default: 1).
    -   `limit` (number, optional): Items per page (default: 20).
-   **Response (200):**
    ```json
    {
      "data": [
        {
          "id": 122,
          "conversation_id": 1,
          "sender_id": 1,
          "content": "Hello!",
          "created_at": "2025-11-10T12:29:00.000Z",
          "sender": { "id": 1, "full_name": "You", "avatar_url": "..." },
          "message_reads": [{ "user_id": 1, "read_at": "..." }]
        },
        {
          "id": 123,
          "conversation_id": 1,
          "sender_id": 2,
          "content": "See you then!",
          "created_at": "2025-11-10T12:30:00.000Z",
          "sender": { "id": 2, "full_name": "Jane Doe", "avatar_url": "..." },
          "message_reads": []
        }
      ],
      "pagination": { "page": 1, "limit": 20, "total": 2, "pages": 1 }
    }
    ```

---

### 4. Mark All Messages as Read

-   **Endpoint:** `PATCH /messages/conversations/:conversationId/read-all`
-   **Description:** Marks all unread messages in a conversation as read for the current user.
-   **Auth:** Required (JWT).
-   **Params:**
    -   `conversationId` (number): The ID of the conversation.
-   **Request Body (Optional):**
    -   `userId` can be passed for testing.
    ```json
    {
      "userId": 1
    }
    ```
-   **Response (200):**
    ```json
    {
      "message": "All messages marked as read",
      "marked_count": 2
    }
    ```

---

### 5. Delete a Message

-   **Endpoint:** `DELETE /messages/:messageId`
-   **Description:** Deletes a message. Only the original sender can delete their own message.
-   **Auth:** Required (JWT).
-   **Params:**
    -   `messageId` (number): The ID of the message to delete.
-   **Response (200):**
    ```json
    {
      "message": "Message deleted successfully"
    }
    ```

---

# Notifications Module

## Overview

This module manages all user-facing notifications within the application. It provides a centralized system for informing users about important events such as new likes, comments, follows, and order status changes.

## Features

-   **Centralized Notification Feed**: A single API to fetch all of a user's notifications.
-   **Rich Contextual Data**: Uses a `meta_json` field to store detailed information about the event, allowing the frontend to build rich, interactive notification items.
-   **Read/Unread Management**: Endpoints to get unread counts and to mark notifications as read, either individually or in bulk.
-   **Automated Generation**: The `NotificationHelperService` is used by other modules (`Likes`, `Comments`, `Follows`, `Order`) to automatically create notifications for relevant user actions.

## Notification Data Structure

A key part of each notification is the `meta_json` field. This JSON object contains all the necessary context for the frontend to render the notification and handle user interaction (e.g., navigating to a specific post or user profile).

**Example `meta_json` for a "post like" notification:**
```json
{
  "actor_id": 2,
  "actor_name": "Jane Doe",
  "actor_avatar": "/uploads/avatars/jane.jpg",
  "post_id": 15,
  "post_title": "My Morning Skincare Routine"
}
```
-   `actor_*`: Information about the user who performed the action.
-   `post_*`, `comment_*`: Information about the target content.

## API Endpoints

---

### 1. Get User's Notifications

-   **Endpoint:** `GET /notifications`
-   **Description:** Retrieves a paginated list of notifications for the authenticated user.
-   **Auth:** Required (JWT).
-   **Query Parameters:**
    -   `userId` (number, optional): For testing; user ID is taken from JWT in production.
    -   `is_read` (boolean, optional): Filter by read status (e.g., `is_read=false` for unread notifications).
    -   `page` (number, optional): Page number for pagination (default: 1).
    -   `limit` (number, optional): Items per page (default: 20).
-   **Response (200):**
    ```json
    {
      "data": [
        {
          "id": 1,
          "user_id": 1,
          "type": "post_like",
          "title": "Có người thích bài viết của bạn",
          "body": "Jane Doe đã thích bài viết của bạn",
          "is_read": false,
          "meta_json": "{\"actor_id\":2,\"actor_name\":\"Jane Doe\",\"actor_avatar\":\"/uploads/avatars/jane.jpg\",\"post_id\":15}",
          "created_at": "2025-11-10T12:00:00.000Z"
        }
      ],
      "total": 1,
      "page": 1,
      "limit": 20,
      "total_pages": 1
    }
    ```

---

### 2. Get Notification Statistics

-   **Endpoint:** `GET /notifications/stats`
-   **Description:** Retrieves the total, unread, and read notification counts for the user.
-   **Auth:** Required (JWT).
-   **Query Parameters:**
    -   `userId` (number, optional): For testing.
-   **Response (200):**
    ```json
    {
      "total": 15,
      "unread": 3,
      "read": 12
    }
    ```

---

### 3. Mark a Notification as Read

-   **Endpoint:** `PATCH /notifications/:id/mark-read`
-   **Description:** Marks a single notification as read.
-   **Auth:** Required (JWT).
-   **Params:**
    -   `id` (number): The ID of the notification to mark as read.
-   **Request Body (Optional):**
    -   `user_id` can be passed for testing.
-   **Response (200):** The updated notification object.
    ```json
    {
      "id": 1,
      "user_id": 1,
      "type": "post_like",
      "title": "...",
      "body": "...",
      "is_read": true,
      "meta_json": "...",
      "created_at": "2025-11-10T12:00:00.000Z"
    }
    ```

---

### 4. Mark All Notifications as Read

-   **Endpoint:** `POST /notifications/mark-all-read`
-   **Description:** Marks all unread notifications for the user as read.
-   **Auth:** Required (JWT).
-   **Request Body (Optional):**
    -   `user_id` can be passed for testing.
-   **Response (200):**
    ```json
    {
      "updated": 3
    }
    ```

---

### 5. Delete All Read Notifications

-   **Endpoint:** `DELETE /notifications/read`
-   **Description:** Deletes all notifications that have been marked as read for the current user.
-   **Auth:** Required (JWT).
-   **Request Body (Optional):**
    -   `user_id` can be passed for testing.
-   **Response (200):**
    ```json
    {
      "deleted": 12
    }
    ```

---

# Order Module

## Overview

This module is the core of the e-commerce functionality, handling the entire checkout process. It takes a user's shopping cart, which may contain items from multiple shops, and intelligently splits it into individual orders for each shop. It also integrates deeply with the Giao Hàng Nhanh (GHN) service for shipping fee calculation and order creation.

## Checkout Workflow

The checkout process is the most critical workflow in this module.

1.  **Initiate Checkout**: The user provides their chosen shipping address and payment method and calls `POST /order/create`.
2.  **Group Cart by Shop**: The backend service retrieves the user's cart and groups all items by their respective `shop_id`.
3.  **Process Each Shop's Order**: For each group of items belonging to a single shop, the service performs the following steps within a single database transaction:
    a. **Calculate Totals**: It calculates the subtotal for the items.
    b. **Get Shipping Info**: It retrieves the shop's default pickup address and the user's selected shipping address.
    c. **Calculate Shipping Fee**: It calls the GHN API (`previewShippingOrder`) with the package dimensions, weight, and destination to get an accurate shipping fee.
    d. **Create Local Order**: It creates an `orders` record in the database with all the calculated totals (subtotal, shipping, tax).
    e. **Create GHN Shipping Order**: It calls the GHN API again (`createShippingOrder`) to register the shipment. GHN returns a unique `ghn_order_code`.
    f. **Save GHN Code**: The `ghn_order_code` is saved to the local `orders` record.
4.  **Clear Cart**: Once all shops' orders have been processed successfully, the user's cart is cleared.
5.  **Respond to User**: The API returns a summary of all the newly created orders.

## API Endpoints

---

### 1. Create Order from Cart (Checkout)

-   **Endpoint:** `POST /order/create`
-   **Description:** The main endpoint to initiate the checkout process. It converts the user's cart into one or more orders.
-   **Auth:** Required (JWT).
-   **Request Body:**
    ```json
    {
      "userId": 1,
      "shipping_address_id": 1,
      "note": "Please call before delivering.",
      "payment_method": "cod"
    }
    ```
-   **Response (200):**
    ```json
    {
      "success": true,
      "message": "Đặt hàng thành công",
      "orders": [
        {
          "id": 101,
          "user_id": 1,
          "shop_id": 1,
          "status": "pending",
          "total_amount": 545000,
          "ghn_order_code": "GHNXYZ123"
        }
      ]
    }
    ```

---

### 2. Get User's Orders

-   **Endpoint:** `GET /order/my-orders`
-   **Description:** Retrieves a paginated list of orders for the currently authenticated user.
-   **Auth:** Required (JWT).
-   **Query Parameters:**
    -   `userId` (number, required): The ID of the user.
    -   `page` (number, optional): Page number for pagination.
    -   `limit` (number, optional): Items per page.
    -   `status` (string, optional): Filter by order status (e.g., `pending`, `shipped`, `delivered`).
-   **Response (200):**
    ```json
    {
      "success": true,
      "orders": [
        {
          "id": 101,
          "shop_id": 1,
          "status": "pending",
          "total_amount": 545000,
          "created_at": "2025-11-10T14:00:00.000Z",
          "shop": { "id": 1, "name": "Beauty Store" },
          "order_items": [
            {
              "id": 201,
              "name_snapshot": "Hydrating Serum",
              "quantity": 1,
              "unit_price": 500000,
              "product": { "product_media": [{ "url": "..." }] }
            }
          ]
        }
      ],
      "pagination": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
    }
    ```

---

### 3. Get Order Details

-   **Endpoint:** `GET /order/:id`
-   **Description:** Retrieves the full details of a single order.
-   **Auth:** Required (JWT). The user must be the owner of the order.
-   **Params:**
    -   `id` (number): The ID of the order.
-   **Response (200):**
    ```json
    {
      "success": true,
      "order": {
        "id": 101,
        "status": "pending",
        "total_amount": 545000,
        "ghn_order_code": "GHNXYZ123",
        "user": { "full_name": "John Doe" },
        "shop": { "name": "Beauty Store" },
        "order_items": [
          {
            "name_snapshot": "Hydrating Serum",
            "quantity": 1,
            "unit_price": 500000
          }
        ],
        "shipping_address": {
          "recipient": "John Doe",
          "street": "123 Main St",
          "ward": "Phường Bến Nghé"
        }
      }
    }
    ```

---

### 4. Cancel an Order

-   **Endpoint:** `POST /order/:id/cancel`
-   **Description:** Cancels an order. This is only possible before the order has been shipped. This action may also attempt to cancel the corresponding GHN order.
-   **Auth:** Required (JWT).
-   **Params:**
    -   `id` (number): The ID of the order to cancel.
-   **Request Body:**
    ```json
    {
      "userId": 1
    }
    ```
-   **Response (200):**
    ```json
    {
      "success": true,
      "message": "Đã hủy đơn hàng"
    }
    ```

---

### 5. Track GHN Shipment

-   **Endpoint:** `GET /order/:id/ghn/track`
-   **Description:** Fetches the latest shipping status and history directly from the GHN API for a specific order.
-   **Auth:** Required (JWT).
-   **Params:**
    -   `id` (number): The ID of the local order.
-   **Response (200):** The raw data response from the GHN tracking API.
    ```json
    {
      "success": true,
      "data": {
        "order_code": "GHNXYZ123",
        "status": "ready_to_pick",
        "log": [
          { "status": "ready_to_pick", "updated_date": "2025-11-10T14:01:00Z" },
          { "status": "created", "updated_date": "2025-11-10T14:00:00Z" }
        ]
      }
    }
    ```

---

# Posts Module

## Overview

This module manages user-generated content, serving as the backbone for the social features of the application. It allows users to create, share, and manage rich media posts that can include text, images, videos, linked products, and tags.

## Features

-   **Rich Content Creation**: Supports posts with Markdown text, multiple images, and videos.
-   **Product Tagging**: Allows users to link products from the platform directly within their posts.
-   **Media Uploads**: Handles single and multiple file uploads for post media.
-   **Social Interaction Hooks**: Provides the foundation for likes and comments (which are handled by the `Likes` and `Comments` modules, respectively).
-   **Flexible Queries**: A powerful endpoint to fetch posts for feeds, user profiles, or search results, with filtering and pagination.

## Workflow: Creating a Post

Creating a post is a `multipart/form-data` request, as it combines JSON-like data with file uploads.

1.  **Client Prepares Data**: The frontend gathers the post's text content, any product IDs to be linked, tags, and the image/video files selected by the user.
2.  **API Request**: A single `POST` request is made to `/posts`.
    -   Text-based data (`title`, `content_md`, `product_ids`, etc.) are sent as form fields.
    -   All images and videos are sent as an array of files under the `media` field name.
3.  **Backend Processing**: 
    -   The service first creates the main `posts` record in the database.
    -   It then processes each uploaded file, saves it to storage (local or S3), and creates `post_media` records linking them to the newly created post.
    -   It also creates `post_products` and `post_tags` associations.
4.  **Response**: The API returns the complete, newly created post object, including URLs to the uploaded media.

## API Endpoints

---

### 1. Create a New Post

-   **Endpoint:** `POST /posts`
-   **Description:** Creates a new post with text, media, linked products, and tags.
-   **Auth:** Required (JWT with `create_post` permission).
-   **Request:** `multipart/form-data`
    -   **Fields:**
        -   `content_md` (string): The main content of the post in Markdown format.
        -   `title` (string, optional): The title of the post.
        -   `product_ids[]` (number, optional): An array of product IDs to link.
        -   `tags[]` (string, optional): An array of tag names.
        -   `visibility` (string, optional): `public`, `private`, or `friends`.
    -   **Files:**
        -   `media[]`: An array of files (images or videos).
-   **Response (201):**
    ```json
    {
      "success": true,
      "message": "Post created successfully",
      "data": {
        "id": 10,
        "user_id": 1,
        "content_md": "Check out this new look!",
        "like_count": 0,
        "comment_count": 0,
        "user": { "id": 1, "full_name": "John Doe", "avatar_url": "..." },
        "post_media": [
          { "media_url": "https://your-bucket.s3.amazonaws.com/postimages/1678886400000-123.jpg" }
        ],
        "post_products": [ { "product": { "id": 5, "name": "Matte Lipstick" } } ]
      }
    }
    ```

---

### 2. Get Posts (Feed)

-   **Endpoint:** `GET /posts`
-   **Description:** Retrieves a paginated list of posts. This is the main endpoint for building user feeds, profile pages, or search results.
-   **Auth:** Not Required.
-   **Query Parameters:**
    -   `page` (number, optional): Page number for pagination (default: 1).
    -   `limit` (number, optional): Items per page (default: 10).
    -   `user_id` (number, optional): Filter posts by a specific user.
    -   `shop_id` (number, optional): Filter posts by a specific shop.
    -   `search` (string, optional): Search term to find in post titles and content.
-   **Response (200):**
    ```json
    {
      "success": true,
      "data": [
        {
          "id": 10,
          "user_id": 1,
          "content_md": "Check out this new look!",
          "like_count": 15,
          "comment_count": 3,
          "user": { "id": 1, "full_name": "John Doe", "avatar_url": "..." },
          "post_media": [{ "media_url": "..." }]
        }
      ],
      "pagination": { "page": 1, "limit": 10, "total": 1, "pages": 1 }
    }
    ```

---

### 3. Get a Single Post

-   **Endpoint:** `GET /posts/:id`
-   **Description:** Retrieves all details for a single post, including linked products, media, and tags.
-   **Auth:** Not Required.
-   **Params:**
    -   `id` (number): The ID of the post.
-   **Response (200):**
    ```json
    {
      "success": true,
      "data": {
        "id": 10,
        "user_id": 1,
        "content_md": "Check out this new look!",
        "like_count": 15,
        "comment_count": 3,
        "user": { "id": 1, "full_name": "John Doe", "avatar_url": "..." },
        "post_media": [{ "media_url": "..." }],
        "post_products": [{ "product": { "id": 5, "name": "Matte Lipstick" } }],
        "post_tags": [{ "tag": { "name": "makeup" } }]
      }
    }
    ```

---

### 4. Update a Post

-   **Endpoint:** `PATCH /posts/:id`
-   **Description:** Updates the text content, linked products, or tags of a post. Media must be updated via the dedicated media upload/delete endpoints.
-   **Auth:** Required (JWT with `edit_post` permission). User must be the post owner.
-   **Params:**
    -   `id` (number): The ID of the post to update.
-   **Request Body:**
    ```json
    {
      "content_md": "An updated caption for my look!",
      "product_ids": [5, 8]
    }
    ```
-   **Response (200):** The full, updated post object.

---

### 5. Delete a Post

-   **Endpoint:** `DELETE /posts/:id`
-   **Description:** Deletes a post and all its associated data (media, likes, comments).
-   **Auth:** Required (JWT with `delete_post` permission). User must be the post owner.
-   **Params:**
    -   `id` (number): The ID of the post to delete.
-   **Response (200):**
    ```json
    {
      "message": "Post deleted successfully"
    }
    ```

---

### 6. Manage Post Media

-   **Add Media:** `POST /posts/:id/upload-media`
    -   **Description:** Uploads additional images or videos to an existing post.
    -   **Request:** `multipart/form-data` with a `media[]` file array.
-   **Delete Media:** `DELETE /posts/media/:mediaId`
    -   **Description:** Deletes a single media item from a post.
    -   **Params:** `mediaId` (number).

---

# Product Module

## Overview

This is a core module that manages the entire product catalog, including brands, categories, products, variants, and media. It also handles user-specific e-commerce interactions such as wishlists and the shopping cart.

## Features

-   **Catalog Management (Admin/Seller)**: Provides endpoints for admins and sellers to perform CRUD (Create, Read, Update, Delete) operations on brands, categories, products, and their variants/media.
-   **Product Discovery (Customer)**: Offers public-facing endpoints for customers to list, search, filter, and view detailed information about products.
-   **Wishlist Management**: Allows authenticated users to add products to a personal wishlist and view it later.
-   **Shopping Cart**: Implements the essential e-commerce shopping cart functionality, including adding, viewing, updating quantities, and removing items.
-   **Multi-Shop Cart**: The cart is designed to handle items from multiple different shops in a single session. The `getCart` endpoint groups items by shop, which is a critical feature for the multi-shop checkout process in the `Order` module.

---

## 1. Catalog Management APIs (Admin/Seller)

These endpoints are typically restricted to users with administrative or seller permissions.

### Get All Brands

-   **Endpoint:** `GET /product/all-brands`
-   **Description:** Retrieves a list of all product brands.

### Add a New Brand

-   **Endpoint:** `POST /product/add-brand`
-   **Description:** Adds a new brand. Requires `manage_brands` permission.
-   **Request:** `multipart/form-data` with fields `userid`, `name`, `slug`, and a `file` for the logo.

### Get All Categories

-   **Endpoint:** `GET /product/all-categories`
-   **Description:** Retrieves a list of all product categories.

### Add a New Category

-   **Endpoint:** `POST /product/add-category`
-   **Description:** Adds a new product category. Requires `manage_categorys` permission.
-   **Request Body:** `{ "userid": 1, "name": "Skincare", "slug": "skincare", "parent_id": null }`

### Add a New Product

-   **Endpoint:** `POST /product/add-product`
-   **Description:** Creates a new product within a specific shop. Requires `create_product` permission and shop ownership/staff status.
-   **Request Body:**
    ```json
    {
      "user_id": 2,
      "shop_id": 1,
      "name": "Hydrating Serum",
      "slug": "hydrating-serum",
      "skin_type_compat": "all",
      "is_published": true,
      "description": "A serum for all skin types.",
      "brand_id": 1,
      "category_ids": [2, 5]
    }
    ```

### Add a Product Variant

-   **Endpoint:** `POST /product/add-product-variant`
-   **Description:** Adds a new variant (e.g., size, color) to an existing product.
-   **Request Body:**
    ```json
    {
      "product_id": 1,
      "sku": "HS-50ML",
      "name": "50ml",
      "price": "500000",
      "stock": "100"
    }
    ```

### Get Products by Shop

-   **Endpoint:** `GET /product/shop/:shopId/products`
-   **Description:** Retrieves a paginated and filterable list of products belonging to a specific shop.
-   **Params:** `shopId` (number).
-   **Query Parameters:** `page`, `limit`, `search`, `category_id`, `brand_id`, `min_price`, `max_price`, `sort_field`, etc.

---

## 2. Product Discovery APIs (Customer)

### Get All Products

-   **Endpoint:** `GET /product/products`
-   **Description:** Retrieves a paginated list of all published and approved products. Supports filtering and sorting.
-   **Query Parameters:** `page`, `limit`, `category`, `brand`, `min_price`, `max_price`, `sort`.

### Get Product by ID

-   **Endpoint:** `GET /product/products/:id`
-   **Description:** Retrieves detailed information for a single product.

---

## 3. Wishlist APIs

### Add to Wishlist

-   **Endpoint:** `POST /product/wishlist/add`
-   **Description:** Adds a product to the user's wishlist.
-   **Auth:** Required (JWT).
-   **Request Body:** `{ "productId": 1, "userId": 1 }` (userId is optional, taken from JWT).

### Remove from Wishlist

-   **Endpoint:** `DELETE /product/wishlist/remove/:productId`
-   **Description:** Removes a product from the user's wishlist.
-   **Auth:** Required (JWT).

### Get Wishlist

-   **Endpoint:** `GET /product/wishlist`
-   **Description:** Retrieves all items in the user's wishlist.
-   **Auth:** Required (JWT).

---

## 4. Shopping Cart APIs

### Add to Cart

-   **Endpoint:** `POST /product/cart/add`
-   **Description:** Adds a specific product variant to the user's shopping cart. If the item already exists, its quantity is increased.
-   **Auth:** Required (JWT).
-   **Request Body:**
    ```json
    {
      "productId": 1,
      "variantId": 2,
      "quantity": 1,
      "userId": 1
    }
    ```

### Get Cart Contents

-   **Endpoint:** `GET /product/cart`
-   **Description:** Retrieves the contents of the user's cart, grouped by shop. This is the primary endpoint used before checkout.
-   **Auth:** Required (JWT).
-   **Query Parameters:** `userId` (number).
-   **Response:**
    ```json
    {
      "success": true,
      "cart": [
        {
          "shop_id": 1,
          "shop_name": "Beauty Store",
          "items": [
            {
              "id": 1,
              "product_id": 1,
              "name": "Hydrating Serum",
              "price": 500000,
              "quantity": 2,
              "image_url": "/uploads/products/serum.jpg"
            }
          ]
        },
        {
          "shop_id": 2,
          "shop_name": "Skincare World",
          "items": [
            {
              "id": 2,
              "product_id": 10,
              "name": "Sunscreen SPF 50",
              "price": 350000,
              "quantity": 1,
              "image_url": "/uploads/products/sunscreen.jpg"
            }
          ]
        }
      ]
    }
    ```

### Update Cart Item Quantity

-   **Endpoint:** `PUT /product/cart/items/:itemId`
-   **Description:** Updates the quantity of a specific item in the cart.
-   **Auth:** Required (JWT).
-   **Request Body:** `{ "quantity": 3 }`

### Remove from Cart

-   **Endpoint:** `DELETE /product/cart/items/:itemId`
-   **Description:** Removes a specific item from the cart.
-   **Auth:** Required (JWT).

---

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

---

# Shop Address Module

## Overview

This module manages the physical addresses associated with a shop, such as pickup locations for shipping. It plays a critical role in the e-commerce workflow by integrating the shop with the Giao Hàng Nhanh (GHN) delivery service.

## Features

-   **Address Management**: Allows shop owners to add, update, list, and delete multiple addresses for their shop.
-   **Default Address**: Supports designating one address as the default pickup location.
-   **Automatic GHN Shop Registration**: This is a key feature of the module. When a **default** address is created with valid GHN location details, the module automatically calls the GHN API to register the shop. The `ghn_shop_id` received from GHN is then saved to the shop's main profile, enabling all future shipping functionalities for that shop.

## Workflow

1.  **Prerequisites**: A shop must exist in the system. The user should have the necessary GHN location IDs (province, district, ward) for the address they intend to add. These can be fetched from the endpoints in the `GhnModule`.
2.  **Adding an Address**: The shop owner adds an address via the `POST /shop-address` endpoint.
3.  **GHN Registration (Critical Step)**:
    -   If the address is marked as the default (`is_default: true`), the `ShopAddressService` triggers a call to the `GhnService`.
    -   It uses the address details to register the shop with the GHN platform.
    -   Upon successful registration, GHN returns a unique `shop_id`.
    -   This `ghn_shop_id` is then saved in the `shops` table, permanently linking the shop to its GHN account. This ID is required for all subsequent shipping operations like calculating fees and creating delivery orders.

## API Endpoints

---

### Add a Shop Address

-   **Endpoint:** `POST /shop-address`
-   **Description:** Creates a new address for a shop. If `is_default` is true, this will also trigger GHN shop registration.
-   **Auth:** Required (JWT with appropriate seller permissions).
-   **Request Body (`CreateShopAddressDto`):**
    ```json
    {
      "shop_id": 1,
      "name": "Kho chính",
      "phone": "0987654321",
      "email": "kho@shop.com",
      "province": "Hồ Chí Minh",
      "district": "Quận 1",
      "ward": "Phường Bến Nghé",
      "street": "123 Lê Lợi",
      "is_default": true,
      "ghn_province_id": 202,
      "ghn_district_id": 1444,
      "ghn_ward_code": "20301"
    }
    ```
-   **Response:** The created shop address object.

---

### Update a Shop Address

-   **Endpoint:** `PATCH /shop-address/:id`
-   **Description:** Updates the details of an existing shop address.
-   **Auth:** Required (JWT with appropriate seller permissions).
-   **Params:**
    -   `id` (number): The ID of the address to update.
-   **Request Body (`UpdateShopAddressDto`):** Any fields from the create DTO are optional.
    ```json
    {
      "phone": "0999888777",
      "is_default": false
    }
    ```
-   **Response:** The updated shop address object.

---

### Get All Addresses for a Shop

-   **Endpoint:** `GET /shop-address`
-   **Description:** Retrieves a list of all addresses associated with a specific shop.
-   **Auth:** Not required, but typically used by authenticated shop owners/staff.
-   **Query Parameters:**
    -   `shop_id` (number, required): The ID of the shop.
-   **Response:** An array of shop address objects.

---

### Delete a Shop Address

-   **Endpoint:** `DELETE /shop-address/:id`
-   **Description:** Deletes a specific shop address.
-   **Auth:** Required (JWT with appropriate seller permissions).
-   **Params:**
    -   `id` (number): The ID of the address to delete.
-   **Response:** The deleted shop address object.

---

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

```