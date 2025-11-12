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

### 5. GHN Shipping Calculation Endpoints

These endpoints provide direct access to GHN's shipping calculation functionalities, proxied through the Order module.

### Get Available Services

-   **Endpoint:** `POST /order/shipping/services`
-   **Description:** Lấy các gói dịch vụ vận chuyển có sẵn theo tuyến đường.
-   **Request Body:**
    ```json
    {
      "from_district_id": 1447,
      "to_district_id": 1442
    }
    ```
-   **Response (200):**
    ```json
    [
        {
            "short_name":"Hàng nặng",
            "service_type_id":5
        },
        {
            "short_name":"Hàng nhẹ",
            "service_type_id":2
        }
    ]
    ```

### Calculate Shipping Fee

-   **Endpoint:** `POST /order/shipping/calculate-fee`
-   **Description:** Tính phí dịch vụ cho một đơn hàng. Note: This service now always uses the 'Heavy Goods' (`service_type_id: 5`) logic, requiring item-level dimensions.
-   **Request Body (`CalculateFeeDto`):**
    ```json
    {
      "from_district_id": 1442,
      "from_ward_code": "20101",
      "to_district_id": 1444,
      "to_ward_code": "20301",
      "service_id": 53320,
      "insurance_value": 250000,
      "cod_amount": 250000,
      "items": [
        {
          "name": "Awesome Product",
          "quantity": 1,
          "price": 250000,
          "length": 20,
          "width": 15,
          "height": 10,
          "weight": 500
        }
      ]
    }
    ```
-   **Response (200):**
    ```json
    {
        "total": 36300,
        "service_fee": 36300,
        "insurance_fee": 0
    }
    ```

### Preview Shipping Order

-   **Endpoint:** `POST /order/shipping/preview`
-   **Description:** Previews a new shipping order on the GHN platform. Note: This service now always uses the 'Heavy Goods' (`service_type_id: 5`) logic.
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
      "insurance_value": 250000,
      "items": [
        {
          "name": "My Awesome Product",
          "quantity": 1,
          "price": 250000,
          "length": 20,
          "width": 15,
          "height": 10,
          "weight": 500
        }
      ]
    }
    ```
-   **Response (200):**
    ```json
    {
      "order_code": "GXYZ123ABC",
      "total_fee": "36300",
      "expected_delivery_time": "2025-11-12T22:00:00Z"
    }
    ```

### Get Leadtime

-   **Endpoint:** `POST /order/shipping/leadtime`
-   **Description:** Retrieves the estimated delivery time for a shipment.
-   **Query Parameters:**
    -   `shopId` (number, required): The shop's `ghn_shop_id`.
-   **Request Body (`GetLeadtimeDto`):**
    ```json
    {
      "from_district_id": 1442,
      "from_ward_code": "20101",
      "to_district_id": 1444,
      "to_ward_code": "20301",
      "service_id": 53320
    }
    ```
-   **Response (200):**
    ```json
    {
      "leadtime": 1700000000,
      "order_date": "2025-11-12T00:00:00Z"
    }
    ```

---

### 6. Track GHN Shipment

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
