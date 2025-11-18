# Makeup Module

## Overview

Module này cung cấp các API để tạo và quản lý các phiên thử trang điểm ảo (AR Try-On) với database tracking. Module cũng hoạt động như một proxy service đến Python AI service để xử lý ảnh.

## Features

-   **Tryon Session Management**: Tạo và quản lý các phiên thử makeup
-   **Tryon Item Tracking**: Theo dõi các sản phẩm makeup được áp dụng trong mỗi session
-   **Image Upload**: Accepts a single image file from the client
-   **AI Service Proxy**: Forwards the uploaded image to a configured Python backend (e.g., a FastAPI server) for processing
-   **Database Integration**: Lưu trữ sessions và items vào database

## Dependencies

-   **External Python Service**: This module is non-functional without the corresponding Python AI service. The URL for this service must be configured in the `.env` file.
    ```
    # URL for the Python makeup service
    MAKEUP_SERVICE_URL=http://127.0.0.1:9000/makeup/
    ```

## Workflow

### Workflow 1: Create Session & Items (Recommended)

1. **Tạo Session**: Client gọi `POST /makeup/session` với ảnh đầu vào → nhận `session_id`
2. **Thêm Items**: Client gọi `POST /makeup/item` với `session_id` và thông tin sản phẩm
3. **Lưu trữ**: Tất cả thông tin được lưu vào database để tracking và analytics

### Workflow 2: Direct Apply (Legacy)

1. **Client Request**: The client sends a `POST` request to the `/makeup/apply` endpoint with an image file
2. **File Reception**: The `MakeupController` receives the image file in memory
3. **Service Call**: The controller passes the image buffer to the `MakeupService`
4. **Proxy to Python**: The `MakeupService` creates a new `multipart/form-data` request and sends the image buffer to the Python service
5. **AI Processing**: The Python service receives the image, applies the virtual makeup effect, and sends back the processed image
6. **Response to Client**: The binary image data is returned directly to the client

## API Endpoints

---

### 1. Create Tryon Session

-   **Endpoint:** `POST /makeup/session`
-   **Description:** Tạo một phiên thử trang điểm mới và trả về session ID
-   **Auth:** Optional (nếu có auth, user_id sẽ được lưu)
-   **Request:**
    -   **Type:** `multipart/form-data`
    -   **Fields:**
        -   `file` (optional): File ảnh đầu vào
        -   `device` (optional): Thông tin thiết bị
        -   `input_type` (optional): Loại input (camera, upload, etc.)
        -   `input_image_url` (optional): URL ảnh đầu vào
-   **Response:**
    -   **Success (200):**
        ```json
        {
          "success": true,
          "data": {
            "session_id": 1
          }
        }
        ```
    -   **Error (400):** If validation fails

**Example cURL:**
```bash
curl -X POST http://localhost:3000/makeup/session \
  -F "file=@/path/to/image.jpg" \
  -F "device=mobile" \
  -F "input_type=upload"
```

---

### 2. Create Tryon Item

-   **Endpoint:** `POST /makeup/item`
-   **Description:** Tạo một item (sản phẩm makeup) cho session đã tạo
-   **Auth:** Not Required
-   **Request:**
    -   **Type:** `application/json`
    -   **Body:**
        ```json
        {
          "session_id": 1,
          "product_id": 123,
          "variant_id": 456,
          "type": "lipstick",
          "params_json": {
            "color": "#FF0000",
            "intensity": 0.8
          }
        }
        ```
-   **Response:**
    -   **Success (200):**
        ```json
        {
          "success": true,
          "data": {
            "id": 1,
            "session_id": 1,
            "product_id": 123,
            "variant_id": 456,
            "type": "lipstick",
            "params_json": "{\"color\":\"#FF0000\",\"intensity\":0.8}"
          }
        }
        ```
    -   **Error (404):** Session not found
    -   **Error (400):** Validation fails

**Example cURL:**
```bash
curl -X POST http://localhost:3000/makeup/item \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": 1,
    "product_id": 123,
    "variant_id": 456,
    "type": "lipstick",
    "params_json": {
      "color": "#FF0000",
      "intensity": 0.8
    }
  }'
```

---

### 3. Apply Virtual Makeup (Legacy)

-   **Endpoint:** `POST /makeup/apply`
-   **Description:** Uploads an image, sends it to the AI backend for makeup application, and returns the resulting image
-   **Auth:** Not Required
-   **Request:**
    -   **Type:** `multipart/form-data`
    -   **Field:** `file` - The image file to be processed
-   **Response:**
    -   **Success (200):**
        -   **Headers:** `Content-Type: image/jpeg`
        -   **Body:** The binary data of the processed JPEG image
    -   **Error (400):** If no file is provided
    -   **Error (502 Bad Gateway):** If the request to the external Python service fails

**Example cURL:**
```bash
curl -X POST http://localhost:3000/makeup/apply \
  -F "file=@/path/to/image.jpg" \
  --output result.jpg
```

## Database Schema

### tryon_sessions
```prisma
model tryon_sessions {
  id              Int           @id @default(autoincrement())
  user_id         Int?
  device          String?
  input_type      String?
  input_image_url String?
  result_url      String?
  latency_ms      Int?
  created_at      DateTime      @default(now())
  user            users?        @relation(fields: [user_id], references: [id])
  tryon_items     tryon_items[]
}
```

### tryon_items
```prisma
model tryon_items {
  id          Int               @id @default(autoincrement())
  session_id  Int
  product_id  Int?
  variant_id  Int?
  type        String?
  params_json String?
  session     tryon_sessions    @relation(fields: [session_id], references: [id])
  product     products?         @relation(fields: [product_id], references: [id])
  variant     product_variants? @relation(fields: [variant_id], references: [id])
}
```

## Notes

- Session được tạo với hoặc không có user_id (tùy thuộc vào authentication)
- File upload hiện tại tạo URL placeholder, cần implement upload to S3/storage
- Python makeup service endpoint được cấu hình qua env variable
- Legacy endpoint `/makeup/apply` vẫn hoạt động để backward compatibility

