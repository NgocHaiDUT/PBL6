const fs = require('fs');
const path = require('path');

// Read products to get valid product/variant IDs
const products = JSON.parse(fs.readFileSync(path.join(__dirname, 'products.json'), 'utf8'));

console.log('=== Generating Carts & Cart Items ===\n');

// Customer IDs: 2, 3, 4
const customerIds = [2, 3, 4];

// Generate carts
const carts = customerIds.map((userId, index) => {
    const daysAgo = 30 - (index * 10);
    const createdDate = new Date();
    createdDate.setDate(createdDate.getDate() - daysAgo);
    const updatedDate = new Date();
    updatedDate.setDate(updatedDate.getDate() - 1);

    return {
        user_id: userId,
        created_at: createdDate.toISOString(),
        updated_at: updatedDate.toISOString()
    };
});

fs.writeFileSync(path.join(__dirname, 'carts.json'), JSON.stringify(carts, null, 2), 'utf8');
console.log(`✅ Generated ${carts.length} carts`);

// Generate cart items
const cartItems = [];

// Each cart gets 2-4 items from different shops
carts.forEach((cart, cartIndex) => {
    const userId = cart.user_id;
    const numItems = 2 + (cartIndex % 3);

    for (let i = 0; i < numItems; i++) {
        const productIndex = (cartIndex * 3 + i) % products.length;
        const product = products[productIndex];
        const variant = product.variants[0]; // Use first variant

        const createdDate = new Date(cart.updated_at);
        createdDate.setHours(createdDate.getHours() - (numItems - i) * 2);

        cartItems.push({
            cart_id: cartIndex + 1, // Cart IDs will be 1, 2, 3 in DB
            product_id: productIndex + 1,
            variant_id: (productIndex * 2) + 1, // Approximate variant ID
            quantity: 1 + (i % 3),
            price_snapshot: variant.price,
            created_at: createdDate.toISOString()
        });
    }
});

fs.writeFileSync(path.join(__dirname, 'cart_items.json'), JSON.stringify(cartItems, null, 2), 'utf8');
console.log(`✅ Generated ${cartItems.length} cart items`);

console.log('\nDistribution:');
for (let cartId = 1; cartId <= 3; cartId++) {
    const items = cartItems.filter(item => item.cart_id === cartId);
    const userId = carts[cartId - 1].user_id;
    console.log(`  Cart ${cartId} (User ${userId}): ${items.length} items`);
}

console.log('\n✅ Carts and cart items generated successfully!');
