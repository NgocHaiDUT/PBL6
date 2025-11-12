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