
# Data-Driven Testing Framework

## Tổng quan

Framework này cho phép bạn viết và quản lý test cases thông qua file JSON, tự động tạo mock từ metadata, và xuất báo cáo test kết quả ra file Excel kèm screenshot.

## Cấu trúc thư mục

```
src/shop/
├── __test-data__/
│   ├── test-case.json           # File chứa tất cả test cases
│   └── test-data-reader.ts      # Utility đọc test cases từ JSON
├── __test-reports__/
│   ├── test-report-writer.ts    # Utility xuất báo cáo Excel
│   └── screenshot-helper.ts     # Utility chụp màn hình kết quả test
├── shop.service.data-driven.spec.ts  # File test chính
└── README.md                    # Tài liệu này
```

## Quy trình sử dụng

### Bước 1: Định nghĩa Test Cases trong JSON

Mở file `__test-data__/test-case.json` và thêm test cases theo cấu trúc:

```json
{
    "functionName": [
        {
            "testCaseId": "TC01",
            "testCaseDescription": "Mô tả test case",
            "input": {
                "param1": "value1",
                "param2": "value2"
            },
            "expectedResult": {
                "success": true,
                "message": "Kết quả mong đợi"
            },
            "mockSetup": {
                "table.method": returnValue,
                "$transaction": transactionConfig
            }
        }
    ]
}
```

### Bước 2: Cấu hình Mock Setup

#### Mock thông thường:

```json
"mockSetup": {
    "users.findUnique": { "id": 1, "email": "test@example.com" },
    "shops.findUnique": { "id": 2, "owner_id": 1 },
    "permission.findFirst": null
}
```

#### Mock với nhiều giá trị (array):

```json
"mockSetup": {
    "shop_staffs.findFirst": [null, null]  // Gọi lần 1 trả null, lần 2 trả null
}
```

#### Mock với Transaction:

**Cách 1 - Backward Compatible (boolean):**
```json
"mockSetup": {
    "$transaction": true  // Sử dụng transaction mock mặc định
}
```

**Cách 2 - Custom Transaction (object):**
```json
"mockSetup": {
    "$transaction": {
        "shop_staffs.create": { "id": 1, "shop_id": 2 },
        "userpermission.createMany": { "count": 2 },
        "users.update": { "id": 3 }
    }
}
```

### Bước 3: Thêm Describe Block trong Spec File

Mở `shop.service.data-driven.spec.ts` và thêm describe block cho function mới:

```typescript
describe('FunctionName Tests', () => {
  const testCases: TestCase[] = TestDataReader.loadTestCases('functionName');

  testCases.forEach((testCase) => {
    it(testCase.testCaseDescription, async () => {
      let errorMessage = '';
      
      try {
        // Setup mocks từ metadata
        autoSetupMocksFromMetadata(testCase, mockPrismaService);

        // Gọi function cần test
        const result = await service.functionName(
          testCase.input.param1,
          testCase.input.param2
        );

        // Verify kết quả
        expect(result).toEqual(testCase.expectedResult);
      } catch (error) {
        if (!errorMessage) {
          errorMessage = error.message;
        }
        throw error;
      } finally {
        // Lưu kết quả test (cả pass và fail)
        const screenshot = await ScreenshotHelper.captureScreenshot(
          testCase,
          errorMessage ? 'FAIL' : 'PASS',
          errorMessage,
          testCase.expectedResult,
          errorMessage ? null : testCase.expectedResult
        );

        testResults.push({
          testCaseId: testCase.testCaseId,
          description: testCase.testCaseDescription,
          status: errorMessage ? 'FAIL' : 'PASS',
          expectedResult: JSON.stringify(testCase.expectedResult),
          actualResult: errorMessage || JSON.stringify(testCase.expectedResult),
          screenshot: screenshot,
        });
      }
    });
  });
});
```

### Bước 4: Chạy Test

```bash
npm test -- shop.service.data-driven.spec.ts
```

### Bước 5: Xem Báo cáo

Sau khi test chạy xong, báo cáo sẽ được tạo tự động tại:

```
__test-reports__/test-run-YYYY-MM-DD_HH-MM-SS/
├── test-results.xlsx        # File Excel chứa kết quả
└── screenshots/             # Thư mục chứa ảnh chụp màn hình
    ├── TC01.png
    ├── TC02.png
    └── ...
```

## Cấu trúc File Excel

### Sheet 1: Summary
| Metric | Value |
|--------|-------|
| Total Tests | 10 |
| Passed | 8 |
| Failed | 2 |
| Pass Rate | 80.00% |

### Sheet 2: Test Results
| Test Case ID | Description | Status | Expected Result | Actual Result | Screenshot |
|-------------|-------------|--------|----------------|---------------|------------|
| TC01 | Thêm nhân viên thành công | PASS | {...} | {...} | TC01.png |
| TC02 | Không có quyền | FAIL | {...} | Error message | TC02.png |

## Ví dụ Test Cases

### Example 1: Test thành công

