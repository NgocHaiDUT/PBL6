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