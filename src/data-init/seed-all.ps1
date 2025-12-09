# PowerShell Script to seed all data in correct order
# Usage: .\seed-all.ps1 [base_url]
# Example: .\seed-all.ps1 http://localhost:3000

param(
    [string]$BaseUrl = "http://localhost:3000"
)

Write-Host "🚀 Bắt đầu seed data cho PBL6 Backend" -ForegroundColor Cyan
Write-Host "📍 Base URL: $BaseUrl" -ForegroundColor White
Write-Host ""

# Function to make POST request and check response
function Seed-Data {
    param(
        [string]$Endpoint,
        [string]$Name
    )
    
    Write-Host "⏳ Đang seed $Name..." -ForegroundColor Yellow
    
    try {
        $response = Invoke-RestMethod -Uri "$BaseUrl$Endpoint" -Method Post -ContentType "application/json" -ErrorAction Stop
        
        if ($response.success -eq $true) {
            Write-Host "✅ $Name thành công!" -ForegroundColor Green
            $response | ConvertTo-Json -Depth 3
        } else {
            Write-Host "❌ $Name thất bại!" -ForegroundColor Red
            $response | ConvertTo-Json -Depth 3
            return $false
        }
    } catch {
        Write-Host "❌ $Name thất bại!" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        return $false
    }
    
    Write-Host ""
    Start-Sleep -Seconds 1
    return $true
}

# Check if server is running
Write-Host "🔍 Kiểm tra server..." -ForegroundColor Yellow
try {
    $null = Invoke-WebRequest -Uri $BaseUrl -Method Get -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Server đang chạy" -ForegroundColor Green
} catch {
    Write-Host "❌ Server không chạy tại $BaseUrl" -ForegroundColor Red
    Write-Host "Vui lòng khởi động server trước khi chạy script này." -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Wait for initial seed to complete
Write-Host "⏳ Đợi server khởi động và seed data cơ bản..." -ForegroundColor Yellow
Write-Host "   (Brands, Categories, Roles, Permissions, Users, Shops, Products, Coupons)" -ForegroundColor Gray
Write-Host ""
Start-Sleep -Seconds 5

# Seed data in order
Write-Host "📦 Bắt đầu seed data có foreign key dependencies..." -ForegroundColor Cyan
Write-Host ""

$success = $true

$success = (Seed-Data "/data-init/shop-staffs" "Shop Staffs") -and $success
if (-not $success) { exit 1 }

$success = (Seed-Data "/data-init/addresses" "User Addresses") -and $success
if (-not $success) { exit 1 }

$success = (Seed-Data "/data-init/shop-addresses" "Shop Addresses") -and $success
if (-not $success) { exit 1 }

$success = (Seed-Data "/data-init/carts" "Carts") -and $success
if (-not $success) { exit 1 }

$success = (Seed-Data "/data-init/cart-items" "Cart Items") -and $success
if (-not $success) { exit 1 }

$success = (Seed-Data "/data-init/orders" "Orders") -and $success
if (-not $success) { exit 1 }

Write-Host "🎉 Hoàn thành seed data!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Kiểm tra kết quả trong database:" -ForegroundColor Cyan
Write-Host "   - Shop Staffs (4 records)" -ForegroundColor White
Write-Host "   - User Addresses (15 records)" -ForegroundColor White
Write-Host "   - Shop Addresses (3 records)" -ForegroundColor White
Write-Host "   - Carts (3 records)" -ForegroundColor White
Write-Host "   - Cart Items (15 records)" -ForegroundColor White
Write-Host "   - Orders (10 records + order_items + payments + shipments)" -ForegroundColor White
Write-Host ""
Write-Host "✨ Database đã sẵn sàng để sử dụng!" -ForegroundColor Green
