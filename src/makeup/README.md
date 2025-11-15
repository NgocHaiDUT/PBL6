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
