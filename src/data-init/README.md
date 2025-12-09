# Data Initialization Module

## Overview

This module handles database seeding with two types of data:

1. **Basic Master Data** (automatic on server startup)
2. **Foreign Key Dependent Data** (manual via API calls)

⚠️ **Important:** This is a development utility only. Do not use in production!

## Quick Start

### Method 1: Automatic Script (Recommended)

```powershell
# Windows PowerShell
.\src\data-init\seed-all.ps1

# Or with custom URL
.\src\data-init\seed-all.ps1 http://localhost:3000
```

```bash
# Linux/Mac
./src/data-init/seed-all.sh

# Or with custom URL
./src/data-init/seed-all.sh http://localhost:3000
```

### Method 2: Manual API Calls

See detailed guide in [API_GUIDE.md](./API_GUIDE.md)

### Method 3: Postman Collection

Import `postman_collection.json` into Postman and run requests in order.

## Data Types

### Automatic Seeding (on server startup)

These are seeded automatically when the server starts for the first time:

- ✅ Brands (`brands.json`)
- ✅ Categories (`categorys.json`)
- ✅ Roles (`roles.json`)
- ✅ Permissions (`permissions.json`)
- ✅ Role Permissions (`role_permissions.json`)
- ✅ Admin User
- ✅ Regular Users (`users.json`)
- ✅ Shops
- ✅ Products (`products.json` - with variants and media)
- ✅ Coupons (`coupons.json`)

### Manual Seeding (via API)

These require manual API calls in the correct order to avoid foreign key errors:

1. **Shop Staffs** (`shop_staffs.json`)
   - Dependencies: users, shops
   - Endpoint: `POST /data-init/shop-staffs`

2. **User Addresses** (`addresses.json`)
   - Dependencies: users
   - Endpoint: `POST /data-init/addresses`

3. **Shop Addresses** (`shop_addresses.json`)
   - Dependencies: shops
   - Endpoint: `POST /data-init/shop-addresses`

4. **Carts** (`carts.json`)
   - Dependencies: users
   - Endpoint: `POST /data-init/carts`

5. **Cart Items** (`cart_items.json`)
   - Dependencies: carts, products, product_variants
   - Endpoint: `POST /data-init/cart-items`

6. **Orders** (`orders.json`)
   - Dependencies: users, shops, products, addresses, shop_addresses
   - Endpoint: `POST /data-init/orders`
   - Also creates: order_items, payments, shipments

## Why Split Data Seeding?

**Problem:** Foreign key dependencies cause errors when seeding data with hardcoded IDs.

**Example:**
- `shop_staffs.json` has `user_id: 3`
- But in your database, that user might have `id: 5`
- This causes foreign key constraint error!

**Solution:**
1. Automatic seeding creates users/shops first (with auto-increment IDs)
2. You check actual IDs in database
3. Update JSON files with correct IDs
4. Call APIs to seed dependent data

## Workflow

```
Server Startup
    ↓
Automatic Seed (brands, categories, users, shops, products)
    ↓
Check Database for actual IDs
    ↓
Update JSON files if needed
    ↓
Call API #1: Shop Staffs
    ↓
Call API #2: Addresses
    ↓
Call API #3: Shop Addresses
    ↓
Call API #4: Carts
    ↓
Call API #5: Cart Items
    ↓
Call API #6: Orders
    ↓
Complete! Database ready for use
```

## Files Structure

```
data-init/
├── README.md                    # This file
├── API_GUIDE.md                 # Detailed API usage guide
├── postman_collection.json      # Postman collection for testing
├── seed-all.ps1                 # PowerShell automation script
├── seed-all.sh                  # Bash automation script
├── data-init.controller.ts      # API endpoints
├── data-init.service.ts         # Seeding logic
├── s3-upload.service.ts         # S3 utilities
├── brands.json                  # Brand data
├── categorys.json               # Category data (with hierarchy)
├── roles.json                   # User roles
├── permissions.json             # Permissions
├── role_permissions.json        # Role-permission mappings
├── users.json                   # Test users
├── products.json                # Products with variants & media
├── coupons.json                 # Discount coupons
├── shop_staffs.json            # Shop staff assignments
├── addresses.json              # User delivery addresses
├── shop_addresses.json         # Shop pickup addresses
├── carts.json                  # Shopping carts
├── cart_items.json             # Cart items
└── orders.json                 # Orders with items & payments
```

## API Endpoints

| Endpoint | Method | Description | Dependencies |
|----------|--------|-------------|--------------|
| `/data-init/shop-staffs` | POST | Create shop staff assignments | users, shops |
| `/data-init/addresses` | POST | Create user addresses | users |
| `/data-init/shop-addresses` | POST | Create shop addresses | shops |
| `/data-init/carts` | POST | Create shopping carts | users |
| `/data-init/cart-items` | POST | Create cart items | carts, products |
| `/data-init/orders` | POST | Create orders (+ items, payments, shipments) | users, shops, products, addresses |
| `/data-init/upload-brand-logos` | POST | Upload brand logos to S3 | - |

## Error Handling

All manual seeding APIs return detailed responses:

```json
{
  "success": true,
  "message": "Đã tạo 4/4 shop staffs",
  "successCount": 4,
  "errorCount": 0
}
```

If a foreign key is missing:
- Record is skipped with warning log
- `errorCount` is incremented
- Process continues with next record

## Idempotency

All seeding operations check if data exists before inserting:

```typescript
const existingCount = await this.prisma.table.count();
if (existingCount > 0) {
  return { success: false, message: 'Data already exists' };
}
```

## S3 Brand Logo Upload

**Endpoint:** `POST /data-init/upload-brand-logos`

Uploads brand logos from local `uploads/brands/` to S3 bucket.

**Response:**
```json
        }
        ```
    -   **Error:**
        ```json
        {
          "success": false,
          "message": "Failed to upload brand logos",
          "error": "Error message details..."
        }
        ```
