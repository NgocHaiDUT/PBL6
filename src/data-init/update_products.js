const fs = require('fs');
const path = require('path');

// Read products.json
const productsPath = path.join(__dirname, 'products.json');
const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));

// Distribute products across 4 shops (5 products each)
// Shop 1: products 0-4
// Shop 2: products 5-9
// Shop 3: products 10-14
// Shop 4: products 15-19

products.forEach((product, i) => {
    if (i < 5) {
        product.shop_id = 1;
    } else if (i < 10) {
        product.shop_id = 2;
    } else if (i < 15) {
        product.shop_id = 3;
    } else {
        product.shop_id = 4;
    }
});

// Write back to products.json
fs.writeFileSync(productsPath, JSON.stringify(products, null, 2), 'utf8');

console.log(`✅ Updated ${products.length} products`);
console.log('Distribution:');
for (let shopId = 1; shopId <= 4; shopId++) {
    const count = products.filter(p => p.shop_id === shopId).length;
    console.log(`  Shop ${shopId}: ${count} products`);
}