```json
{
    "testCaseId": "TC01",
    "testCaseDescription": "Thêm nhân viên thành công",
    "input": {
        "userid": 1,
        "staffemail": "staff@example.com",
        "shopid": 2,
        "is_manager": false
    },
    "expectedResult": {
        "success": true,
        "message": "Thêm nhân viên thành công"
    },
    "mockSetup": {
        "permission.findUnique": { "id": 1 },
        "userpermission.findFirst": { "user_id": 1 },
        "users.findUnique": { "id": 3, "email": "staff@example.com" },
        "shops.findUnique": { "id": 2, "owner_id": 1 },
        "shop_staffs.findFirst": [null, null],
        "role.findUnique": {
            "id": 2,
            "name": "staff",
            "rolePermissions": [{ "permission_id": 10 }]
        },
        "$transaction": {
            "shop_staffs.create": { "id": 1 },
            "userpermission.createMany": { "count": 1 }
        }
    }
}
```

### Example 2: Test thất bại (validation)

```json
{
    "testCaseId": "TC02",
    "testCaseDescription": "Không có quyền thêm nhân viên",
    "input": {
        "userid": 1,
        "staffemail": "staff@example.com",
        "shopid": 2,
        "is_manager": false
    },
    "expectedResult": {
        "success": false,
        "message": "Bạn không có quyền thêm nhân viên"
    },
    "mockSetup": {
        "permission.findUnique": { "id": 1 },
        "userpermission.findFirst": null
    }
}
```

### Example 3: Test với null check

```json
{
    "testCaseId": "TC03",
    "testCaseDescription": "Email không tồn tại",
    "input": {
        "userid": 1,
        "staffemail": "notfound@example.com",
        "shopid": 2,
        "is_manager": false
    },
    "expectedResult": {
        "success": false,
        "message": "Email không tồn tại trong hệ thống"
    },
    "mockSetup": {
        "permission.findUnique": { "id": 1 },
        "userpermission.findFirst": { "user_id": 1 },
        "users.findUnique": null
    }
}
```

## Best Practices

### 1. Đặt tên Test Case ID có ý nghĩa
- Sử dụng prefix theo function: `TC_ADD_01`, `TC_DEL_01`, `TC_UPD_01`
- Đánh số tuần tự theo thứ tự logic

### 2. Viết mô tả rõ ràng
- Mô tả ngắn gọn, dễ hiểu
- Tập trung vào điều kiện test
- Ví dụ: "Thêm nhân viên thành công", "Không có quyền", "Email không tồn tại"

### 3. Mock đầy đủ dependencies
- Xác định tất cả các database call trong function
- Mock tất cả các method được gọi
- Đảm bảo mock trả về đúng cấu trúc dữ liệu

### 4. Test Cases nên cover
- ✅ Happy path (thành công)
- ✅ Validation errors (thiếu quyền, dữ liệu không hợp lệ)
- ✅ Null/undefined checks
- ✅ Business logic edge cases
- ✅ Transaction rollback scenarios

### 5. Organize Test Cases
- Nhóm test cases theo function
- Sắp xếp từ happy path → edge cases → error cases
- Dùng comment để phân nhóm trong JSON nếu cần

## Troubleshooting

### Lỗi: "Multiple matches found"
**Nguyên nhân:** Chuỗi tìm kiếm trong replace không unique.  
**Giải pháp:** Thêm nhiều dòng context xung quanh (3-5 dòng trước và sau).

### Lỗi: "tx.table.method is not a function"
**Nguyên nhân:** Transaction mock thiếu method.  
**Giải pháp:** Thêm method vào `$transaction` object trong mockSetup:
```json
"$transaction": {
    "table.method": returnValue
}
```

### Lỗi: "Expected X but got Y"
**Nguyên nhân:** Mock setup không đúng hoặc expectedResult sai.  
**Giải pháp:** 
1. Kiểm tra mock có đầy đủ không
2. Verify expectedResult khớp với business logic
3. Xem screenshot để debug

### Test không chạy
**Nguyên nhân:** Function name trong JSON không khớp với code.  
**Giải pháp:** Đảm bảo key trong test-case.json khớp với parameter trong `TestDataReader.loadTestCases('functionName')`.

## Mở rộng

### Thêm Function mới

1. Thêm test cases vào `test-case.json`:
```json
{
    "newFunction": [
        { /* test case */ }
    ]
}
```

2. Thêm describe block vào spec file:
```typescript
describe('NewFunction Tests', () => {
  const testCases = TestDataReader.loadTestCases('newFunction');
  // ... implement test logic
});
```

### Custom Screenshot Template

Chỉnh sửa `screenshot-helper.ts` để thay đổi giao diện screenshot:
- Thay đổi colors
- Thêm/bớt thông tin hiển thị
- Tùy chỉnh layout HTML

### Thay đổi Report Format

Chỉnh sửa `test-report-writer.ts`:
- Thêm columns mới vào Excel
- Thay đổi Summary metrics
- Xuất thêm format khác (JSON, HTML, PDF...)

## Tài liệu tham khảo

