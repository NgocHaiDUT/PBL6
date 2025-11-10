# Shop Address Module

## Overview

This module manages the physical addresses associated with a shop, such as pickup locations for shipping. It plays a critical role in the e-commerce workflow by integrating the shop with the Giao Hàng Nhanh (GHN) delivery service.

## Features

-   **Address Management**: Allows shop owners to add, update, list, and delete multiple addresses for their shop.
-   **Default Address**: Supports designating one address as the default pickup location.
-   **Automatic GHN Shop Registration**: This is a key feature of the module. When a **default** address is created with valid GHN location details, the module automatically calls the GHN API to register the shop. The `ghn_shop_id` received from GHN is then saved to the shop's main profile, enabling all future shipping functionalities for that shop.

## Workflow

1.  **Prerequisites**: A shop must exist in the system. The user should have the necessary GHN location IDs (province, district, ward) for the address they intend to add. These can be fetched from the endpoints in the `GhnModule`.
2.  **Adding an Address**: The shop owner adds an address via the `POST /shop-address` endpoint.
3.  **GHN Registration (Critical Step)**:
    -   If the address is marked as the default (`is_default: true`), the `ShopAddressService` triggers a call to the `GhnService`.
    -   It uses the address details to register the shop with the GHN platform.
    -   Upon successful registration, GHN returns a unique `shop_id`.
    -   This `ghn_shop_id` is then saved in the `shops` table, permanently linking the shop to its GHN account. This ID is required for all subsequent shipping operations like calculating fees and creating delivery orders.

## API Endpoints

---

### Add a Shop Address

-   **Endpoint:** `POST /shop-address`
-   **Description:** Creates a new address for a shop. If `is_default` is true, this will also trigger GHN shop registration.
-   **Auth:** Required (JWT with appropriate seller permissions).
-   **Request Body (`CreateShopAddressDto`):**
    ```json
    {
      "shop_id": 1,
      "name": "Kho chính",
      "phone": "0987654321",
      "email": "kho@shop.com",
      "province": "Hồ Chí Minh",
      "district": "Quận 1",
      "ward": "Phường Bến Nghé",
      "street": "123 Lê Lợi",
      "is_default": true,
      "ghn_province_id": 202,
      "ghn_district_id": 1444,
      "ghn_ward_code": "20301"
    }
    ```
-   **Response:** The created shop address object.

---

### Update a Shop Address

-   **Endpoint:** `PATCH /shop-address/:id`
-   **Description:** Updates the details of an existing shop address.
-   **Auth:** Required (JWT with appropriate seller permissions).
-   **Params:**
    -   `id` (number): The ID of the address to update.
-   **Request Body (`UpdateShopAddressDto`):** Any fields from the create DTO are optional.
    ```json
    {
      "phone": "0999888777",
      "is_default": false
    }
    ```
-   **Response:** The updated shop address object.

---

### Get All Addresses for a Shop

-   **Endpoint:** `GET /shop-address`
-   **Description:** Retrieves a list of all addresses associated with a specific shop.
-   **Auth:** Not required, but typically used by authenticated shop owners/staff.
-   **Query Parameters:**
    -   `shop_id` (number, required): The ID of the shop.
-   **Response:** An array of shop address objects.

---

### Delete a Shop Address

-   **Endpoint:** `DELETE /shop-address/:id`
-   **Description:** Deletes a specific shop address.
-   **Auth:** Required (JWT with appropriate seller permissions).
-   **Params:**
    -   `id` (number): The ID of the address to delete.
-   **Response:** The deleted shop address object.
