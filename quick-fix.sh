#!/bin/bash

# Quick Fix Script - Chạy ngay trên EC2 để fix vấn đề không truy cập được
# Run this on EC2: bash quick-fix.sh

echo "🔧 PBL6 Backend Quick Fix - Enabling External Access"
echo "=================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get current directory
CURRENT_DIR=$(pwd)
echo -e "${YELLOW}📁 Current directory: ${CURRENT_DIR}${NC}"

# Step 1: Stop current PM2 process
echo -e "${YELLOW}🛑 Stopping current PM2 process...${NC}"
pm2 stop nestjs-app 2>/dev/null || echo "No process to stop"
pm2 delete nestjs-app 2>/dev/null || echo "No process to delete"

# Step 2: Rebuild (nếu đã update main.ts)
echo -e "${YELLOW}🔨 Rebuilding application...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi

# Step 3: Start with explicit host binding
echo -e "${YELLOW}▶️  Starting with HOST=0.0.0.0...${NC}"

# Create temporary ecosystem config if not exists
if [ ! -f "ecosystem.config.js" ]; then
    echo -e "${YELLOW}📝 Creating ecosystem.config.js...${NC}"
    cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'nestjs-app',
      script: './dist/main.js',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOST: '0.0.0.0'
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      node_args: '--no-warnings'
    }
  ]
};
EOF
fi

# Create logs directory
mkdir -p logs

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 list
pm2 save

echo ""
echo -e "${GREEN}✅ Application restarted!${NC}"
echo ""

# Wait for app to start
echo -e "${YELLOW}⏳ Waiting for application to start...${NC}"
sleep 3

# Check status
echo -e "${GREEN}📊 PM2 Status:${NC}"
pm2 status

echo ""
echo -e "${GREEN}🔍 Checking port 3000...${NC}"
sudo netstat -tulpn | grep :3000 || sudo lsof -i :3000

echo ""
echo -e "${YELLOW}📝 Recent logs:${NC}"
pm2 logs nestjs-app --lines 20 --nostream

echo ""
echo -e "${GREEN}✅ Quick fix completed!${NC}"
echo ""
echo -e "${YELLOW}🌐 Try accessing:${NC}"
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "YOUR_EC2_IP")
echo -e "${GREEN}   http://${PUBLIC_IP}:3000/api${NC}"
echo ""
echo -e "${YELLOW}⚠️  If still not accessible, check AWS Security Group:${NC}"
echo "   1. Go to EC2 Console → Security Groups"
echo "   2. Find your instance's security group"
echo "   3. Edit Inbound Rules"
echo "   4. Add: Custom TCP, Port 3000, Source 0.0.0.0/0"
echo ""
echo -e "${YELLOW}📝 Useful commands:${NC}"
echo "   pm2 logs nestjs-app    - View logs"
echo "   pm2 restart nestjs-app - Restart"
echo "   pm2 monit              - Monitor"
