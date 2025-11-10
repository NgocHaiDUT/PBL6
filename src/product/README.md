# Product Module

## Overview

This is a core module that manages the entire product catalog, including brands, categories, products, variants, and media. It also handles user-specific e-commerce interactions such as wishlists and the shopping cart.

## Features

-   **Catalog Management (Admin/Seller)**: Provides endpoints for admins and sellers to perform CRUD (Create, Read, Update, Delete) operations on brands, categories, products, and their variants/media.
-   **Product Discovery (Customer)**: Offers public-facing endpoints for customers to list, search, filter, and view detailed information about products.
-   **Wishlist Management**: Allows authenticated users to add products to a personal wishlist and view it later.
-   **Shopping Cart**: Implements the essential e-commerce shopping cart functionality, including adding, viewing, updating quantities, and removing items.
-   **Multi-Shop Cart**: The cart is designed to handle items from multiple different shops in a single session. The `getCart` endpoint groups items by shop, which is a critical feature for the multi-shop checkout process in the `Order` module.

---

## 1. Catalog Management APIs (Admin/Seller)

These endpoints are typically restricted to users with administrative or seller permissions.

### Get All Brands

-   **Endpoint:** `GET /product/all-brands`
-   **Description:** Retrieves a list of all product brands.

### Add a New Brand

-   **Endpoint:** `POST /product/add-brand`
-   **Description:** Adds a new brand. Requires `manage_brands` permission.
-   **Request:** `multipart/form-data` with fields `userid`, `name`, `slug`, and a `file` for the logo.

### Get All Categories

-   **Endpoint:** `GET /product/all-categories`
-   **Description:** Retrieves a list of all product categories.

### Add a New Category

-   **Endpoint:** `POST /product/add-category`
-   **Description:** Adds a new product category. Requires `manage_categorys` permission.
-   **Request Body:** `{ "userid": 1, "name": "Skincare", "slug": "skincare", "parent_id": null }`

### Add a New Product

-   **Endpoint:** `POST /product/add-product`
-   **Description:** Creates a new product within a specific shop. Requires `create_product` permission and shop ownership/staff status.
-   **Request Body:**
    ```json
    {
      "user_id": 2,
      "shop_id": 1,
      "name": "Hydrating Serum",
      "slug": "hydrating-serum",
      "skin_type_compat": "all",
      "is_published": true,
      "description": "A serum for all skin types.",
      "brand_id": 1,
      "category_ids": [2, 5]
    }
    ```

### Add a Product Variant

-   **Endpoint:** `POST /product/add-product-variant`
-   **Description:** Adds a new variant (e.g., size, color) to an existing product.
-   **Request Body:**
    ```json
    {
      "product_id": 1,
      "sku": "HS-50ML",
      "name": "50ml",
      "price": "500000",
      "stock": "100"
    }
    ```

### Get Products by Shop

-   **Endpoint:** `GET /product/shop/:shopId/products`
-   **Description:** Retrieves a paginated and filterable list of products belonging to a specific shop.
-   **Params:** `shopId` (number).
-   **Query Parameters:** `page`, `limit`, `search`, `category_id`, `brand_id`, `min_price`, `max_price`, `sort_field`, etc.

---

## 2. Product Discovery APIs (Customer)

### Get All Products

-   **Endpoint:** `GET /product/products`
-   **Description:** Retrieves a paginated list of all published and approved products. Supports filtering and sorting.
-   **Query Parameters:** `page`, `limit`, `category`, `brand`, `min_price`, `max_price`, `sort`.

### Get Product by ID

-   **Endpoint:** `GET /product/products/:id`
-   **Description:** Retrieves detailed information for a single product.

---

## 3. Wishlist APIs

### Add to Wishlist

-   **Endpoint:** `POST /product/wishlist/add`
-   **Description:** Adds a product to the user's wishlist.
-   **Auth:** Required (JWT).
-   **Request Body:** `{ "productId": 1, "userId": 1 }` (userId is optional, taken from JWT).

### Remove from Wishlist

-   **Endpoint:** `DELETE /product/wishlist/remove/:productId`
-   **Description:** Removes a product from the user's wishlist.
-   **Auth:** Required (JWT).

### Get Wishlist

-   **Endpoint:** `GET /product/wishlist`
-   **Description:** Retrieves all items in the user's wishlist.
-   **Auth:** Required (JWT).

---

## 4. Shopping Cart APIs

### Add to Cart

-   **Endpoint:** `POST /product/cart/add`
-   **Description:** Adds a specific product variant to the user's shopping cart. If the item already exists, its quantity is increased.
-   **Auth:** Required (JWT).
-   **Request Body:**
    ```json
    {
      "productId": 1,
      "variantId": 2,
      "quantity": 1,
      "userId": 1
    }
    ```

### Get Cart Contents

-   **Endpoint:** `GET /product/cart`
-   **Description:** Retrieves the contents of the user's cart, grouped by shop. This is the primary endpoint used before checkout.
-   **Auth:** Required (JWT).
-   **Query Parameters:** `userId` (number).
-   **Response:**
    ```json
    {
      "success": true,
      "cart": [
        {
          "shop_id": 1,
          "shop_name": "Beauty Store",
          "items": [
            {
              "id": 1,
              "product_id": 1,
              "name": "Hydrating Serum",
              "price": 500000,
              "quantity": 2,
              "image_url": "/uploads/products/serum.jpg"
            }
          ]
        },
        {
          "shop_id": 2,
          "shop_name": "Skincare World",
          "items": [
            {
              "id": 2,
              "product_id": 10,
              "name": "Sunscreen SPF 50",
              "price": 350000,
              "quantity": 1,
              "image_url": "/uploads/products/sunscreen.jpg"
            }
          ]
        }
      ]
    }
    ```

### Update Cart Item Quantity

-   **Endpoint:** `PUT /product/cart/items/:itemId`
-   **Description:** Updates the quantity of a specific item in the cart.
-   **Auth:** Required (JWT).
-   **Request Body:** `{ "quantity": 3 }`

### Remove from Cart

-   **Endpoint:** `DELETE /product/cart/items/:itemId`
-   **Description:** Removes a specific item from the cart.
-   **Auth:** Required (JWT).
