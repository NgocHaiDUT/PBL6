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
