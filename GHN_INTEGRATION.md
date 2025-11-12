# Kế hoạch Tích hợp Giao Hàng Nhanh (GHN)

## 1. Mục tiêu

Tích hợp dịch vụ giao hàng của GHN vào nền tảng để cho phép các cửa hàng đăng ký, tạo và quản lý đơn hàng vận chuyển qua GHN.

## 2. Thay đổi Schema Prisma (`prisma/schema.prisma`)

Để hỗ trợ tích hợp GHN, các thay đổi sau cần được thực hiện đối với schema của cơ sở dữ liệu:

1.  **Model `shops`**:
    - Thêm trường `ghn_shop_id` (kiểu `Int`, `unique`, `nullable`) để lưu trữ ID cửa hàng do GHN cung cấp sau khi đăng ký thành công.

2.  **Model `orders`**:
    - Thêm `ghn_order_code` (kiểu `String`, `unique`, `nullable`) để lưu mã vận đơn của GHN.
    - Thêm `ghn_expected_delivery_time` (kiểu `DateTime`, `nullable`) để lưu ngày giao hàng dự kiến.
    - Thêm `ghn_required_note` (kiểu `String`, `nullable`) để lưu các yêu cầu bắt buộc khi giao hàng (ví dụ: `KHONGCHOXEMHANG`).
    - Thêm `shipping_payer` (kiểu `String`, `nullable`, ví dụ: `SELLER` hoặc `BUYER`) để xác định bên thanh toán phí vận chuyển.

3.  **Model `product_variants`**:
    - Thêm các trường sau để tính toán phí vận chuyển. Các trường này nên `nullable` để không ảnh hưởng đến các sản phẩm hiện có.
      - `weight` (kiểu `Int`, đơn vị `gram`)
      - `length` (kiểu `Int`, đơn vị `cm`)
      - `width` (kiểu `Int`, đơn vị `cm`)
      - `height` (kiểu `Int`, đơn vị `cm`)

4.  **Model `addresses` (Địa chỉ người dùng)**:
    - Thêm các trường để lưu mã định danh địa chỉ của GHN, giúp việc tạo đơn hàng chính xác và nhanh chóng.
      - `ghn_province_id` (kiểu `Int`, `nullable`)
      - `ghn_district_id` (kiểu `Int`, `nullable`)
      - `ghn_ward_code` (kiểu `String`, `nullable`)

5.  **Model `shop_addresses` (Địa chỉ cửa hàng)**:
    - Tương tự như `addresses`, thêm các trường mã định danh của GHN.
      - `ghn_province_id` (kiểu `Int`, `nullable`)
      - `ghn_district_id` (kiểu `Int`, `nullable`)
      - `ghn_ward_code` (kiểu `String`, `nullable`)

6.  **Model `shipment_logs` (Mới)**:
    - Tạo model mới để lưu trữ lịch sử chi tiết của quá trình vận chuyển.
      - `id` (Int, primary key)
      - `shipment_id` (Int, foreign key liên kết tới model `shipments`)
      - `status` (String): Trạng thái từ GHN (ví dụ: `delivering`, `picked`, `return`).
      - `location_description` (String, nullable): Mô tả vị trí hoặc tên kho hàng.
      - `updated_at` (DateTime): Thời gian tại thời điểm log được ghi nhận.
      - Tạo quan hệ một-nhiều từ `shipments` đến `shipment_logs`.

## 3. Kế hoạch triển khai Backend

1.  **Tạo Module GHN (`ghn.module.ts`)**:
    - Tạo một `GhnService` để quản lý tất cả các tương tác với API của GHN.
    - Sử dụng `HttpModule` của NestJS để gửi request.
    - Quản lý GHN Token và API endpoint trong file `.env`.

2.  **Quản lý Địa chỉ**:
    - Xây dựng các API endpoint để lấy danh sách Tỉnh/Thành, Quận/Huyện, Phường/Xã từ GHN và cung cấp cho frontend.
    - Cập nhật logic tạo/cập nhật địa chỉ (`addresses` và `shop_addresses`) để lưu lại các mã `id` và `code` tương ứng của GHN.

3.  **Đăng ký Cửa hàng với GHN**:
    - Trong `shop.service`, sau khi một cửa hàng được tạo, thêm chức năng đăng ký cửa hàng đó với GHN bằng cách sử dụng địa chỉ mặc định của cửa hàng.
    - Lưu `ghn_shop_id` trả về vào database.

4.  **Quản lý Dịch vụ Vận chuyển**:
    - Thêm chức năng trong `GhnService` để gọi API của GHN nhằm lấy danh sách các gói dịch vụ vận chuyển hiện có. Điều này cần thiết để tính toán phí và cho phép người dùng lựa chọn.

