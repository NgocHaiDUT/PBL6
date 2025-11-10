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