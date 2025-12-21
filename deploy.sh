#!/bin/bash

# PBL6 Backend (NestJS) Deployment Script for EC2
# This script automates the deployment process

echo "🚀 Starting PBL6 Backend Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Pull latest code (if using git)
echo -e "${YELLOW}📥 Pulling latest code...${NC}"
git pull origin main || echo "Not a git repository or pull failed, continuing..."

# Step 2: Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install

# Step 3: Generate Prisma Client
echo -e "${YELLOW}🔧 Generating Prisma Client...${NC}"
npx prisma generate

# Step 4: Run database migrations (optional, comment out if not needed)
echo -e "${YELLOW}🗄️  Running database migrations...${NC}"
npx prisma migrate deploy || echo "Migration failed or not needed, continuing..."

# Step 5: Build the application
echo -e "${YELLOW}🔨 Building application...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed! Please check the errors above.${NC}"
    exit 1
fi

# Step 6: Create logs directory if not exists
mkdir -p logs

# Step 7: Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}⚙️  PM2 not found. Installing PM2...${NC}"
    sudo npm install -g pm2
fi

# Step 8: Stop existing PM2 process if running
echo -e "${YELLOW}🛑 Stopping existing application...${NC}"
pm2 stop nestjs-app 2>/dev/null || echo "No existing process to stop"
pm2 delete nestjs-app 2>/dev/null || echo "No existing process to delete"

# Step 9: Start the application with PM2
echo -e "${YELLOW}▶️  Starting application with PM2...${NC}"
pm2 start ecosystem.config.js

# Step 10: Save PM2 process list
echo -e "${YELLOW}💾 Saving PM2 process list...${NC}"
pm2 save

# Step 11: Setup PM2 startup script (first time only)
echo -e "${YELLOW}🔧 Setting up PM2 startup script...${NC}"
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME || echo "Startup script already configured"

# Step 12: Show status
echo -e "${GREEN}✅ Deployment completed!${NC}"
echo ""
echo -e "${GREEN}📊 Application Status:${NC}"
pm2 status

echo ""
echo -e "${GREEN}🌐 Your backend should be accessible at:${NC}"
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "YOUR_EC2_IP")
echo -e "${GREEN}   API: http://${PUBLIC_IP}:3000${NC}"
echo -e "${GREEN}   Swagger: http://${PUBLIC_IP}:3000/api${NC}"
echo ""
echo -e "${YELLOW}📝 Useful commands:${NC}"
echo "   pm2 logs nestjs-app      - View logs"
echo "   pm2 restart nestjs-app   - Restart application"
echo "   pm2 stop nestjs-app      - Stop application"
echo "   pm2 monit                - Monitor application"
echo ""
echo -e "${BLUE}🔍 Checking if port 3000 is listening...${NC}"
sleep 2
sudo netstat -tulpn | grep :3000 || sudo lsof -i :3000
