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