const fs = require('fs');
const path = require('path');

// Read data files
const usersPath = path.join(__dirname, 'users.json');
const productsPath = path.join(__dirname, 'products.json');
const ordersPath = path.join(__dirname, 'orders.json');

const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));

console.log('=== Data Analysis ===');
console.log(`Users: ${users.length}`);
console.log(`Products: ${products.length}`);
console.log('\nUser IDs will be:');
console.log('- Admin: ID 1');
users.forEach((u, i) => {
    console.log(`- ${u.email}: ID ${i + 4}`); // IDs start from 4 (after admin + 2 shop owners)
});

console.log('\nProducts by shop:');
for (let shopId = 1; shopId <= 4; shopId++) {
    const shopProducts = products.filter(p => p.shop_id === shopId);
    console.log(`Shop ${shopId}: ${shopProducts.length} products`);
    shopProducts.slice(0, 2).forEach((p, i) => {
        console.log(`  - Product ${products.indexOf(p) + 1}: ${p.name.substring(0, 50)}...`);
    });
}

// Generate orders
const statuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
const paymentStatuses = ['unpaid', 'paid', 'refunded'];
const paymentProviders = ['VNPAY', 'MOMO', 'ZALOPAY', 'COD', 'BANKING'];
const carriers = ['Giao Hàng Nhanh', 'Viettel Post', 'Giao Hàng Tiết Kiệm', 'J&T Express'];

const orders = [];
let orderCount = 0;

// Generate 24 orders (6 per shop)
for (let shopId = 1; shopId <= 4; shopId++) {
    const shopProducts = products.filter(p => p.shop_id === shopId);

    for (let i = 0; i < 6; i++) {
        orderCount++;

        // Random user (customer1, customer2, or customer3 = IDs 4, 5, 6)
        const userId = 4 + (orderCount % 3);

        // Random status
        const status = statuses[orderCount % statuses.length];
        const paymentStatus = status === 'cancelled' ? 'refunded' :
            status === 'pending' ? 'unpaid' : 'paid';

        // Select 1-3 random products from this shop
        const numItems = 1 + (orderCount % 3);
        const selectedProducts = [];
        for (let j = 0; j < numItems && j < shopProducts.length; j++) {
            const productIndex = (i + j) % shopProducts.length;
            selectedProducts.push(shopProducts[productIndex]);
        }

        // Calculate totals
        let subtotal = 0;
        const orderItems = selectedProducts.map((product, idx) => {
            const variant = product.variants[0]; // Use first variant
            const quantity = 1 + (idx % 2);
            const lineTotal = variant.price * quantity;
            subtotal += lineTotal;

            return {
                product_id: products.indexOf(product) + 1,
                variant_id: (products.indexOf(product) * 2) + 1, // Approximate variant ID
                name_snapshot: product.name,
                variant_snapshot: variant.name,
                unit_price: variant.price,
                quantity: quantity,
                line_total: lineTotal
            };
        });

        const discountAmount = subtotal > 500000 ? 50000 : 0;
        const shippingFee = status === 'cancelled' ? 0 : 25000 + (orderCount % 2) * 5000;
        const totalAmount = subtotal - discountAmount + shippingFee;

        // Create dates
        const daysAgo = 30 - orderCount;
        const createdDate = new Date();
        createdDate.setDate(createdDate.getDate() - daysAgo);
        const updatedDate = new Date(createdDate);
        updatedDate.setHours(updatedDate.getHours() + 2);

        const order = {
            user_id: userId,
            shop_id: shopId,
            status: status,
            payment_status: paymentStatus,
            subtotal_amount: subtotal,
            discount_amount: discountAmount,
            shipping_fee: shippingFee,
            total_amount: totalAmount,
            shipping_address_id: ((orderCount - 1) % 3) + 1,
            pickup_address_id: shopId,
            note: i === 0 ? 'Giao hàng giờ hành chính' : i === 1 ? 'Gọi trước khi giao' : null,
            created_at: createdDate.toISOString(),
            updated_at: updatedDate.toISOString(),
            order_items: orderItems,
            payment: {
                provider: paymentProviders[orderCount % paymentProviders.length],
                amount: totalAmount,
                status: paymentStatus,
                transaction_id: paymentStatus === 'paid' ? `TXN${Date.now()}${orderCount}` : null,
                created_at: createdDate.toISOString()
            },
            shipment: {
                status: status === 'delivered' ? 'delivered' :
                    status === 'shipped' ? 'in_transit' :
                        status === 'processing' ? 'packing' :
                            status === 'cancelled' ? 'failed' : 'pending',
                carrier: status === 'pending' || status === 'cancelled' ? null : carriers[orderCount % carriers.length],
                tracking_number: status === 'pending' || status === 'cancelled' ? null : `TRK${orderCount}${shopId}${userId}`,
                shipped_at: status === 'shipped' || status === 'delivered' ? updatedDate.toISOString() : null,
                delivered_at: status === 'delivered' ? new Date(updatedDate.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString() : null,
                address_snapshot: `${100 + orderCount} Nguyễn Văn Linh, Quận ${(orderCount % 12) + 1}, TP.HCM`
            }
        };

        orders.push(order);
    }
}

// Write orders
fs.writeFileSync(ordersPath, JSON.stringify(orders, null, 2), 'utf8');

console.log('\n=== Generated Orders ===');
console.log(`Total orders: ${orders.length}`);
console.log('\nDistribution by shop:');
for (let shopId = 1; shopId <= 4; shopId++) {
    const count = orders.filter(o => o.shop_id === shopId).length;
    console.log(`  Shop ${shopId}: ${count} orders`);
}
console.log('\nDistribution by user:');
for (let userId = 4; userId <= 6; userId++) {
    const count = orders.filter(o => o.user_id === userId).length;
    const userEmail = users[userId - 4].email;
    console.log(`  User ${userId} (${userEmail}): ${count} orders`);
}
console.log('\nDistribution by status:');
statuses.forEach(status => {
    const count = orders.filter(o => o.status === status).length;
    console.log(`  ${status}: ${count} orders`);
});

console.log('\n✅ Orders generated successfully!');
