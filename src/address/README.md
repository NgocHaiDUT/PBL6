# Address Module

## Overview

This module manages user shipping addresses. It allows authenticated users to create, view, update, and delete their personal addresses.

## Features

- Add a new shipping address for a user.
- Update an existing address.
- Retrieve all addresses for the currently logged-in user.
- Delete a specific address.
- Store GHN-specific location IDs (`ghn_province_id`, `ghn_district_id`, `ghn_ward_code`) for integration with the shipping provider.

## Workflow

1.  A user must be authenticated (provide a valid JWT) to access any of the endpoints.
2.  The user's ID is automatically extracted from the JWT token for all operations.
3.  When adding or updating an address, the user can provide GHN location IDs, which are used by the Order module to calculate shipping fees and create shipping orders.
4.  Users can have multiple addresses, but can designate one as the default shipping address.

## API Endpoints

All endpoints require authentication.

---

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
