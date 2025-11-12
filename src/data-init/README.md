# Data Initialization Module

## Overview

This module is a development utility designed to seed the database with initial master data. It is not intended for use in a production environment or by end-users. Its primary purpose is to set up a fresh database with necessary data for the application to run correctly.

## Features

-   **Database Seeding**: Populates the database with initial data for:
    -   Brands (`brands.json`)
    -   Product Categories (`categorys.json`)
    -   User Roles (`roles.json`)
    -   Permissions (`permissions.json`)
    -   Role-Permission Mappings (`role_permissions.json`)
    -   A sample Shop and Owner
    -   Sample Products (`products.json`)
-   **Idempotent**: The seeding process checks if data already exists in the tables before inserting, preventing duplicate entries on subsequent runs.
-   **S3 Asset Upload**: Includes a utility service and an endpoint to upload brand logos from a local directory (`uploads/brands`) to the configured AWS S3 bucket.

## Workflow & Usage

### Database Seeding

The main functionality of this module is executed via a command line script, not through a standard API endpoint.

1.  **Prepare Data**: The data to be seeded is stored in JSON files located in the `src/data-init/` directory.
2.  **Run the Seed Script**: To populate the database, run the following npm script from the project's root directory:
    ```bash
    npm run seed
    ```
3.  **Process**:
    -   This command executes the `seed.ts` file.
    -   The script bootstraps a standalone NestJS application context to gain access to the application's services.
    -   It retrieves an instance of `DataInitService` and calls the `seedData()` method.
    -   The service then reads the JSON files and systematically creates records in the database, logging its progress to the console.

### S3 Brand Logo Upload

This module also provides a manual way to upload brand logos to your S3 bucket, which is useful for initial environment setup.

-   **Endpoint:** `POST /data-init/upload-brand-logos`
-   **Description:** Reads all PNG files from the local `uploads/brands` directory and uploads them to the `brands/` folder in the configured S3 bucket.
-   **Auth:** None. This is a development utility.
-   **Request:** (No body needed)
-   **Response:**
    -   **Success (201):**
        ```json
        {
          "success": true,
          "message": "Brand logos uploaded to S3 successfully"
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
