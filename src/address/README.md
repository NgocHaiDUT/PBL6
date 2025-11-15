# Address Module

## Overview

This module manages user shipping addresses. It allows authenticated users to create, view, update, and delete their personal addresses. It also provides public endpoints for fetching geographical data from the GHN (Giao Hàng Nhanh) service, which is essential for address selection and shipping calculations.

## Features

- Add a new shipping address for a user.
- Update an existing address.
- Retrieve all addresses for the currently logged-in user.
- Delete a specific address.
- Store GHN-specific location IDs (`ghn_province_id`, `ghn_district_id`, `ghn_ward_code`) for integration with the shipping provider.
- **Data Integrity:** When an address is created or updated with GHN location IDs, the service automatically fetches the official names for the province, district, and ward from GHN. These official names are then saved to the database, ensuring all address data is standardized and consistent with the shipping provider.
- **Public endpoints to fetch GHN provinces, districts, and wards.**

## Workflow

1.  For address management (add, update, delete, get all), a user must be authenticated (provide a valid JWT) to access any of the endpoints.
2.  The user's ID is automatically extracted from the JWT token for all authenticated operations.
3.  When adding or updating an address, the user can provide GHN location IDs, which are used by the Order module to calculate shipping fees and create shipping orders.
4.  Users can have multiple addresses, but can designate one as the default shipping address.
5.  **GHN location data can be fetched publicly without authentication.**

## API Endpoints

---

### Authenticated Endpoints (Require JWT)

### Add a New Address

-   **Endpoint:** `POST /address/add-address`
-   **Description:** Creates a new shipping address for the logged-in user.
-   **Auth:** Required (JWT).
-   **Request Body:**
    ```json
    {
      "label": "Home",
      "receiver_name": "John Doe",
      "phone": "0987654321",
      "province": "Hà Nội",
      "district": "Quận Ba Đình",
      "ward": "Phường Phúc Xá",
      "street": "123 Trần Phú",
      "is_default": true,
      "ghn_province_id": 201,
      "ghn_district_id": 1442,
      "ghn_ward_code": "20101"
    }
    ```
-   **Response:**
    -   **Success (200):**
        ```json
        {
          "message": "Thêm địa chỉ nhận hàng thành công"
        }
        ```

---

### Update an Existing Address

-   **Endpoint:** `POST /address/update-address`
-   **Description:** Updates the details of an existing address. All fields are optional.
-   **Auth:** Required (JWT).
-   **Request Body:**
    ```json
    {
      "addressid": 1,
      "label": "Work Office",
      "phone": "0123456789"
    }
    ```
-   **Response:**
    -   **Success (200):**
        ```json
        {
          "message": "Cập nhật địa chỉ nhận hàng thành công"
        }
        ```

---

### Get All Addresses

-   **Endpoint:** `GET /address/all-address`
-   **Description:** Retrieves a list of all addresses associated with the logged-in user.
-   **Auth:** Required (JWT).
-   **Request:** (No body, params, or query needed)
-   **Response:**
    -   **Success (200):**
        ```json
        [
          {
            "id": 1,
            "user_id": 1,
            "label": "Home",
            "recipient": "John Doe",
            "phone": "0987654321",
            "province": "Hà Nội",
            "district": "Quận Ba Đình",
            "ward": "Phường Phúc Xá",
            "street": "123 Trần Phú",
            "is_default": true,
            "created_at": "2025-11-10T12:00:00.000Z",
            "ghn_province_id": 201,
            "ghn_district_id": 1442,
            "ghn_ward_code": "20101"
          }
        ]
        ```

---

### Delete an Address

-   **Endpoint:** `POST /address/delete-address`
-   **Description:** Deletes a specific address by its ID.
-   **Auth:** Required (JWT).
-   **Request Body:**
    ```json
    {
      "addressid": 1
    }
    ```
-   **Response:**
    -   **Success (200):**
        ```json
        {
          "message": "Xoá địa chỉ thành công"
        }
        ```

---

### Public GHN Location Endpoints (No Auth Required)

### Get Provinces

-   **Endpoint:** `GET /address/provinces`
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

-   **Endpoint:** `GET /address/districts`
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

-   **Endpoint:** `GET /address/wards`
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
