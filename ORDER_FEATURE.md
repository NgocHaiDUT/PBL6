# Kế hoạch chi tiết xây dựng chức năng Đặt hàng

Dựa trên các yêu cầu mới, kế hoạch này tập trung vào việc tích hợp đơn vị vận chuyển Giao Hàng Nhanh (GHN), tối ưu hóa quy trình xử lý đơn hàng và loại bỏ sự phụ thuộc vào webhook.

---

### Giai đoạn 1: Hoàn thiện Luồng Đặt hàng & Tích hợp GHN

Mục tiêu của giai đoạn này là xây dựng một luồng đặt hàng vững chắc, xử lý tồn kho chính xác và tích hợp API của GHN để đăng đơn vận chuyển tự động.

#### 1. Thay đổi CSDL (`schema.prisma`)

Để tích hợp GHN và tính toán phí vận chuyển chính xác, chúng ta cần bổ sung các trường sau:

- **Trong model `product_variants`:** Thêm các trường về kích thước và trọng lượng. GHN yêu cầu các thông tin này để tính phí.
  ```prisma
  model product_variants {
    // ... các trường hiện có
    weight           Int?     @default(100) // gram
    length           Int?     @default(10)  // cm
    width            Int?     @default(10)  // cm
    height           Int?     @default(10)  // cm
  }
  ```

- **Trong model `shipments`:** Thêm các trường dành riêng cho GHN.
  ```prisma
  model shipments {
    // ... các trường hiện có
    carrier_service_id  String? // ID dịch vụ của GHN (ví dụ: standard, fast)
    ghn_order_code      String? @unique // Mã vận đơn từ GHN
    ghn_required_note   String? // Ghi chú yêu cầu của GHN (CHOTHUHANG, CHOXEMHANGKHONGTHU)
  }
  ```

#### 2. Tối ưu hóa xử lý đơn hàng (`order.service.ts`)

Luồng `createOrderFromCart` cần được cải tiến để đảm bảo tính toàn vẹn dữ liệu, đặc biệt là khi xử lý nhiều sản phẩm trong một đơn hàng của shop.

- **Transaction cho mỗi Shop:** Giữ nguyên logic xử lý mỗi shop trong một transaction riêng biệt.
- **Bên trong mỗi transaction:**
  1.  **Lock sản phẩm:** Dùng `SELECT ... FOR UPDATE` (thông qua `findUnique` hoặc `findFirst` của Prisma trong một transaction) để khóa các hàng `product_variants` liên quan đến đơn hàng, tránh tình trạng "race condition" khi nhiều người dùng cùng đặt một sản phẩm.
  2.  **Kiểm tra tồn kho (Stock Validation):** Lặp qua từng `cartItem`, kiểm tra `product_variants.stock >= cartItem.quantity`. Nếu bất kỳ sản phẩm nào không đủ hàng, toàn bộ transaction sẽ được `rollback` và báo lỗi cho người dùng.
  3.  **Tạo các record:** Tạo `orders`, `order_items`, `payments` như logic hiện tại.
  4.  **Trừ kho (Stock Deduction):** Sau khi kiểm tra thành công, lặp lại và trừ số lượng `quantity` khỏi `product_variants.stock` cho mỗi sản phẩm đã đặt.
  5.  **Hoàn thành transaction.**

#### 3. Tích hợp API GHN

- **Tạo `GhnService`:**
  - Tạo một module và service mới (`ghn.module.ts`, `ghn.service.ts`) để đóng gói tất cả các tương tác với API của GHN.
  - Service này sẽ có các phương thức như `registerOrder()`, `calculateFee()`, `getOrderDetail()`.
- **Cập nhật `OrderService`:**
  - Sau khi transaction tạo đơn hàng trong database thành công:
  - Gọi `ghnService.registerOrder()` với thông tin từ đơn hàng (địa chỉ người nhận, địa chỉ shop, danh sách sản phẩm, tổng trọng lượng, giá trị đơn hàng).
  - Nhận về `ghn_order_code` (mã vận đơn) từ GHN.
  - Cập nhật `ghn_order_code` vào record `shipments` tương ứng của đơn hàng vừa tạo.

---

### Giai đoạn 2: Cập nhật Trạng thái Đơn hàng (Không dùng Webhook)

Thay vì dùng webhook, chúng ta sẽ chủ động gọi API để cập nhật và đồng bộ trạng thái.

1.  **Cập nhật từ Backend (Do Seller/Admin thực hiện):**
    - Seller/Admin cập nhật trạng thái đơn hàng (`confirmed`, `processing`) qua giao diện quản trị.
    - Giao diện này gọi API `POST /seller/orders/:id/status` (đã có), backend sẽ cập nhật trạng thái vào `orders.status`.

2.  **Đồng bộ Trạng thái từ GHN (API Polling):**
    - **Tạo endpoint `POST /orders/:id/sync-ghn-status`:**
      - Endpoint này (có thể được gọi bởi một cron job hoặc admin) sẽ lấy `ghn_order_code` đã lưu.
      - Gọi API `GetOrderDetail` của GHN để lấy trạng thái mới nhất.
      - Ánh xạ trạng thái của GHN (vd: `ready_to_pick`, `picking`, `delivering`, `delivered`) sang `order_status` và `shipment_status` của hệ thống và cập nhật vào database.
    - **Tự động đồng bộ khi người dùng xem chi tiết:**
      - Trong `OrderService.getOrderById`, trước khi trả về dữ liệu, có thể kích hoạt một tiến trình không đồng bộ (async) để gọi logic `sync-ghn-status` ở trên. Điều này giúp dữ liệu người dùng thấy luôn được cập nhật ở mức tương đối.

---

### Giai đoạn 3: Tích hợp Thanh toán Online (Chờ phát triển)

Khi triển khai, luồng thanh toán online sẽ được thiết kế để không cần webhook.

1.  **Tạo Payment Intent:**
    - Người dùng chọn thanh toán online, backend tạo một `payment` record với `status: 'pending'`.
    - Backend gọi API của cổng thanh toán (VNPay, MoMo), nhận về một URL/mã QR.
    - Client redirect người dùng hoặc hiển thị mã QR.
2.  **Kiểm tra trạng thái thanh toán (Polling):**
    - Sau khi người dùng hoàn thành thanh toán trên trang của cổng thanh toán và được redirect lại, client bắt đầu gọi định kỳ (ví dụ, mỗi 3 giây trong vòng 1 phút) tới một endpoint của chúng ta: `GET /order/:id/payment-status`.
    - Backend nhận yêu cầu này, gọi API của cổng thanh toán để xác minh trạng thái giao dịch.
    - Nếu thành công, backend cập nhật `payments.status` và `orders.payment_status` thành `paid` và trả về kết quả cho client. Client dừng polling và hiển thị trang đặt hàng thành công.

---

### Giai đoạn 4: Hoàn thiện các chức năng khác

- **Quản lý Hủy/Trả hàng:**
  - Khi một đơn hàng bị hủy (`cancelled`) hoặc hoàn tiền (`refunded`), cần có logic để **cộng lại số lượng sản phẩm** vào `product_variants.stock`. Logic này cũng nên nằm trong một transaction để đảm bảo an toàn.
- **Coupons & Notifications:**
  - Vẫn giữ nguyên kế hoạch tích hợp mã giảm giá và gửi thông báo cho người dùng khi trạng thái đơn hàng thay đổi.