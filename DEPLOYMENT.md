# Deploy NestJS Backend to EC2

## 🎯 Vấn đề hiện tại

Backend NestJS đang chạy nhưng **người khác không truy cập được** vì:

1. **App chỉ lắng nghe localhost** - Đã fix trong `main.ts` để bind `0.0.0.0`
2. **Security Group chưa mở port 3000** - Cần cấu hình AWS
3. **Lỗi crypto warning** - Đã thêm `--no-warnings` trong PM2 config

## ✅ Giải pháp đã áp dụng

### 1. Sửa `src/main.ts`
```typescript
const host = process.env.HOST ?? '0.0.0.0'; // Bind to all network interfaces
const server = await app.listen(port, host);
```

### 2. Tạo `ecosystem.config.js` cho PM2
```javascript
env: {
  NODE_ENV: 'production',
  PORT: 3000,
  HOST: '0.0.0.0'  // ✅ Quan trọng!
}
```

## 🚀 Cách Deploy

### Cách 1: Sử dụng script tự động (Khuyến khích)

```bash
# Trên EC2, trong thư mục ~/PBL6
chmod +x deploy.sh
./deploy.sh
```

### Cách 2: Deploy thủ công

```bash
# 1. Pull code mới (nếu dùng git)
git pull origin main

# 2. Cài đặt dependencies
npm install

# 3. Generate Prisma Client
npx prisma generate

# 4. Build ứng dụng
npm run build

# 5. Stop PM2 cũ và start lại
pm2 stop nestjs-app
pm2 delete nestjs-app
pm2 start ecosystem.config.js

# 6. Lưu và setup auto-start
pm2 save
pm2 startup
```

## ⚙️ Cấu hình AWS Security Group

**QUAN TRỌNG**: Phải mở các port sau trong Security Group:

### Backend (Port 3000):
1. Vào **EC2 Dashboard** → **Security Groups**
2. Chọn Security Group của instance
3. **Inbound Rules** → **Edit inbound rules**
4. **Add Rule**:
   - Type: **Custom TCP**
   - Port range: **3000**
   - Source: **0.0.0.0/0** (hoặc IP cụ thể)
   - Description: `NestJS Backend API`
5. **Save rules**

### Frontend (Port 3001) - Nếu chưa mở:
- Type: **Custom TCP**
- Port range: **3001**
- Source: **0.0.0.0/0**
- Description: `Next.js Frontend`

### Kiểm tra Security Group hiện tại:
```bash
# Trên EC2, kiểm tra port đang lắng nghe
sudo netstat -tulpn | grep LISTEN

# Hoặc
sudo lsof -i -P -n | grep LISTEN
```

## 🔍 Kiểm tra sau khi deploy

### 1. Kiểm tra PM2 status
```bash
pm2 status
pm2 logs nestjs-app --lines 50
```

### 2. Kiểm tra port đang lắng nghe
```bash
sudo netstat -tulpn | grep :3000
# Kết quả mong đợi:
# tcp6  0  0  :::3000  :::*  LISTEN  <pid>/node
```

### 3. Test từ trong EC2
```bash
curl http://localhost:3000/api
# Hoặc
curl http://0.0.0.0:3000/api
```

### 4. Test từ bên ngoài
```bash
# Từ máy local của bạn
curl http://YOUR_EC2_PUBLIC_IP:3000/api
```

### 5. Truy cập Swagger
```
http://YOUR_EC2_PUBLIC_IP:3000/api
```

## 🐛 Troubleshooting

### Vấn đề 1: PM2 logs hiển thị "crypto is not defined"

**Giải pháp**: Đã fix trong `ecosystem.config.js` với `node_args: '--no-warnings'`

Nếu vẫn lỗi, kiểm tra Node.js version:
```bash
node --version
# Nên dùng Node.js >= 18.x LTS
```

Nâng cấp Node.js nếu cần:
```bash
# Cài đặt nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Cài Node.js 18 LTS
nvm install 18
nvm use 18
nvm alias default 18
```

### Vấn đề 2: Port 3000 không lắng nghe

**Kiểm tra**:
```bash
pm2 logs nestjs-app --err --lines 50
```

**Giải pháp**:
- Đảm bảo build thành công: `npm run build`
- Kiểm tra file `dist/main.js` có tồn tại không
- Restart PM2: `pm2 restart nestjs-app`

### Vấn đề 3: Vẫn không truy cập được từ bên ngoài

**Checklist**:
1. ✅ Security Group đã mở port 3000?
2. ✅ App đang chạy? (`pm2 status`)
3. ✅ Port đang lắng nghe? (`sudo netstat -tulpn | grep :3000`)
4. ✅ Firewall của EC2? (Ubuntu: `sudo ufw status`)

**Disable firewall tạm thời để test**:
```bash
# Ubuntu
sudo ufw disable

# Amazon Linux
sudo systemctl stop firewalld
```

### Vấn đề 4: Database connection error

**Kiểm tra .env**:
```bash
cat .env | grep DATABASE_URL
```

**Đảm bảo Prisma đã generate**:
```bash
npx prisma generate
npx prisma migrate deploy
```

## 📊 Monitoring

### Xem logs real-time
```bash
pm2 logs nestjs-app
```

### Xem resource usage
```bash
pm2 monit
```

### Xem thông tin chi tiết
```bash
pm2 show nestjs-app
```

## 🔐 Bảo mật Production

### 1. Giới hạn CORS
Sửa `src/main.ts`:
```typescript
app.enableCors({
  origin: ['http://YOUR_FRONTEND_IP:3001', 'https://yourdomain.com'],
  credentials: true,
});
```

### 2. Sử dụng HTTPS
- Cài đặt Nginx reverse proxy
- Sử dụng Let's Encrypt SSL certificate

### 3. Environment Variables
Đảm bảo `.env` có:
```env
NODE_ENV=production
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret-key"
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
```

### 4. Giới hạn Security Group
Thay vì `0.0.0.0/0`, chỉ cho phép:
- IP của frontend server
- IP của admin
- IP của load balancer (nếu có)

## 📝 Các lệnh hữu ích

```bash
# Restart toàn bộ
pm2 restart all

# Reload without downtime
pm2 reload nestjs-app

# Stop tất cả
pm2 stop all

# Xóa tất cả
pm2 delete all

# Xem logs của tất cả apps
pm2 logs

# Flush logs
pm2 flush

# Xem process list
pm2 list
```

## 🌐 Truy cập sau khi deploy

```
Backend API: http://YOUR_EC2_PUBLIC_IP:3000
Swagger Docs: http://YOUR_EC2_PUBLIC_IP:3000/api
Frontend: http://YOUR_EC2_PUBLIC_IP:3001
```

## 📞 Hỗ trợ

Nếu vẫn gặp vấn đề, cung cấp:
1. Output của `pm2 logs nestjs-app --lines 100`
2. Output của `sudo netstat -tulpn | grep :3000`
3. Screenshot Security Group Inbound Rules
4. Output của `curl http://localhost:3000/api` (chạy trên EC2)