- [Jest Documentation](https://jestjs.io/)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
- [ExcelJS Library](https://www.npmjs.com/package/xlsx)
- [Puppeteer Documentation](https://pptr.dev/)

## Lịch sử thay đổi

### Version 1.0 (Current)
- ✅ Data-driven testing với JSON
- ✅ Auto mock setup từ metadata
- ✅ Excel report với screenshots
- ✅ Test history với timestamp folders
- ✅ Flexible transaction mocking
- ✅ Error handling với finally block

---

**Tác giả:** PBL6 Team  
**Cập nhật:** November 2025

# Shop Module

## Overview

This module is dedicated to shop administration, focusing specifically on managing staff members and their permissions. It allows shop owners or managers to add and remove staff, and to control their access to various shop-related functions by assigning granular permissions.

## Features

-   **Staff Management**: Add or remove users as staff members for a shop.
-   **Permission Control**: Grant or revoke specific permissions for each staff member.
-   **Role Management**: Automatically assigns the "staff" role to users when they are added to a shop and reverts them to the "user" role if they are removed from their last staff position.
-   **Access Control**: All actions are protected, requiring the user performing the action to be the shop owner or a manager with the `manage_shop_staff` permission.

## Workflow

1.  **Adding Staff**:
    -   A shop owner (or a manager) sends a `POST` request to `/shop/staff` with the email of the user they want to add.
    -   The service verifies that the requesting user has the authority to manage staff.
    -   It finds the user by email and creates a `shop_staffs` record, linking the user to the shop.
    -   The new staff member's user role is set to "staff", and they are granted a default set of staff-level permissions.

2.  **Managing Permissions**:
    -   The shop owner/manager can then grant additional permissions to the staff member (e.g., `update_order_status`, `moderate_reviews`) by sending a `POST` request to `/shop/staff/permissions`.
    -   Permissions can also be revoked via `DELETE /shop/staff/permissions`.

3.  **Removing Staff**:
    -   The owner/manager sends a `DELETE` request to `/shop/staff` with the staff member's email.
    -   The service removes the `shop_staffs` record.
    -   It then checks if the user is a staff member of any other shop. If not, it revokes all their staff-related permissions and changes their role back to "user".

## API Endpoints

---

### Add Staff to Shop

-   **Endpoint:** `POST /shop/staff`
-   **Description:** Adds a user as a staff member to a shop.
-   **Auth:** Required (JWT). The user must be the shop owner or a manager with `manage_shop_staff` permission.
-   **Request Body:**
    ```json
    {
      "userid": 1, // ID of the user performing the action (owner/manager)
      "staffemail": "new.staff@example.com",
      "shopid": 1,
      "is_manager": false // Optional, defaults to false
    }
    ```
-   **Response:** `{ "success": true, "message": "Thêm nhân viên thành công" }`

---

### Remove Staff from Shop

-   **Endpoint:** `DELETE /shop/staff`
-   **Description:** Removes a staff member from a shop.
-   **Auth:** Required (JWT). The user must be the shop owner or a manager.
-   **Request Body:**
    ```json
    {
      "userid": 1, // ID of the user performing the action
      "staffemail": "staff.to.remove@example.com",
      "shopid": 1
    }
    ```
-   **Response:** `{ "success": true, "message": "Xóa nhân viên thành công" }`

---

### Get All Staff for a Shop

-   **Endpoint:** `GET /shop/:shopid/staffs`
-   **Description:** Retrieves a list of all staff members for a given shop.
-   **Auth:** Not required, but typically accessed by authenticated users.
-   **Params:**
    -   `shopid` (number): The ID of the shop.
-   **Response:** An array of staff members with their user details.

---

### Update Staff Permissions

-   **Endpoint:** `POST /shop/staff/permissions`
-   **Description:** Grants one or more permissions to a staff member.
-   **Auth:** Required (JWT). The user must be the shop owner or a manager.
-   **Request Body:**
    ```json
    {
      "userid": 1,
      "staffemail": "staff.member@example.com",
      "shopid": 1,
      "permissions": ["update_order_status", "moderate_reviews"]
    }
    ```
-   **Response:** `{ "success": true, "message": "Cập nhật quyền nhân viên thành công" }`

---

### Get Staff Permissions

-   **Endpoint:** `GET /shop/:shopid/staff/:staffemail/permissions`
-   **Description:** Retrieves a list of permission names for a specific staff member of a shop.
-   **Auth:** Not required.
-   **Params:**
    -   `shopid` (number): The ID of the shop.
    -   `staffemail` (string): The email of the staff member.
-   **Response:** `["view_shop_orders", "update_order_status"]`

---

### Delete Staff Permissions

-   **Endpoint:** `DELETE /shop/staff/permissions`
-   **Description:** Revokes one or more permissions from a staff member.
-   **Auth:** Required (JWT). The user must be the shop owner or a manager.
-   **Request Body:**
    ```json
    {
      "userid": 1,
      "staffemail": "staff.member@example.com",
      "shopid": 1,
      "permissions": ["moderate_reviews"]
    }
    ```
-   **Response:** `{ "success": true, "message": "Đã xóa 1 quyền của nhân viên", "deleted_count": 1 }`

