#!/bin/bash

# Script để gọi các API seed data theo đúng thứ tự
# Usage: ./seed-all.sh [base_url]
# Example: ./seed-all.sh http://localhost:3000

BASE_URL=${1:-http://localhost:3000}

echo "🚀 Bắt đầu seed data cho PBL6 Backend"
echo "📍 Base URL: $BASE_URL"
echo ""

# Function to make POST request and check response
seed_data() {
  local endpoint=$1
  local name=$2
  
  echo "⏳ Đang seed $name..."
  response=$(curl -s -X POST "$BASE_URL$endpoint" \
    -H "Content-Type: application/json")
  
  # Check if request was successful
  if echo "$response" | grep -q '"success":true'; then
    echo "✅ $name thành công!"
    echo "$response" | jq '.' 2>/dev/null || echo "$response"
  else
    echo "❌ $name thất bại!"
    echo "$response" | jq '.' 2>/dev/null || echo "$response"
    return 1
  fi
  echo ""
  sleep 1
}

# Check if server is running
echo "🔍 Kiểm tra server..."
if ! curl -s "$BASE_URL" > /dev/null 2>&1; then
  echo "❌ Server không chạy tại $BASE_URL"
  echo "Vui lòng khởi động server trước khi chạy script này."
  exit 1
fi
echo "✅ Server đang chạy"
echo ""

# Wait for initial seed to complete (brands, categories, users, shops, products)
echo "⏳ Đợi server khởi động và seed data cơ bản..."
echo "   (Brands, Categories, Roles, Permissions, Users, Shops, Products, Coupons)"
echo ""
sleep 5

# Seed data in order
echo "📦 Bắt đầu seed data có foreign key dependencies..."
echo ""

seed_data "/data-init/shop-staffs" "Shop Staffs" || exit 1
seed_data "/data-init/addresses" "User Addresses" || exit 1
seed_data "/data-init/shop-addresses" "Shop Addresses" || exit 1
seed_data "/data-init/carts" "Carts" || exit 1
seed_data "/data-init/cart-items" "Cart Items" || exit 1
seed_data "/data-init/orders" "Orders" || exit 1

echo "🎉 Hoàn thành seed data!"
echo ""
echo "📊 Kiểm tra kết quả trong database:"
echo "   - Shop Staffs"
echo "   - User Addresses (15 records)"
echo "   - Shop Addresses (3 records)"
echo "   - Carts (3 records)"
echo "   - Cart Items (15 records)"
echo "   - Orders (10 records + order_items + payments + shipments)"
echo ""
echo "✨ Database đã sẵn sàng để sử dụng!"
