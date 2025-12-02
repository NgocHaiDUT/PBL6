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
-   **Request:** `multipart/form-data` with fields `name`, `slug`, and a `file` for the logo.
-   **Auth:** Required (JWT).

### Edit Brand Name

-   **Endpoint:** `POST /product/edit-brand-name`
-   **Description:** Updates the name of an existing brand. Requires `manage_brands` permission.
-   **Auth:** Required (JWT).
-   **Request Body:** `{ "id": "1", "name": "New Brand Name" }`

### Edit Brand Slug

-   **Endpoint:** `POST /product/edit-brand-slug`
-   **Description:** Updates the slug of an existing brand. Requires `manage_brands` permission.
-   **Auth:** Required (JWT).
-   **Request Body:** `{ "id": "1", "slug": "new-brand-slug" }`

### Edit Brand Logo

-   **Endpoint:** `POST /product/edit-brand-logo`
-   **Description:** Updates the logo of an existing brand. Requires `manage_brands` permission.
-   **Auth:** Required (JWT).
-   **Request:** `multipart/form-data` with fields `id` and a `file` for the new logo.

### Get All Categories

-   **Endpoint:** `GET /product/all-categories`
-   **Description:** Retrieves a list of all product categories.

### Add a New Category

-   **Endpoint:** `POST /product/add-category`
-   **Description:** Adds a new product category. Requires `manage_categorys` permission.
-   **Auth:** Required (JWT).
-   **Request Body:** `{ "name": "Skincare", "slug": "skincare", "parent_id": "1" }` (parent_id is optional)

### Edit Category Name

-   **Endpoint:** `POST /product/edit-category-name`
-   **Description:** Updates the name of an existing category. Requires `manage_categorys` permission.
-   **Auth:** Required (JWT).
-   **Request Body:** `{ "id": "1", "name": "New Category Name" }`

### Edit Category Slug

-   **Endpoint:** `POST /product/edit-category-slug`
-   **Description:** Updates the slug of an existing category. Requires `manage_categorys` permission.
-   **Auth:** Required (JWT).
-   **Request Body:** `{ "id": "1", "slug": "new-category-slug" }`

### Add a New Product

-   **Endpoint:** `POST /product/add-product`
-   **Description:** Creates a new product within a specific shop. Requires `create_product` permission and shop ownership/staff status.
-   **Auth:** Required (JWT).
-   **Request Body:**
    ```json
    {
      "shop_id": "1",
      "name": "Hydrating Serum",
      "slug": "hydrating-serum",
      "skin_type_compat": "normal",
      "is_published": true,
      "description": "A serum for all skin types.",
      "how_to_use": "Apply 2-3 drops to clean skin.",
      "brand_id": "1",
      "category_ids": ["2", "5"]
    }
    ```
-   **Valid skin_type_compat values:** `unknown`, `normal`, `oily`, `dry`, `combination`, `sensitive`

### Edit Product

-   **Endpoint:** `PUT /product/edit-product/:id`
-   **Description:** Updates an existing product. Requires `edit_product` permission.
-   **Auth:** Required (JWT).
-   **Params:** `id` (product ID).
-   **Request Body:** (all fields are optional)
    ```json
    {
      "name": "Updated Product Name",
      "slug": "updated-slug",
      "description": "Updated description",
      "how_to_use": "Updated instructions",
      "skin_type_compat": "combination",
      "is_published": false,
      "brand_id": "2",
      "category_ids": ["3", "6"]
    }
    ```

### Delete Product

-   **Endpoint:** `DELETE /product/delete-product/:id`
-   **Description:** Deletes a product. Requires `delete_product` permission.
-   **Auth:** Required (JWT).
-   **Params:** `id` (product ID).

### Add a Product Variant

-   **Endpoint:** `POST /product/add-product-variant`
-   **Description:** Adds a new variant (e.g., size, color) to an existing product.
-   **Request Body:**
    ```json
    {
      "product_id": "1",
      "sku": "HS-50ML",
      "name": "50ml",
      "price": "500000",
      "stock": "100",
      "shade_hex": "#FF5733",
      "size_label": "50ml",
      "compare_at_price": "600000"
    }
    ```
-   **Note:** Only `product_id`, `sku`, `name`, and `price` are required. Other fields are optional.

### Edit Product Variant

