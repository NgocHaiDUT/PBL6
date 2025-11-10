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