5.  **Tạo Đơn hàng Vận chuyển**:
    - Trong `order.service`, khi một đơn hàng được xác nhận:
      - Sử dụng `GhnService` để tính toán phí vận chuyển dự kiến (dựa trên gói dịch vụ đã chọn).
      - Tập hợp thông tin cần thiết để gửi cho GHN:
        - **Thông tin gói hàng:** Tự động tổng hợp từ các `order_items`.
          - **Nội dung gói hàng (`content`):** Tạo chuỗi mô tả bằng cách ghép tên các sản phẩm (ví dụ: "Áo thun, Quần jean").
          - **Kích thước & Cân nặng:** Tính tổng cân nặng và ước tính kích thước gói hàng cuối cùng từ các sản phẩm trong đơn.
        - **Thông tin khác:** Địa chỉ người gửi/nhận, tiền CoD, v.v.
      - Gọi API của GHN để tạo đơn hàng vận chuyển.
      - Lưu `ghn_order_code` và các thông tin liên quan vào đơn hàng trong database.

6.  **Quản lý Trạng thái và Lịch sử Đơn hàng**:
    - Xây dựng một endpoint để truy vấn trạng thái đơn hàng từ GHN bằng `ghn_order_code` khi người dùng muốn xem.
    - Khi nhận được dữ liệu, ngoài việc cập nhật trạng thái chung trong model `shipments`, hệ thống sẽ lưu toàn bộ lịch sử vận chuyển (`log` từ GHN) vào model `shipment_logs`.

7.  **Các Chức năng Quản lý Đơn hàng Khác**:
    - Triển khai các chức năng sau thông qua `GhnService` để quản lý đơn hàng hiệu quả:
      - **Hủy đơn hàng** (sử dụng API `/switch-status/cancel`).
      - **Cập nhật thông tin đơn hàng** (sử dụng API `/shipping-order/update`).
      - **Yêu cầu trả hàng** (sử dụng API `/switch-status/return`).

## 4. Các thay đổi cần thiết ở Frontend (Gợi ý)

- Cập nhật form nhập địa chỉ để người dùng có thể chọn Tỉnh/Thành, Quận/Huyện, Phường/Xã từ danh sách lấy từ API, thay vì nhập tay.
- Cung cấp api tỉnh từ backend (backend gọi api của ghn)
- Hiển thị các tùy chọn vận chuyển và mức phí tương ứng từ GHN ở trang thanh toán.
- Hiển thị thông tin theo dõi đơn hàng và trạng thái vận chuyển cho người dùng, bao gồm cả lịch sử các điểm đã đi qua.

## 5. Logic Nghiệp vụ Giỏ hàng và Thanh toán

### 1. Hiển thị Giỏ hàng (Cart Display)

- **Yêu cầu:** API trả về thông tin giỏ hàng phải được cấu trúc để frontend có thể dễ dàng hiển thị sản phẩm gom nhóm theo từng cửa hàng.
- **Logic Backend:**
  - Khi được yêu cầu, `cart.service` sẽ truy vấn tất cả `cart_items` của người dùng.
  - Dữ liệu trả về sẽ được xử lý và sắp xếp:
    1.  Gom nhóm các `cart_items` theo `shop_id` của sản phẩm.
    2.  Trong mỗi nhóm (mỗi shop), các sản phẩm sẽ được sắp xếp theo thời gian thêm vào giỏ hàng (`created_at`) giảm dần.
  - **Cấu trúc trả về (ví dụ):**
    ```json
    [
      {
        "shop_id": 1,
        "shop_name": "Shop A",
        "items": [
          { "product_name": "Sản phẩm mới nhất của Shop A", ... },
          { "product_name": "Sản phẩm cũ hơn của Shop A", ... }
        ]
      },
      {
        "shop_id": 2,
        "shop_name": "Shop B",
        "items": [ ... ]
      }
    ]
    ```

### 2. Xử lý Thanh toán (Checkout)

- **Yêu cầu:** Khi người dùng thanh toán giỏ hàng chứa sản phẩm từ nhiều cửa hàng, hệ thống phải tạo các đơn hàng riêng biệt cho mỗi cửa hàng.
- **Logic Backend:**
  - Khi API checkout được gọi, `order.service` sẽ nhận một danh sách các `cart_item_id` mà người dùng muốn mua.
  - Dịch vụ sẽ gom nhóm các `cart_items` này theo `shop_id`.
  - Với mỗi nhóm sản phẩm thuộc về một shop, hệ thống sẽ tạo một bản ghi `orders` riêng biệt trong database.
  - Mỗi đơn hàng riêng lẻ này sau đó sẽ được xử lý vận chuyển (tạo đơn GHN, v.v.) một cách độc lập.
  - **Ví dụ:** Nếu giỏ hàng có sản phẩm từ Shop A và Shop B, hệ thống sẽ tạo ra 2 đơn hàng: `Order_1` (cho Shop A) và `Order_2` (cho Shop B).
