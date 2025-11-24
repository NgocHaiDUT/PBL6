# Payment Module

## Overview

This module handles all payment-related logic, providing a flexible and extensible architecture for integrating various payment gateways. It is designed using the **Strategy Pattern** to allow for easy addition of new payment methods in the future.

Currently, it supports:
-   **VNPAY**: Online payment gateway.
-   **COD**: Cash on Delivery (handled by the Order module).

## Architecture

The module is built around a few key components:

-   `PaymentStrategy` (`src/payment/strategies/payment.strategy.ts`): An abstract class that defines a common interface (a "contract") for all payment services. It mandates methods like `createPaymentUrl`, `handleIpn`, and `verifyReturn`.
-   **Concrete Strategies** (`src/payment/strategies/`): These are the specific implementations for each payment gateway.
    -   `VnpayService`: Implements the `PaymentStrategy` for VNPAY, using the `nestjs-vnpay` library internally.
-   `PaymentFactory` (`src/payment/payment.factory.ts`): A service responsible for selecting the correct payment strategy based on the `payment_method` string (e.g., `'vnpay'`) provided during checkout.
-   `PaymentController` (`src/payment/payment.controller.ts`): Handles incoming webhooks and redirects from payment gateways (Return URL and IPN URL).

## Configuration

To use the VNPAY integration, you must add the following variables to your `.env` file:

```env
# VNPAY API Configuration
VNPAY_TMN_CODE="YOUR_TMN_CODE"
VNPAY_HASH_SECRET="YOUR_HASH_SECRET"
VNPAY_URL="https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
VNPAY_RETURN_URL="http://localhost:3000/payment/vnpay-return"

# Frontend URL for redirects
FRONTEND_URL="http://localhost:5173"
```

## VNPAY Payment Flow

The payment flow involves the user's browser, our backend, and VNPAY's servers.

### 1. Payment Initiation

1.  **Frontend**: The user finalizes their cart and calls the `POST /order/create` endpoint with `"payment_method": "vnpay"`.
2.  **Backend (`OrderService`**):
    -   Creates the order in the database with a `payment_status` of `pending`.
    -   Calls the `PaymentFactory` to get the `VnpayService`.
    -   Calls the `createPaymentUrl` method on the service, passing the order details (amount, ID, etc.).
3.  **Backend Response**: The API responds to the frontend with a JSON object containing a `paymentUrl`.
4.  **Frontend**: The frontend receives the `paymentUrl` and **redirects the user's browser** to this VNPAY URL.

### 2. User Pays on VNPAY

-   The user completes the payment process on the VNPAY gateway.
-   After completion, VNPAY does two things simultaneously:
    a. Redirects the user's browser back to the `VNPAY_RETURN_URL`.
    b. Sends a server-to-server request to our IPN (Instant Payment Notification) endpoint.

### 3. Handling the Return URL

-   **Endpoint:** `GET /payment/vnpay-return`
-   **Purpose:** To provide immediate feedback to the user.
-   **Process:**
    1.  VNPAY redirects the user's browser to this endpoint with transaction details in the query parameters.
    2.  The `PaymentController` calls the `VnpayService` to verify the secure hash of the response. This confirms the data has not been tampered with.
    3.  The controller **does not update the database**. It is not a reliable source of truth.
    4.  It redirects the user to a success or failure page on the frontend (e.g., `http://localhost:5173/checkout/success`).

### 4. Handling the IPN URL (Source of Truth)

-   **Endpoint:** `GET /payment/vnpay-ipn`
-   **Purpose:** To reliably confirm the payment status and update the order.
-   **Process:**
    1.  VNPAY's servers send a direct, server-to-server GET request to this endpoint.
    2.  The `PaymentController` calls the `VnpayService` to handle the IPN.
    3.  The `VnpayService` performs the following critical checks:
        a. **Verifies the secure hash** to ensure the request is genuinely from VNPAY.
        b. **Checks the database** for the corresponding order (`vnp_TxnRef`).
        c. **Verifies the amount** (`vnp_Amount`) matches the order's `total_amount`.
        d. **Checks if the order is already paid** to prevent duplicate processing.
    4.  If all checks pass and the payment was successful (`vnp_ResponseCode: '00'`), the service updates the `orders.payment_status` to `'paid'`.
    5.  The endpoint responds to VNPAY with a JSON object (`{ "RspCode": "00", "Message": "Success" }`) to acknowledge receipt. If this acknowledgment is not sent, VNPAY may send the IPN request again.
