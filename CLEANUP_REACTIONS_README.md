# Fix Duplicate Reactions - Complete Guide

## Vấn đề gốc
1. **Schema cũ**: Constraint `@@unique([message_id, user_id, emoji])` cho phép 1 user thả nhiều emoji khác nhau cho cùng 1 message
2. **Kết quả**: Database có dữ liệu trùng lặp - cùng 1 user có nhiều reactions cho 1 message
3. **Avatar**: Avatar của currentUser không hiển thị trong ReactionsModal

## Giải pháp

### 1. Database Schema Fix
**Thay đổi**: `@@unique([message_id, user_id, emoji])` → `@@unique([message_id, user_id])`

**Ý nghĩa**: Đảm bảo mỗi user CHỈ có 1 reaction cho mỗi message (ở mức database constraint)

### 2. Cleanup Existing Data
Có 2 cách để dọn dẹp:

#### Cách 1: Chạy TypeScript Script (Khuyến nghị)
```bash
cd Backend
npx ts-node src/chat/cleanup-duplicate-reactions.ts
```

**Ưu điểm**: 
- ✅ Hiển thị log chi tiết
- ✅ An toàn, dễ debug
- ✅ Không cần chạy migration thủ công

#### Cách 2: Chạy SQL Migration
```bash
cd Backend
# Chạy migration SQL trực tiếp
psql -U your_username -d your_database -f prisma/migrations/fix_message_reactions_unique_constraint.sql
```

### 3. Apply Prisma Schema Changes
```bash
cd Backend
npx prisma migrate dev --name fix_reactions_unique_constraint
# hoặc cho production:
npx prisma migrate deploy
```

## Frontend Fixes

### Avatar hiển thị đúng
**Đã sửa trong `ChatThread.tsx`**:
1. ✅ Thêm state `currentUserAvatar` để lưu avatar của user đang đăng nhập
2. ✅ Extract avatar từ messages khi load conversation
3. ✅ Update `getUserInfo()` để trả về avatar đã normalize cho cả currentUser và otherUser

### Debug Logs
**Đã thêm logs trong `ReactionsModal.tsx`**:
- 🎭 Log reactions received
- 👤 Log từng user info (name + avatar)
- 🖼️ Log avatar URLs (original + normalized)

## Kết quả mong đợi

### Sau khi cleanup
```
🧹 Starting cleanup of duplicate reactions...

📊 Total reactions found: 25

🔍 Found 3 reactions for message 123, user 5:
  ✅ KEEP: 😍 (created: 2025-11-03T10:30:00.000Z)
  ❌ DELETE: 👍 (created: 2025-11-03T10:25:00.000Z)
  ❌ DELETE: ❤️ (created: 2025-11-03T10:20:00.000Z)

============================================================
✅ Cleanup completed!
📝 Messages with duplicates: 2
🗑️  Total reactions deleted: 4
✨ Database is now clean!
============================================================
```

### Behavior mới
- ✅ Mỗi user chỉ có thể thả **1 emoji** cho mỗi tin nhắn
- ✅ Click vào emoji đã thả sẽ **gỡ bỏ** (toggle off)
- ✅ Click vào emoji khác sẽ **thay thế** emoji cũ
- ✅ Avatar hiển thị đúng cho tất cả users (currentUser + otherUser)

## Testing Checklist

### Backend
- [ ] Chạy cleanup script thành công
- [ ] Apply migration schema
- [ ] Kiểm tra constraint trong DB: `\d message_reactions` (PostgreSQL)
- [ ] Verify unique constraint: `message_reactions_message_id_user_id_key`

### Frontend
1. [ ] Mở chat, thả emoji vào tin nhắn
2. [ ] Thử thả emoji khác → emoji cũ bị thay thế
3. [ ] Click emoji đã thả → emoji bị gỡ
4. [ ] Thử thả lại cùng emoji → không thể thả 2 lần
5. [ ] Click vào reactions badge → mở modal
6. [ ] Kiểm tra trong modal:
   - [ ] Mỗi user chỉ xuất hiện 1 lần
   - [ ] Avatar của "Bạn" (currentUser) hiển thị đúng
   - [ ] Avatar của người khác hiển thị đúng
   - [ ] Click emoji của bạn → hiện confirm gỡ bỏ
   - [ ] Tab "TẤT CẢ" + các emoji tabs hoạt động đúng

### Debug
Nếu vẫn có vấn đề, check console logs:
```
🎭 [ReactionsModal] Building user list...
🎭 [ReactionsModal] Reactions received: [...]
👤 User X: { name: "...", avatar: "..." }
🖼️ Rendering user X (...)
  - Original avatar: ...
  - Normalized URL: ...
🖼️ [ChatThread] Set currentUser avatar: ...
```

## Rollback (nếu cần)

### Rollback Migration
```bash
cd Backend
npx prisma migrate resolve --rolled-back fix_reactions_unique_constraint
```

### Khôi phục constraint cũ
```sql
ALTER TABLE message_reactions DROP CONSTRAINT IF EXISTS message_reactions_message_id_user_id_key;
ALTER TABLE message_reactions ADD CONSTRAINT message_reactions_message_id_user_id_emoji_key UNIQUE (message_id, user_id, emoji);
```
