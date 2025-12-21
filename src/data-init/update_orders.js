const fs = require('fs');
const path = require('path');

// Read current orders
const ordersPath = path.join(__dirname, 'orders.json');
const orders = JSON.parse(fs.readFileSync(ordersPath, 'utf8'));

console.log(`Current orders: ${orders.length}`);
console.log('Current shop distribution:');
for (let shopId = 1; shopId <= 4; shopId++) {
    const count = orders.filter(o => o.shop_id === shopId).length;
    console.log(`  Shop ${shopId}: ${count} orders`);
}

// Redistribute orders across 4 shops
// We'll distribute evenly: 2 orders per shop (total 8 orders, we'll add 1 more)
const shopIds = [1, 2, 3, 4];
orders.forEach((order, i) => {
    order.shop_id = shopIds[i % 4];
});

// Add one more order to make it 8 total (2 per shop)
const newOrder = {
    "user_id": 5,
    "shop_id": 4,
    "status": "confirmed",
    "payment_status": "paid",
    "subtotal_amount": 550000,
    "discount_amount": 0,
    "shipping_fee": 30000,
    "total_amount": 580000,
    "shipping_address_id": 2,
    "pickup_address_id": 4,
    "note": null,
    "created_at": "2025-11-12T10:00:00Z",
    "updated_at": "2025-11-12T10:30:00Z",
    "order_items": [
        {
            "product_id": 16,
            "variant_id": 30,
            "name_snapshot": "Product from Shop 4",
            "variant_snapshot": "Standard",
            "unit_price": 550000,
            "quantity": 1,
            "line_total": 550000
        }
    ],
    "payment": {
        "provider": "VNPAY",
        "amount": 580000,
        "status": "paid",
        "transaction_id": "VNP20251112100045",
        "created_at": "2025-11-12T10:05:00Z"
    },
    "shipment": {
        "status": "pending",
        "carrier": null,
        "tracking_number": null,
        "shipped_at": null,
        "delivered_at": null,
        "address_snapshot": "111 Trần Hưng Đạo, Quận 1, TP.HCM"
    }
};

orders.push(newOrder);

// Update pickup_address_id to match shop_id
orders.forEach(order => {
    order.pickup_address_id = order.shop_id;
});

// Write back
fs.writeFileSync(ordersPath, JSON.stringify(orders, null, 2), 'utf8');

console.log(`\n✅ Updated ${orders.length} orders`);
console.log('New shop distribution:');
for (let shopId = 1; shopId <= 4; shopId++) {
    const count = orders.filter(o => o.shop_id === shopId).length;
    console.log(`  Shop ${shopId}: ${count} orders`);
}
