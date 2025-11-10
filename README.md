<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

# Kế hoạch Tích hợp Giao Hàng Nhanh (GHN)

## 1. Mục tiêu

Tích hợp dịch vụ giao hàng của GHN vào nền tảng để cho phép các cửa hàng đăng ký, tạo và quản lý đơn hàng vận chuyển qua GHN.

## 2. Thay đổi Schema Prisma (`prisma/schema.prisma`)

Để hỗ trợ tích hợp GHN, các thay đổi sau cần được thực hiện đối với schema của cơ sở dữ liệu:

1.  **Model `shops`**:
    *   Thêm trường `ghn_shop_id` (kiểu `Int`, `unique`, `nullable`) để lưu trữ ID cửa hàng do GHN cung cấp sau khi đăng ký thành công.

2.  **Model `orders`**:
    *   Thêm `ghn_order_code` (kiểu `String`, `unique`, `nullable`) để lưu mã vận đơn của GHN.
    *   Thêm `ghn_expected_delivery_time` (kiểu `DateTime`, `nullable`) để lưu ngày giao hàng dự kiến.
    *   Thêm `ghn_required_note` (kiểu `String`, `nullable`) để lưu các yêu cầu bắt buộc khi giao hàng (ví dụ: `KHONGCHOXEMHANG`).
    *   Thêm `shipping_payer` (kiểu `String`, `nullable`, ví dụ: `SELLER` hoặc `BUYER`) để xác định bên thanh toán phí vận chuyển.

3.  **Model `product_variants`**:
    *   Thêm các trường sau để tính toán phí vận chuyển. Các trường này nên `nullable` để không ảnh hưởng đến các sản phẩm hiện có.
        *   `weight` (kiểu `Int`, đơn vị `gram`)
        *   `length` (kiểu `Int`, đơn vị `cm`)
        *   `width` (kiểu `Int`, đơn vị `cm`)
        *   `height` (kiểu `Int`, đơn vị `cm`)

4.  **Model `addresses` (Địa chỉ người dùng)**:
    *   Thêm các trường để lưu mã định danh địa chỉ của GHN, giúp việc tạo đơn hàng chính xác và nhanh chóng.
        *   `ghn_province_id` (kiểu `Int`, `nullable`)
        *   `ghn_district_id` (kiểu `Int`, `nullable`)
        *   `ghn_ward_code` (kiểu `String`, `nullable`)

5.  **Model `shop_addresses` (Địa chỉ cửa hàng)**:
    *   Tương tự như `addresses`, thêm các trường mã định danh của GHN.
        *   `ghn_province_id` (kiểu `Int`, `nullable`)
        *   `ghn_district_id` (kiểu `Int`, `nullable`)
        *   `ghn_ward_code` (kiểu `String`, `nullable`)

6.  **Model `shipment_logs` (Mới)**:
    *   Tạo model mới để lưu trữ lịch sử chi tiết của quá trình vận chuyển.
        *   `id` (Int, primary key)
        *   `shipment_id` (Int, foreign key liên kết tới model `shipments`)
        *   `status` (String): Trạng thái từ GHN (ví dụ: `delivering`, `picked`, `return`).
        *   `location_description` (String, nullable): Mô tả vị trí hoặc tên kho hàng.
        *   `updated_at` (DateTime): Thời gian tại thời điểm log được ghi nhận.
        *   Tạo quan hệ một-nhiều từ `shipments` đến `shipment_logs`.

## 3. Kế hoạch triển khai Backend

1.  **Tạo Module GHN (`ghn.module.ts`)**:
    *   Tạo một `GhnService` để quản lý tất cả các tương tác với API của GHN.
    *   Sử dụng `HttpModule` của NestJS để gửi request.
    *   Quản lý GHN Token và API endpoint trong file `.env`.

2.  **Quản lý Địa chỉ**:
    *   Xây dựng các API endpoint để lấy danh sách Tỉnh/Thành, Quận/Huyện, Phường/Xã từ GHN và cung cấp cho frontend.
    *   Cập nhật logic tạo/cập nhật địa chỉ (`addresses` và `shop_addresses`) để lưu lại các mã `id` và `code` tương ứng của GHN.

3.  **Đăng ký Cửa hàng với GHN**:
    *   Trong `shop.service`, sau khi một cửa hàng được tạo, thêm chức năng đăng ký cửa hàng đó với GHN bằng cách sử dụng địa chỉ mặc định của cửa hàng.
    *   Lưu `ghn_shop_id` trả về vào database.

4.  **Tạo Đơn hàng Vận chuyển**:
    *   Trong `order.service`, khi một đơn hàng được xác nhận:
        *   Sử dụng `GhnService` để tính toán phí vận chuyển dự kiến.
        *   Tập hợp thông tin cần thiết (địa chỉ người gửi/nhận, thông tin gói hàng, tiền CoD).
        *   Gọi API của GHN để tạo đơn hàng vận chuyển.
        *   Lưu `ghn_order_code` và các thông tin liên quan vào đơn hàng trong database.

5.  **Theo dõi và Cập nhật Trạng thái Đön hàng**:
    *   Xây dựng một endpoint để truy vấn trạng thái đơn hàng từ GHN bằng `ghn_order_code`.
    *   Khi nhận được dữ liệu, ngoài việc cập nhật trạng thái chung trong model `shipments`, hệ thống sẽ lưu toàn bộ lịch sử vận chuyển (`log` từ GHN) vào model `shipment_logs`.
    *   (Tùy chọn nâng cao) Thiết lập Webhook để GHN có thể tự động cập nhật trạng thái và lịch sử đơn hàng.

## 4. Các thay đổi cần thiết ở Frontend (Gợi ý)

*   Cập nhật form nhập địa chỉ để người dùng có thể chọn Tỉnh/Thành, Quận/Huyện, Phường/Xã từ danh sách lấy từ API, thay vì nhập tay.
*   Hiển thị các tùy chọn vận chuyển và mức phí tương ứng từ GHN ở trang thanh toán.
*   Hiển thị thông tin theo dõi đơn hàng và trạng thái vận chuyển cho người dùng, bao gồm cả lịch sử các điểm đã đi qua.