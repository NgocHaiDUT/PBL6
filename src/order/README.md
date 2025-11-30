# Order Module

## Overview

This module is the core of the e-commerce functionality, handling the entire checkout process. It takes a user's shopping cart, which may contain items from multiple shops, and intelligently splits it into individual orders for each shop. It also integrates deeply with the Giao Hàng Nhanh (GHN) service for shipping fee calculation and order creation.

## Checkout Workflow

The checkout process is the most critical workflow in this module.

1.  **Initiate Checkout**: The user provides a list of items to purchase, their chosen shipping address, and payment method, then calls `POST /order/create`.
2.  **Group Items by Shop**: The backend service receives the list of items and groups them by their respective `shop_id`.
3.  **Process Each Shop's Order**: For each group of items belonging to a single shop, the service performs the following steps within a single database transaction:
    a. **Calculate Totals**: It calculates the subtotal for the items.
    b. **Get Shipping Info**: It retrieves the shop's default pickup address and the user's selected shipping address.
    c. **Calculate Shipping Fee**: It calls the GHN API by trying all available services and automatically selecting the cheapest valid one.
    d. **Create Local Order**: It creates an `orders` record in the database with all the calculated totals (subtotal, shipping, tax).
    e. **Create GHN Shipping Order**: It calls the GHN API again (`createShippingOrder`) with the cheapest selected service to register the shipment. GHN returns a unique `ghn_order_code`.
    f. **Save GHN Code**: The `ghn_order_code` is saved to the local `orders` record.
4.  **Clear Processed Items from Cart**: Once all shops' orders have been processed successfully, the items that were just purchased are removed from the user's cart.
5.  **Respond to User**: The API returns a detailed summary of all the newly created orders, including the items in each.

## API Endpoints

---

### 1. Create Orders from Items (Checkout)

-   **Endpoint:** `POST /order/create`
-   **Description:** The main endpoint to initiate the checkout process. It takes a specific list of items and converts them into one or more orders based on the shops they belong to.
-   **Auth:** Required (JWT).
-   **Request Body:**
    ```json
    {
      "shipping_address_id": 1,
      "note": "Please call before delivering.",
      "payment_method": "cod",
      "items": [
        { "variant_id": 1, "quantity": 2 },
        { "variant_id": 10, "quantity": 1 }
      ]
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
          "shop_id": 1,
          "total_amount": 545000,
          "ghn_order_code": "GHNXYZ123",
          "order_items": [
            {
              "quantity": 2,
              "variant": {
                "id": 2,
                "name": "50ml"
              },
              "product": {
                "name": "Hydrating Serum"
              }
            }
          ]
        }
      ],
      "paymentUrl": null
    }
    ```

    **Note on VNPAY Payment:**
    If you set `"payment_method": "vnpay"`, the response will contain a `paymentUrl`. Your frontend application should redirect the user to this URL to complete the payment.

    Example response for VNPAY:
    ```json
    {
      "success": true,
      "message": "Đặt hàng thành công",
      "orders": [...],
      "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=545000..."
    }
    ```

---

### 2. Get User's Orders

-   **Endpoint:** `GET /order/my-orders`
-   **Description:** Retrieves a paginated list of orders for the currently authenticated user.
-   **Auth:** Required (JWT).
-   **Query Parameters:**
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
-   **Request Body:** (No body needed)
-   **Response (200):**
    ```json
    {
      "success": true,
      "message": "Đã hủy đơn hàng"
    }
    ```

---

### 5. GHN Shipping Calculation Endpoints

These endpoints provide access to GHN's shipping calculation functionalities, proxied through the Order module.

### Calculate Cart Shipping (Recommended)

-   **Endpoint:** `POST /order/calculate-cart-shipping`
-   **Description:** A high-level endpoint to automatically calculate the cheapest shipping fee for a given list of items. The backend handles all the complex logic of finding addresses, grouping by shop, and selecting the best rate.
-   **Auth:** Required (JWT).
-   **Request Body:**
    ```json
    {
      "items": [
        { "variant_id": 1, "quantity": 2 },
        { "variant_id": 10, "quantity": 1 }
      ],
      "shipping_address_id": 5 // Optional. If not provided, user's default address is used.
    }
    ```
-   **Response (200):**
    ```json
    {
        "total_shipping_fee": 36300,
        "details": [
            {
                "shop_id": 1,
                "shop_name": "Beauty Store",
                "fee": 36300,
                "service_id": 53321
            }
        ]
    }
    ```

### Get Available Services

-   **Endpoint:** `POST /order/shipping/services`
-   **Description:** A lower-level endpoint to get the available shipping packages for a specific route.
-   **Request Body:**
    ```json
    {
      "from_district_id": 1447,
      "to_district_id": 1442,
      "shop_id": 885
    }
    ```
-   **Response (200):**
    ```json
    [
        {
            "service_id": 53321,
            "short_name":"Hàng nhẹ",
            "service_type_id":2
        },
        {
            "service_id": 100039,
            "short_name":"Hàng nặng",
            "service_type_id":5
        }
    ]
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
