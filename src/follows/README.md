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
