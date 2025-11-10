# GHN (Giao Hàng Nhanh) Integration Module

## Overview

This module serves as a secure proxy and wrapper around the official Giao Hàng Nhanh (GHN) API. It abstracts the direct API calls, allowing the frontend to interact with GHN services through our backend. This approach protects the API token and provides a consistent interface for all shipping-related functionalities.

## Environment Variables

This module requires the following environment variables to be set in the project's `.env` file:

```
GHN_API_TOKEN="your_ghn_api_token"
GHN_API_URL="https://dev-online-gateway.ghn.vn/shiip/public-api/v2"
```

## Important Note on `shopId`

Many order management endpoints require a `shopId` to be passed as a query parameter. This ID is the **GHN Shop ID** (`ghn_shop_id` from the `shops` table), which is obtained automatically when a shop's default address is created via the `ShopAddressModule`. **It is not the internal shop ID.**

---

## 1. Location Data Endpoints

These endpoints are used to fetch administrative location data required for addresses and shipping calculations.

### Get Provinces

-   **Endpoint:** `GET /ghn/provinces`
-   **Description:** Retrieves a list of all provinces and their IDs from GHN.
-   **Response (200):**
    ```json
    [
      {
        "ProvinceID": 201,
        "ProvinceName": "Hà Nội",
        "CountryID": 1,
        "Code": "HN",
        "NameExtension": ["Hà Nội"],
        "IsEnable": 1,
        "RegionID": 2,
        "UpdatedBy": 1,
        "CreatedAt": "2022-08-01T00:00:00Z",
        "UpdatedAt": "2022-08-01T00:00:00Z",
        "CanUseCod": true,
        "Status": 1
      }
    ]
    ```

### Get Districts

-   **Endpoint:** `GET /ghn/districts`
-   **Description:** Retrieves a list of districts for a given province.
-   **Query Parameters:**
    -   `province_id` (number, required): The `ProvinceID` from the Get Provinces endpoint.
-   **Response (200):**
    ```json
    [
      {
        "DistrictID": 1442,
        "ProvinceID": 201,
        "DistrictName": "Quận Ba Đình",
        "Code": "BD",
        "Type": 2,
        "SupportType": 3,
        "NameExtension": ["Ba Đình"],
        "IsEnable": 1,
        "Status": 1
      }
    ]
    ```

### Get Wards

-   **Endpoint:** `GET /ghn/wards`
-   **Description:** Retrieves a list of wards for a given district.
-   **Query Parameters:**
    -   `district_id` (number, required): The `DistrictID` from the Get Districts endpoint.
-   **Response (200):**
    ```json
    [
      {
        "WardCode": "20101",
        "WardName": "Phường Phúc Xá",
        "DistrictID": 1442,
        "NameExtension": ["Phúc Xá"],
        "IsEnable": 1,
        "CanUpdateCOD": true,
        "Status": 1
      }
    ]
    ```

---

## 2. Shipping Calculation Endpoints

### Get Available Services

-   **Endpoint:** `POST /ghn/services`
-   **Description:** Gets the available shipping service packages for a given route.
-   **Request Body:**
    ```json
    {
      "shop_id": 12345, // GHN Shop ID
      "from_district": 1442,
      "to_district": 1444
    }
    ```
-   **Response (200):**
    ```json
    [
        {
            "service_id": 53320,
            "short_name": "Nhanh",
            "service_type_id": 2
        }
    ]
    ```

### Calculate Shipping Fee

-   **Endpoint:** `POST /ghn/calculate-fee`
-   **Description:** Calculates the shipping fee for a potential order.
-   **Request Body (`CalculateFeeDto`):**
    ```json
    {
      "from_district_id": 1442,
      "from_ward_code": "20101",
      "to_district_id": 1444,
      "to_ward_code": "20301",
      "service_id": 53320,
      "height": 10,
      "length": 20,
      "width": 15,
      "weight": 500,
      "insurance_value": 250000,
      "cod_amount": 250000
    }
    ```
-   **Response (200):**
    ```json
    {
      "total": 25000,
      "service_fee": 25000,
      "insurance_fee": 0,
      "pick_station_fee": 0,
      "coupon_value": 0,
      "r2s_fee": 0
    }
    ```

---

## 3. Order Management Endpoints

### Create Shipping Order

-   **Endpoint:** `POST /ghn/create-order`
-   **Description:** Creates a new shipping order on the GHN platform.
-   **Query Parameters:**
    -   `shopId` (number, required): The shop's `ghn_shop_id`.
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
      "weight": 500,
      "length": 20,
      "width": 15,
      "height": 10,
      "service_type_id": 2,
      "items": [
        {
          "name": "My Awesome Product",
          "quantity": 1,
          "price": 250000
        }
      ]
    }
    ```
-   **Response (200):**
    ```json
    {
      "order_code": "GXYZ123ABC",
      "total_fee": "25000",
      "expected_delivery_time": "2025-11-12T22:00:00Z"
    }
    ```

### Get Shipping Order Detail

-   **Endpoint:** `GET /ghn/order/:orderCode`
-   **Description:** Retrieves detailed information about a specific shipping order.
-   **Params:**
    -   `orderCode` (string): The GHN order code (e.g., `GXYZ123ABC`).
-   **Response (200):** A full order detail object from GHN.

### Cancel Shipping Order

-   **Endpoint:** `POST /ghn/cancel-order`
-   **Description:** Cancels one or more shipping orders.
-   **Query Parameters:**
    -   `shopId` (number, required): The shop's `ghn_shop_id`.
-   **Request Body:**
    ```json
    {
      "order_codes": ["GXYZ123ABC"]
    }
    ```
-   **Response (200):**
    ```json
    [
        {
            "order_code": "GXYZ123ABC",
            "result": true,
            "message": "Success"
        }
    ]
    ```