-   **Endpoint:** `PUT /product/edit-product-variant/:id`
-   **Description:** Updates an existing product variant. Requires `edit_product` permission.
-   **Auth:** Required (JWT).
-   **Params:** `id` (variant ID).
-   **Request Body:** (all fields are optional)
    ```json
    {
      "sku": "HS-100ML",
      "name": "100ml",
      "price": "800000",
      "stock": "50",
      "shade_hex": "#00FF00",
      "size_label": "100ml",
      "compare_at_price": "1000000",
      "is_active": true
    }
    ```

### Delete Product Variant

-   **Endpoint:** `DELETE /product/delete-product-variant/:id`
-   **Description:** Deletes a product variant. Requires `delete_product` permission.
-   **Auth:** Required (JWT).
-   **Params:** `id` (variant ID).

### Add Product Media

-   **Endpoint:** `POST /product/add-product-media`
-   **Description:** Adds an image or video to a product.
-   **Request:** `multipart/form-data` with a `file` and query parameters.
-   **Query Parameters:**
    -   `product_id` (required): The product ID
    -   `type` (optional): Media type (`image` or `video`, default: `image`)
    -   `sort_order` (optional): Display order (default: `0`)
-   **Example:** `POST /product/add-product-media?product_id=1&type=image&sort_order=1`

### Get Products by Shop

-   **Endpoint:** `GET /product/shop/:shopId/products`
-   **Description:** Retrieves a paginated and filterable list of products belonging to a specific shop.
-   **Params:** `shopId` (number).
-   **Query Parameters:** `page`, `limit`, `search`, `category_id`, `brand_id`, `min_price`, `max_price`, `sort_field`, etc.

---

## 2. Product Discovery APIs (Customer)

### Get All Products

-   **Endpoint:** `GET /product/all-products`
-   **Description:** Retrieves a paginated list of all products with advanced filtering options.
-   **Query Parameters:**
    -   `page` (default: 1): Page number
    -   `limit` (default: 20): Items per page
    -   `category`: Filter by category slug
    -   `brand`: Filter by brand slug
    -   `minPrice`: Minimum price filter
    -   `maxPrice`: Maximum price filter
    -   `minRating`: Minimum rating filter
    -   `search`: Search keyword in product name/description
-   **Example:** `GET /product/all-products?page=1&limit=20&category=skincare&brand=cerave&minPrice=100000&maxPrice=500000&minRating=4`

### Get Product by ID

-   **Endpoint:** `GET /product/product/:id`
-   **Description:** Retrieves detailed information for a single product including variants, media, categories, and brand.

---

## 3. Wishlist APIs

**Note:** These APIs are planned but not yet implemented in the current version.

### Add to Wishlist

-   **Endpoint:** `POST /product/wishlist/add` _(Coming Soon)_
-   **Description:** Adds a product to the user's wishlist.
-   **Auth:** Required (JWT).
-   **Request Body:** `{ "productId": 1 }`

### Remove from Wishlist

-   **Endpoint:** `DELETE /product/wishlist/remove/:productId` _(Coming Soon)_
-   **Description:** Removes a product from the user's wishlist.
-   **Auth:** Required (JWT).

### Get Wishlist

-   **Endpoint:** `GET /product/wishlist` _(Coming Soon)_
-   **Description:** Retrieves all items in the user's wishlist.
-   **Auth:** Required (JWT).

---

## 4. Shopping Cart APIs

**Note:** These APIs are planned but not yet implemented in the current version.

### Add to Cart

-   **Endpoint:** `POST /product/cart/add` _(Coming Soon)_
-   **Description:** Adds a specific product variant to the user's shopping cart. If the item already exists, its quantity is increased.
-   **Auth:** Required (JWT).
-   **Request Body:**
    ```json
    {
      "productId": 1,
      "variantId": 2,
      "quantity": 1
    }
    ```

### Get Cart Contents

-   **Endpoint:** `GET /product/cart` _(Coming Soon)_
-   **Description:** Retrieves the contents of the user's cart, grouped by shop. This is the primary endpoint used before checkout.
-   **Auth:** Required (JWT).
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

-   **Endpoint:** `PUT /product/cart/items/:itemId` _(Coming Soon)_
-   **Description:** Updates the quantity of a specific item in the cart.
-   **Auth:** Required (JWT).
-   **Request Body:** `{ "quantity": 3 }`

### Remove from Cart

-   **Endpoint:** `DELETE /product/cart/items/:itemId` _(Coming Soon)_
-   **Description:** Removes a specific item from the cart.
-   **Auth:** Required (JWT).
