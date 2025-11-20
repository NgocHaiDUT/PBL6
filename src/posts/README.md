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
        "post_products": [
          { "product": { "id": 5, "name": "Matte Lipstick" } }
        ]
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